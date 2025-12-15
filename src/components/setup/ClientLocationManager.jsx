import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client, Location, Equipment, LocationEquipment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight, Building, MapPin, ArrowLeft, Pencil } from "lucide-react";

export default function ClientLocationManager() {
    const [view, setView] = useState('clients'); // clients, locations
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
            // V1.1 New Field
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

    if (view === 'locations' && selectedClient) {
        return <LocationManager client={selectedClient} onBack={() => { setView('clients'); setSelectedClient(null); }} />;
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
                        <div key={client.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md cursor-pointer transition-all group gap-4 w-full max-w-full overflow-hidden" onClick={() => { setSelectedClient(client); setView('locations'); }}>
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

function LocationManager({ client, onBack }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingLoc, setEditingLoc] = useState(null);
    const [selectedEqs, setSelectedEqs] = useState([]);

    // Queries
    const { data: locations } = useQuery({
        queryKey: ['locations', client.id],
        queryFn: () => Location.list().then(res => res.filter(l => l.client_id === client.id))
    });
    const { data: catalogEquipments } = useQuery({
        queryKey: ['equipments'],
        queryFn: () => Equipment.list()
    });

    // Mutations
    const createLocation = useMutation({
        mutationFn: async (data) => {
            const loc = await Location.create(data.location);
            if (data.equipmentIds.length > 0) {
                await Promise.all(data.equipmentIds.map(eqId =>
                    LocationEquipment.create({
                        location_id: loc.id,
                        equipment_id: eqId
                    })
                ));
            }
            return loc;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations', client.id] });
            setIsOpen(false);
            setSelectedEqs([]);
            setEditingLoc(null);
        }
    });

    const updateLocation = useMutation({
        mutationFn: async (data) => {
            await Location.update(data.id, data.location);

            // Update equipment links
            const existingLinks = await LocationEquipment.list().then(res => res.filter(r => r.location_id === data.id));
            const existingEqIds = existingLinks.map(r => r.equipment_id);

            const toRemove = existingLinks.filter(r => !data.equipmentIds.includes(r.equipment_id));
            const toAdd = data.equipmentIds.filter(eid => !existingEqIds.includes(eid));

            await Promise.all([
                ...toRemove.map(r => LocationEquipment.delete(r.id)),
                ...toAdd.map(eid => LocationEquipment.create({ location_id: data.id, equipment_id: eid }))
            ]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations', client.id] });
            setIsOpen(false);
            setSelectedEqs([]);
            setEditingLoc(null);
        }
    });

    const remove = useMutation({
        mutationFn: (id) => Location.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations', client.id] })
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const locData = {
            name: formData.get('name'),
            description: formData.get('description'),
            client_id: client.id
        };

        if (editingLoc) {
            updateLocation.mutate({
                id: editingLoc.id,
                location: locData,
                equipmentIds: selectedEqs
            });
        } else {
            createLocation.mutate({
                location: locData,
                equipmentIds: selectedEqs
            });
        }
    };

    const handleOpenEdit = async (loc) => {
        setEditingLoc(loc);
        // Fetch linked equipments
        const links = await LocationEquipment.list().then(res => res.filter(r => r.location_id === loc.id));
        setSelectedEqs(links.map(r => r.equipment_id));
        setIsOpen(true);
    };

    const handleOpenNew = () => {
        setEditingLoc(null);
        setSelectedEqs([]);
        setIsOpen(true);
    };

    const toggleEq = (id) => {
        setSelectedEqs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1 cursor-pointer hover:text-blue-600" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
                    </div>
                    <CardTitle>Locais de {client.name}</CardTitle>
                    <CardDescription>Cadastre os locais e vincule os equipamentos existentes</CardDescription>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild><Button onClick={handleOpenNew} className="w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Novo Local</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>{editingLoc ? 'Editar Local' : 'Novo Local'}</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4">
                                <div className="space-y-2"><Label>Nome do Local / Área</Label><Input name="name" defaultValue={editingLoc?.name} placeholder="Ex: Sala de Caldeiras" required /></div>
                                <div className="space-y-2"><Label>Descrição</Label><Input name="description" defaultValue={editingLoc?.description} /></div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Equipamentos neste Local</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-4 bg-slate-50 max-h-60 overflow-y-auto">
                                    {catalogEquipments?.map(eq => (
                                        <div key={eq.id} className="flex items-center space-x-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200">
                                            <Checkbox
                                                id={`eq-${eq.id}`}
                                                checked={selectedEqs.includes(eq.id)}
                                                onCheckedChange={() => toggleEq(eq.id)}
                                            />
                                            <label htmlFor={`eq-${eq.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                                                {eq.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <DialogFooter><Button type="submit">{editingLoc ? 'Salvar Alterações' : 'Salvar Local'}</Button></DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 overflow-hidden">
                    {locations?.map(loc => (
                        <div key={loc.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border rounded-lg gap-4 w-full max-w-full overflow-hidden">
                            <div className="flex items-start gap-3 overflow-hidden flex-1 min-w-0 w-full">
                                <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold truncate w-full block">{loc.name}</h3>
                                    <p className="text-sm text-slate-500 truncate w-full block">{loc.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600" onClick={() => handleOpenEdit(loc)}>
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => remove.mutate(loc.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {locations?.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum local cadastrado.</p>}
                </div>
            </CardContent>
        </Card>
    );
}