
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { Visit, ObservationTemplate } from "@/api/entities";
import { Core } from "@/api/integrations";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignaturePad from "./SignaturePad";
import { Bot, Send, FileText, Loader2, ExternalLink, Mail, AlertTriangle, CheckCircle, Lock, MonitorUp, Plus, Droplets, quote } from "lucide-react";
import { useReportData } from '@/hooks/useReportData';
import { ReportTemplate } from '@/components/visit/ReportTemplate';
import html2pdf from 'html2pdf.js';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateAsLocal } from "@/lib/utils";

export default function ReportTab({ visit, results, onUpdateVisit, readOnly, isAdmin }) {
    if (!visit) return null;
    const queryClient = useQueryClient();

    // Form States
    const [observations, setObservations] = useState(visit.observations || '');
    const [generalObservations, setGeneralObservations] = useState(visit.general_observations || '');
    const [discharges, setDischarges] = useState(visit.discharges_drainages || '');

    // Fetch Client Details (to get default discharges) - Forced Fresh
    const { data: clientDetails, refetch: refetchClient } = useQuery({
        queryKey: ['client_full', visit.client_id], // New key to force refresh
        queryFn: async () => {
            if (!visit.client_id) return null;
            console.log("Fetching client details for:", visit.client_id);
            const res = await Client.filter({ id: visit.client_id });
            console.log("Client FULL result:", JSON.stringify(res[0], null, 2)); // Debugging
            return res && res.length > 0 ? res[0] : null;
        },
        enabled: !visit.discharges_drainages && !readOnly,
        staleTime: 0 // Always fetch fresh
    });

    // Effect to load default if empty and available
    useEffect(() => {
        if (!discharges && clientDetails?.default_discharges_drainages) {
            console.log("Applying default discharges:", clientDetails.default_discharges_drainages);
            setDischarges(clientDetails.default_discharges_drainages);
        } else {
            console.log("Skipping apply. Current:", discharges, "Default:", clientDetails?.default_discharges_drainages);
        }
    }, [clientDetails, discharges]); // Trigger on client load or if discharges is empty (safeguard)

    // UI States
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

    // Fetch Full Report Data for PDF Generation
    const { data: reportData, isLoading: isLoadingReport, refetch: refetchReport } = useReportData(visit.id);

    // Fetch Templates
    const { data: templates } = useQuery({ queryKey: ['observationTemplates'], queryFn: () => ObservationTemplate.list() });

    // Fetch Current User
    const { user } = useAuth();

    // Check for signature on mount
    useEffect(() => {
        if (user && !user.signature_url) {
            setShowSignatureDialog(true);
        }
    }, [user]);

    const userUpdateMutation = useMutation({
        mutationFn: async (data) => {
            const { error } = await supabase.from('profiles').update(data).eq('id', user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            window.location.reload();
            setShowSignatureDialog(false);
        }
    });

    const handleSaveTechnicianSignature = (url) => {
        userUpdateMutation.mutate({ signature_url: url });
    };

    const updateMutation = useMutation({
        mutationFn: (data) => {
            const payload = { ...data };
            if (visit?.status === 'scheduled' && !payload.status) {
                payload.status = 'in_progress';
            }
            return Visit.update(visit.id, payload);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['fullReport', visit.id] });
            if (onUpdateVisit) onUpdateVisit();
            if (variables.client_signature_url) {
                alert("Assinatura salva com sucesso!");
            }
        },
        onError: (err) => {
            alert("Erro ao salvar: " + err.message);
        }
    });

    // Handlers for Blur (Auto-save)
    const handleBlur = (field, value) => {
        if (readOnly) return;
        updateMutation.mutate({ [field]: value });
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const context = {
                client: visit.client?.name,
                location: visit.location?.name,
                date: visit.visit_date,
                results: results?.map(r => ({
                    test: r.test_definition_id,
                    value: r.measured_value,
                    status: r.status_light
                }))
            };

            const prompt = `
                Atue como um engenheiro químico sênior da WGA Brasil.
                Analise os seguintes dados de uma visita técnica:
                Cliente: ${context.client}
                Local: ${context.location}
                Resultados: ${JSON.stringify(context.results)}

                Gere um texto técnico, direto e profissional para o relatório (em português).
                Estruture em: 
                1. Resumo Geral
                2. Anomalias Encontradas (focar nos vermelhos/amarelos)
                3. Recomendações de ação.
                
                Se tudo estiver verde, elogie a manutenção.
                Use texto corrido e bullets onde necessário.
            `;

            const response = await Core.InvokeLLM({ prompt: prompt });

            const newObs = observations ? observations + "\n\n--- Análise IA ---\n" + response.result : response.result;
            setObservations(newObs);
            updateMutation.mutate({ observations: newObs, ai_generated_analysis: true });
        } catch (error) {
            console.error("AI Error:", error);
            alert("Erro ao gerar análise IA.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleInsertTemplate = (templateId, targetSetter, fieldName, currentValue) => {
        const template = templates?.find(t => t.id === templateId);
        if (template) {
            const newValue = currentValue ? currentValue + "\n" + template.content : template.content;
            targetSetter(newValue);
            handleBlur(fieldName, newValue);
        }
    };

    const handleSaveSignature = (url) => {
        updateMutation.mutate({ client_signature_url: url });
    };

    const handleFinalize = async () => {
        if (!confirm("Tem certeza que deseja finalizar? Após isso, não será possível editar.")) return;
        updateMutation.mutate({ status: 'completed' });
    };

    const handleReopen = async () => {
        if (!confirm("Reabrir esta visita para edição?")) return;
        updateMutation.mutate({ status: 'in_progress' });
    };

    // PDF & Email Logic
    const handleOpenPreview = async () => {
        const { data } = await refetchReport();

        if (!data) {
            alert("Aguarde o carregamento completo dos dados do relatório.");
            return;
        }
        setIsPreviewing(true);
    };

    const handleConfirmSend = async () => {
        setIsSending(true);
        setUploadStatus('Gerando PDF...');

        try {
            const element = document.getElementById('report-preview-content');
            if (!element) throw new Error("Template de pré-visualização não encontrado");

            await new Promise(resolve => setTimeout(resolve, 500));

            const opt = {
                margin: 0,
                filename: `relatorio_${visit.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');

            let safeDate = new Date();
            if (visit.visit_date) {
                const dateStr = visit.visit_date.includes('T') ? visit.visit_date.split('T')[0] : visit.visit_date;
                const [y, m, d] = dateStr.split('-').map(Number);
                safeDate = new Date(y, m - 1, d, 12, 0, 0);
            }

            const fileName = `${format(safeDate, 'yyyyMMdd')}_${visit.client?.name.replace(/[^a-z0-9]/gi, '_')}_${visit.id.slice(0, 6)}.pdf`;

            // Upload to Drive
            const driveFolderId = visit.client?.google_drive_folder_id;
            let driveLink = null;

            if (driveFolderId) {
                setUploadStatus('Enviando para o Google Drive...');
                const uploadRes = await fetch('/api/upload-drive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileBase64: pdfBase64,
                        fileName: fileName,
                        folderId: driveFolderId
                    })
                });

                if (!uploadRes.ok) {
                    console.error("Drive upload failed", await uploadRes.json());
                    alert("Aviso: Falha ao salvar no Google Drive. Verifique o ID da pasta.");
                } else {
                    const responseData = await uploadRes.json();
                    driveLink = responseData.webViewLink;
                }
            }

            // Send Email
            setUploadStatus('Enviando email...');
            if (!readOnly) {
                await Visit.update(visit.id, { status: 'completed' });
            }

            const emailBody = `
                Olá,
                
                Segue abaixo o link para o relatório da visita técnica realizada em ${format(safeDate, 'dd/MM/yyyy')}.
                
                ${driveLink ? `<p><strong><a href="${driveLink}">Clique aqui para visualizar o Relatório (Google Drive)</a></strong></p>` : '<p>Nota: O arquivo não pôde ser salvo no Drive, favor contactar o suporte.</p>'}
                
                Atenciosamente,
                Equipe WGA Brasil
            `;

            await Core.SendEmail({
                to: visit.client?.email,
                subject: `Relatório de Visita Técnica - ${visit.client?.name} - ${format(safeDate, 'dd/MM/yyyy')}`,
                body: emailBody,
            });

            alert("Sucesso! Relatório enviado e salvo.");
            updateMutation.mutate({ status: 'synced' });
            setIsPreviewing(false);

        } catch (error) {
            console.error("Process Error:", error);
            alert("Erro no processo: " + error.message);
        } finally {
            setIsSending(false);
            setUploadStatus('');
        }
    };

    return (
        <div className="space-y-6 pb-20 relative">

            {/* Preview Dialog */}
            <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
                <DialogContent className="max-w-[230mm] h-[90vh] overflow-y-auto bg-slate-100 p-8 flex flex-col items-center">
                    <DialogHeader className="w-full max-w-[210mm] mb-4">
                        <DialogTitle>Pré-visualização do PDF</DialogTitle>
                        <DialogDescription>
                            Verifique como o relatório ficará antes de enviar.
                        </DialogDescription>
                    </DialogHeader>

                    <div id="report-preview-content" className="bg-white shadow-xl w-[210mm] min-h-[297mm] origin-top scale-95">
                        {reportData && <ReportTemplate data={reportData} isPdfGeneration={true} />}
                    </div>

                    <div className="fixed bottom-6 right-6 flex gap-4 z-50">
                        <Button variant="outline" onClick={() => setIsPreviewing(false)} disabled={isSending}>Cancelar</Button>
                        <Button onClick={handleConfirmSend} disabled={isSending} className="bg-green-600 hover:bg-green-700 text-lg px-8">
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                            {isSending ? uploadStatus : "Confirmar e Enviar"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Signature Dialog */}
            <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assinatura do Técnico Necessária</DialogTitle>
                        <DialogDescription>Para finalizar relatórios, cadastre sua assinatura digital.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <SignaturePad onSave={handleSaveTechnicianSignature} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Warnings */}
            {user && !user.signature_url && !showSignatureDialog && !readOnly && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-700">
                        Você ainda não cadastrou sua assinatura.
                        <Button variant="link" className="text-yellow-800 underline pl-1" onClick={() => setShowSignatureDialog(true)}>Cadastrar agora</Button>
                    </p>
                </div>
            )}

            {readOnly && (
                <div className="bg-slate-100 border-l-4 border-slate-500 p-4 mb-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <Lock className="h-5 w-5 text-slate-500 mr-2" />
                        <p className="text-sm text-slate-700">Visita finalizada. Modo somente leitura.</p>
                    </div>
                    {isAdmin && <Button variant="outline" size="sm" onClick={handleReopen}>Reabrir Visita</Button>}
                </div>
            )}

            {/* 1. Descargas e Drenagens */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" />Descargas e Drenagens</CardTitle>
                    <CardDescription>Informe as descargas de fundo ou drenagens realizadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder="Ex: Descarga de fundo em todas as caldeiras..."
                        value={discharges}
                        onChange={(e) => setDischarges(e.target.value)}
                        onBlur={() => handleBlur('discharges_drainages', discharges)}
                        disabled={readOnly}
                    />
                </CardContent>
            </Card>

            {/* 2. Análise Técnica (Observações) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Observações (Análise Técnica)</CardTitle>
                        <CardDescription>Análise dos resultados e recomendações.</CardDescription>
                    </div>
                    {!readOnly && (
                        <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="bg-purple-50 text-purple-600 border-purple-200">
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                            Gerar com IA
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        onBlur={() => handleBlur('observations', observations)}
                        className="min-h-[150px]"
                        placeholder="Descreva a análise técnica..."
                        disabled={readOnly}
                    />
                </CardContent>
            </Card>

            {/* 3. Observações Gerais */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Observações Gerais</CardTitle>
                        <CardDescription>Informações complementares e sugestões.</CardDescription>
                    </div>
                    {!readOnly && (
                        <Select onValueChange={(val) => handleInsertTemplate(val, setGeneralObservations, 'general_observations', generalObservations)}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Inserir Modelo" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates?.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={generalObservations}
                        onChange={(e) => setGeneralObservations(e.target.value)}
                        onBlur={() => handleBlur('general_observations', generalObservations)}
                        className="min-h-[100px]"
                        placeholder="Observações gerais..."
                        disabled={readOnly}
                    />
                </CardContent>
            </Card>

            {/* 4. Client Signature */}
            <Card>
                <CardHeader><CardTitle className="text-base">Assinatura do Cliente</CardTitle></CardHeader>
                <CardContent>
                    {readOnly ? (
                        visit.client_signature_url ? <img src={visit.client_signature_url} className="h-24 border rounded bg-slate-50" alt="Assinatura" /> : <p className="text-slate-400 italic">Não assinado</p>
                    ) : (
                        <SignaturePad savedUrl={visit.client_signature_url} onSave={handleSaveSignature} />
                    )}
                </CardContent>
            </Card>

            {/* Footer / Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-10 flex flex-col md:flex-row items-center gap-3 md:status md:border-0 md:bg-transparent md:p-0">
                <a href={`/report/${visit.id}`} target="_blank" className="w-full md:flex-1">
                    <Button variant="outline" className="w-full"><FileText className="w-4 h-4 mr-2" /> Visualizar Relatório Web</Button>
                </a>

                {!readOnly && (
                    <Button className="w-full md:flex-1 bg-green-600 hover:bg-green-700" onClick={handleFinalize}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Finalizar Localmente
                    </Button>
                )}

                <Button className="w-full md:flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenPreview()} disabled={isSending || isLoadingReport}>
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (readOnly ? <MonitorUp className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />)}
                    {readOnly ? "Reenviar e Salvar no Drive" : "Finalizar, Enviar e Salvar"}
                </Button>
            </div>
            {isLoadingReport && <div className="text-center text-xs text-slate-400">Carregando dados para geração de PDF...</div>}
        </div>
    );
}