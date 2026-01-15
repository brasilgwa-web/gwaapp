import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ObservationTemplate } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, FileText, ArrowUpDown, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTemplateRow({ item, sortOrder, openEdit, remove, index }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-start justify-between p-4 bg-white border rounded-lg hover:border-slate-300 transition-colors ${isDragging ? 'opacity-50 ring-2 ring-blue-500/20' : ''}`}
        >
            <div className="flex items-start gap-3">
                {sortOrder === 'manual' && (
                    <div className="flex flex-col gap-1 mt-1">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 -ml-2"
                            style={{ touchAction: 'none' }}
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="w-5 h-5" />
                        </button>
                    </div>
                )}
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
    );
}

export default function ObservationTemplateManager() {
    const queryClient = useQueryClient();
    const [editingItem, setEditingItem] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'asc', 'desc'

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

    // Sorted templates based on sortOrder
    const sortedTemplates = useMemo(() => {
        if (!templates) return [];

        let sorted = [...templates];

        if (sortOrder === 'asc') {
            sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists
            sorted.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return sorted;
    }, [templates, sortOrder]);

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
            const oldIndex = sortedTemplates.findIndex((item) => item.id === active.id);
            const newIndex = sortedTemplates.findIndex((item) => item.id === over.id);

            const newOrderedList = arrayMove(sortedTemplates, oldIndex, newIndex);

            await Promise.all(newOrderedList.map((item, index) =>
                ObservationTemplate.update(item.id, { display_order: index })
            ));

            queryClient.invalidateQueries({ queryKey: ['observationTemplates'] });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Modelos de Observações</CardTitle>
                    <CardDescription>Crie textos padrões para usar nas observações gerais do relatório.</CardDescription>
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
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedTemplates.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                            disabled={sortOrder !== 'manual'}
                        >
                            {sortedTemplates.map((item, index) => (
                                <SortableTemplateRow
                                    key={item.id}
                                    item={item}
                                    sortOrder={sortOrder}
                                    openEdit={openEdit}
                                    remove={remove}
                                    index={index}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {!isLoading && sortedTemplates.length === 0 && (
                        <p className="text-center text-slate-500 py-8">Nenhum modelo cadastrado.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
