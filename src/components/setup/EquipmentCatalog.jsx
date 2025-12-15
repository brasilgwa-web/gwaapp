import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Equipment, TestDefinition, EquipmentTest } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function EquipmentCatalog() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingEq, setEditingEq] = useState(null);

    // Instead of just IDs, we store objects: { id (testDefId), min_value, max_value, unit }
    const [selectedTestsData, setSelectedTestsData] = useState([]);

    // Queries
    const { data: equipments } = useQuery({
        queryKey: ['equipments'],
        queryFn: () => Equipment.list()
    });
    const { data: tests } = useQuery({
        queryKey: ['testDefinitions'],
        queryFn: () => TestDefinition.list()
    });

    // Mutations
    const createEquipment = useMutation({
        mutationFn: async (data) => {
            const eq = await Equipment.create(data.equipment);
            if (data.testLinks.length > 0) {
                await Promise.all(data.testLinks.map(link =>
                    EquipmentTest.create({
                        equipment_id: eq.id,
                        test_definition_id: link.id,
                        min_value: link.min_value,
                        max_value: link.max_value,
                        unit: link.unit
                    })
                ));
            }
            return eq;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            setIsOpen(false);
            setSelectedTestsData([]);
            setEditingEq(null);
        }
    });

    const updateEquipment = useMutation({
        mutationFn: async (data) => {
            await Equipment.update(data.id, data.equipment);

            // Update tests links
            // 1. Get existing links
            const existingLinks = await EquipmentTest.list().then(res => res.filter(r => r.equipment_id === data.id));

            // Strategy: Delete all and recreate is easiest for full sync of auxiliary fields, 
            // but might break foreign keys if we had them (we don't for these links usually, or CASCADE).
            // Better: update existing, add new, delete removed.

            const existingTestIds = existingLinks.map(r => r.test_definition_id);
            const newTestIds = data.testLinks.map(l => l.id);

            // To Remove
            const toRemove = existingLinks.filter(r => !newTestIds.includes(r.test_definition_id));
            await Promise.all(toRemove.map(r => EquipmentTest.delete(r.id)));

            // To Add or Update
            await Promise.all(data.testLinks.map(async (link) => {
                const existing = existingLinks.find(r => r.test_definition_id === link.id);
                if (existing) {
                    // Update
                    await EquipmentTest.update(existing.id, {
                        min_value: link.min_value,
                        max_value: link.max_value,
                        unit: link.unit
                    });
                } else {
                    // Create
                    await EquipmentTest.create({
                        equipment_id: data.id,
                        test_definition_id: link.id,
                        min_value: link.min_value,
                        max_value: link.max_value,
                        unit: link.unit
                    });
                }
            }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            setIsOpen(false);
            setSelectedTestsData([]);
            setEditingEq(null);
        }
    });

    const remove = useMutation({
        mutationFn: (id) => Equipment.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipments'] }),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const eqData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        if (editingEq) {
            updateEquipment.mutate({
                id: editingEq.id,
                equipment: eqData,
                testLinks: selectedTestsData
            });
        } else {
            createEquipment.mutate({
                equipment: eqData,
                testLinks: selectedTestsData
            });
        }
    };

    const handleOpenEdit = async (eq) => {
        setEditingEq(eq);
        // Fetch linked tests for this equipment
        const links = await EquipmentTest.list().then(res => res.filter(r => r.equipment_id === eq.id));

        // Map to internal state
        const loadedData = links.map(l => {
            // Fallback if null in DB (legacy) => fetch from generic definition isn't possible here synchronously easily unless we populated data.
            // But we have 'tests' (catalog).
            const def = tests?.find(t => t.id === l.test_definition_id);
            return {
                id: l.test_definition_id,
                min_value: l.min_value ?? def?.min_value,
                max_value: l.max_value ?? def?.max_value,
                unit: l.unit ?? def?.unit
            };
        });

        setSelectedTestsData(loadedData);
        setIsOpen(true);
    };

    const handleOpenNew = () => {
        setEditingEq(null);
        setSelectedTestsData([]);
        setIsOpen(true);
    }

    const toggleTest = (testId) => {
        const exists = selectedTestsData.find(x => x.id === testId);
        if (exists) {
            setSelectedTestsData(prev => prev.filter(x => x.id !== testId));
        } else {
            // Initialize with default values from Definition
            const def = tests?.find(t => t.id === testId);
            setSelectedTestsData(prev => [...prev, {
                id: testId,
                min_value: def?.min_value,
                max_value: def?.max_value,
                unit: def?.unit
            }]);
        }
    };

    const updateTestData = (testId, field, value) => {
        setSelectedTestsData(prev => prev.map(item =>
            item.id === testId ? { ...item, [field]: value } : item
        ));
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Catálogo de Equipamentos</CardTitle>
                    <CardDescription>Defina os tipos de equipamentos e seus testes padrão</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenNew}><Plus className="w-4 h-4 mr-2" /> Novo Equipamento</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingEq ? 'Editar Equipamento' : 'Novo Equipamento'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4">
                                <div className="space-y-2"><Label>Nome do Equipamento</Label><Input name="name" defaultValue={editingEq?.name} placeholder="Ex: Caldeira Flamotubular" required /></div>
                                <div className="space-y-2"><Label>Descrição</Label><Input name="description" defaultValue={editingEq?.description} /></div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Testes e Limites (VMP)</Label>
                                <div className="grid grid-cols-1 gap-2 border rounded-lg p-4 bg-slate-50 max-h-[400px] overflow-y-auto">
                                    {tests?.map(test => {
                                        const isSelected = selectedTestsData.some(x => x.id === test.id);
                                        const config = selectedTestsData.find(x => x.id === test.id);

                                        return (
                                            <div key={test.id} className={`flex flex-col p-3 rounded border transition-colors ${isSelected ? 'bg-white border-blue-300 shadow-sm' : 'border-transparent hover:border-slate-200'}`}>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`test-${test.id}`}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleTest(test.id)}
                                                    />
                                                    <label htmlFor={`test-${test.id}`} className="font-medium flex-1 cursor-pointer">
                                                        {test.name}
                                                    </label>
                                                </div>

                                                {isSelected && (
                                                    <div className="ml-6 mt-3 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-slate-500">Mínimo</Label>
                                                            <Input
                                                                type="text"
                                                                value={config?.min_value || ''}
                                                                onChange={(e) => updateTestData(test.id, 'min_value', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-slate-500">Máximo</Label>
                                                            <Input
                                                                type="text"
                                                                value={config?.max_value || ''}
                                                                onChange={(e) => updateTestData(test.id, 'max_value', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-slate-500">Unidade</Label>
                                                            <Input
                                                                type="text"
                                                                value={config?.unit || ''}
                                                                onChange={(e) => updateTestData(test.id, 'unit', e.target.value)}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <DialogFooter><Button type="submit">{editingEq ? 'Salvar Alterações' : 'Salvar Equipamento'}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2">
                    {equipments?.map(eq => (
                        <div key={eq.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                            <div>
                                <h3 className="font-semibold">{eq.name}</h3>
                                <p className="text-sm text-slate-500">{eq.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => handleOpenEdit(eq)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => remove.mutate(eq.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}