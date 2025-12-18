
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/lib/supabase";
import { generateTechnicalAnalysis } from "@/lib/gemini";
import { Visit, ObservationTemplate } from "@/api/entities";
import { Core } from "@/api/integrations";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmContext";
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
    const { confirm, alert } = useConfirm();

    // Form States
    const [observations, setObservations] = useState(visit.observations || '');
    const [generalObservations, setGeneralObservations] = useState(visit.general_observations || '');
    const [discharges, setDischarges] = useState(visit.discharges_drainages || '');

    // Fetch Client Details (to get default discharges) - Direct Supabase Call
    const { data: clientDetails } = useQuery({
        queryKey: ['client_direct', visit.client_id],
        queryFn: async () => {
            if (!visit.client_id) return null;
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', visit.client_id)
                .single();

            if (error) return null;
            return data;
        },
        enabled: !visit.discharges_drainages && !readOnly,
        staleTime: 0
    });

    // Effect to load default if empty and available
    useEffect(() => {
        if (!discharges && clientDetails?.default_discharges_drainages) {
            setDischarges(clientDetails.default_discharges_drainages);
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
            // Prepare visit data for AI analysis
            const visitData = {
                client: visit.client,
                results: results?.map(r => ({
                    test_name: r.test_name || r.test?.name,
                    test_definition_id: r.test_definition_id,
                    measured_value: r.measured_value,
                    unit: r.unit || r.test?.unit,
                    status_light: r.status_light
                })),
                dosages: [], // Could be populated from report data if available
                observations: observations
            };

            const aiAnalysis = await generateTechnicalAnalysis(visitData);

            const newObs = observations
                ? observations + "\n\n--- Análise IA (Gemini) ---\n" + aiAnalysis
                : aiAnalysis;
            setObservations(newObs);
            updateMutation.mutate({ observations: newObs, ai_generated_analysis: true });
        } catch (error) {
            console.error("AI Error:", error);
            alert("Erro ao gerar análise IA: " + (error.message || 'Erro desconhecido'));
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
        // Capture service_end_time when client signs
        updateMutation.mutate({
            client_signature_url: url,
            service_end_time: new Date().toISOString()
        });
    };

    // --- Stock Management Logic ---
    const handleSyncStock = async (action) => {
        // Fetch dosages for this visit
        const { data: dosages, error } = await supabase.from('visit_dosages').select('*').eq('visit_id', visit.id);
        if (error || !dosages || dosages.length === 0) return;

        for (const dosage of dosages) {
            if (!dosage.product_id || !dosage.dosage_applied) continue;

            const { data: clientProduct } = await supabase.from('client_products')
                .select('*')
                .eq('client_id', visit.client_id)
                .eq('product_id', dosage.product_id)
                .single();

            if (clientProduct) {
                const currentStock = parseFloat(clientProduct.current_stock || 0);
                const applied = parseFloat(dosage.dosage_applied);
                let newStock = action === 'deduct' ? currentStock - applied : currentStock + applied;

                await supabase.from('client_products')
                    .update({ current_stock: newStock })
                    .eq('id', clientProduct.id);
            }
        }
    };

    const handleFinalize = async () => {
        const confirmed = await confirm({
            title: 'Finalizar Visita',
            message: 'Tem certeza que deseja finalizar? O estoque será debitado e a visita será concluída.',
            type: 'warning'
        });
        if (!confirmed) return;

        try {
            // Deduct Stock if not already deducted
            if (!visit.stock_deducted_at) {
                await handleSyncStock('deduct');
            }

            updateMutation.mutate({
                status: 'completed',
                stock_deducted_at: new Date().toISOString()
            });

        } catch (error) {
            console.error("Finalize Error:", error);
            await alert({ title: 'Erro', message: "Erro ao finalizar visita (Estoque): " + error.message, type: 'error' });
        }
    };

    const handleReopen = async () => {
        const confirmed = await confirm({
            title: 'Reabrir Visita',
            message: 'Reabrir esta visita? O estoque será estornado para permitir edição.',
            type: 'warning'
        });
        if (!confirmed) return;

        try {
            // Restore Stock if it was deducted
            if (visit.stock_deducted_at) {
                await handleSyncStock('restore');
            }

            updateMutation.mutate({
                status: 'in_progress',
                stock_deducted_at: null // Reset flag
            });

        } catch (error) {
            console.error("Reopen Error:", error);
            await alert({ title: 'Erro', message: "Erro ao reabrir visita (Estoque): " + error.message, type: 'error' });
        }
    };

    // PDF & Email Logic
    const handleOpenPreview = async () => {
        // Simple confirmation instead of preview
        const actionLabel = readOnly ? "reenviar e salvar" : "finalizar, enviar e salvar";
        const confirmed = await confirm({
            title: 'Confirmar Envio',
            message: `Tem certeza que deseja ${actionLabel} o relatório?`,
            confirmLabel: 'Sim, enviar',
            cancelLabel: 'Cancelar',
            type: 'confirm'
        });
        if (!confirmed) return;

        const { data } = await refetchReport();

        if (!data) {
            await alert({ title: 'Aguarde', message: 'Aguarde o carregamento completo dos dados do relatório.', type: 'info' });
            return;
        }

        // Set previewing to true to render the hidden PDF template
        setIsPreviewing(true);

        // Wait for React to render the offscreen template, then generate PDF
        setTimeout(() => {
            handleConfirmSend();
        }, 500);
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

            await alert({ title: 'Sucesso!', message: 'Relatório enviado e salvo com sucesso.', type: 'success' });
            updateMutation.mutate({ status: 'synced' });
            setIsPreviewing(false);

        } catch (error) {
            console.error("Process Error:", error);
            await alert({ title: 'Erro', message: 'Erro no processo: ' + error.message, type: 'error' });
        } finally {
            setIsSending(false);
            setUploadStatus('');
        }
    };

    return (
        <div className="space-y-6 pb-20 relative">

            {/* Hidden Offscreen Container for PDF Generation - Not visible to user */}
            {isPreviewing && (
                <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none">
                    <div id="report-preview-content" className="bg-white w-[210mm] min-h-[297mm]">
                        {reportData && <ReportTemplate data={reportData} isPdfGeneration={true} />}
                    </div>
                </div>
            )}

            {/* Loading Dialog - Shows progress during PDF generation/send */}
            <Dialog open={isSending} onOpenChange={() => { }}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            Processando...
                        </DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            {uploadStatus || "Gerando relatório..."}
                        </DialogDescription>
                    </DialogHeader>
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
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-10 flex flex-col gap-3 md:relative md:flex-row md:border-0 md:bg-transparent md:p-0">
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