import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TestDefinition } from "@/api/entities";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ArrowUpDown, Search, BarChart2, AlertTriangle, ChevronDown, ChevronUp, Loader2 as Loader2Icon } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTableRow } from '@/components/ui/sortable-table-row';
import { useOperationFeedback } from "@/context/OperationFeedbackContext";

export default function TestCatalog() {
    const queryClient = useQueryClient();
    const { executeWithFeedback } = useOperationFeedback();
    const [editingTest, setEditingTest] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'asc', 'desc'

    const { data: tests } = useQuery({
        queryKey: ['testDefinitions'],
        queryFn: () => TestDefinition.list()
    });

    const create = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: () => TestDefinition.create(data),
                loadingMessage: 'Criando teste...',
                successMessage: 'Teste criado com sucesso!',
                errorMessage: 'Erro ao criar teste.',
                logCategory: 'crud',
                logDetails: { action: 'create', entity: 'test_definition', data },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testDefinitions'] });
            setIsDialogOpen(false);
        },
    });

    const update = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: () => TestDefinition.update(data.id, data.fields),
                loadingMessage: 'Salvando alterações...',
                successMessage: 'Teste atualizado com sucesso!',
                errorMessage: 'Erro ao atualizar teste.',
                logCategory: 'crud',
                logDetails: { action: 'update', entity: 'test_definition', id: data.id, fields: data.fields },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testDefinitions'] });
            setEditingTest(null);
            setIsDialogOpen(false);
        },
    });

    const remove = useMutation({
        mutationFn: async (id) => {
            const result = await executeWithFeedback({
                operation: () => TestDefinition.delete(id),
                loadingMessage: 'Excluindo teste...',
                successMessage: 'Teste excluído com sucesso!',
                errorMessage: 'Erro ao excluir teste.',
                logCategory: 'crud',
                logDetails: { action: 'delete', entity: 'test_definition', id },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testDefinitions'] }),
    });

    const [showInChartForm, setShowInChartForm] = useState(false);
    const [globalCascadeDialog, setGlobalCascadeDialog] = useState(null);
    const [isCascading, setIsCascading] = useState(false);
    const [cascadeExpanded, setCascadeExpanded] = useState(false);

    const toggleShowInChart = useMutation({
        mutationFn: ({ id, value }) => TestDefinition.update(id, { show_in_chart: value }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testDefinitions'] }),
    });

    const handleToggleShowInChart = async (testId, newValue) => {
        await toggleShowInChart.mutateAsync({ id: testId, value: newValue });
        // Cascade check: find clients with explicit override for this test
        const { data: allSettings, error } = await supabase
            .from('client_report_chart_settings')
            .select('id, client_id, chart_test_overrides');
        if (error) { console.error('Cascade check failed:', error); return; }

        const affected = (allSettings || []).filter(s => {
            const ov = s.chart_test_overrides;
            return ov !== null && typeof ov === 'object' && Object.prototype.hasOwnProperty.call(ov, testId);
        });
        if (!affected.length) return;

        const clientIds = affected.map(s => s.client_id);
        const { data: clients } = await supabase
            .from('clients').select('id, name').in('id', clientIds);
        const clientMap = new Map((clients || []).map(c => [c.id, c]));
        const testName = tests?.find(t => t.id === testId)?.name || 'teste';
        const items = affected.map(s => ({
            settingsId: s.id,
            clientId: s.client_id,
            clientName: clientMap.get(s.client_id)?.name || 'Cliente',
            currentValue: s.chart_test_overrides[testId],
            chartTestOverrides: s.chart_test_overrides,
        }));
        setGlobalCascadeDialog({ testId, testName, newValue, items });
    };

    const handleGlobalCascadeConfirm = async () => {
        if (!globalCascadeDialog) return;
        setIsCascading(true);
        try {
            const { testId, items } = globalCascadeDialog;
            await Promise.all(items.map(item => {
                const newOverrides = { ...item.chartTestOverrides };
                delete newOverrides[testId];
                const val = Object.keys(newOverrides).length > 0 ? newOverrides : null;
                return supabase
                    .from('client_report_chart_settings')
                    .update({ chart_test_overrides: val })
                    .eq('id', item.settingsId);
            }));
            queryClient.invalidateQueries({ queryKey: ['chartSettings'] });
            queryClient.invalidateQueries({ queryKey: ['historicalChartData'] });
            queryClient.invalidateQueries({ queryKey: ['fullReport'] });
        } finally {
            setIsCascading(false);
            setGlobalCascadeDialog(null);
            setCascadeExpanded(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            unit: formData.get('unit'),
            min_value: parseFloat(formData.get('min_value')),
            max_value: parseFloat(formData.get('max_value')),
            tolerance_percent: parseFloat(formData.get('tolerance_percent') || 10),
            dilution_factor: parseFloat(formData.get('dilution_factor') || 1),
            ld: formData.get('ld'),
            lq: formData.get('lq'),
            method_uncertainty: formData.get('method_uncertainty'),
            methodology: formData.get('methodology'),
            observation: formData.get('observation'),
            show_in_chart: showInChartForm,
        };

        if (editingTest) {
            update.mutate({ id: editingTest.id, fields: data });
        } else {
            create.mutate(data);
        }
    };

    const openEdit = (test) => {
        setEditingTest(test);
        setShowInChartForm(test?.show_in_chart || false);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingTest(null);
        setShowInChartForm(false);
        setIsDialogOpen(true);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(100);

    // Filter and sort tests
    const filteredTests = useMemo(() => {
        if (!tests) return [];

        let result = [...tests];

        // 1. Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(t =>
                (t.name && t.name.toLowerCase().includes(lower)) ||
                (t.unit && t.unit.toLowerCase().includes(lower)) ||
                (t.methodology && t.methodology.toLowerCase().includes(lower))
            );
        }

        // 2. Sort
        if (sortOrder === 'asc') {
            result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            result.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists
            result.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return result;
    }, [tests, sortOrder, searchTerm]);

    const visibleTests = useMemo(() => {
        return filteredTests.slice(0, visibleCount);
    }, [filteredTests, visibleCount]);

    // Reset visible count when search changes
    React.useEffect(() => {
        setVisibleCount(100);
    }, [searchTerm]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = filteredTests.findIndex((item) => item.id === active.id);
            const newIndex = filteredTests.findIndex((item) => item.id === over.id);

            const newOrderedList = arrayMove(filteredTests, oldIndex, newIndex);

            await Promise.all(newOrderedList.map((item, index) =>
                TestDefinition.update(item.id, { display_order: index })
            ));

            queryClient.invalidateQueries({ queryKey: ['testDefinitions'] });
        }
    };

    return (
        <>
        <Card className="w-full">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Catálogo de Testes</CardTitle>
                    <CardDescription>Defina os parâmetros analisados e seus dados laboratoriais (LD, LQ, Metodologia)</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar testes..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Ordem Manual</SelectItem>
                            <SelectItem value="asc">A → Z</SelectItem>
                            <SelectItem value="desc">Z → A</SelectItem>
                        </SelectContent>
                    </Select>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Teste</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>{editingTest ? 'Editar Teste' : 'Novo Teste'}</DialogTitle></DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4">
                                <div className="grid gap-2"><Label>Nome do Teste</Label><Input name="name" defaultValue={editingTest?.name} placeholder="Ex: pH, Condutividade" required /></div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border">
                                    <div className="grid gap-2"><Label>Unidade</Label><Input name="unit" defaultValue={editingTest?.unit} placeholder="Ex: uS/cm" required /></div>
                                    <div className="grid gap-2"><Label>Mínimo</Label><Input name="min_value" defaultValue={editingTest?.min_value} type="number" step="0.01" required /></div>
                                    <div className="grid gap-2"><Label>Máximo</Label><Input name="max_value" defaultValue={editingTest?.max_value} type="number" step="0.01" required /></div>
                                    <div className="grid gap-2"><Label>Tolerância (%)</Label><Input name="tolerance_percent" defaultValue={editingTest?.tolerance_percent || 10} type="number" step="1" required /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="grid gap-2"><Label>LD (Lim. Detecção)</Label><Input name="ld" defaultValue={editingTest?.ld} placeholder="Ex: 0.1" /></div>
                                    <div className="grid gap-2"><Label>LQ (Lim. Quantificação)</Label><Input name="lq" defaultValue={editingTest?.lq} placeholder="Ex: 0.5" /></div>
                                    <div className="grid gap-2"><Label>Incerteza do Método</Label><Input name="method_uncertainty" defaultValue={editingTest?.method_uncertainty} placeholder="Ex: 1.19" /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2"><Label>Fator Diluição (Padrão)</Label><Input name="dilution_factor" defaultValue={editingTest?.dilution_factor || 1} type="number" step="0.1" /></div>
                                    <div className="grid gap-2"><Label>Metodologia (ISO/SMEWW)</Label><Input name="methodology" defaultValue={editingTest?.methodology} placeholder="Ex: SMEWW 2510 B" /></div>
                                </div>

                                <div className="grid gap-2"><Label>Observação Padrão</Label><Input name="observation" defaultValue={editingTest?.observation} /></div>

                                <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <Label htmlFor="show_in_chart" className="text-sm font-medium text-blue-900 cursor-pointer flex items-center gap-2">
                                        <BarChart2 className="w-4 h-4" />
                                        Exibir nos gráficos de relatório (padrão global)
                                    </Label>
                                    <Switch
                                        id="show_in_chart"
                                        checked={showInChartForm}
                                        onCheckedChange={setShowInChartForm}
                                    />
                                </div>

                                <DialogFooter>
                                    <Button type="submit">{editingTest ? 'Salvar Alterações' : 'Criar Teste'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-md border overflow-x-auto">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead>Faixa</TableHead>
                                    <TableHead>Metodologia</TableHead>
                                    <TableHead className="w-24 text-center text-xs text-slate-500">
                                        <div className="flex items-center justify-center gap-1">
                                            <BarChart2 className="w-3 h-3" /> Gráfico?
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <SortableContext
                                    items={visibleTests.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={sortOrder !== 'manual' || searchTerm !== ''}
                                >
                                    {visibleTests.map((test) => (
                                        <SortableTableRow key={test.id} id={test.id}>
                                            <TableCell className="font-medium">{test.name}</TableCell>
                                            <TableCell>{test.unit}</TableCell>
                                            <TableCell><span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{test.min_value} - {test.max_value}</span></TableCell>
                                            <TableCell className="text-xs text-slate-500">{test.methodology || '-'}</TableCell>
                                            <TableCell className="text-center">
                                                <Switch
                                                    checked={!!test.show_in_chart}
                                                    onCheckedChange={(val) => handleToggleShowInChart(test.id, !!val)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => openEdit(test)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => remove.mutate(test.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </SortableTableRow>
                                    ))}
                                </SortableContext>
                                {visibleTests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-4">Nenhum teste encontrado.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
                {visibleTests.length < filteredTests.length && (
                    <div className="flex justify-center mt-4">
                        <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 10)}>
                            Carregar mais
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Global → Client cascade dialog */}
        <Dialog open={!!globalCascadeDialog} onOpenChange={() => { setGlobalCascadeDialog(null); setCascadeExpanded(false); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Replicar alteração global?
                    </DialogTitle>
                    <DialogDescription>
                        {globalCascadeDialog?.items.length} cliente{globalCascadeDialog?.items.length !== 1 ? 's' : ''} {globalCascadeDialog?.items.length !== 1 ? 'têm' : 'tem'} um override explícito para <strong>{globalCascadeDialog?.testName}</strong>.
                        Deseja remover esses overrides para que herdem o novo padrão global ({globalCascadeDialog?.newValue ? 'ON' : 'OFF'})?
                    </DialogDescription>
                </DialogHeader>

                <button
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => setCascadeExpanded(e => !e)}
                >
                    {cascadeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {cascadeExpanded ? 'Ocultar' : 'Ver'} clientes afetados ({globalCascadeDialog?.items.length})
                </button>

                {cascadeExpanded && (
                    <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        {globalCascadeDialog?.items.map(item => (
                            <div key={item.settingsId} className="px-3 py-2 border-b last:border-0 text-sm flex items-center justify-between">
                                <span className="font-medium text-slate-700">{item.clientName}</span>
                                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${item.currentValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {item.currentValue ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => { setGlobalCascadeDialog(null); setCascadeExpanded(false); }} disabled={isCascading}>
                        Não, manter overrides
                    </Button>
                    <Button onClick={handleGlobalCascadeConfirm} disabled={isCascading} className="bg-amber-500 hover:bg-amber-600 text-white">
                        {isCascading
                            ? <><Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> Aplicando...</>
                            : 'Sim, limpar overrides'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}