import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClientProduct, Product } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Package, AlertTriangle, ArrowLeft } from "lucide-react";

export default function ClientInventoryManager({ client, onBack }) {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Queries
    const { data: inventory } = useQuery({
        queryKey: ['clientInventory', client.id],
        queryFn: () => ClientProduct.filter({ client_id: client.id })
    });

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: () => Product.list()
    });

    // Mutations
    const saveStock = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return ClientProduct.update(data.id, data);
            } else {
                return ClientProduct.create({ ...data, client_id: client.id });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientInventory', client.id] });
            setIsDialogOpen(false);
            setEditingItem(null);
        }
    });

    const removeStock = useMutation({
        mutationFn: (id) => ClientProduct.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientInventory', client.id] })
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const data = {
            id: editingItem?.id,
            product_id: formData.get('product_id'),
            current_stock: parseFloat(formData.get('current_stock')),
            min_stock: parseFloat(formData.get('min_stock'))
        };

        // Validate duplicates if creating new
        if (!data.id) {
            const exists = inventory?.find(i => i.product_id === data.product_id);
            if (exists) {
                alert("Este produto já está cadastrado no estoque deste cliente.");
                return;
            }
        }

        saveStock.mutate(data);
    };

    const openNew = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    // Helper to get product name
    const getProductName = (id) => products?.find(p => p.id === id)?.name || 'Produto Desconhecido';
    const getProductUnit = (id) => products?.find(p => p.id === id)?.unit || '';

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1 cursor-pointer hover:text-blue-600" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
                    </div>
                    <CardTitle>Estoque do Cliente: {client.name}</CardTitle>
                    <CardDescription>Gerencie o estoque atual e o estoque mínimo para alertas.</CardDescription>
                </div>
                <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Adicionar Produto</Button>
            </CardHeader>

            <CardContent>
                <div className="grid gap-3">
                    {inventory?.map(item => {
                        const isLowStock = item.current_stock <= item.min_stock;
                        return (
                            <div key={item.id} className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-all ${isLowStock ? 'border-amber-200 bg-amber-50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isLowStock ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{getProductName(item.product_id)}</h3>
                                        <div className="flex gap-4 text-sm mt-1">
                                            <span className={`${isLowStock ? 'text-amber-700 font-bold' : 'text-slate-600'}`}>
                                                Atual: {item.current_stock} {getProductUnit(item.product_id)}
                                            </span>
                                            <span className="text-slate-400">|</span>
                                            <span className="text-slate-500">
                                                Mínimo: {item.min_stock} {getProductUnit(item.product_id)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isLowStock && <AlertTriangle className="w-5 h-5 text-amber-500 mr-2 animate-pulse" />}
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                        <Pencil className="w-4 h-4 text-slate-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => removeStock.mutate(item.id)}>
                                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {!inventory?.length && <p className="text-center text-slate-500 py-8">Nenhum produto em estoque.</p>}
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Editar Estoque' : 'Adicionar Produto ao Estoque'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Produto</Label>
                                <Select name="product_id" disabled={!!editingItem} defaultValue={editingItem?.product_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Estoque Atual</Label>
                                    <Input name="current_stock" type="number" step="0.01" defaultValue={editingItem?.current_stock} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estoque Mínimo (Alerta)</Label>
                                    <Input name="min_stock" type="number" step="0.01" defaultValue={editingItem?.min_stock} required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Salvar</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
