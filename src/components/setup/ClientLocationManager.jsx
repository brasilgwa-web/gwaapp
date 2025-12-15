import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight, Building, Pencil } from "lucide-react";

// V1.2 Managers
import ClientInventoryManager from "./ClientInventoryManager";
import ClientEquipmentManager from "./ClientEquipmentManager";

export default function ClientLocationManager() {
    const [view, setView] = useState('clients'); // clients, details
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Client CRUD
    const queryClient = useQueryClient();
    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => Client.list() });

    const createClient = useMutation({
        mutationFn: (data) => Client.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsClientDialogOpen(false);
        }
    });

    const updateClient = useMutation({
        mutationFn: (data) => Client.update(data.id, data.fields),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsClientDialogOpen(false);
            setEditingClient(null);
        }
    });

    const removeClient = useMutation({
        mutationFn: (id) => Client.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
    });

    const handleClientSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            contact_name: formData.get('contact_name'),
            client_code: formData.get('client_code'),
            address: formData.get('address'),
            city_state: formData.get('city_state'),
            google_drive_folder_id: formData.get('google_drive_folder_id'),
            default_discharges_drainages: formData.get('default_discharges_drainages')
        };

        if (editingClient) {
            updateClient.mutate({ id: editingClient.id, fields: data });
        } else {
            createClient.mutate(data);
        }
    };

    const openNewClient = () => {
        setEditingClient(null);
        setIsClientDialogOpen(true);
    };

    const openEditClient = (e, client) => {
        e.stopPropagation();
        setEditingClient(client);
        setIsClientDialogOpen(true);
    };

    // --- V1.2 Detail View ---
    if (view === 'details' && selectedClient) {
        return (
            <div className="space-y-6">
                {/* Inventory Section (Full Width) */}
                <ClientInventoryManager
                    client={selectedClient}
                    onBack={() => { setView('clients'); setSelectedClient(null); }}
                />

                {/* Equipments Section (Full Width) */}
                <ClientEquipmentManager
                    client={selectedClient}
                />
            </div>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle>Gerenciar Clientes</CardTitle>
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNewClient} className="w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Novo Cliente</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleClientSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Empresa</Label><Input name="name" defaultValue={editingClient?.name} required /></div>
                                <div className="space-y-2"><Label>Código do Cliente</Label><Input name="client_code" defaultValue={editingClient?.client_code} placeholder="Ex: C001" /></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Email (Relatórios)</Label><Input name="email" type="email" defaultValue={editingClient?.email} required /></div>
                                <div className="space-y-2"><Label>Contato</Label><Input name="contact_name" defaultValue={editingClient?.contact_name} /></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Endereço</Label><Input name="address" defaultValue={editingClient?.address} /></div>
                                <div className="space-y-2"><Label>Cidade/UF</Label><Input name="city_state" defaultValue={editingClient?.city_state} /></div>
                            </div>

                            <div className="space-y-2"><Label>ID Pasta Drive</Label><Input name="google_drive_folder_id" defaultValue={editingClient?.google_drive_folder_id} placeholder="ID da pasta do Google Drive" /></div>

                            <div className="space-y-2">
                                <Label>Descargas e Drenagens (Padrão)</Label>
                                <textarea
                                    name="default_discharges_drainages"
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                                    defaultValue={editingClient?.default_discharges_drainages}
                                    placeholder="Texto padrão para aparecer no relatório..."
                                />
                            </div>

                            <DialogFooter><Button type="submit">{editingClient ? 'Salvar' : 'Criar'}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 overflow-hidden">
                    {clients?.map(client => (
                        <div key={client.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-all group gap-4 w-full max-w-full overflow-hidden" onClick={() => { setSelectedClient(client); setView('details'); }}>
                            <div className="flex items-start gap-3 overflow-hidden flex-1 min-w-0 w-full">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0"><Building className="w-5 h-5" /></div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold truncate pr-2 w-full block">{client.name}</h3>
                                    <p className="text-sm text-slate-500 truncate w-full block">{client.email} • {client.city_state}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={(e) => openEditClient(e, client)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); removeClient.mutate(client.id); }}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}