import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sample, LocationEquipment, Equipment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Edit2, Trash2, Beaker, Thermometer, Droplets, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function SampleTab({ visit, readOnly }) {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSample, setEditingSample] = useState(null);

    // Fetch samples for this visit
    const { data: samples, isLoading } = useQuery({
        queryKey: ['samples', visit.id],
        queryFn: () => Sample.filter({ visit_id: visit.id }),
        enabled: !!visit?.id
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => Sample.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['samples', visit.id] });
        }
    });

    const handleDelete = (id) => {
        if (confirm('Tem certeza que deseja excluir esta amostra? Esta ação não pode ser desfeita.')) {
            deleteMutation.mutate(id);
        }
    };

    const openEdit = (sample) => {
        setEditingSample(sample);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingSample(null);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div>
                    <h3 className="font-bold text-blue-900 flex items-center gap-2">
                        <Beaker className="w-5 h-5" />
                        Cadeia de Custódia (Coleta em Campo)
                    </h3>
                    <p className="text-sm text-blue-800 mt-1">Registre as amostras coletadas nesta visita. Estes dados serão enviados diretamente para a equipe de laboratório.</p>
                </div>
                {!readOnly && (
                    <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Coletar Amostra
                    </Button>
                )}
            </div>

            {samples?.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                    <p className="text-slate-500">Nenhuma amostra registrada nesta visita.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {samples?.map((sample) => (
                        <Card key={sample.id} className="border-l-4 border-l-blue-500 overflow-hidden relative group">
                            <CardHeader className="pb-2 flex flex-row items-start justify-between bg-slate-50/50">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {sample.equipment || 'Ponto não especificado'}
                                    </CardTitle>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">
                                        ID: {sample.id.split('-')[0].toUpperCase()}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!readOnly && sample.status === 'coletado' && (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(sample)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(sample.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 text-sm grid grid-cols-2 gap-y-3">
                                <div>
                                    <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1"><Droplets className="w-3 h-3"/> Matriz</span>
                                    <span className="font-medium">{sample.matrix || 'N/I'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1"><Thermometer className="w-3 h-3"/> Temperatura</span>
                                    <span className="font-medium">{sample.temperature ? `${sample.temperature} ºC` : 'N/I'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-xs block mb-1">Data/Hora da Coleta</span>
                                    <span className="font-medium">{sample.collected_at ? format(new Date(sample.collected_at), 'dd/MM/yyyy HH:mm') : 'N/I'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-xs block mb-1">Status</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                        sample.status === 'recebido' || sample.status === 'em_analise' || sample.status === 'concluido' 
                                        ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {sample.status === 'coletado' ? 'Aguardando Lab' : 'Recebido Lab'}
                                    </span>
                                </div>
                                <div className="col-span-2 border-t border-slate-100 pt-3 mt-1 flex items-center justify-between">
                                    <div>
                                        <span className="text-slate-400 text-xs block">Assinado por:</span>
                                        <span className="text-slate-700 font-mono text-xs flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-500"/>
                                            {sample.collection_signature_name || 'Assinatura Pendente'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingSample ? 'Editar Amostra' : 'Coletar Nova Amostra'}</DialogTitle>
                        <DialogDescription>
                            Preencha os dados da Cadeia de Custódia exigidos no momento da coleta.
                        </DialogDescription>
                    </DialogHeader>
                    <SampleForm 
                        visit={visit} 
                        initialData={editingSample} 
                        onClose={() => setIsModalOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SampleForm({ visit, initialData, onClose }) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Fetch equipments linked to this location to show as options
    const { data: locationEquipments } = useQuery({
        queryKey: ['locationEquipments', visit.location_id],
        queryFn: async () => {
            if (!visit.location_id) return [];
            const les = await LocationEquipment.filter({ location_id: visit.location_id });
            const eqs = await Equipment.list();
            return les.map(le => {
                const eq = eqs.find(e => e.id === le.equipment_id);
                return { ...le, equipment_name: eq?.name || 'Equipamento Desconhecido' };
            });
        },
        enabled: !!visit.location_id
    });

    const [formData, setFormData] = useState({
        equipment: initialData?.equipment || '',
        sample_type: initialData?.sample_type || 'Pontual',
        matrix: initialData?.matrix || 'Água Industrial',
        visual_characteristics: initialData?.visual_characteristics || 'Límpida sem resíduos',
        temperature: initialData?.temperature || '',
        rain_occurrence: initialData?.rain_occurrence || false,
        notes: initialData?.notes || '',
        collection_signature_name: initialData?.collection_signature_name || user?.email || '',
        collected_at: initialData?.collected_at ? initialData.collected_at.slice(0, 16) : new Date().toISOString().slice(0, 16)
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                ...data,
                client_id: visit.client_id,
                location_id: visit.location_id,
                visit_id: visit.id,
                collected_by: user.id,
                status: 'coletado'
            };

            // Format timestamp for postgres
            if (payload.collected_at) {
                payload.collected_at = new Date(payload.collected_at).toISOString();
            }

            if (payload.temperature === '') {
                payload.temperature = null;
            }

            if (initialData?.id) {
                return await Sample.update(initialData.id, payload);
            } else {
                // Generate a sample_code (e.g., YYMM-XXXX)
                const datePart = format(new Date(), 'yyMM');
                const randomPart = Math.floor(1000 + Math.random() * 9000);
                payload.sample_code = `${datePart}-${randomPart}`;
                return await Sample.create(payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['samples', visit.id] });
            onClose();
        },
        onError: (err) => {
            console.error(err);
            alert("Erro ao salvar a amostra.");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        saveMutation.mutate(formData, { onSettled: () => setIsLoading(false) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Equipamento/Ponto de Coleta</label>
                {locationEquipments && locationEquipments.length > 0 ? (
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.equipment}
                        onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                        required
                    >
                        <option value="">Selecione o ponto...</option>
                        {locationEquipments.map(le => (
                            <option key={le.id} value={le.equipment_name}>{le.equipment_name}</option>
                        ))}
                        <option value="Outro Ponto (Especificar nas observações)">Outro Ponto (Especificar nas obs)</option>
                    </select>
                ) : (
                    <Input 
                        placeholder="Nome do equipamento ou ponto" 
                        value={formData.equipment} 
                        onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                        required
                    />
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Matriz</label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.matrix}
                        onChange={(e) => setFormData({...formData, matrix: e.target.value})}
                    >
                        <option value="Água Industrial">Água Industrial</option>
                        <option value="Água Bruta">Água Bruta</option>
                        <option value="Água Tratada">Água Tratada</option>
                        <option value="Efluente">Efluente</option>
                        <option value="Outra">Outra</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.sample_type}
                        onChange={(e) => setFormData({...formData, sample_type: e.target.value})}
                    >
                        <option value="Pontual">Pontual</option>
                        <option value="Composta">Composta</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Data/Hora da Coleta</label>
                    <Input 
                        type="datetime-local" 
                        value={formData.collected_at}
                        onChange={(e) => setFormData({...formData, collected_at: e.target.value})}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Temperatura (ºC)</label>
                    <Input 
                        type="number" 
                        step="0.1"
                        placeholder="Ex: 25.5"
                        value={formData.temperature}
                        onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Características Visuais</label>
                <Input 
                    placeholder="Ex: Límpida sem resíduos"
                    value={formData.visual_characteristics}
                    onChange={(e) => setFormData({...formData, visual_characteristics: e.target.value})}
                />
            </div>

            <div className="flex items-center gap-2 pt-2">
                <input 
                    type="checkbox" 
                    id="rain_occurrence"
                    className="w-4 h-4"
                    checked={formData.rain_occurrence}
                    onChange={(e) => setFormData({...formData, rain_occurrence: e.target.checked})}
                />
                <label htmlFor="rain_occurrence" className="text-sm">Ocorrência de Chuvas nas últimas 24h</label>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Assinatura do Coletor</label>
                <Input 
                    placeholder="Seu nome para assinatura digital"
                    value={formData.collection_signature_name}
                    onChange={(e) => setFormData({...formData, collection_signature_name: e.target.value})}
                    required
                />
                <p className="text-[10px] text-slate-500">Ao salvar, você atesta a veracidade das condições registradas.</p>
            </div>

            <div className="flex justify-end pt-4 gap-2 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Assinar e Salvar
                </Button>
            </div>
        </form>
    );
}
