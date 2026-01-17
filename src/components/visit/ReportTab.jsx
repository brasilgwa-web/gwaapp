
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
import { Bot, Send, FileText, Loader2, ExternalLink, AlertTriangle, CheckCircle, Lock, MonitorUp, Droplets, Clock, Eye, EyeOff, PenTool } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useReportData } from '@/hooks/useReportData';
import { ReportTemplate } from '@/components/visit/ReportTemplate';
import html2pdf from 'html2pdf.js';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateAsLocal } from "@/lib/utils";
import { Logger } from "@/lib/logger";

export default function ReportTab({ visit, results, onUpdateVisit, readOnly, isAdmin }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const { confirm, alert } = useConfirm();

    // Form States
    const [observations, setObservations] = useState(visit.observations || '');
    const [generalObservations, setGeneralObservations] = useState(visit.general_observations || '');
    const [discharges, setDischarges] = useState(visit.discharges_drainages || '');
    const [arrivalTime, setArrivalTime] = useState(visit.arrival_time || '');
    const [departureTime, setDepartureTime] = useState(visit.departure_time || '');
    const [clientAbsent, setClientAbsent] = useState(visit.client_absent || false);
    const [showObsPreview, setShowObsPreview] = useState(true);
    const [technicalResponsibleId, setTechnicalResponsibleId] = useState(visit.technical_responsible_id || '');

    // Helper para converter markdown básico em HTML
    const renderMarkdown = (text) => {
        if (!text) return null;
        let html = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '• $1')
            .replace(/\n/g, '<br />');
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    // Fetch Active Technical Responsibles
    const { data: technicalResponsibles } = useQuery({
        queryKey: ['activeTechnicalResponsibles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('technical_responsibles')
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) {
                console.error('Error fetching responsibles:', error);
                return [];
            }
            return data;
        },
    });

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
    const userHasCrq = Boolean(user?.crq);
    const needsTechnicalResponsible = !userHasCrq;

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
                // Only show success message when saving, not when clearing
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
            // Refetch report data para ter estrutura completa
            const { data: freshReportData } = await refetchReport();

            // Estruturar dados por equipamento (usando fullReportStructure)
            let equipmentDataText = '';
            if (freshReportData?.fullReportStructure?.length > 0) {
                freshReportData.fullReportStructure.forEach(location => {
                    equipmentDataText += `\n\nðŸ“ LOCAL: ${location.name}\n`;
                    location.equipments?.forEach(eq => {
                        equipmentDataText += `\n  ðŸ”§ EQUIPAMENTO: ${eq.equipment.name}\n`;
                        if (eq.sample?.collection_time) {
                            equipmentDataText += `     Coleta: ${eq.sample.collection_time}\n`;
                        }
                        if (eq.tests?.length > 0) {
                            eq.tests.forEach(test => {
                                const status = test.result?.status_light === 'red' ? 'ðŸ”´ CRÃTICO' :
                                    test.result?.status_light === 'yellow' ? 'ðŸŸ¡ ALERTA' : 'ðŸŸ¢ OK';
                                const value = test.result?.measured_value ?? 'N/R';
                                const range = `${test.min_value || '-'} a ${test.max_value || '-'}`;
                                equipmentDataText += `     - ${test.name}: ${value} ${test.unit || ''} (Faixa: ${range}) [${status}]\n`;
                            });
                        } else {
                            equipmentDataText += `     (Nenhum teste registrado)\n`;
                        }
                    });
                });
            }

            // Prepare visit data for AI analysis
            const visitData = {
                client: visit.client,
                results: results?.map(r => ({
                    test_name: r.test_name || r.test?.name,
                    test_definition_id: r.test_definition_id,
                    measured_value: r.measured_value,
                    unit: r.unit || r.test?.unit,
                    status_light: r.status_light,
                    equipment_name: r.equipment_name
                })),
                dosages: freshReportData?.fullReportStructure?.flatMap(loc =>
                    loc.equipments?.flatMap(eq => eq.dosages || []) || []
                ) || [],
                observations: observations,
                equipmentDataText: equipmentDataText // Texto estruturado por equipamento
            };

            const aiAnalysis = await generateTechnicalAnalysis(visitData);

            Logger.info('USER_ACTION', 'AI generated successfully', { visitId: visit.id });

            const newObs = observations
                ? observations + "\n\n--- AnÃ¡lise IA (Gemini) ---\n" + aiAnalysis
                : aiAnalysis;
            setObservations(newObs);
            updateMutation.mutate({ observations: newObs, ai_generated_analysis: true });
        } catch (error) {
            console.error("AI Error:", error);
            alert("Erro ao gerar anÃ¡lise IA: " + (error.message || 'Erro desconhecido'));
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
            Logger.info('USER_ACTION', 'Template inserted', { templateId, fieldName, visitId: visit.id });
        } else {
            Logger.warn('USER_ACTION', 'Template not found', { templateId, visitId: visit.id });
        }
    };

    const handleSaveSignature = (url) => {
        // url can be null (clearing) or a data URL (saving)
        const updates = {
            client_signature_url: url
        };

        // Only capture service_end_time when actually signing (not clearing)
        if (url) {
            updates.service_end_time = new Date().toISOString();
        }

        updateMutation.mutate(updates);
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
            message: 'Tem certeza que deseja finalizar? O estoque serÃ¡ debitado e a visita serÃ¡ concluÃ­da.',
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
            Logger.error('USER_ACTION', 'Error finalizing visit', error);
            await alert({ title: 'Erro', message: "Erro ao finalizar visita (Estoque): " + error.message, type: 'error' });
        }
    };

    const handleReopen = async () => {
        const confirmed = await confirm({
            title: 'Reabrir Visita',
            message: 'Reabrir esta visita? O estoque serÃ¡ estornado para permitir ediÃ§Ã£o.',
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

    const handleResponsibleChange = async (value) => {
        setTechnicalResponsibleId(value);
        try {
            await supabase
                .from('visits')
                .update({ technical_responsible_id: value })
                .eq('id', visit.id);
            onUpdateVisit({ ...visit, technical_responsible_id: value });
        } catch (error) {
            console.error("Error updating responsible:", error);
            alert({ title: "Erro", message: "Erro ao atualizar responsÃ¡vel tÃ©cnico", type: "error" });
        }
    };

    // PDF & Email Logic
    const handleOpenPreview = async () => {
        // Validation: If user has no CRQ, Technical Responsible is MANDATORY
        if (needsTechnicalResponsible && !technicalResponsibleId) {
            await alert({
                title: 'Responsável Técnico Obrigatório',
                message: 'Como você não possui CRQ cadastrado, é obrigatório selecionar um Responsável Técnico para assinar o relatório.',
                type: 'warning'
            });
            return;
        }
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
        setUploadStatus('Carregando configurações...');

        try {
            // 1. Fetch Report Settings Global
            const { data: reportSettings } = await supabase
                .from('report_settings')
                .select('*')
                .limit(1)
                .single();

            setUploadStatus('Gerando PDF...');

            const element = document.getElementById('report-preview-content');
            if (!element) throw new Error("Template de pré-visualização não encontrado");

            await new Promise(resolve => setTimeout(resolve, 500));

            const opt = {
                margin: 0, // MARGIN 0 for Full Bleed Cover
                filename: `relatorio_${visit.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Obter texto do rodapé das configurações ANTES de gerar o PDF
            const footerText = reportSettings?.footer_text || 'WGA Brasil Tratamento de Águas - Este relatório possui validade técnica.';

            // Gerar PDF e adicionar rodapé usando callback
            const pdfBase64 = await new Promise((resolve, reject) => {
                html2pdf()
                    .set(opt)
                    .from(element)
                    .toPdf()
                    .get('pdf')
                    .then((pdf) => {
                        const totalPages = pdf.internal.getNumberOfPages();
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();

                        // Adicionar rodapé em CADA página
                        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                            pdf.setPage(pageNum);
                            pdf.setFontSize(8);
                            pdf.setTextColor(150, 150, 150);

                            // Texto do rodapé centralizado (pode ter múltiplas linhas)
                            const lines = footerText.split('\n');
                            const lineHeight = 3.5;
                            const startY = pageHeight - 8 - (lines.length * lineHeight);

                            lines.forEach((line, idx) => {
                                const textWidth = pdf.getStringUnitWidth(line) * 8 / pdf.internal.scaleFactor;
                                const xPos = (pageWidth - textWidth) / 2;
                                pdf.text(line, xPos > 10 ? xPos : 10, startY + (idx * lineHeight));
                            });

                            // --- FORCE DELETE PAGE 2 LOGIC REMOVED ---

                            // Número da página no canto inferior direito
                            const pageText = `Página ${pageNum} de ${totalPages}`;
                            pdf.text(pageText, pageWidth - 35, pageHeight - 5);
                        }

                        resolve(pdf.output('datauristring'));
                    })
                    .catch(reject);
            });

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

            // Generate and save report number if not already set
            let reportNumber = visit.report_number;
            if (!reportNumber && !readOnly) {
                // Using previously fetched reportSettings
                if (reportSettings) {
                    const currentNum = reportSettings.current_report_number || 1;
                    reportNumber = `${format(safeDate, 'yyMM')}-${String(currentNum).padStart(6, '0')}`;

                    // Update visit with report number
                    await supabase
                        .from('visits')
                        .update({ report_number: reportNumber })
                        .eq('id', visit.id);

                    // Increment counter and update highest emitted
                    await supabase
                        .from('report_settings')
                        .update({
                            current_report_number: currentNum + 1,
                            highest_emitted_number: currentNum,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', reportSettings.id);
                }
            }

            if (!readOnly) {
                await Visit.update(visit.id, { status: 'completed' });
            }

            // Dynamic Email Template
            let subjectTemplate = reportSettings?.email_subject_default || 'Relatório de Visita Técnica - {client_name} - {date}';
            let bodyTemplate = reportSettings?.email_body_default || `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <p>Olá,</p>
                    <p>Segue abaixo o link para o relatório da visita técnica realizada em <strong>{date}</strong>.</p>
                    <p><a href="{link}">Acessar Relatório</a></p>
                    <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática.</p>
                </div>
            `;

            const replaceVars = (text) => text
                .replace(/{client_name}/g, visit.client?.name || '')
                .replace(/{date}/g, format(safeDate, 'dd/MM/yyyy'))
                .replace(/{link}/g, driveLink || '#');

            const emailSubject = replaceVars(subjectTemplate);
            const emailBody = replaceVars(bodyTemplate);

            await Core.SendEmail({
                to: visit.client?.email,
                subject: emailSubject,
                body: emailBody,
            });

            await alert({ title: 'Sucesso!', message: 'Relatório enviado e salvo com sucesso.', type: 'success' });
            Logger.info('USER_ACTION', 'Report sent successfully', { visitId: visit.id, email: visit.client?.email });
            updateMutation.mutate({ status: 'synced' });
            setIsPreviewing(false);

        } catch (error) {
            console.error("Process Error:", error);
            Logger.error('USER_ACTION', 'Error sending report', error);
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

            {/* 0. HorÃ¡rios */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Horários da Visita</CardTitle>
                    <CardDescription>Informe os horários de chegada e saída.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="arrivalTime">Hora de Chegada</Label>
                            <Input
                                id="arrivalTime"
                                type="time"
                                value={arrivalTime}
                                onChange={(e) => setArrivalTime(e.target.value)}
                                onBlur={() => handleBlur('arrival_time', arrivalTime)}
                                disabled={readOnly}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="departureTime">Hora de Saída</Label>
                            <Input
                                id="departureTime"
                                type="time"
                                value={departureTime}
                                onChange={(e) => setDepartureTime(e.target.value)}
                                onBlur={() => handleBlur('departure_time', departureTime)}
                                disabled={readOnly}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

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

            {/* 2. AnÃ¡lise TÃ©cnica (ObservaÃ§Ãµes) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Observações (Análise Técnica)</CardTitle>
                        <CardDescription>Análise dos resultados e recomendações.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowObsPreview(!showObsPreview)}
                            className="text-slate-500"
                            title={showObsPreview ? "Editar" : "Pré-visualizar"}
                        >
                            {showObsPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                            {showObsPreview ? "Editar" : "Preview"}
                        </Button>
                        {!readOnly && (
                            <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="bg-purple-50 text-purple-600 border-purple-200">
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                                Gerar com IA
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {showObsPreview ? (
                        <div className="bg-slate-50 p-4 rounded border border-slate-200 min-h-[150px] text-sm">
                            {observations ? renderMarkdown(observations) : <span className="text-slate-400 italic">Sem observações técnicas.</span>}
                        </div>
                    ) : (
                        <Textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            onBlur={() => handleBlur('observations', observations)}
                            className="min-h-[150px]"
                            placeholder="Descreva a análise técnica..."
                            disabled={readOnly}
                        />
                    )}
                </CardContent>
            </Card>

            {/* 3. ObservaÃ§Ãµes Gerais */}
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

            {/* Responsibilidade Técnica (Inserido) */}
            {(needsTechnicalResponsible || technicalResponsibles?.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-purple-500" />
                            Responsabilidade Técnica
                        </CardTitle>
                        <CardDescription>
                            Selecione o engenheiro/químico responsável por este relatório.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {needsTechnicalResponsible && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-xs text-yellow-700">
                                <strong>Atenção:</strong> Como seu usuário não possui CRQ cadastrado, é obrigatório selecionar um responsável técnico.
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Responsável Técnico</Label>
                            <Select
                                value={technicalResponsibleId}
                                onValueChange={handleResponsibleChange}
                                disabled={readOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o responsável..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {technicalResponsibles?.map((resp) => (
                                        <SelectItem key={resp.id} value={resp.id}>
                                            {resp.name} ({resp.crq})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 4. Client Signature */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Assinatura do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center space-x-2">
                        <Checkbox
                            id="clientAbsent"
                            checked={clientAbsent}
                            onCheckedChange={(checked) => {
                                setClientAbsent(checked);
                                handleBlur('client_absent', checked);
                            }}
                            disabled={readOnly}
                        />
                        <Label htmlFor="clientAbsent" className="text-sm text-slate-600 cursor-pointer">
                            Responsável ausente (cliente não disponível para assinatura)
                        </Label>
                    </div>
                    {clientAbsent ? (
                        <p className="text-slate-400 italic text-sm">Assinatura não necessária - responsável ausente</p>
                    ) : (
                        readOnly ? (
                            visit.client_signature_url ? <img src={visit.client_signature_url} className="h-24 border rounded bg-slate-50" alt="Assinatura" /> : <p className="text-slate-400 italic">Não assinado</p>
                        ) : (
                            <SignaturePad savedUrl={visit.client_signature_url} onSave={handleSaveSignature} />
                        )
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
