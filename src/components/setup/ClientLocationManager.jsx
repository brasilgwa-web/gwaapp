import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client, ClientContact } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronRight, Building, Pencil, ArrowUpDown, GripVertical, User, Users, Search } from "lucide-react";
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

    const openNewClient = () => {
        setEditingClient(null);
        setIsClientDialogOpen(true);
    };

    const openEditClient = (e, client) => {
        e.stopPropagation();
        setEditingClient(client);
        setIsClientDialogOpen(true);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(100);

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        if (!clients) return [];

        let result = [...clients];

        // 1. Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(c =>
                (c.name && c.name.toLowerCase().includes(lower)) ||
                (c.email && c.email.toLowerCase().includes(lower)) ||
                (c.city_state && c.city_state.toLowerCase().includes(lower))
            );
        }

        // 2. Sort
        if (sortOrder === 'asc') {
            result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
        } else if (sortOrder === 'desc') {
            result.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt-BR'));
        } else {
            // Manual: sort by display_order if exists
            result.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        }

        return result;
    }, [clients, sortOrder, searchTerm]);

    const visibleClients = useMemo(() => {
        return filteredClients.slice(0, visibleCount);
    }, [filteredClients, visibleCount]);

    // Reset visible count when search changes
    React.useEffect(() => {
        setVisibleCount(100);
    }, [searchTerm]);

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
            const oldIndex = filteredClients.findIndex((item) => item.id === active.id);
            const newIndex = filteredClients.findIndex((item) => item.id === over.id);

            const newOrderedList = arrayMove(filteredClients, oldIndex, newIndex);

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
                    <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar clientes..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
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
                    <ClientDialog
                        open={isClientDialogOpen}
                        onOpenChange={setIsClientDialogOpen}
                        client={editingClient}
                        onClose={() => { setIsClientDialogOpen(false); setEditingClient(null); }}
                        onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['clients'] }); }}
                    />
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
                            items={visibleClients.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                            disabled={sortOrder !== 'manual' || searchTerm !== ''}
                        >
                            {visibleClients.map((client, index) => (
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
                {visibleClients.length < filteredClients.length && (
                    <div className="flex justify-center mt-4">
                        <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 10)}>
                            Carregar mais
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Sub-components ---

function ClientDialog({ open, onOpenChange, client, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const { executeWithFeedback } = useOperationFeedback();

    // Form State
    const [extraContacts, setExtraContacts] = useState([]);
    const [deletedContactIds, setDeletedContactIds] = useState([]);

    // Fetch existing contacts when editing
    const { data: existingContacts, isLoading: isLoadingContacts } = useQuery({
        queryKey: ['client_contacts', client?.id],
        queryFn: () => ClientContact.filter({ client_id: client.id }),
        enabled: !!client?.id
    });

    // Sync state when data loads
    React.useEffect(() => {
        if (open) {
            if (client && existingContacts) {
                setExtraContacts(existingContacts);
            } else if (!client) {
                setExtraContacts([]); // New client
            }
            setDeletedContactIds([]);
        }
    }, [open, client, existingContacts]);

    const handleAddContact = () => {
        setExtraContacts([...extraContacts, { id: `temp-${Date.now()}`, name: '', email: '', phone: '', receive_email: true }]);
    };

    const handleRemoveContact = (index, contact) => {
        const newContacts = [...extraContacts];
        newContacts.splice(index, 1);
        setExtraContacts(newContacts);

        if (contact.id && !contact.id.startsWith('temp-')) {
            setDeletedContactIds([...deletedContactIds, contact.id]);
        }
    };

    const handleContactChange = (index, field, value) => {
        const newContacts = [...extraContacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setExtraContacts(newContacts);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const clientData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            contact_name: formData.get('contact_name'),
            client_code: formData.get('client_code'),
            address: formData.get('address'),
            city_state: formData.get('city_state'),
            google_drive_folder_id: formData.get('google_drive_folder_id')
        };

        try {
            let savedClient;

            // 1. Save Client
            if (client) {
                const res = await executeWithFeedback({
                    operation: () => Client.update(client.id, clientData),
                    loadingMessage: 'Salvando cliente...',
                    successMessage: 'Cliente salvo!',
                    errorMessage: 'Erro ao salvar cliente',
                });
                if (!res.success) return;
                savedClient = res.data;
            } else {
                const res = await executeWithFeedback({
                    operation: () => Client.create(clientData),
                    loadingMessage: 'Criando cliente...',
                    successMessage: 'Cliente criado!',
                    errorMessage: 'Erro ao criar cliente',
                });
                if (!res.success) return;
                savedClient = res.data;
            }

            // 2. Process Contacts
            // Deletes
            if (deletedContactIds.length > 0) {
                for (const id of deletedContactIds) {
                    await ClientContact.delete(id);
                }
            }

            // Upserts
            for (const contact of extraContacts) {
                const contactPayload = {
                    client_id: savedClient.id,
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone
                };

                if (contact.id && !contact.id.startsWith('temp-')) {
                    // Update
                    await ClientContact.update(contact.id, contactPayload);
                } else {
                    // Create
                    await ClientContact.create(contactPayload);
                }
            }

            onSuccess();
            onClose();

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Dados da Empresa */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Building className="w-4 h-4" /> Dados da Empresa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Empresa *</Label><Input name="name" defaultValue={client?.name} required /></div>
                            <div className="space-y-2"><Label>Código do Cliente</Label><Input name="client_code" defaultValue={client?.client_code} placeholder="Ex: C001" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Endereço</Label><Input name="address" defaultValue={client?.address} /></div>
                            <div className="space-y-2"><Label>Cidade/UF</Label><Input name="city_state" defaultValue={client?.city_state} /></div>
                        </div>
                        <div className="space-y-2"><Label>ID Pasta Drive</Label><Input name="google_drive_folder_id" defaultValue={client?.google_drive_folder_id} placeholder="ID da pasta do Google Drive" /></div>
                    </div>

                    {/* Contato Principal */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><User className="w-4 h-4" /> Contato Principal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Nome do Contato</Label><Input name="contact_name" defaultValue={client?.contact_name} /></div>
                            <div className="space-y-2"><Label>Email (Relatórios)</Label><Input name="email" type="email" defaultValue={client?.email} required /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Celular</Label><Input name="phone" defaultValue={client?.phone} placeholder="(11) 99999-9999" /></div>
                        </div>
                    </div>

                    {/* Contatos Adicionais */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4" /> Contatos Adicionais</h3>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddContact}><Plus className="w-3 h-3 mr-2" /> Adicionar Contato</Button>
                        </div>

                        {isLoadingContacts && <p className="text-sm text-slate-500">Carregando contatos...</p>}

                        <div className="space-y-3">
                            {extraContacts.map((contact, index) => (
                                <div key={contact.id} className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 p-3 rounded-lg border">
                                    <div className="flex-1 space-y-1 w-full">
                                        <Label className="text-xs">Nome</Label>
                                        <Input
                                            value={contact.name}
                                            onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                                            placeholder="Nome do contato"
                                            required
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1 w-full">
                                        <Label className="text-xs">Email</Label>
                                        <Input
                                            value={contact.email}
                                            onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                            placeholder="email@exemplo.com"
                                            type="email"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1 w-full">
                                        <Label className="text-xs">Celular</Label>
                                        <Input
                                            value={contact.phone}
                                            onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center justify-end pb-2 space-y-1">
                                        <Label className="text-xs text-center w-full" title="Receber cópia do relatório">Email?</Label>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 accent-blue-600 cursor-pointer"
                                            checked={contact.receive_email !== false} // Default to true if undefined
                                            onChange={(e) => handleContactChange(index, 'receive_email', e.target.checked)}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveContact(index, contact)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {extraContacts.length === 0 && (
                                <p className="text-sm text-slate-400 italic text-center py-2">Nenhum contato adicional.</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter><Button type="submit">Salvar Tudo</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
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