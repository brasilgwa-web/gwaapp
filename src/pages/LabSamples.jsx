import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sample, Client, Location } from "@/api/entities";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Beaker, CheckSquare, XCircle, Search, Droplets, Calculator, FileText } from "lucide-react";
import SampleAnalysisModal from '../components/visit/SampleAnalysisModal';
import LabReportPdf from '../components/visit/LabReportPdf';
import { pdf } from '@react-pdf/renderer';
import { SampleResult, TestDefinition } from "@/api/entities";

export default function LabSamples() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [receivingSample, setReceivingSample] = useState(null);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [analyzingSample, setAnalyzingSample] = useState(null);

    const { data: samples, isLoading } = useQuery({
        queryKey: ['lab_samples'],
        queryFn: async () => {
            const rawSamples = await Sample.list('-created_at'); // Get newest first
            const clients = await Client.list();
            const locations = await Location.list();
            
            return rawSamples.map(s => ({
                ...s,
                client: clients.find(c => c.id === s.client_id),
                location: locations.find(l => l.id === s.location_id)
            }));
        }
    });

    const receiveMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                status: 'recebido',
                receipt_integrity: data.integrity,
                receipt_notes: data.notes,
                received_at: new Date().toISOString(),
                received_by: user.id
            };
            return await Sample.update(receivingSample.id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lab_samples'] });
            setIsReceiveModalOpen(false);
            setReceivingSample(null);
        }
    });

    const openReceiveModal = (sample) => {
        setReceivingSample(sample);
        setIsReceiveModalOpen(true);
    };

    const handleGeneratePdf = async (sample) => {
        try {
            // alert('Gerando laudo, aguarde...'); // Optional loading state could be added
            const results = await SampleResult.filter({ sample_id: sample.id });
            const testDefs = await TestDefinition.list();
            
            // If sample lacks auth_key, generate and save it
            let currentSample = sample;
            if (!sample.auth_key) {
                const newKey = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
                currentSample = await Sample.update(sample.id, { auth_key: newKey });
            }

            const data = {
                sample: currentSample,
                client: currentSample.client,
                results: results,
                testDefinitions: testDefs
            };

            const blob = await pdf(<LabReportPdf data={data} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laudo_${currentSample.sample_code}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Erro ao gerar PDF.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const filteredSamples = samples?.filter(s => 
        (s.sample_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.client?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ) || [];

    const pendingReceipt = filteredSamples.filter(s => s.status === 'coletado');
    const inLab = filteredSamples.filter(s => s.status !== 'coletado');

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Beaker className="w-6 h-6 text-blue-600" />
                        Recepção de Amostras
                    </h1>
                    <p className="text-slate-500">Módulo de Laboratório - Passo 2 da Cadeia de Custódia</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input 
                        className="pl-9" 
                        placeholder="Buscar por código ou cliente..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Aguardando Recebimento */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="bg-amber-50 border-b border-amber-200 p-4">
                        <h2 className="font-bold text-amber-900 flex items-center gap-2">
                            Aguardando Recebimento
                            <span className="bg-amber-200 text-amber-900 text-xs py-0.5 px-2 rounded-full">
                                {pendingReceipt.length}
                            </span>
                        </h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-3">
                        {pendingReceipt.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">Nenhuma amostra aguardando.</p>
                        ) : pendingReceipt.map(sample => (
                            <SampleCard 
                                key={sample.id} 
                                sample={sample} 
                                action={<Button size="sm" onClick={() => openReceiveModal(sample)}>Receber no Lab</Button>}
                            />
                        ))}
                    </div>
                </div>

                {/* No Laboratório (Recebido/Em Análise) */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="bg-blue-50 border-b border-blue-200 p-4">
                        <h2 className="font-bold text-blue-900 flex items-center gap-2">
                            No Laboratório
                            <span className="bg-blue-200 text-blue-900 text-xs py-0.5 px-2 rounded-full">
                                {inLab.length}
                            </span>
                        </h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-3">
                        {inLab.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-8">Nenhuma amostra no laboratório.</p>
                        ) : inLab.map(sample => (
                            <SampleCard 
                                key={sample.id} 
                                sample={sample} 
                                action={
                                    <div className="flex items-center gap-2">
                                        <div className={`text-[10px] font-semibold px-2 py-1 rounded border ${sample.status === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {sample.status === 'recebido' ? 'Recebido' : sample.status === 'concluido' ? 'Concluído' : 'Analisado'}
                                        </div>
                                        <Button size="sm" variant="outline" className="h-7 px-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100" onClick={() => setAnalyzingSample(sample)}>
                                            <Calculator className="w-3 h-3 mr-1" /> Analisar
                                        </Button>
                                        {sample.status === 'concluido' && (
                                            <Button size="sm" className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleGeneratePdf(sample)}>
                                                <FileText className="w-3 h-3 mr-1" /> PDF
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        ))}
                    </div>
                </div>

            </div>

            {/* Modal de Recebimento */}
            <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Receber Amostra</DialogTitle>
                        <DialogDescription>
                            Atenda aos requisitos da ISO registrando a integridade da amostra recebida do campo.
                        </DialogDescription>
                    </DialogHeader>
                    {receivingSample && (
                        <ReceiveSampleForm 
                            sample={receivingSample} 
                            onSubmit={(data) => receiveMutation.mutate(data)} 
                            isLoading={receiveMutation.isPending}
                            onCancel={() => setIsReceiveModalOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <SampleAnalysisModal 
                sample={analyzingSample} 
                isOpen={!!analyzingSample} 
                onClose={() => setAnalyzingSample(null)} 
            />

        </div>
    );
}

function SampleCard({ sample, action }) {
    return (
        <div className="border border-slate-200 rounded p-4 hover:shadow-md transition bg-white">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="font-bold text-slate-800 text-sm">{sample.client?.name || 'Cliente Desconhecido'}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{sample.sample_code || 'S/ CODIGO'}</div>
                </div>
                <div>{action}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-400 mb-0.5 flex items-center gap-1"><Droplets className="w-3 h-3"/> Equipamento</div>
                    <div className="font-medium text-slate-700 truncate">{sample.equipment || '-'}</div>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                    <div className="text-slate-400 mb-0.5">Coletado em</div>
                    <div className="font-medium text-slate-700">{sample.collected_at ? format(new Date(sample.collected_at), 'dd/MM HH:mm') : '-'}</div>
                </div>
            </div>
            {sample.receipt_integrity === 'Não Conforme' && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-1.5 rounded flex items-center gap-1 border border-red-100">
                    <XCircle className="w-3 h-3" /> Recebido como Não Conforme
                </div>
            )}
        </div>
    );
}

function ReceiveSampleForm({ sample, onSubmit, isLoading, onCancel }) {
    const [formData, setFormData] = useState({
        integrity: 'Conforme',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded border text-sm">
                <strong>Código:</strong> {sample.sample_code}<br/>
                <strong>Equipamento:</strong> {sample.equipment}<br/>
                <strong>Coletado em:</strong> {sample.collected_at ? format(new Date(sample.collected_at), 'dd/MM/yyyy HH:mm') : '-'}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Integridade da Amostra</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer border p-2 rounded flex-1 hover:bg-slate-50">
                        <input 
                            type="radio" 
                            name="integrity" 
                            value="Conforme" 
                            checked={formData.integrity === 'Conforme'}
                            onChange={e => setFormData({...formData, integrity: e.target.value})}
                        />
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">Conforme</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer border p-2 rounded flex-1 hover:bg-slate-50">
                        <input 
                            type="radio" 
                            name="integrity" 
                            value="Não Conforme" 
                            checked={formData.integrity === 'Não Conforme'}
                            onChange={e => setFormData({...formData, integrity: e.target.value})}
                        />
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium">Não Conforme</span>
                    </label>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Justificativa / Observações</label>
                <textarea 
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Se 'Não Conforme', justifique aqui (ex: vazamento no frasco, temperatura inadequada)..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    required={formData.integrity === 'Não Conforme'}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600" disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirmar Recebimento
                </Button>
            </div>
        </form>
    );
}
