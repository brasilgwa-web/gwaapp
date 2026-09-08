import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ExternalLink, Bot, FlaskConical, Loader2, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/api/entities";
import { useConfirm } from "@/context/ConfirmContext";

export default function LabReportTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const { alert } = useConfirm();

    const [comments, setComments] = useState('');
    const [aiDraft, setAiDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (visit.lab_report_comments) {
            if (visit.lab_report_comments.includes('---AI_DRAFT---')) {
                const parts = visit.lab_report_comments.split('---AI_DRAFT---');
                setComments(parts[0].trim());
                setAiDraft(parts[1]?.trim() || '');
            } else {
                setComments(visit.lab_report_comments);
                setAiDraft('');
            }
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

    const handleCommentsChange = (value) => {
        setComments(value);
        if (readOnly) return;
        
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const fullText = aiDraft ? `${value}\n\n---AI_DRAFT---\n${aiDraft}` : value;
            updateMutation.mutate({ lab_report_comments: fullText });
        }, 1500);
    };

    const handleCommentsBlur = () => {
        if (readOnly) return;
        clearTimeout(debounceRef.current);
        const fullText = aiDraft ? `${comments}\n\n---AI_DRAFT---\n${aiDraft}` : comments;
        updateMutation.mutate({ lab_report_comments: fullText });
    };

    const handleGenerateAI = () => {
        if (!aiDraft) {
            alert({ title: "Aviso", message: "Nenhuma análise de IA disponível para este laudo.", type: "warning" });
            return;
        }
        const newComments = comments ? comments + "\n\n" + aiDraft : aiDraft;
        setComments(newComments);
        const fullText = aiDraft ? `${newComments}\n\n---AI_DRAFT---\n${aiDraft}` : newComments;
        updateMutation.mutate({ lab_report_comments: fullText });
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
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Comentários Complementares</CardTitle>
                        <CardDescription>Adicione observações sobre os resultados do laboratório.</CardDescription>
                    </div>
                    {!readOnly && aiDraft && (
                        <Button variant="outline" size="sm" onClick={handleGenerateAI} className="bg-purple-50 text-purple-600 border-purple-200">
                            <Bot className="w-4 h-4 mr-2" />
                            Preencher com IA
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={comments}
                        onChange={(e) => handleCommentsChange(e.target.value)}
                        onBlur={handleCommentsBlur}
                        className="min-h-[150px]"
                        placeholder="Escreva seus comentários aqui..."
                        disabled={readOnly}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
