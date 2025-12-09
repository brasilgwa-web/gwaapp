import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { Visit } from "@/api/entities";
import { Core } from "@/api/integrations";
import { useAuth } from "@/context/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SignaturePad from "./SignaturePad";
import { Bot, Send, FileText, Loader2, ExternalLink, Mail, AlertTriangle, CheckCircle, Lock } from "lucide-react";
import { createPageUrl } from '../../utils';

export default function ReportTab({ visit, results, onUpdateVisit, readOnly, isAdmin }) {
    const queryClient = useQueryClient();
    const [observations, setObservations] = useState(visit.observations || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showSignatureDialog, setShowSignatureDialog] = useState(false);

    // Fetch Current User to check signature
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
            window.location.reload(); // Simple way to force AuthContext to re-fetch profile on load. 
            // Better: Expose a refreshUser function in AuthContext, but reload is robust for this MVP fix.
            setShowSignatureDialog(false);
        }
    });

    const handleSaveTechnicianSignature = (url) => {
        userUpdateMutation.mutate({ signature_url: url });
    };

    const updateMutation = useMutation({
        mutationFn: (data) => {
            const payload = { ...data };
            // Auto-advance status to in_progress if currently scheduled and not setting another status
            if (visit.status === 'scheduled' && !payload.status) {
                payload.status = 'in_progress';
            }
            return Visit.update(visit.id, payload);
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
            if (onUpdateVisit) onUpdateVisit();
            if (variables.client_signature_url) {
                alert("Assinatura salva com sucesso!");
            }
        },
        onError: (err) => {
            alert("Erro ao salvar: " + err.message);
        }
    });

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            // Prepare data for AI
            const context = {
                client: visit.client?.name,
                location: visit.location?.name,
                date: visit.visit_date,
                results: results?.map(r => ({
                    test: r.test_definition_id, // Ideally mapped to name
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

            const response = await Core.InvokeLLM({
                prompt: prompt,
                app_id: null,
                app_owner: null
            });

            // The response is a string
            setObservations(prev => (prev ? prev + "\n\n--- Análise IA ---\n" + response : response));
            updateMutation.mutate({ observations: (observations ? observations + "\n\n--- Análise IA ---\n" + response : response), ai_generated_analysis: true });
        } catch (error) {
            console.error("AI Error:", error);
            alert("Erro ao gerar análise IA. Verifique se as integrações estão ativas.");
        } finally {
            setIsGenerating(false);
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

    const handleSendReport = async () => {
        const confirmMsg = readOnly ? "Reenviar relatório por email?" : "Finalizar e enviar relatório por email?";
        if (!confirm(confirmMsg)) return;

        setIsSending(true);
        try {
            // 1. Ensure visit is completed (if not already)
            if (!readOnly) {
                await Visit.update(visit.id, { status: 'completed' });
            }

            // 2. Send Email
            const reportUrl = `${window.location.origin}/report/${visit.id}`;

            await Core.SendEmail({
                to: visit.client?.email,
                subject: `Relatório de Visita Técnica - ${visit.client?.name} - ${visit.visit_date}`,
                body: `
                    Olá,
                    
                    Segue o link para acessar o relatório da visita técnica realizada em ${visit.visit_date} na unidade ${visit.location?.name}.
                    
                    Acesse o relatório aqui: ${reportUrl}
                    
                    Atenciosamente,
                    Equipe WGA Brasil
                `
            });

            alert("Relatório finalizado e enviado com sucesso!");
            updateMutation.mutate({ status: 'synced' });

        } catch (error) {
            console.error("Send Error:", error);
            alert("Erro ao enviar relatório. Tente novamente.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Technician Signature Dialog */}
            <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assinatura do Técnico Necessária</DialogTitle>
                        <DialogDescription>
                            Para finalizar relatórios, você precisa cadastrar sua assinatura digital.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <SignaturePad onSave={handleSaveTechnicianSignature} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Warning if no signature */}
            {user && !user.signature_url && !showSignatureDialog && !readOnly && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                        <p className="text-sm text-yellow-700">
                            Você ainda não cadastrou sua assinatura.
                            <Button variant="link" className="text-yellow-800 underline pl-1" onClick={() => setShowSignatureDialog(true)}>
                                Clique aqui para cadastrar
                            </Button>
                        </p>
                    </div>
                </div>
            )}

            {readOnly && (
                <div className="bg-slate-100 border-l-4 border-slate-500 p-4 mb-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <Lock className="h-5 w-5 text-slate-500 mr-2" />
                        <p className="text-sm text-slate-700">
                            Visita finalizada. Modo somente leitura.
                        </p>
                    </div>
                    {isAdmin && (
                        <Button variant="outline" size="sm" onClick={handleReopen}>Reabrir Visita</Button>
                    )}
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Análise Técnica</CardTitle>
                    {!readOnly && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateAI}
                            disabled={isGenerating}
                            className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                        >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                            Gerar com IA
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        onBlur={() => !readOnly && updateMutation.mutate({ observations })}
                        className="min-h-[200px] font-normal disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="Descreva as observações da visita ou use a IA para gerar..."
                        disabled={readOnly}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Assinatura do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    {readOnly ? (
                        visit.client_signature_url ? (
                            <img src={visit.client_signature_url} className="h-24 border rounded bg-slate-50" alt="Assinatura" />
                        ) : <p className="text-slate-400 italic">Não assinado</p>
                    ) : (
                        <SignaturePad
                            savedUrl={visit.client_signature_url}
                            onSave={handleSaveSignature}
                        />
                    )}
                </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-10 flex flex-col md:flex-row items-center gap-3 md:static md:border-0 md:bg-transparent md:p-0">
                <a
                    href={`/report/${visit.id}`}
                    target="_blank"
                    className="w-full md:flex-1"
                >
                    <Button variant="outline" className="w-full">
                        <FileText className="w-4 h-4 mr-2" /> Visualizar PDF
                    </Button>
                </a>

                {!readOnly && (
                    <Button
                        className="w-full md:flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleFinalize}
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalizar
                    </Button>
                )}

                <Button
                    className="w-full md:flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleSendReport}
                    disabled={isSending}
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (readOnly ? <Mail className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />)}
                    {readOnly ? "Reenviar por Email" : "Finalizar e Enviar"}
                </Button>
            </div>
        </div>
    );
}