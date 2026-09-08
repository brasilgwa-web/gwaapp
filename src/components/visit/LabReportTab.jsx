import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ExternalLink, Bot, FlaskConical, Loader2, Save, PenLine } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Visit } from "@/api/entities";
import { useConfirm } from "@/context/ConfirmContext";
import { useAuth } from "@/context/AuthContext";

export default function LabReportTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const { alert } = useConfirm();
    const { user } = useAuth();

    const [comments, setComments] = useState('');
    const [aiDraft, setAiDraft] = useState('');
    const [editLog, setEditLog] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    
    const debounceRef = useRef(null);

    // Derived state
    const isFieldDisabled = readOnly && !isEditing;

    useEffect(() => {
        if (visit.lab_report_comments) {
            let text = visit.lab_report_comments;
            let currentDraft = '';
            let currentLog = '';

            // Extract AI Draft
            if (text.includes('---AI_DRAFT---')) {
                const parts = text.split('---AI_DRAFT---');
                currentDraft = parts[1]?.trim() || '';
                text = parts[0];
            }

            // Extract Log
            if (text.includes('---LOG---')) {
                const parts = text.split('---LOG---');
                currentLog = parts[1]?.trim() || '';
                text = parts[0];
            }

            setComments(text.trim());
            setAiDraft(currentDraft);
            setEditLog(currentLog);
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
        
        let fullText = textToSave;
        if (textToSave) {
            fullText += `\n\n---LOG---\n${logText}`;
        }
        if (draftToSave) {
            fullText += `\n\n---AI_DRAFT---\n${draftToSave}`;
        }
        
        updateMutation.mutate({ lab_report_comments: fullText });
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
        </div>
    );
}
