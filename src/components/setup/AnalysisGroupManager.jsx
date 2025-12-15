import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnalysisGroup, AnalysisGroupItem, TestDefinition } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Layers, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AnalysisGroupManager() {
    const queryClient = useQueryClient();
    const [editingGroup, setEditingGroup] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedTests, setSelectedTests] = useState([]);

    // Queries
    const { data: groups } = useQuery({ queryKey: ['analysisGroups'], queryFn: () => AnalysisGroup.list() });
    const { data: tests } = useQuery({ queryKey: ['testDefinitions'], queryFn: () => TestDefinition.list() });

    // Mutations
    const create = useMutation({
        mutationFn: async (data) => {
            const group = await AnalysisGroup.create(data.group);
            if (data.testIds.length > 0) {
                await Promise.all(data.testIds.map(tid =>
                    AnalysisGroupItem.create({ group_id: group.id, test_definition_id: tid })
                ));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analysisGroups'] });
            setIsDialogOpen(false);
        }
    });

    const update = useMutation({
        mutationFn: async (data) => {
            await AnalysisGroup.update(data.id, data.group);
            // Re-sync items simplified strategy: delete all and add new (ok for small lists)
            const currentItems = await AnalysisGroupItem.list().then(res => res.filter(i => i.group_id === data.id));
            await Promise.all(currentItems.map(i => AnalysisGroupItem.delete(i.id)));

            await Promise.all(data.testIds.map(tid =>
                AnalysisGroupItem.create({ group_id: data.id, test_definition_id: tid })
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['analysisGroups'] });
            setIsDialogOpen(false);
            setEditingGroup(null);
        }
    });

    const remove = useMutation({
        mutationFn: (id) => AnalysisGroup.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysisGroups'] })
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const groupData = {
            name: formData.get('name'),
            description: formData.get('description'),
        };

        if (editingGroup) {
            update.mutate({ id: editingGroup.id, group: groupData, testIds: selectedTests });
        } else {
            create.mutate({ group: groupData, testIds: selectedTests });
        }
    };

    const openEdit = async (group) => {
        setEditingGroup(group);
        const items = await AnalysisGroupItem.list().then(res => res.filter(i => i.group_id === group.id));
        setSelectedTests(items.map(i => i.test_definition_id));
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingGroup(null);
        setSelectedTests([]);
        setIsDialogOpen(true);
    };

    const toggleTest = (id) => {
        setSelectedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Grupos de Análises</CardTitle>
                    <CardDescription>Crie pacotes de testes padrão (ex: Grupo 1, Grupo Rotina)</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Grupo</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="grid gap-2"><Label>Nome do Grupo</Label><Input name="name" defaultValue={editingGroup?.name} placeholder="Ex: Grupo 1: pH, Alcalinidade..." required /></div>
                            <div className="grid gap-2"><Label>Descrição</Label><Input name="description" defaultValue={editingGroup?.description} placeholder="Descrição opcional" /></div>

                            <div className="space-y-3">
                                <Label>Selecione os Testes deste Grupo</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-4 bg-slate-50 max-h-60 overflow-y-auto">
                                    {tests?.map(test => (
                                        <div key={test.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200">
                                            <Checkbox
                                                id={`gtest-${test.id}`}
                                                checked={selectedTests.includes(test.id)}
                                                onCheckedChange={() => toggleTest(test.id)}
                                            />
                                            <label htmlFor={`gtest-${test.id}`} className="text-sm font-medium cursor-pointer flex-1">
                                                {test.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit">{editingGroup ? 'Salvar' : 'Criar'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2">
                    {groups?.map(group => (
                        <div key={group.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5 text-slate-500" />
                                <div>
                                    <h3 className="font-semibold">{group.name}</h3>
                                    <p className="text-sm text-slate-500">{group.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => openEdit(group)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => remove.mutate(group.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {groups?.length === 0 && <p className="text-center text-slate-500 py-4">Nenhum grupo cadastrado.</p>}
                </div>
            </CardContent>
        </Card>
    );
}
