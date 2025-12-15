import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Beaker } from "lucide-react";

export default function ProductCatalog() {
    const queryClient = useQueryClient();
    const [editingProduct, setEditingProduct] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
            unit: formData.get('unit'),
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

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Catálogo de Produtos Químicos</CardTitle>
                    <CardDescription>Gerencie os produtos utilizados nas dosagens (ex: Anti-incrustante, Biocida)</CardDescription>
                </div>
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
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products?.map(prod => (
                                <TableRow key={prod.id}>
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
                            {products?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-4">Nenhum produto cadastrado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
