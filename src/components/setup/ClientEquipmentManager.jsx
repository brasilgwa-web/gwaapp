import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, EquipmentTest, TestDefinition, Product, EquipmentDosageParams, AnalysisGroup, LocationEquipmentTest } from "@/api/entities";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Settings, Box, FlaskConical, Beaker, Loader2, CheckCircle, Search, AlertTriangle } from "lucide-react";

export default function ClientEquipmentManager({ client }) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [equipmentFilter, setEquipmentFilter] = useState('');
    const [configEquipment, setConfigEquipment] = useState(null); // The LocationEquipment instance being configured

    // Queries
    // Fetch generic 'Location' for this client to attach equipments to.
    const { data: locations } = useQuery({
        queryKey: ['locations', client.id],
        queryFn: () => Location.filter({ client_id: client.id })
    });

    // Strategy: Use the first location found, or create one named "Geral" if none exists.
    // We do this check when adding equipment.

    const { data: clientEquipments } = useQuery({
        queryKey: ['locationEquipments', locations?.map(l => l.id).join(',')],
        queryFn: async () => {
            if (!locations || locations.length === 0) return [];
            const { data, error } = await supabase
                .from('location_equipments')
                .select('*')
                .in('location_id', locations.map(l => l.id));
            if (error) throw error;
            return data;
        },
        enabled: !!locations && locations.length > 0
    });

    const { data: catalogEquipments } = useQuery({ queryKey: ['equipments'], queryFn: () => Equipment.list() });

    // Mutations
    const addEquipment = useMutation({
        mutationFn: async (equipmentId) => {
            let targetLocationId;
            if (locations && locations.length > 0) {
                targetLocationId = locations[0].id;
            } else {
                const newLoc = await Location.create({ client_id: client.id, name: 'Geral', description: 'Área Geral' });
                targetLocationId = newLoc.id;
                queryClient.invalidateQueries({ queryKey: ['locations', client.id] });
            }

            return LocationEquipment.create({ location_id: targetLocationId, equipment_id: equipmentId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locationEquipments'] });
            setIsAddOpen(false);
        }
    });

    const removeEquipment = useMutation({
        mutationFn: (id) => LocationEquipment.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locationEquipments'] })
    });

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Equipamentos</CardTitle>
                    <CardDescription>Gerencie os equipamentos atendidos neste cliente.</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={(open) => {
                    setIsAddOpen(open);
                    if (!open) setEquipmentFilter(''); // Limpa o filtro ao fechar
                }}>
                    <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Adicionar Equipamento</Button></DialogTrigger>
                    <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
                        <DialogHeader><DialogTitle>Adicionar Equipamento</DialogTitle></DialogHeader>

                        {/* Campo de filtro */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar equipamento..."
                                value={equipmentFilter}
                                onChange={(e) => setEquipmentFilter(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Lista de equipamentos com scroll */}
                        <div className="flex-1 overflow-y-auto min-h-0 grid gap-2 py-2">
                            {catalogEquipments
                                ?.filter(eq => eq.name.toLowerCase().includes(equipmentFilter.toLowerCase()))
                                .map(eq => (
                                    <Button
                                        key={eq.id}
                                        variant="outline"
                                        className="justify-start"
                                        onClick={() => addEquipment.mutate(eq.id)}
                                    >
                                        <Box className="w-4 h-4 mr-2" />
                                        {eq.name}
                                    </Button>
                                ))}
                            {catalogEquipments?.filter(eq => eq.name.toLowerCase().includes(equipmentFilter.toLowerCase())).length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">Nenhum equipamento encontrado.</p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {clientEquipments?.map(le => {
                        const catalogItem = catalogEquipments?.find(c => c.id === le.equipment_id);
                        return (
                            <div key={le.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded text-slate-600"><Box className="w-5 h-5" /></div>
                                    <span className="font-semibold">{catalogItem?.name || 'Equipamento Desconhecido'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setConfigEquipment(le)}>
                                        <Settings className="w-3 h-3 mr-2" /> Configurar
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => removeEquipment.mutate(le.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {configEquipment && (
                    <EquipmentConfigDialog
                        locationEquipment={configEquipment}
                        catalogItem={catalogEquipments?.find(c => c.id === configEquipment.equipment_id)}
                        open={!!configEquipment}
                        onClose={() => setConfigEquipment(null)}
                    />
                )}
            </CardContent>
        </Card>
    );
}

function EquipmentConfigDialog({ locationEquipment, catalogItem, open, onClose }) {
    const queryClient = useQueryClient();
    // Local state for selected group - needed because prop is snapshot when dialog opens
    const [selectedGroupId, setSelectedGroupId] = React.useState(locationEquipment?.default_analysis_group_id || null);
    const [selectedProductId, setSelectedProductId] = React.useState('');
    const [selectedTestId, setSelectedTestId] = React.useState(''); // For adding custom test

    // --- Tests Logic ---
    const { data: allTests } = useQuery({ queryKey: ['testDefinitions'], queryFn: () => TestDefinition.list() });

    // Standard Tests (Catalog)
    const { data: standardTests } = useQuery({
        queryKey: ['equipmentTests', catalogItem.id],
        queryFn: () => EquipmentTest.filter({ equipment_id: catalogItem.id })
    });

    // Custom/Override Tests (Client Specific)
    const { data: customTests } = useQuery({
        queryKey: ['locationEquipmentTests', locationEquipment.id],
        queryFn: () => LocationEquipmentTest.filter({ location_equipment_id: locationEquipment.id })
    });

    // --- Dosage / Products Logic (PER INSTANCE - V1.2) ---
    const { data: allProducts } = useQuery({ queryKey: ['products'], queryFn: () => Product.list() });
    const { data: dosageParams } = useQuery({
        queryKey: ['equipmentDosageParams', locationEquipment.id],
        queryFn: () => EquipmentDosageParams.filter({ location_equipment_id: locationEquipment.id })
    });

    // --- Analysis Groups Logic ---
    const { data: analysisGroups } = useQuery({ queryKey: ['analysisGroups'], queryFn: () => AnalysisGroup.list() });

    const updateDefaultGroup = useMutation({
        mutationFn: async (groupId) => {
            const { error } = await supabase.from('location_equipments')
                .update({ default_analysis_group_id: groupId || null })
                .eq('id', locationEquipment.id);
            if (error) throw error;
            return groupId;
        },
        onSuccess: (groupId) => {
            setSelectedGroupId(groupId); // Update local state immediately
            queryClient.invalidateQueries({ queryKey: ['locationEquipments'] });
        }
    });

    const addProduct = useMutation({
        mutationFn: (data) => EquipmentDosageParams.create({ ...data, location_equipment_id: locationEquipment.id }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipmentDosageParams', locationEquipment.id] })
    });

    const removeProduct = useMutation({
        mutationFn: (id) => EquipmentDosageParams.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipmentDosageParams', locationEquipment.id] })
    });

    // Tests Mutations
    const addCustomTest = useMutation({
        mutationFn: (data) => LocationEquipmentTest.create({
            ...data,
            location_equipment_id: locationEquipment.id,
            // Default values from definition if not provided? Already handled in form
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locationEquipmentTests', locationEquipment.id] })
    });

    const removeCustomTest = useMutation({
        mutationFn: (id) => LocationEquipmentTest.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locationEquipmentTests', locationEquipment.id] })
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Configurar {catalogItem?.name}</DialogTitle>
                </DialogHeader>

                {/* Default Analysis Group Selector */}
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-bold text-purple-800">Grupo de Análise Padrão</Label>
                        {updateDefaultGroup.isPending && (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                            </span>
                        )}
                        {updateDefaultGroup.isSuccess && !updateDefaultGroup.isPending && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Salvo!
                            </span>
                        )}
                    </div>
                    <Select
                        value={selectedGroupId || "none"}
                        onValueChange={(val) => {
                            const newGroupId = val === "none" ? null : val;
                            setSelectedGroupId(newGroupId); // Update local state immediately for UI
                            updateDefaultGroup.mutate(newGroupId);
                        }}
                    >
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecione um grupo..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Nenhum (selecionar manualmente)</SelectItem>
                            {analysisGroups?.map(g => (
                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-purple-600 mt-1">Este grupo será carregado automaticamente na visita.</p>
                </div>

                <Tabs defaultValue="chemical_tech" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                        <TabsTrigger value="chemical_tech">Tecnologia Química</TabsTrigger>
                        <TabsTrigger value="products">Produtos & Dosagens</TabsTrigger>
                        <TabsTrigger value="analysis_params">Parâmetros de Análise</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Tecnologia Química (Custom Tests) */}
                    <TabsContent value="chemical_tech" className="flex-1 overflow-y-auto pt-4 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold flex items-center gap-2">Testes Personalizados deste Cliente</h4>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h5 className="text-xs font-semibold text-slate-700 mb-2">Adicionar Teste Específico</h5>
                                <form
                                    className="flex flex-col gap-3"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (!selectedTestId) return;

                                        // Find definition to prefill if needed, but we save values explicitly
                                        const def = allTests?.find(t => t.id === selectedTestId);
                                        const fd = new FormData(e.target);

                                        addCustomTest.mutate({
                                            test_definition_id: selectedTestId,
                                            min_value: fd.get('min_value') || def?.min_value,
                                            max_value: fd.get('max_value') || def?.max_value,
                                            unit: fd.get('unit') || def?.unit
                                        });

                                        e.target.reset();
                                        setSelectedTestId('');
                                    }}
                                >
                                    <div className="w-full space-y-1">
                                        <Label className="text-xs uppercase text-slate-500 font-bold">Teste</Label>
                                        <SearchableSelect
                                            value={selectedTestId}
                                            onValueChange={setSelectedTestId}
                                            options={allTests?.map(t => ({ value: t.id, label: t.name })) || []}
                                            placeholder="Selecionar teste..."
                                            searchPlaceholder="Buscar teste..."
                                        />
                                    </div>

                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs uppercase text-slate-500 font-bold">Min</Label>
                                            <Input name="min_value" className="h-10 bg-white" placeholder="0.0" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs uppercase text-slate-500 font-bold">Max</Label>
                                            <Input name="max_value" className="h-10 bg-white" placeholder="10.0" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs uppercase text-slate-500 font-bold">Unidade</Label>
                                            <Input name="unit" className="h-10 bg-white" placeholder="ppm" />
                                        </div>
                                        <div className="pb-0.5">
                                            <Button type="submit" size="icon" className="h-10 w-10 bg-blue-100 text-blue-600 hover:bg-blue-200"><Plus className="w-5 h-5" /></Button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="space-y-1">
                                {customTests?.map(ct => {
                                    const t = allTests?.find(x => x.id === ct.test_definition_id);
                                    return (
                                        <div key={ct.id} className="flex items-center justify-between p-3 bg-white border border-blue-200 rounded shadow-sm text-sm">
                                            <div className="flex items-center gap-2">
                                                <FlaskConical className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium">{t?.name || 'Teste Removido'}</span>
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Personalizado</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs text-slate-600">
                                                    {ct.min_value ?? '-'} a {ct.max_value ?? '-'} {ct.unit}
                                                </span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => removeCustomTest.mutate(ct.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!customTests?.length && (
                                    <p className="text-xs text-slate-400 text-center italic">Nenhum teste específico configurado.</p>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Produtos & Dosagens (Products) */}
                    <TabsContent value="products" className="flex-1 overflow-y-auto space-y-4 pt-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">Adicionar Produto</h4>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!selectedProductId) return;
                                    const fd = new FormData(e.target);
                                    addProduct.mutate({
                                        product_id: selectedProductId,
                                        recommended_dosage: parseFloat(fd.get('recommended_dosage')),
                                        dosage_unit: fd.get('dosage_unit') || '-',
                                        complementary_info: fd.get('complementary_info') || ''
                                    });
                                    e.target.reset();
                                    setSelectedProductId('');
                                }}
                                className="space-y-3"
                            >
                                <div className="flex gap-2 items-end">
                                    <div className="space-y-1 flex-1">
                                        <Label className="text-xs">Produto</Label>
                                        <SearchableSelect
                                            value={selectedProductId}
                                            onValueChange={setSelectedProductId}
                                            options={allProducts?.map(p => ({
                                                value: p.id,
                                                label: p.name
                                            })) || []}
                                            placeholder="Selecione um produto..."
                                            searchPlaceholder="Buscar produto..."
                                            emptyText="Nenhum produto encontrado."
                                        />
                                    </div>
                                    <div className="space-y-1 w-32">
                                        <Label className="text-xs">Dosagem (Meta)</Label>
                                        <Input name="recommended_dosage" type="number" step="0.01" className="bg-white" required />
                                    </div>
                                    <Button type="submit" size="sm"><Plus className="w-4 h-4" /></Button>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Informação Complementar (opcional)</Label>
                                    <textarea
                                        name="complementary_info"
                                        className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px]"
                                        placeholder="Informações adicionais que aparecerão na visita e relatório..."
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="space-y-2">
                            {dosageParams?.map(dp => {
                                const prod = allProducts?.find(p => p.id === dp.product_id);
                                return (
                                    <div key={dp.id} className="p-3 bg-white border rounded shadow-sm space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <Beaker className="w-4 h-4 text-purple-500" />
                                                <span className="font-medium text-sm">{prod?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                    Meta: {dp.recommended_dosage} {prod?.unit}
                                                </span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeProduct.mutate(dp.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        {dp.complementary_info && (
                                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                {dp.complementary_info}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {!dosageParams?.length && <p className="text-xs text-center text-slate-400">Nenhum produto vinculado.</p>}
                        </div>
                    </TabsContent>

                    {/* Tab 3: Parâmetros de Análise (Standard Tests) */}
                    <TabsContent value="analysis_params" className="flex-1 overflow-y-auto pt-4 space-y-6">
                        {/* Standard Tests Section (Read-Only) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold flex items-center gap-2 text-slate-600">Testes Padrão do Equipamento</h4>
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border rounded px-1">Global</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">Estes testes são herdados do catálogo ({catalogItem?.name}). Eles aparecerão na visita a menos que haja um personalizado ocultando-os.</p>

                            <div className="space-y-1">
                                {standardTests?.map(lt => {
                                    const t = allTests?.find(x => x.id === lt.test_definition_id);
                                    return (
                                        <div key={lt.id} className="flex items-center justify-between p-2 text-sm border-b bg-slate-50/50">
                                            <span className="text-slate-700">{t?.name}</span>
                                            <span className="font-mono text-xs text-slate-500">{lt.min_value} - {lt.max_value} {lt.unit}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="mt-4">
                    <Button onClick={onClose}>Concluído</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Missing Icon

