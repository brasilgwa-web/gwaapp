import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ObservationTemplate } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, FileText } from "lucide-react";

export default function ObservationTemplateManager() {
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Query
    const { data: templates, isLoading } = useQuery({
        queryKey: ['observationTemplates'],
        queryFn: () => ObservationTemplate.list()
    });

    // Mutations
    const create = useMutation({
        mutationFn: (data) => ObservationTemplate.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['observationTemplates'] });
            setIsDialogOpen(false);
        }
    });

    const update = useMutation({
        mutationFn: (data) => ObservationTemplate.update(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['observationTemplates'] });
            setIsDialogOpen(false);
            setEditingItem(null);
        }
    });

    const remove = useMutation({
        mutationFn: (id) => ObservationTemplate.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['observationTemplates'] })
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            content: formData.get('content'),
        };

        if (editingItem) {
            update.mutate({ ...data, id: editingItem.id });
        } else {
            create.mutate(data);
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Modelos de Observações</CardTitle>
                    <CardDescription>Crie textos padrões para usar nas observações gerais do relatório.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Modelo</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Título</Label>
                                <Input
                                    name="title"
                                    defaultValue={editingItem?.title}
                                    placeholder="Ex: Caldeira - Condições Normais"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Texto Padrão</Label>
                                <Textarea
                                    name="content"
                                    defaultValue={editingItem?.content}
                                    placeholder="Digite o texto que será inserido no relatório..."
                                    rows={6}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">{editingItem ? 'Salvar' : 'Criar'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2">
                    {templates?.map(item => (
                        <div key={item.id} className="flex items-start justify-between p-4 bg-white border rounded-lg hover:border-slate-300 transition-colors">
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-slate-500 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                                    <p className="text-sm text-slate-500 whitespace-pre-wrap line-clamp-2">{item.content}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => openEdit(item)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => remove.mutate(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {!isLoading && templates?.length === 0 && (
                        <p className="text-center text-slate-500 py-8">Nenhum modelo cadastrado.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
