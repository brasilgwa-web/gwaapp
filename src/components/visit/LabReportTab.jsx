import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    FileText,
    ExternalLink,
    Bot,
    FlaskConical,
    Loader2,
    PenLine,
    Upload,
    ShieldCheck,
    AlertTriangle,
    History,
    CheckCircle2,
    Copy,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Search
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/api/entities";
import { Core } from "@/api/integrations";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/context/ConfirmContext";
import { useAuth } from "@/context/AuthContext";
import { useReportData } from "@/hooks/useReportData";
import { analyzeLabReportWithAI } from "@/lib/gemini";
import { formatDateAsLocal } from "@/lib/utils";
import {
    EMPTY_LAB_METADATA,
    parseLabReportData,
    serializeLabReportData,
    buildValidatedOpinionText
} from "@/lib/labReportMetadataUtils";

export default function LabReportTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const { alert } = useConfirm();
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const debounceRef = useRef(null);

    // States
    const [comments, setComments] = useState('');
    const [aiDraft, setAiDraft] = useState('');
    const [editLog, setEditLog] = useState('');
    const [metadata, setMetadata] = useState({ ...EMPTY_LAB_METADATA });
    const [isEditing, setIsEditing] = useState(false);
    const [isUploadingLab, setIsUploadingLab] = useState(false);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [uploadedFileMemory, setUploadedFileMemory] = useState(null); // { base64, mimeType, name }
    const [showHistory, setShowHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(5);
    const [historyFetchLimit, setHistoryFetchLimit] = useState(30);
    const [expandedHistoryIds, setExpandedHistoryIds] = useState({});

    // Fetch equipment/test VMP structure for this visit to cross-reference in AI
    const { data: reportData } = useReportData(visit.id);

    // Lightweight count of historical lab reports (so header shows count even while collapsed)
    const { data: historyTotalCount } = useQuery({
        queryKey: ['clientLabHistoryCount', visit.client_id, visit.id],
        queryFn: async () => {
            if (!visit.client_id) return 0;
            const { count, error } = await supabase
                .from('visits')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', visit.client_id)
                .neq('id', visit.id)
                .or('lab_report_url.not.is.null,lab_report_comments.not.is.null');
            if (error) return 0;
            return count || 0;
        },
        enabled: !!visit.client_id
    });

    // Fetch Historical Lab Reports for this Client (Entregável #2 — Lazy + Server-Filtered + Projected)
    const { data: historicalLabVisits, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['clientLabHistory', visit.client_id, visit.id, historyFetchLimit],
        queryFn: async () => {
            if (!visit.client_id) return [];
            const { data, error } = await supabase
                .from('visits')
                .select('id, visit_date, lab_report_url, lab_report_comments')
                .eq('client_id', visit.client_id)
                .neq('id', visit.id)
                .or('lab_report_url.not.is.null,lab_report_comments.not.is.null')
                .order('visit_date', { ascending: false })
                .limit(historyFetchLimit);
            if (error) {
                console.warn('Fallback history query:', error);
                const fallbackVisits = await Visit.filter({ client_id: visit.client_id }, '-visit_date', historyFetchLimit);
                return (fallbackVisits || []).filter(v => v.id !== visit.id && (v.lab_report_url || v.lab_report_comments));
            }
            return data || [];
        },
        enabled: !!visit.client_id && showHistory
    });

    // Build VMP limits text from client's configured equipments
    const equipmentLimitsText = useMemo(() => {
        if (!reportData?.fullReportStructure?.length) return '';
        const lines = [];
        reportData.fullReportStructure.forEach(loc => {
            loc.equipments?.forEach(eq => {
                if (eq.tests?.length) {
                    lines.push(`Equipamento: ${eq.equipment.name} (${loc.location?.name || ''})`);
                    eq.tests.forEach(t => {
                        lines.push(`  - ${t.name}: VMP de ${t.min_value ?? '-'} a ${t.max_value ?? '-'} ${t.unit || ''}`);
                    });
                }
            });
        });
        return lines.join('\n');
    }, [reportData]);

    const isFieldDisabled = readOnly && !isEditing;

    // Load parsed state from visit
    useEffect(() => {
        const parsed = parseLabReportData(visit);
        setComments(parsed.comments);
        setAiDraft(parsed.aiDraft);
        setEditLog(parsed.editLog);
        setMetadata(parsed.metadata);
    }, [visit.lab_report_comments, visit.lab_report_metadata]);

    // Dual-layer mutation (saves both lab_report_comments and lab_report_metadata with fallback)
    const updateMutation = useMutation({
        mutationFn: async (payload) => {
            try {
                return await Visit.update(visit.id, payload);
            } catch (err) {
                // Fallback if lab_report_metadata column hasn't been added via SQL migration yet
                if (payload.lab_report_metadata !== undefined) {
                    const { lab_report_metadata, ...safePayload } = payload;
                    return await Visit.update(visit.id, safePayload);
                }
                throw err;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['fullReport', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['clientLabHistory', visit.client_id, visit.id] });
        },
        onError: (err) => {
            alert({ title: "Erro", message: "Erro ao salvar dados do laudo: " + err.message, type: "error" });
        }
    });

    const persistLabState = (nextComments, nextDraft, nextMeta, customLog = null) => {
        const logToUse = customLog || editLog || `Editado por ${user?.full_name || user?.name || user?.email || 'Técnico'} em ${new Date().toLocaleString('pt-BR')}`;
        setEditLog(logToUse);

        const serialized = serializeLabReportData({
            comments: nextComments,
            aiDraft: nextDraft,
            editLog: logToUse,
            metadata: nextMeta
        });

        updateMutation.mutate(serialized);
    };

    const handleCommentsChange = (value) => {
        if (isFieldDisabled) return;
        setComments(value);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            persistLabState(value, aiDraft, metadata);
        }, 1500);
    };

    const handleCommentsBlur = () => {
        if (isFieldDisabled) return;
        clearTimeout(debounceRef.current);
        persistLabState(comments, aiDraft, metadata);
    };

    const handleMetadataFieldChange = (field, value) => {
        if (isFieldDisabled) return;
        const nextMeta = { ...metadata, [field]: value, validated: false };
        setMetadata(nextMeta);
    };

    const handleMetadataBlur = () => {
        if (isFieldDisabled) return;
        persistLabState(comments, aiDraft, metadata);
    };

    // Entregável #3: Upload de Laudo (PDF ou Print/Imagem) durante a visita
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingLab(true);
        try {
            // Read file into base64 for immediate AI Vision analysis
            const base64DataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
            setUploadedFileMemory({ base64: base64DataUrl, mimeType, name: file.name });

            // 1. Upload to Supabase Storage
            const { file_url } = await Core.UploadFile({ file });
            let finalUrl = file_url;

            // 2. If client has Google Drive folder and file is PDF, also try uploading to Drive
            const driveFolderId = visit.client?.google_drive_folder_id;
            if (driveFolderId && mimeType === 'application/pdf' && file_url && !file_url.includes('placehold.co')) {
                try {
                    const driveRes = await fetch('/api/upload-drive', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fileUrl: file_url,
                            fileName: `LAUDO_${file.name}`,
                            folderId: driveFolderId
                        })
                    });
                    if (driveRes.ok) {
                        const driveData = await driveRes.json().catch(() => null);
                        if (driveData?.webViewLink) {
                            finalUrl = driveData.webViewLink;
                        }
                    }
                } catch (driveErr) {
                    console.warn('Upload Drive opcional ignorado, mantendo link do Storage:', driveErr);
                }
            }

            // 3. Save URL on Visit
            await updateMutation.mutateAsync({
                lab_report_status: true,
                lab_report_url: finalUrl
            });

            // 4. Automatically trigger AI Vision scan on the uploaded file
            await runAiVisionAnalysis(base64DataUrl, mimeType, file.name);

        } catch (err) {
            console.error('Erro no upload do laudo:', err);
            alert({ title: "Erro no Upload", message: err.message || "Não foi possível anexar o arquivo do laudo.", type: "error" });
        } finally {
            setIsUploadingLab(false);
            if (e.target) e.target.value = '';
        }
    };

    // Entregável #6: Leitura Multimodal do Laudo via Gemini Vision + Confrontação com VMP
    const runAiVisionAnalysis = async (base64Input, mimeTypeInput, fileNameInput) => {
        setIsAnalyzingAI(true);
        try {
            let base64ToUse = base64Input || uploadedFileMemory?.base64;
            let mimeToUse = mimeTypeInput || uploadedFileMemory?.mimeType || 'application/pdf';
            const fileNameToUse = fileNameInput || uploadedFileMemory?.name || decodeURIComponent(visit.lab_report_url?.split('/').pop()?.split('?')[0] || '');

            if (!base64ToUse && visit.lab_report_url && !visit.lab_report_url.includes('drive.google.com')) {
                try {
                    const resp = await fetch(visit.lab_report_url);
                    if (resp.ok) {
                        const blob = await resp.blob();
                        mimeToUse = blob.type || 'application/pdf';
                        base64ToUse = await new Promise((res, rej) => {
                            const r = new FileReader();
                            r.onload = () => res(r.result);
                            r.onerror = rej;
                            r.readAsDataURL(blob);
                        });
                    }
                } catch (fetchErr) {
                    console.warn('Não foi possível baixar o arquivo existente via URL:', fetchErr);
                }
            }

            if (!base64ToUse) {
                alert({
                    title: "Selecione o Arquivo ou Print do Laudo",
                    message: "Para a IA ler todas as tabelas e metadados com precisão, clique em 'Anexar Laudo / Print (PDF ou Imagem)' e selecione o arquivo do laudo.",
                    type: "warning"
                });
                return;
            }

            const result = await analyzeLabReportWithAI({
                fileBase64: base64ToUse,
                mimeType: mimeToUse,
                fileName: fileNameToUse,
                clientName: visit.client?.name || '',
                equipmentLimitsText
            });

            const nextMeta = {
                ...metadata,
                report_number: result.report_number || metadata.report_number || '',
                collection_date: result.collection_date || metadata.collection_date || '',
                release_date: result.release_date || metadata.release_date || '',
                sampling_point: result.sampling_point || metadata.sampling_point || '',
                parameters_summary: result.parameters_summary || [],
                validated: false,
                validated_by: '',
                validated_at: ''
            };

            const nextDraft = result.technical_opinion || aiDraft;
            setMetadata(nextMeta);
            setAiDraft(nextDraft);

            const scanLog = `Leitura preliminar por IA gerada em ${new Date().toLocaleString('pt-BR')} (Aguardando validação técnica)`;
            persistLabState(comments, nextDraft, nextMeta, scanLog);

        } catch (err) {
            console.error('Erro na leitura IA do laudo:', err);
            alert({ title: "Erro na Leitura por IA", message: err.message || "Falha ao analisar o laudo com IA.", type: "error" });
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    // Entregável #7: Validação e Autorização Formal do Técnico (Human-in-the-Loop)
    const handleValidateAndInclude = () => {
        if (!aiDraft?.trim()) {
            alert({ title: "Aviso", message: "Não há parecer preliminar de IA preenchido para validar.", type: "warning" });
            return;
        }

        const techIdentifier = user?.full_name || user?.name || user?.email || 'Responsável Técnico';
        const crqSuffix = user?.crq ? ` (${user.crq})` : '';
        const timestamp = new Date().toLocaleString('pt-BR');

        const formattedBlock = buildValidatedOpinionText({
            metadata,
            opinionText: aiDraft
        });

        const nextComments = comments?.trim()
            ? (comments.includes(aiDraft.trim()) ? comments : `${comments.trim()}\n\n${formattedBlock}`)
            : formattedBlock;

        const validationStamp = `Validado e autorizado tecnicamente por ${techIdentifier}${crqSuffix} em ${timestamp}`;

        const nextMeta = {
            ...metadata,
            validated: true,
            validated_by: `${techIdentifier}${crqSuffix}`,
            validated_at: new Date().toISOString()
        };

        setComments(nextComments);
        setMetadata(nextMeta);
        persistLabState(nextComments, aiDraft, nextMeta, validationStamp);

        alert({
            title: "Parecer Validado com Sucesso",
            message: "O parecer analítico e os metadados regulatórios foram chancelados e incorporados aos comentários oficiais.",
            type: "success"
        });
    };

    return (
        <div className="space-y-6 pb-10">
            {/* 1. Card de Upload e Visualização do Laudo (Entregáveis #3 e #6) */}
            <Card className="border-blue-200 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 bg-slate-50/60 border-b">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                            <FlaskConical className="w-5 h-5 text-blue-600" />
                            Laudo Analítico do Laboratório
                        </CardTitle>
                        <CardDescription>
                            Faça o upload direto do laudo (PDF ou Print/Imagem) durante a visita ou consulte o arquivo sincronizado via Google Drive.
                        </CardDescription>
                    </div>

                    {!isFieldDisabled && (
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploadingLab || isAnalyzingAI}
                            />
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingLab || isAnalyzingAI}
                            >
                                {isUploadingLab ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando e Lendo...</>
                                ) : (
                                    <><Upload className="w-4 h-4 mr-2" />Anexar Laudo / Print (PDF ou Imagem)</>
                                )}
                            </Button>

                            {(uploadedFileMemory || visit.lab_report_url) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                    onClick={() => runAiVisionAnalysis()}
                                    disabled={isAnalyzingAI}
                                >
                                    {isAnalyzingAI ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando VMP...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4 mr-2" />Reanalisar com IA</>
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="pt-4">
                    {visit.lab_report_url ? (
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-blue-50/50 border border-blue-200 rounded-md gap-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                                <div>
                                    <span className="font-semibold text-slate-800 text-sm block">
                                        {uploadedFileMemory?.name ? `Laudo Anexado: ${uploadedFileMemory.name}` : 'Laudo Laboratorial Vinculado à Visita'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Disponível para consulta técnica e auditoria
                                    </span>
                                </div>
                            </div>
                            <a href={visit.lab_report_url} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                                <Button variant="outline" size="sm" className="w-full md:w-auto text-blue-700 border-blue-300 bg-white hover:bg-blue-50">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Visualizar Laudo Original
                                </Button>
                            </a>
                        </div>
                    ) : (
                        <div className="p-4 border border-dashed border-slate-300 rounded-md bg-slate-50 text-center space-y-2">
                            <p className="text-sm text-slate-600 font-medium">Nenhum laudo anexado a esta visita até o momento.</p>
                            <p className="text-xs text-slate-500">
                                Clique em <strong>"Anexar Laudo / Print (PDF ou Imagem)"</strong> acima para enviar o arquivo e iniciar a varredura automática com IA.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. Card de Assistente IA + Metadados Regulatórios + Validação Humana Obrigatória (Entregáveis #6 e #7) */}
            <Card className="border-slate-300 bg-slate-50/70 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                            <Bot className="w-5 h-5 text-purple-600" />
                            🤖 Parecer Analítico Sugerido por IA (Leitura Multimodal & Confronto VMP)
                        </CardTitle>

                        {metadata.validated ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                                <ShieldCheck className="w-4 h-4" />
                                VALIDADO PELO RESPONSÁVEL TÉCNICO
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                VALIDAÇÃO HUMANA OBRIGATÓRIA
                            </span>
                        )}
                    </div>
                    <CardDescription>
                        Confira os 4 metadados regulatórios extraídos e revise o parecer preliminar antes de autorizar sua inclusão nos comentários oficiais.
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                    {/* Quadro dos 4 Metadados Regulatórios Obrigatórios */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-md border border-slate-200">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Nº do Relatório (Laudo)</Label>
                            <Input
                                value={metadata.report_number}
                                onChange={(e) => handleMetadataFieldChange('report_number', e.target.value)}
                                onBlur={handleMetadataBlur}
                                placeholder="Ex: WGA-LAB-2026-088"
                                className="h-8 text-xs font-semibold text-sky-800 bg-slate-50/50"
                                disabled={isFieldDisabled}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Data de Coleta</Label>
                            <Input
                                value={metadata.collection_date}
                                onChange={(e) => handleMetadataFieldChange('collection_date', e.target.value)}
                                onBlur={handleMetadataBlur}
                                placeholder="DD/MM/AAAA"
                                className="h-8 text-xs bg-slate-50/50"
                                disabled={isFieldDisabled}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Data da Liberação</Label>
                            <Input
                                value={metadata.release_date}
                                onChange={(e) => handleMetadataFieldChange('release_date', e.target.value)}
                                onBlur={handleMetadataBlur}
                                placeholder="DD/MM/AAAA"
                                className="h-8 text-xs bg-slate-50/50"
                                disabled={isFieldDisabled}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-600">Ponto de Amostragem</Label>
                            <Input
                                value={metadata.sampling_point}
                                onChange={(e) => handleMetadataFieldChange('sampling_point', e.target.value)}
                                onBlur={handleMetadataBlur}
                                placeholder="Ex: Caldeira B-01"
                                className="h-8 text-xs bg-slate-50/50"
                                disabled={isFieldDisabled}
                            />
                        </div>
                    </div>

                    {/* Resumo dos Parâmetros Extraídos vs VMP (quando presente) */}
                    {Array.isArray(metadata.parameters_summary) && metadata.parameters_summary.length > 0 && (
                        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                            <div className="px-3 py-1.5 bg-slate-100 border-b text-xs font-bold text-slate-700">
                                Parâmetros Identificados no Laudo vs. Limites (VMP)
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 text-slate-500 border-b">
                                        <tr>
                                            <th className="px-3 py-1.5 text-left">Parâmetro</th>
                                            <th className="px-3 py-1.5 text-center">Resultado Lido</th>
                                            <th className="px-3 py-1.5 text-center">VMP / Referência</th>
                                            <th className="px-3 py-1.5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {metadata.parameters_summary.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-1.5 font-medium text-slate-800">{item.parameter}</td>
                                                <td className="px-3 py-1.5 text-center font-mono">{item.value}</td>
                                                <td className="px-3 py-1.5 text-center text-slate-500">{item.vmp || '-'}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        String(item.status).toUpperCase().includes('CRIT') || String(item.status).toUpperCase().includes('FORA')
                                                            ? 'bg-red-100 text-red-700'
                                                            : String(item.status).toUpperCase().includes('ALERT')
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {item.status || 'OK'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Editor do Parecer Preliminar da IA */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">
                            Parecer Técnico Preliminar da IA (Editável pelo Responsável Técnico antes da aprovação):
                        </Label>
                        <Textarea
                            value={aiDraft}
                            onChange={(e) => {
                                if (isFieldDisabled) return;
                                setAiDraft(e.target.value);
                                setMetadata(prev => ({ ...prev, validated: false }));
                            }}
                            onBlur={() => {
                                if (!isFieldDisabled) persistLabState(comments, aiDraft, metadata);
                            }}
                            placeholder="O parecer técnico preliminar gerado pela IA aparecerá aqui após anexar o PDF ou Print do laudo (ou digite/ajuste manualmente)..."
                            className="min-h-[110px] bg-white text-xs leading-relaxed border-slate-300"
                            disabled={isFieldDisabled}
                        />
                    </div>

                    {/* Barra de Chancela e Autorização Mandatória (Human-in-the-Loop) */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-md bg-sky-50 border border-sky-200">
                        <div className="space-y-1">
                            <p className="text-xs text-sky-900 font-medium">
                                Ao autorizar, o parecer e os metadados serão incorporados aos comentários oficiais sob assinatura e responsabilidade técnica do emissor.
                            </p>
                            {metadata.validated && metadata.validated_by && (
                                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Autorizado por {metadata.validated_by}
                                </p>
                            )}
                        </div>

                        {!isFieldDisabled && (
                            <Button
                                type="button"
                                onClick={handleValidateAndInclude}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0"
                            >
                                <ShieldCheck className="w-4 h-4 mr-1.5" />
                                ✓ Validar e Incluir nos Comentários
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. Comentários Oficiais do Laudo (Incorporados após Validação) */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Comentários Complementares / Parecer Técnico Oficial</CardTitle>
                        <CardDescription>
                            Texto final validado pelo responsável técnico referente aos ensaios laboratoriais.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="includeInReport"
                                checked={metadata.include_in_report !== false}
                                onCheckedChange={(checked) => {
                                    if (isFieldDisabled) return;
                                    const nextMeta = { ...metadata, include_in_report: Boolean(checked) };
                                    setMetadata(nextMeta);
                                    persistLabState(comments, aiDraft, nextMeta);
                                }}
                                disabled={isFieldDisabled}
                            />
                            <Label htmlFor="includeInReport" className="text-xs text-slate-600 cursor-pointer">
                                Exibir também no Relatório PDF da Visita
                            </Label>
                        </div>

                        {readOnly && !isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <PenLine className="w-4 h-4 mr-2" />
                                Editar Comentários
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={comments}
                        onChange={(e) => handleCommentsChange(e.target.value)}
                        onBlur={handleCommentsBlur}
                        className={`min-h-[150px] ${isFieldDisabled ? 'bg-slate-50 opacity-75' : 'bg-white'}`}
                        placeholder="Os comentários validados pelo responsável técnico constarão aqui..."
                        disabled={isFieldDisabled}
                    />

                    {editLog && (comments || metadata.validated) && (
                        <div className="mt-2 text-xs text-slate-600 italic flex items-center justify-end">
                            <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                {editLog}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. Consulta ao Histórico de Laudos do Cliente (Entregável #2) */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setShowHistory(!showHistory)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                                <History className="w-5 h-5 text-blue-600" />
                                Histórico de Laudos do Cliente ({historyTotalCount ?? historicalLabVisits?.length ?? 0})
                            </CardTitle>
                            <CardDescription>
                                Consulte laudos analíticos e pareceres de visitas anteriores deste cliente sem sair da tela.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" type="button">
                            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    </div>
                </CardHeader>

                {showHistory && (
                    <CardContent className="pt-2">
                        {isLoadingHistory ? (
                            <div className="py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                Carregando histórico de laudos...
                            </div>
                        ) : !historicalLabVisits || historicalLabVisits.length === 0 ? (
                            <p className="text-sm text-slate-500 italic py-4 text-center">
                                Nenhum laudo anterior encontrado no histórico deste cliente.
                            </p>
                        ) : (() => {
                            const normalizedSearch = historySearch.trim().toLowerCase();
                            const parsedList = historicalLabVisits.map(hv => ({
                                visit: hv,
                                parsed: parseLabReportData(hv),
                                dateStr: formatDateAsLocal(hv.visit_date)
                            }));
                            const filteredList = normalizedSearch
                                ? parsedList.filter(({ parsed, dateStr }) => {
                                    const haystack = [
                                        dateStr,
                                        parsed.metadata?.report_number,
                                        parsed.metadata?.sampling_point,
                                        parsed.metadata?.collection_date,
                                        parsed.comments,
                                        parsed.aiDraft
                                    ].filter(Boolean).join(' ').toLowerCase();
                                    return haystack.includes(normalizedSearch);
                                })
                                : parsedList;
                            const visibleList = filteredList.slice(0, visibleHistoryCount);

                            return (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={historySearch}
                                            onChange={(e) => {
                                                setHistorySearch(e.target.value);
                                                setVisibleHistoryCount(5);
                                            }}
                                            placeholder="Buscar por Nº do laudo, ponto de amostragem, data ou parâmetro..."
                                            className="pl-9 h-9 text-xs bg-slate-50"
                                        />
                                    </div>

                                    {filteredList.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic py-4 text-center">
                                            Nenhum laudo encontrado para "{historySearch}".
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                                            {visibleList.map(({ visit: histVisit, parsed: histParsed, dateStr }) => {
                                                const summaryText = histParsed.comments || histParsed.aiDraft || 'Laudo anexado sem comentários adicionais.';
                                                const isItemExpanded = Boolean(expandedHistoryIds[histVisit.id]);
                                                return (
                                                    <div
                                                        key={histVisit.id}
                                                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col gap-2"
                                                    >
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-800">
                                                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                                    Visita: {dateStr}
                                                                </span>
                                                                {histParsed.metadata?.report_number && (
                                                                    <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                                                                        Laudo Nº {histParsed.metadata.report_number}
                                                                    </span>
                                                                )}
                                                                {histParsed.metadata?.sampling_point && (
                                                                    <span className="text-slate-600">
                                                                        • Ponto: {histParsed.metadata.sampling_point}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {histVisit.lab_report_url && (
                                                                    <a href={histVisit.lab_report_url} target="_blank" rel="noopener noreferrer">
                                                                        <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs text-blue-600 border-blue-200">
                                                                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                                            Abrir PDF
                                                                        </Button>
                                                                    </a>
                                                                )}
                                                                {!isFieldDisabled && (histParsed.comments || histParsed.aiDraft) && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                                                                        title="Copiar texto para o rascunho atual"
                                                                        onClick={() => {
                                                                            const textToCopy = histParsed.comments || histParsed.aiDraft;
                                                                            setAiDraft(prev => prev ? `${prev}\n\n[Ref. ${dateStr}]: ${textToCopy}` : textToCopy);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                                                        Usar Ref.
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div
                                                            onClick={() => setExpandedHistoryIds(prev => ({ ...prev, [histVisit.id]: !prev[histVisit.id] }))}
                                                            className="cursor-pointer group"
                                                        >
                                                            <p className={`text-xs text-slate-600 whitespace-pre-line ${isItemExpanded ? '' : 'line-clamp-2'}`}>
                                                                {summaryText}
                                                            </p>
                                                            {summaryText.length > 140 && (
                                                                <span className="text-[11px] font-medium text-blue-600 group-hover:underline inline-block mt-0.5">
                                                                    {isItemExpanded ? 'Recolher parecer ▲' : 'Ler parecer completo ▼'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {(filteredList.length > visibleHistoryCount || (historicalLabVisits.length >= historyFetchLimit && (historyTotalCount || 0) > historyFetchLimit)) && (
                                        <div className="pt-1 flex justify-center">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                                                onClick={() => {
                                                    const nextVisible = visibleHistoryCount + 5;
                                                    setVisibleHistoryCount(nextVisible);
                                                    if (nextVisible > historicalLabVisits.length && (historyTotalCount || 0) > historyFetchLimit) {
                                                        setHistoryFetchLimit(prev => prev + 30);
                                                    }
                                                }}
                                            >
                                                Ver mais laudos (+5) — Exibindo {visibleList.length} de {normalizedSearch ? filteredList.length : (historyTotalCount || filteredList.length)}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {false && (
                            <div className="hidden">
                                {historicalLabVisits.map(histVisit => {
                                    const histParsed = parseLabReportData(histVisit);
                                    const summaryText = histParsed.comments || histParsed.aiDraft || 'Laudo anexado sem comentários adicionais.';
                                    return (
                                        <div
                                            key={histVisit.id}
                                            className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-800">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                        Visita: {formatDateAsLocal(histVisit.visit_date)}
                                                    </span>
                                                    {histParsed.metadata?.report_number && (
                                                        <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                                                            Laudo Nº {histParsed.metadata.report_number}
                                                        </span>
                                                    )}
                                                    {histParsed.metadata?.sampling_point && (
                                                        <span className="text-slate-600">
                                                            • Ponto: {histParsed.metadata.sampling_point}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-2">
                                                    {summaryText}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {histVisit.lab_report_url && (
                                                    <a href={histVisit.lab_report_url} target="_blank" rel="noopener noreferrer">
                                                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs text-blue-600 border-blue-200">
                                                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                            Abrir Laudo
                                                        </Button>
                                                    </a>
                                                )}
                                                {!isFieldDisabled && (histParsed.comments || histParsed.aiDraft) && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-xs text-slate-600 hover:text-slate-900"
                                                        title="Copiar texto para o rascunho atual"
                                                        onClick={() => {
                                                            const textToCopy = histParsed.comments || histParsed.aiDraft;
                                                            setAiDraft(prev => prev ? `${prev}\n\n[Ref. ${formatDateAsLocal(histVisit.visit_date)}]: ${textToCopy}` : textToCopy);
                                                        }}
                                                    >
                                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                                        Usar Ref.
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
