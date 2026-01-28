import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TestDefinition } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ArrowUpDown } from "lucide-react";
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

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            unit: formData.get('unit'),
            min_value: parseFloat(formData.get('min_value')),
            max_value: parseFloat(formData.get('max_value')),
            tolerance_percent: parseFloat(formData.get('tolerance_percent') || 10),
            // V1.1 New Fields
            dilution_factor: parseFloat(formData.get('dilution_factor') || 1),
            ld: formData.get('ld'),
            lq: formData.get('lq'),
            method_uncertainty: formData.get('method_uncertainty'),
            methodology: formData.get('methodology'),
            observation: formData.get('observation')
        };

        if (editingTest) {
            update.mutate({ id: editingTest.id, fields: data });
        } else {
            create.mutate(data);
        }
    };

    const openEdit = (test) => {
        setEditingTest(test);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingTest(null);
        setIsDialogOpen(true);
    };

    // Sorted tests based on sortOrder
    const sortedTests = useMemo(() => {
        if (!tests) return [];

        let sorted = [...tests];

        if (sortOrder === 'asc') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists
            sorted.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return sorted;
    }, [tests, sortOrder]);

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
            const oldIndex = sortedTests.findIndex((item) => item.id === active.id);
            const newIndex = sortedTests.findIndex((item) => item.id === over.id);

            const newOrderedList = arrayMove(sortedTests, oldIndex, newIndex);

            await Promise.all(newOrderedList.map((item, index) =>
                TestDefinition.update(item.id, { display_order: index })
            ));

            queryClient.invalidateQueries({ queryKey: ['testDefinitions'] });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Catálogo de Testes</CardTitle>
                    <CardDescription>Defina os parâmetros analisados e seus dados laboratoriais (LD, LQ, Metodologia)</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
                                    <TableHead className="w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <SortableContext
                                    items={sortedTests.map(t => t.id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={sortOrder !== 'manual'}
                                >
                                    {sortedTests.map((test) => (
                                        <SortableTableRow key={test.id} id={test.id}>
                                            <TableCell className="font-medium">{test.name}</TableCell>
                                            <TableCell>{test.unit}</TableCell>
                                            <TableCell><span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{test.min_value} - {test.max_value}</span></TableCell>
                                            <TableCell className="text-xs text-slate-500">{test.methodology || '-'}</TableCell>
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
                                {sortedTests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-4">Nenhum teste cadastrado.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
            </CardContent>
        </Card>
    );
}