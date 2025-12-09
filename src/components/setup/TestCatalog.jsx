import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TestDefinition } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function TestCatalog() {
    const queryClient = useQueryClient();
    const [editingTest, setEditingTest] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: tests } = useQuery({
        queryKey: ['testDefinitions'],
        queryFn: () => TestDefinition.list()
    });

    const create = useMutation({
        mutationFn: (data) => TestDefinition.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testDefinitions'] });
            setIsDialogOpen(false);
        },
    });

    const update = useMutation({
        mutationFn: (data) => TestDefinition.update(data.id, data.fields),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['testDefinitions'] });
            setEditingTest(null);
            setIsDialogOpen(false);
        },
    });

    const remove = useMutation({
        mutationFn: (id) => TestDefinition.delete(id),
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

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Catálogo de Testes</CardTitle>
                    <CardDescription>Defina os parâmetros analisados (ex: pH, Dureza)</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Teste</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{editingTest ? 'Editar Teste' : 'Novo Teste'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="grid gap-2"><Label>Nome</Label><Input name="name" defaultValue={editingTest?.name} placeholder="Ex: pH" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>Unidade</Label><Input name="unit" defaultValue={editingTest?.unit} placeholder="Ex: ppm" required /></div>
                                <div className="grid gap-2"><Label>Observação Padrão</Label><Input name="observation" defaultValue={editingTest?.observation} /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2"><Label>Mínimo</Label><Input name="min_value" defaultValue={editingTest?.min_value} type="number" step="0.01" required /></div>
                                <div className="grid gap-2"><Label>Máximo</Label><Input name="max_value" defaultValue={editingTest?.max_value} type="number" step="0.01" required /></div>
                                <div className="grid gap-2"><Label>Tolerância (%)</Label><Input name="tolerance_percent" defaultValue={editingTest?.tolerance_percent || 10} type="number" step="1" required /></div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">{editingTest ? 'Salvar Alterações' : 'Criar Teste'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Faixa Ideal</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tests?.map(test => (
                                <TableRow key={test.id}>
                                    <TableCell className="font-medium">{test.name}</TableCell>
                                    <TableCell>{test.unit}</TableCell>
                                    <TableCell><span className="font-mono bg-slate-100 px-2 py-1 rounded">{test.min_value} - {test.max_value}</span></TableCell>
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
                                </TableRow>
                            ))}
                            {tests?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-4">Nenhum teste cadastrado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}