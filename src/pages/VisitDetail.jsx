import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Visit, Client, Location, TestResult, VisitPhoto } from "@/api/entities";
import { Core } from "@/api/integrations";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList, Image as ImageIcon, FileText, Info, Save, Camera, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateAsLocal } from '@/lib/utils';
import ReadingsTab from "../components/visit/ReadingsTab";
import ReportTab from "../components/visit/ReportTab";
import { Card, CardContent } from "@/components/ui/card";

export default function VisitDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('readings');
    const { user } = useAuth();

    // Fetch Visit Data
    const { data: visit, isLoading, error, refetch } = useQuery({
        queryKey: ['visit', id],
        queryFn: async () => {
            // 1. Fetch Visit directly from Supabase
            const { data: v, error: visitError } = await supabase
                .from('visits')
                .select('*')
                .eq('id', id)
                .single();

            if (visitError) throw visitError;
            if (!v) throw new Error("Visit not found");

            // 2. Fetch Related Data Manually
            // This avoids issues with joins if foreign keys are null or RLS is strict
            let client = null;
            let location = null;

            if (v.client_id) {
                const { data: c } = await supabase.from('clients').select('*').eq('id', v.client_id).single();
                client = c;
            }

            if (v.location_id) {
                const { data: l } = await supabase.from('locations').select('*').eq('id', v.location_id).single();
                location = l;
            }

            return { ...v, client, location };
        },
        retry: 1,
        enabled: !!id
    });

    // Fetch Results for Report Tab to pass down
    const { data: results } = useQuery({
        queryKey: ['results', id],
        queryFn: () => TestResult.filter({ visit_id: id }, undefined, 1000),
        enabled: !!id
    });

    if (isLoading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

    // Explicitly handle "Visit not found" vs "Error"
    if (error || !visit) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-4">
                <p className="text-xl text-slate-700">Não foi possível carregar a visita</p>
                <div className="text-sm text-red-500 bg-red-50 p-4 rounded border border-red-200 max-w-lg overflow-auto text-left w-full">
                    <p className="font-bold">Detalhes do erro:</p>
                    <pre className="whitespace-pre-wrap mt-2 text-xs font-mono">
                        {error ? JSON.stringify(error, null, 2) : "Visita não encontrada (ID inválido ou sem permissão)"}
                    </pre>
                    {error?.message && <p className="mt-2 font-semibold">{error.message}</p>}
                </div>
                <Button variant="outline" onClick={() => navigate('/visits')}>Voltar para Visitas</Button>
            </div>
        );
    }

    const isAdmin = user?.role === 'admin';
    const isReadOnly = (visit.status === 'completed' || visit.status === 'synced');

    return (
        <div className="pb-20 md:pb-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/visits')}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{visit.client?.name}</h1>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            {visit.location && (
                                <>
                                    <span>{visit.location.name}</span>
                                    <span>•</span>
                                </>
                            )}
                            <span>{formatDateAsLocal(visit.visit_date, "d MMM yyyy")}</span>
                        </div>
                    </div>
                </div>
                <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 bg-blue-50" title="Salvar">
                    <Save className="w-5 h-5" />
                </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="readings" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg text-xs md:text-sm">
                        <ClipboardList className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Medições</span>
                    </TabsTrigger>
                    <TabsTrigger value="photos" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg text-xs md:text-sm">
                        <ImageIcon className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Fotos</span>
                    </TabsTrigger>
                    <TabsTrigger value="info" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg text-xs md:text-sm">
                        <Info className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Info</span>
                    </TabsTrigger>
                    <TabsTrigger value="report" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg text-xs md:text-sm">
                        <FileText className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">Relatório</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="readings" className="mt-4 data-[state=inactive]:hidden" forceMount>
                    <ReadingsTab visit={visit} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="photos" className="mt-4 data-[state=inactive]:hidden" forceMount>
                    <PhotosTab visitId={visit.id} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="info" className="mt-4 data-[state=inactive]:hidden" forceMount>
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase">Cliente</label>
                                <p className="text-lg font-medium">{visit.client?.name}</p>
                                <p className="text-sm text-slate-600">{visit.client?.address}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase">Local</label>
                                <p className="text-lg font-medium">{visit.location?.name}</p>
                                <p className="text-sm text-slate-600">{visit.location?.description}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase">Contato</label>
                                <p className="text-lg font-medium">{visit.client?.contact_name}</p>
                                <p className="text-sm text-slate-600">{visit.client?.email}</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="report" className="mt-4 data-[state=inactive]:hidden" forceMount>
                    <ReportTab visit={visit} results={results} onUpdateVisit={refetch} readOnly={isReadOnly} isAdmin={isAdmin} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Minimal Photos Tab Implementation
function PhotosTab({ visitId, readOnly }) {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);

    const { data: photos } = useQuery({
        queryKey: ['photos', visitId],
        queryFn: () => VisitPhoto.list().then(res => res.filter(p => p.visit_id === visitId))
    });

    const createPhoto = useMutation({
        mutationFn: (url) => VisitPhoto.create({ visit_id: visitId, photo_url: url }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos', visitId] })
    });

    const deletePhoto = useMutation({
        mutationFn: (id) => VisitPhoto.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos', visitId] })
    });

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await Core.UploadFile({ file });
            await createPhoto.mutateAsync(file_url);
        } catch (err) {
            alert('Erro ao enviar foto');
        } finally {
            setIsUploading(false);
            // Reset input value to allow selecting same file again if needed
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {!readOnly && (
                    <div className="flex flex-col items-center justify-center h-40 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg gap-2 p-2 relative overflow-hidden">
                        {isUploading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                                <span className="text-xs font-medium text-slate-600">Enviando...</span>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm font-medium text-slate-500">Adicionar Foto</span>
                                <div className="flex gap-2 w-full">
                                    <label className={`flex-1 flex flex-col items-center justify-center bg-white p-2 rounded shadow-sm cursor-pointer hover:bg-slate-50 border transition-colors ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                                        <ImageIcon className="w-5 h-5 text-blue-600 mb-1" />
                                        <span className="text-xs text-slate-600">Galeria</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
                                    </label>
                                    <label className={`flex-1 flex flex-col items-center justify-center bg-white p-2 rounded shadow-sm cursor-pointer hover:bg-slate-50 border transition-colors ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                                        <Camera className="w-5 h-5 text-blue-600 mb-1" />
                                        <span className="text-xs text-slate-600">Câmera</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} disabled={isUploading} />
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {photos?.map(photo => (
                    <div key={photo.id} className="relative h-40 rounded-lg overflow-hidden border bg-slate-100 group">
                        <img src={photo.photo_url} alt="Visita" className="w-full h-full object-cover" />
                        {!readOnly && (
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (confirm('Excluir esta foto?')) deletePhoto.mutate(photo.id);
                                }}
                                title="Excluir foto"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}