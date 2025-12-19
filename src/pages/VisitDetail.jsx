import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Visit, Client, Location, TestResult, TestDefinition, VisitPhoto } from "@/api/entities";
import { Core } from "@/api/integrations";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, ClipboardList, Image as ImageIcon, FileText, Info, Save, Camera, Loader2, Trash2, Beaker } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateAsLocal } from '@/lib/utils';
import ReadingsTab from "../components/visit/ReadingsTab";
import ReportTab from "../components/visit/ReportTab";
import DosageBoardTab from "../components/visit/DosageBoardTab";
import { Card, CardContent } from "@/components/ui/card";


// ... imports

export default function VisitDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('readings');
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false); // Edit Modal State

    React.useEffect(() => {
        // Component loaded
    }, []);

    // Fetch Visit Data
    const { data: visit, isLoading, error, refetch } = useQuery({
        queryKey: ['visit', id],
        queryFn: async () => {
            const [visit] = await Visit.filter({ id: id });
            if (!visit) return null;

            const [client, location] = await Promise.all([
                Client.filter({ id: visit.client_id }).then(res => res[0]),
                visit.location_id ? Location.filter({ id: visit.location_id }).then(res => res[0]) : Promise.resolve(null)
            ]);

            return { ...visit, client, location };
        },
        enabled: !!id
    });

    // Fetch Test Results for this visit
    const { data: testResults } = useQuery({
        queryKey: ['testResults', id],
        queryFn: async () => {
            if (!id) return [];
            const results = await TestResult.filter({ visit_id: id }, undefined, 1000);
            // Enrich with test definition names
            const testDefs = await TestDefinition.list(undefined, 1000);
            return results.map(r => {
                const def = testDefs.find(t => t.id === r.test_definition_id);
                return {
                    ...r,
                    test_name: def?.name || 'Teste',
                    unit: def?.unit || ''
                };
            });
        },
        enabled: !!id
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: (data) => Visit.update(id, data),
        onSuccess: () => {
            refetch();
            setIsEditOpen(false);
            alert("Visita atualizada com sucesso!");
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500">Carregando detalhes da visita...</p>
            </div>
        );
    }

    if (error || !visit) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <Info className="w-10 h-10 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Visita não encontrada</h2>
                <p className="text-slate-500 mb-6">Não foi possível carregar os dados desta visita.</p>
                <Button onClick={() => navigate('/visits')}>Voltar para Lista</Button>
            </div>
        );
    }

    const isAdmin = user?.role === 'admin';
    // Now safe to access visit properties
    const isReadOnly = (visit.status === 'completed' || visit.status === 'synced');

    return (
        <div className="pb-20 md:pb-0">
            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Visita</DialogTitle>
                        <DialogDescription>Alterar data ou detalhes da visita.</DialogDescription>
                    </DialogHeader>
                    <EditVisitForm visit={visit} onSubmit={updateMutation.mutate} isLoading={updateMutation.isPending} />
                </DialogContent>
            </Dialog>

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
                            {/* Use local formatter */}
                            <span>{formatDateAsLocal(visit.visit_date, "d MMM yyyy")}</span>
                        </div>
                    </div>
                </div>
                {/* Edit Button */}
                {!isReadOnly && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="text-blue-600 border-blue-200 bg-blue-50"
                        title="Editar Detalhes"
                        onClick={() => setIsEditOpen(true)}
                    >
                        <Save className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-4">
                    <TabsTrigger value="readings" title="Leituras"><ClipboardList className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Leituras</span></TabsTrigger>
                    <TabsTrigger value="dosages" title="Dosagens"><Beaker className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Dosagens</span></TabsTrigger>
                    <TabsTrigger value="photos" title="Fotos"><ImageIcon className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Fotos</span></TabsTrigger>
                    <TabsTrigger value="details" title="Detalhes"><Info className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Detalhes</span></TabsTrigger>
                    <TabsTrigger value="report" title="Relatório"><FileText className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Relatório</span></TabsTrigger>
                </TabsList>

                <TabsContent value="readings" className="mt-2">
                    <ReadingsTab visit={visit} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="dosages" className="mt-2">
                    <DosageBoardTab visit={visit} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="photos" className="mt-2">
                    <PhotosTab visitId={visit.id} readOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="details" className="mt-2">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-500">Cliente</label>
                                    <p className="text-lg font-medium">{visit.client?.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500">Local</label>
                                    <p className="text-lg font-medium">{visit.location?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500">Data da Visita</label>
                                    <p>{formatDateAsLocal(visit.visit_date)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500">Status</label>
                                    <p className="capitalize">{visit.status === 'in_progress' ? 'Em Andamento' : visit.status === 'scheduled' ? 'Agendada' : visit.status}</p>
                                </div>
                                {visit.technician_email && (
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-slate-500">Técnico Responsável</label>
                                        <p>{visit.technician_email}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="report" className="mt-2">
                    <ReportTab
                        visit={visit}
                        results={testResults || []}
                        onUpdateVisit={refetch}
                        readOnly={isReadOnly}
                        isAdmin={isAdmin}
                    />
                </TabsContent>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                    <Button
                        variant="outline"
                        onClick={() => {
                            const tabs = ['readings', 'dosages', 'photos', 'details', 'report'];
                            const currentIdx = tabs.indexOf(activeTab);
                            if (currentIdx > 0) setActiveTab(tabs[currentIdx - 1]);
                        }}
                        disabled={activeTab === 'readings'}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Anterior
                    </Button>
                    <span className="text-sm text-slate-500">
                        {activeTab === 'readings' && 'Leituras'}
                        {activeTab === 'dosages' && 'Dosagens'}
                        {activeTab === 'photos' && 'Fotos'}
                        {activeTab === 'details' && 'Detalhes'}
                        {activeTab === 'report' && 'Relatório'}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => {
                            const tabs = ['readings', 'dosages', 'photos', 'details', 'report'];
                            const currentIdx = tabs.indexOf(activeTab);
                            if (currentIdx < tabs.length - 1) setActiveTab(tabs[currentIdx + 1]);
                        }}
                        disabled={activeTab === 'report'}
                    >
                        Próximo
                        <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                    </Button>
                </div>
            </Tabs>
        </div>
    );
}

// Simple Edit Form Component
function EditVisitForm({ visit, onSubmit, isLoading }) {
    // Initialize with YYYY-MM-DD string
    const [date, setDate] = useState(visit.visit_date ? visit.visit_date.split('T')[0] : '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ visited_at: undefined, visit_date: date }); // Ensure we strictly update visit_date
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Data da Visita</label>
                <div className="relative">
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                </div>
                <p className="text-xs text-slate-500">
                    Ajuste a data caso tenha sido registrada incorretamente.
                </p>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar Alterações
                </Button>
            </div>
        </form>
    );
}

// ... (Keep PhotosTab)


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