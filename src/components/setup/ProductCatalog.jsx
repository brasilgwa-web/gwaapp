import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Beaker, ArrowUpDown } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTableRow } from '@/components/ui/sortable-table-row';
import { useOperationFeedback } from "@/context/OperationFeedbackContext";

export default function ProductCatalog() {
    const queryClient = useQueryClient();
    const { executeWithFeedback } = useOperationFeedback();
    const [editingProduct, setEditingProduct] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'asc', 'desc'

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: () => Product.list()
    });

    const create = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: () => Product.create(data),
                loadingMessage: 'Criando produto...',
                successMessage: 'Produto criado com sucesso!',
                errorMessage: 'Erro ao criar produto.',
                logCategory: 'crud',
                logDetails: { action: 'create', entity: 'product', data },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsDialogOpen(false);
        },
    });

    const update = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: () => Product.update(data.id, data.fields),
                loadingMessage: 'Salvando alterações...',
                successMessage: 'Produto atualizado com sucesso!',
                errorMessage: 'Erro ao atualizar produto.',
                logCategory: 'crud',
                logDetails: { action: 'update', entity: 'product', id: data.id, fields: data.fields },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setEditingProduct(null);
            setIsDialogOpen(false);
        },
    });

    const remove = useMutation({
        mutationFn: async (id) => {
            const result = await executeWithFeedback({
                operation: () => Product.delete(id),
                loadingMessage: 'Excluindo produto...',
                successMessage: 'Produto excluído com sucesso!',
                errorMessage: 'Erro ao excluir produto.',
                logCategory: 'crud',
                logDetails: { action: 'delete', entity: 'product', id },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            unit: formData.get('unit')
        };

        if (editingProduct) {
            update.mutate({ id: editingProduct.id, fields: data });
        } else {
            create.mutate(data);
        }
    };

    const openEdit = (prod) => {
        setEditingProduct(prod);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingProduct(null);
        setIsDialogOpen(true);
    };

    // Sorted products based on sortOrder
    const sortedProducts = useMemo(() => {
        if (!products) return [];

        let sorted = [...products];

        if (sortOrder === 'asc') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists
            sorted.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return sorted;
    }, [products, sortOrder]);

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
            const oldIndex = sortedProducts.findIndex((p) => p.id === active.id);
            const newIndex = sortedProducts.findIndex((p) => p.id === over.id);

            // Optimistic Update (optional but recommended for smooth UX)
            // For now we trust refetch, but here we update backend.

            // Re-calculate orders logic:
            // We need to update display_order for ALL items affected or swap?
            // Swap is easier but drag usually implies re-insert.
            // arrayMove gives us the new array. We should update display_order locally then push.

            const newOrderedList = arrayMove(sortedProducts, oldIndex, newIndex);

            // Update all to match new index
            await Promise.all(newOrderedList.map((item, index) =>
                Product.update(item.id, { display_order: index })
            ));

            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Catálogo de Produtos Químicos</CardTitle>
                    <CardDescription>Gerencie os produtos utilizados nas dosagens (ex: Anti-incrustante, Biocida)</CardDescription>
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
                            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo Produto</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
                            <form onSubmit={handleSubmit} className="grid gap-4">
                                <div className="grid gap-2"><Label>Nome do Produto</Label><Input name="name" defaultValue={editingProduct?.name} placeholder="Ex: Nalco 7330" required /></div>
                                <div className="grid gap-2"><Label>Unidade de Dosagem (Padrão)</Label><Input name="unit" defaultValue={editingProduct?.unit} placeholder="Ex: kg, Litros, ppm" required /></div>
                                <DialogFooter>
                                    <Button type="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead className="w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <SortableContext
                                    items={sortedProducts.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={sortOrder !== 'manual'}
                                >
                                    {sortedProducts.map((prod) => (
                                        <SortableTableRow key={prod.id} id={prod.id}>
                                            <TableCell><Beaker className="w-4 h-4 text-slate-500" /></TableCell>
                                            <TableCell className="font-medium">{prod.name}</TableCell>
                                            <TableCell>{prod.unit}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => openEdit(prod)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => remove.mutate(prod.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </SortableTableRow>
                                    ))}
                                </SortableContext>
                                {sortedProducts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-4">Nenhum produto cadastrado.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </DndContext>
                </div>
            </CardContent>
        </Card>
    );
}
