import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronRight, Building, Pencil, ArrowUpDown, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useOperationFeedback } from "@/context/OperationFeedbackContext";

// V1.2 Managers
import ClientInventoryManager from "./ClientInventoryManager";
import ClientEquipmentManager from "./ClientEquipmentManager";

function SortableClientRow({ client, sortOrder, openEditClient, removeClient, setSelectedClient, setView, index }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: client.id });

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
            className={`flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-all group gap-4 w-full max-w-full overflow-hidden ${isDragging ? 'opacity-50 ring-2 ring-blue-500/20' : ''}`}
            onClick={() => { setSelectedClient(client); setView('details'); }}
        >
            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 w-full">
                {sortOrder === 'manual' && (
                    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 -ml-2"
                            style={{ touchAction: 'none' }} // Critical for mobile functionality
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="w-5 h-5" />
                        </button>
                    </div>
                )}
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
    );
}


export default function ClientLocationManager() {
    const [view, setView] = useState('clients'); // clients, details
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'asc', 'desc'

    // Client CRUD
    const queryClient = useQueryClient();
    const { executeWithFeedback } = useOperationFeedback();
    const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => Client.list() });

    const createClient = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: () => Client.create(data),
                loadingMessage: 'Criando cliente...',
                successMessage: 'Cliente criado com sucesso!',
                errorMessage: 'Erro ao criar cliente.',
                logCategory: 'crud',
                logDetails: { action: 'create', entity: 'client', data },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsClientDialogOpen(false);
        }
    });

    const updateClient = useMutation({
        mutationFn: async (data) => {
            const result = await executeWithFeedback({
                operation: () => Client.update(data.id, data.fields),
                loadingMessage: 'Salvando alterações...',
                successMessage: 'Cliente atualizado com sucesso!',
                errorMessage: 'Erro ao atualizar cliente.',
                logCategory: 'crud',
                logDetails: { action: 'update', entity: 'client', id: data.id, fields: data.fields },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsClientDialogOpen(false);
            setEditingClient(null);
        }
    });

    const removeClient = useMutation({
        mutationFn: async (id) => {
            const result = await executeWithFeedback({
                operation: () => Client.delete(id),
                loadingMessage: 'Excluindo cliente...',
                successMessage: 'Cliente excluído com sucesso!',
                errorMessage: 'Erro ao excluir cliente.',
                logCategory: 'crud',
                logDetails: { action: 'delete', entity: 'client', id },
            });
            if (!result.success) throw result.error;
            return result.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
    });

    const handleClientSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            contact_name: formData.get('contact_name'),
            client_code: formData.get('client_code'),
            address: formData.get('address'),
            city_state: formData.get('city_state'),
            google_drive_folder_id: formData.get('google_drive_folder_id')
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

    // Sorted clients based on sortOrder
    const sortedClients = useMemo(() => {
        if (!clients) return [];

        let sorted = [...clients];

        if (sortOrder === 'asc') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists
            sorted.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return sorted;
    }, [clients, sortOrder]);

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
            const oldIndex = sortedClients.findIndex((item) => item.id === active.id);
            const newIndex = sortedClients.findIndex((item) => item.id === over.id);

            const newOrderedList = arrayMove(sortedClients, oldIndex, newIndex);

            await Promise.all(newOrderedList.map((item, index) =>
                Client.update(item.id, { display_order: index })
            ));

            queryClient.invalidateQueries({ queryKey: ['clients'] });
        }
    };

    // --- V1.2 Detail View ---
    if (view === 'details' && selectedClient) {
        return (
            <div className="space-y-6">
                {/* Discharges/Drainages Section */}
                <ClientDischargesSection
                    client={selectedClient}
                    onBack={() => { setView('clients'); setSelectedClient(null); }}
                    onUpdate={(updatedClient) => {
                        setSelectedClient(updatedClient);
                        queryClient.invalidateQueries({ queryKey: ['clients'] });
                    }}
                />

                {/* Inventory Section (Full Width) */}
                <ClientInventoryManager client={selectedClient} />

                {/* Equipments Section (Full Width) */}
                <ClientEquipmentManager client={selectedClient} />
            </div>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Gerenciar Clientes</CardTitle>
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
                                    <div className="space-y-2"><Label>Cel.</Label><Input name="phone" defaultValue={editingClient?.phone} placeholder="(11) 99999-9999" /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Endereço</Label><Input name="address" defaultValue={editingClient?.address} /></div>
                                    <div className="space-y-2"><Label>Cidade/UF</Label><Input name="city_state" defaultValue={editingClient?.city_state} /></div>
                                </div>

                                <div className="space-y-2"><Label>ID Pasta Drive</Label><Input name="google_drive_folder_id" defaultValue={editingClient?.google_drive_folder_id} placeholder="ID da pasta do Google Drive" /></div>

                                <DialogFooter><Button type="submit">{editingClient ? 'Salvar' : 'Criar'}</Button></DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 overflow-hidden">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedClients.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                            disabled={sortOrder !== 'manual'}
                        >
                            {sortedClients.map((client, index) => (
                                <SortableClientRow
                                    key={client.id}
                                    client={client}
                                    sortOrder={sortOrder}
                                    openEditClient={openEditClient}
                                    removeClient={removeClient}
                                    setSelectedClient={setSelectedClient}
                                    setView={setView}
                                    index={index}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </CardContent>
        </Card>
    );
}

// Component for editing Discharges/Drainages field
function ClientDischargesSection({ client, onBack, onUpdate }) {
    const [text, setText] = React.useState(client.default_discharges_drainages || '');
    const [isSaving, setIsSaving] = React.useState(false);
    const [hasChanges, setHasChanges] = React.useState(false);

    const handleTextChange = (e) => {
        setText(e.target.value);
        setHasChanges(e.target.value !== (client.default_discharges_drainages || ''));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await Client.update(client.id, { default_discharges_drainages: text });
            setHasChanges(false);
            onUpdate({ ...client, default_discharges_drainages: text });
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1 cursor-pointer hover:text-blue-600" onClick={onBack}>
                        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar para Clientes
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold">Descargas e Drenagens (Padrão)</Label>
                    <p className="text-sm text-slate-500">
                        Este texto será inserido automaticamente nos relatórios deste cliente.
                    </p>
                    <textarea
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px]"
                        value={text}
                        onChange={handleTextChange}
                        placeholder="Texto padrão para aparecer no relatório..."
                    />
                </div>
                {hasChanges && (
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}