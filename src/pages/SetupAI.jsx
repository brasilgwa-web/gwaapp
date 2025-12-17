import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Save, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SetupAI() {
    const queryClient = useQueryClient();
    const [prompt, setPrompt] = useState('');
    const [isSaved, setIsSaved] = useState(false);

    // Fetch current AI settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['aiSettings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ai_settings')
                .select('*')
                .eq('setting_key', 'technical_analysis_prompt')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching AI settings:', error);
                return null;
            }
            return data;
        }
    });

    // Initialize prompt from settings
    useEffect(() => {
        if (settings?.setting_value) {
            setPrompt(settings.setting_value);
        }
    }, [settings]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (newPrompt) => {
            const { error } = await supabase
                .from('ai_settings')
                .upsert({
                    setting_key: 'technical_analysis_prompt',
                    setting_value: newPrompt,
                    description: 'Prompt usado para gerar análise técnica automática via Gemini AI',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'setting_key' });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        },
        onError: (err) => {
            alert('Erro ao salvar: ' + err.message);
        }
    });

    const handleSave = () => {
        saveMutation.mutate(prompt);
    };

    const handleReset = () => {
        const defaultPrompt = `Você é um engenheiro químico sênior especializado em tratamento de água e efluentes da WGA Brasil.

DADOS DA VISITA TÉCNICA:
Cliente: {{client_name}}
Endereço: {{client_address}}

RESULTADOS ANALÍTICOS:
{{results}}

DOSAGENS APLICADAS:
{{dosages}}

OBSERVAÇÕES DO TÉCNICO:
{{observations}}

INSTRUÇÕES:
1. Analise os resultados acima de forma técnica e profissional
2. Identifique anomalias (valores fora da faixa, especialmente 🔴 e 🟡)
3. Sugira ações corretivas específicas quando necessário
4. Se tudo estiver OK, elogie a manutenção preventiva
5. Use linguagem técnica mas acessível
6. Seja conciso e direto (máximo 200 palavras)

FORMATO:
- Inicie com um resumo geral (1-2 frases)
- Liste anomalias encontradas se houver
- Finalize com recomendações práticas

Responda em português brasileiro:`;
        setPrompt(defaultPrompt);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Bot className="w-6 h-6 text-purple-600" />
                    Configurações de IA
                </h1>
                <p className="text-slate-500">Configure o prompt usado pela IA para gerar análises técnicas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Prompt de Análise Técnica</CardTitle>
                    <CardDescription>
                        Este texto é enviado ao Gemini AI junto com os dados da visita.
                        Use as variáveis abaixo para inserir dados dinâmicos:
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Variables Reference */}
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <h4 className="font-semibold text-purple-800 text-sm mb-2">Variáveis Disponíveis:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                            <div><code className="bg-purple-100 px-1 rounded">{"{{client_name}}"}</code> Nome do cliente</div>
                            <div><code className="bg-purple-100 px-1 rounded">{"{{client_address}}"}</code> Endereço</div>
                            <div><code className="bg-purple-100 px-1 rounded">{"{{results}}"}</code> Resultados analíticos</div>
                            <div><code className="bg-purple-100 px-1 rounded">{"{{dosages}}"}</code> Dosagens aplicadas</div>
                            <div><code className="bg-purple-100 px-1 rounded">{"{{observations}}"}</code> Observações do técnico</div>
                        </div>
                    </div>

                    {/* Prompt Editor */}
                    <div className="space-y-2">
                        <Label htmlFor="prompt" className="text-sm font-medium">Prompt</Label>
                        <Textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={20}
                            className="font-mono text-sm"
                            placeholder="Digite o prompt para a IA..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <Button variant="outline" onClick={handleReset}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Restaurar Padrão
                        </Button>
                        <Button onClick={handleSave} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : isSaved ? (
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {isSaved ? 'Salvo!' : 'Salvar Alterações'}
                        </Button>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-700">
                            <strong>Atenção:</strong> Alterações no prompt afetam todas as futuras análises de IA.
                            O prompt atual usa o modelo <code className="bg-amber-100 px-1 rounded">gemini-2.0-flash-exp</code>.
                            Mantenha as variáveis entre chaves duplas para inserção correta dos dados.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
