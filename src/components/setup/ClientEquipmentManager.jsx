import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, EquipmentTest, TestDefinition, Product, EquipmentDosageParams, AnalysisGroup } from "@/api/entities";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Settings, Box, FlaskConical, Beaker, Loader2, CheckCircle } from "lucide-react";

export default function ClientEquipmentManager({ client }) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [configEquipment, setConfigEquipment] = useState(null); // The LocationEquipment instance being configured

    // Queries
    // Fetch generic 'Location' for this client to attach equipments to.
    const { data: locations } = useQuery({
        queryKey: ['locations', client.id],
        queryFn: () => Location.filter({ client_id: client.id })
    });

    // Strategy: Use the first location found, or create one named "Geral" if none exists.
    // We do this check when adding equipment.

    const { data: allLocationEquipments } = useQuery({ queryKey: ['locationEquipments'], queryFn: () => LocationEquipment.list() });

    // Filter for THIS client's equipments
    const clientEquipments = allLocationEquipments?.filter(le => locations?.some(l => l.id === le.location_id));

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
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Adicionar Equipamento</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Adicionar Equipamento</DialogTitle></DialogHeader>
                        <div className="grid gap-2 py-4">
                            {catalogEquipments?.map(eq => (
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

    // --- Tests Logic ---
    const { data: allTests } = useQuery({ queryKey: ['testDefinitions'], queryFn: () => TestDefinition.list() });
    const { data: linkedTests } = useQuery({
        queryKey: ['equipmentTests', catalogItem.id],
        queryFn: () => EquipmentTest.filter({ equipment_id: catalogItem.id })
    });

    // Note: The original system linked tests to the CATALOG item (Equipment), not the instance.
    // If we want per-client customization, we should link to LocationEquipment. 
    // BUT, for now, preserving legacy behavior: we are editing the CATALOG links? 
    // NO! That would change it for ALL clients. 
    // The user wants to configure "THIS equipment".
    // Does 'EquipmentTest' link to Equipment(Catalog) or LocationEquipment(Instance)?
    // Inspecting entities.js... it links to 'equipment_id' (Catalog).
    // Should we verify this? If it links to Catalog, then changing it changes for everyone.
    // User request: "nesse equipamento será castrado quais produtos...".
    // For TESTS, usually standard per Equipment Type (e.g. all Boilers have pH).
    // For DOSAGE, it MUST be per instance (Boiler A uses Product X, Boiler B uses Product Y).

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
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locationEquipments'] })
    });

    const addProduct = useMutation({
        mutationFn: (data) => EquipmentDosageParams.create({ ...data, location_equipment_id: locationEquipment.id }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipmentDosageParams', locationEquipment.id] })
    });

    const removeProduct = useMutation({
        mutationFn: (id) => EquipmentDosageParams.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipmentDosageParams', locationEquipment.id] })
    });

    const updateProduct = useMutation({
        mutationFn: (data) => EquipmentDosageParams.update(data.id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipmentDosageParams', locationEquipment.id] })
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
                        value={locationEquipment.default_analysis_group_id || "none"}
                        onValueChange={(val) => updateDefaultGroup.mutate(val === "none" ? null : val)}
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

                <Tabs defaultValue="products" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList>
                        <TabsTrigger value="products">Produtos & Dosagens</TabsTrigger>
                        <TabsTrigger value="tests">Parâmetros de Análise</TabsTrigger>
                    </TabsList>

                    <TabsContent value="products" className="flex-1 overflow-y-auto space-y-4 pt-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">Adicionar Produto</h4>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.target);
                                    addProduct.mutate({
                                        product_id: fd.get('product_id'),
                                        recommended_dosage: parseFloat(fd.get('recommended_dosage')),
                                        dosage_unit: fd.get('dosage_unit') || '-'
                                    });
                                    e.target.reset();
                                }}
                                className="flex gap-2 items-end"
                            >
                                <div className="space-y-1 flex-1">
                                    <Label className="text-xs">Produto</Label>
                                    <Select name="product_id" required>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {allProducts?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 w-32">
                                    <Label className="text-xs">Dosagem (Meta)</Label>
                                    <Input name="recommended_dosage" type="number" step="0.01" className="bg-white" required />
                                </div>
                                <Button type="submit" size="sm"><Plus className="w-4 h-4" /></Button>
                            </form>
                        </div>

                        <div className="space-y-2">
                            {dosageParams?.map(dp => {
                                const prod = allProducts?.find(p => p.id === dp.product_id);
                                return (
                                    <div key={dp.id} className="flex justify-between items-center p-2 bg-white border rounded shadow-sm">
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
                                );
                            })}
                            {!dosageParams?.length && <p className="text-xs text-center text-slate-400">Nenhum produto vinculado.</p>}
                        </div>
                    </TabsContent>

                    <TabsContent value="tests" className="flex-1 overflow-y-auto pt-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm mb-4">
                            <h4 className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Atenção</h4>
                            <p>Os testes são configurados globalmente para o <strong>Tipo de Equipamento</strong> de mesmo nome no catálogo. Alterações aqui afetarão todos os clientes que usam este tipo de equipamento. (Feature Legada)</p>
                        </div>
                        <div className="space-y-1">
                            {/* Read-only view of tests for now to avoid confusion, or implement EquipmentTestManager separately */}
                            {linkedTests?.map(lt => {
                                const t = allTests?.find(x => x.id === lt.test_definition_id);
                                return (
                                    <div key={lt.id} className="flex items-center justify-between p-2 text-sm border-b">
                                        <span>{t?.name}</span>
                                        <span className="font-mono text-xs text-slate-500">{t?.min_value} - {t?.max_value} {t?.unit}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-4 text-center">
                            <Button variant="outline" size="sm" onClick={() => window.open('/setup/equipments', '_blank')}>Gerenciar Testes no Catálogo</Button>
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
function AlertTriangle(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
