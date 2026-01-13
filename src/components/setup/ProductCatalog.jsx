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
import { Plus, Trash2, Pencil, Beaker, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function ProductCatalog() {
    const queryClient = useQueryClient();
    const [editingProduct, setEditingProduct] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'asc', 'desc'

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: () => Product.list()
    });

    const create = useMutation({
        mutationFn: (data) => Product.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsDialogOpen(false);
        },
    });

    const update = useMutation({
        mutationFn: (data) => Product.update(data.id, data.fields),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setEditingProduct(null);
            setIsDialogOpen(false);
        },
    });

    const remove = useMutation({
        mutationFn: (id) => Product.delete(id),
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

    // Move product up/down for manual ordering
    const moveProduct = async (product, direction) => {
        const currentIndex = sortedProducts.findIndex(p => p.id === product.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= sortedProducts.length) return;

        const otherProduct = sortedProducts[newIndex];

        // Swap display_order values
        const currentOrder = product.display_order ?? currentIndex;
        const otherOrder = otherProduct.display_order ?? newIndex;

        await Product.update(product.id, { display_order: otherOrder });
        await Product.update(otherProduct.id, { display_order: currentOrder });

        queryClient.invalidateQueries({ queryKey: ['products'] });
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {sortOrder === 'manual' && <TableHead className="w-16"></TableHead>}
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedProducts.map((prod, index) => (
                                <TableRow key={prod.id}>
                                    {sortOrder === 'manual' && (
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-slate-400 hover:text-slate-600"
                                                    onClick={() => moveProduct(prod, 'up')}
                                                    disabled={index === 0}
                                                >
                                                    <ArrowUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-slate-400 hover:text-slate-600"
                                                    onClick={() => moveProduct(prod, 'down')}
                                                    disabled={index === sortedProducts.length - 1}
                                                >
                                                    <ArrowDown className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
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
                                </TableRow>
                            ))}
                            {sortedProducts.length === 0 && <TableRow><TableCell colSpan={sortOrder === 'manual' ? 5 : 4} className="text-center text-slate-500 py-4">Nenhum produto cadastrado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
