import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    FileText,
    ExternalLink,
    Bot,
    FlaskConical,
    PenLine,
    History,
    ChevronDown,
    ChevronUp,
    Search,
    Loader2,
    Copy
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/api/entities";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/context/ConfirmContext";
import { useAuth } from "@/context/AuthContext";
import { formatDateAsLocal } from "@/lib/utils";
import { parseLabReportData, serializeLabReportData } from "@/lib/labReportMetadataUtils";

export default function LabReportTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const { alert } = useConfirm();
    const { user } = useAuth();

    const [comments, setComments] = useState('');
    const [aiDraft, setAiDraft] = useState('');
    const [editLog, setEditLog] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Historical Lab Reports state
    const [showHistory, setShowHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(5);
    const [historyFetchLimit, setHistoryFetchLimit] = useState(30);
    const [expandedHistoryIds, setExpandedHistoryIds] = useState({});

    const debounceRef = useRef(null);

    // Derived state
    const isFieldDisabled = readOnly && !isEditing;

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

    // Fetch Historical Lab Reports for this Client (Lazy + Server-Filtered + Projected)
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

    useEffect(() => {
        if (visit.lab_report_comments) {
            const parsed = parseLabReportData(visit);
            setComments(parsed.comments || '');
            setAiDraft(parsed.aiDraft || '');
            setEditLog(parsed.editLog || '');
        }
    }, [visit.lab_report_comments]);

    const updateMutation = useMutation({
        mutationFn: (data) => Visit.update(visit.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
        },
        onError: (err) => {
            alert({ title: "Erro", message: "Erro ao salvar: " + err.message, type: "error" });
        }
    });

    const saveToServer = (textToSave, draftToSave) => {
        const logText = `Editado por ${user?.name || user?.email || 'Técnico'} em ${new Date().toLocaleString('pt-BR')}`;
        setEditLog(logText);

        const existingParsed = parseLabReportData(visit);
        const serialized = serializeLabReportData({
            comments: textToSave,
            aiDraft: draftToSave,
            editLog: textToSave ? logText : '',
            metadata: existingParsed.metadata || {}
        });

        updateMutation.mutate({ lab_report_comments: serialized.lab_report_comments });
    };

    const handleCommentsChange = (value) => {
        if (isFieldDisabled) return;
        setComments(value);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            saveToServer(value, aiDraft);
        }, 1500);
    };

    const handleCommentsBlur = () => {
        if (isFieldDisabled) return;
        clearTimeout(debounceRef.current);
        saveToServer(comments, aiDraft);
    };

    const handleGenerateAI = () => {
        if (!aiDraft) {
            alert({ title: "Aviso", message: "Nenhuma análise de IA disponível para este laudo.", type: "warning" });
            return;
        }
        const newComments = comments ? comments + "\n\n" + aiDraft : aiDraft;
        setComments(newComments);
        saveToServer(newComments, aiDraft);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-blue-600" />
                            Laudo do Laboratório
                        </CardTitle>
                        <CardDescription>Arquivo sincronizado via Google Drive</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {visit.lab_report_url ? (
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-slate-50 border rounded-md gap-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <span className="font-medium text-slate-700">Laudo Disponível</span>
                            </div>
                            <a href={visit.lab_report_url} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                                <Button variant="outline" size="sm" className="w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-50">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Visualizar Laudo
                                </Button>
                            </a>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">Nenhum laudo sincronizado para esta visita.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Comentários Complementares</CardTitle>
                        <CardDescription>Adicione observações sobre os resultados do laboratório.</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        {readOnly && !isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <PenLine className="w-4 h-4 mr-2" />
                                Editar Comentários
                            </Button>
                        )}
                        {(!isFieldDisabled) && (
                            <Button variant="outline" size="sm" onClick={handleGenerateAI} className="bg-purple-50 text-purple-600 border-purple-200">
                                <Bot className="w-4 h-4 mr-2" />
                                Preencher com IA
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
                        placeholder="Escreva seus comentários aqui..."
                        disabled={isFieldDisabled}
                    />

                    {editLog && comments && (
                        <div className="mt-2 text-xs text-slate-500 italic flex items-center justify-end">
                            <span className="bg-slate-100 px-2 py-1 rounded">
                                {editLog}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Consulta ao Histórico de Laudos do Cliente (Entregável #2) */}
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
                                                                        title="Copiar texto para os comentários atuais"
                                                                        onClick={() => {
                                                                            const textToCopy = histParsed.comments || histParsed.aiDraft;
                                                                            const nextComments = comments
                                                                                ? `${comments}\n\n[Ref. ${dateStr}]: ${textToCopy}`
                                                                                : `[Ref. ${dateStr}]: ${textToCopy}`;
                                                                            setComments(nextComments);
                                                                            saveToServer(nextComments, aiDraft);
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
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
