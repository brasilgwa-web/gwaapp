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
    const [selectedTests, setSelectedTests] = useState([]);

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
            if (data.testIds.length > 0) {
                await Promise.all(data.testIds.map(testId =>
                    EquipmentTest.create({
                        equipment_id: eq.id,
                        test_definition_id: testId
                    })
                ));
            }
            return eq;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            setIsOpen(false);
            setSelectedTests([]);
            setEditingEq(null);
        }
    });

    const updateEquipment = useMutation({
        mutationFn: async (data) => {
            await Equipment.update(data.id, data.equipment);

            // Update tests links
            // 1. Get existing links
            const existingLinks = await EquipmentTest.list().then(res => res.filter(r => r.equipment_id === data.id));
            const existingTestIds = existingLinks.map(r => r.test_definition_id);

            // 2. Find to remove
            const toRemove = existingLinks.filter(r => !data.testIds.includes(r.test_definition_id));
            // 3. Find to add
            const toAdd = data.testIds.filter(tid => !existingTestIds.includes(tid));

            await Promise.all([
                ...toRemove.map(r => EquipmentTest.delete(r.id)),
                ...toAdd.map(tid => EquipmentTest.create({ equipment_id: data.id, test_definition_id: tid }))
            ]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipments'] });
            setIsOpen(false);
            setSelectedTests([]);
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
                testIds: selectedTests
            });
        } else {
            createEquipment.mutate({
                equipment: eqData,
                testIds: selectedTests
            });
        }
    };

    const handleOpenEdit = async (eq) => {
        setEditingEq(eq);
        // Fetch linked tests for this equipment
        const links = await EquipmentTest.list().then(res => res.filter(r => r.equipment_id === eq.id));
        setSelectedTests(links.map(r => r.test_definition_id));
        setIsOpen(true);
    };

    const handleOpenNew = () => {
        setEditingEq(null);
        setSelectedTests([]);
        setIsOpen(true);
    }

    const toggleTest = (id) => {
        setSelectedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
                                <Label className="text-base font-semibold">Selecione os Testes Padrão</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-4 bg-slate-50 max-h-60 overflow-y-auto">
                                    {tests?.map(test => (
                                        <div key={test.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200">
                                            <Checkbox
                                                id={`test-${test.id}`}
                                                checked={selectedTests.includes(test.id)}
                                                onCheckedChange={() => toggleTest(test.id)}
                                            />
                                            <label htmlFor={`test-${test.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1">
                                                {test.name} <span className="text-slate-400 text-xs">({test.unit})</span>
                                            </label>
                                        </div>
                                    ))}
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