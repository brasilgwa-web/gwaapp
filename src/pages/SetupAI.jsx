import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/context/ConfirmContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Save, RefreshCw, AlertTriangle, CheckCircle2, Key, MessageSquare, Eye, EyeOff, Loader2, ShieldCheck, ShieldX } from "lucide-react";

// Fallback models shown when no API key is provided or validation hasn't run
const FALLBACK_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Mais Rápido)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemma-3-27b', label: 'Gemma 3 27B (Open Source)' },
];

export default function SetupAI() {
    const queryClient = useQueryClient();
    const { alert } = useConfirm();
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [maxTokens, setMaxTokens] = useState('2048');
    const [apiKey, setApiKey] = useState('');
    const [chatPrompt, setChatPrompt] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Dynamic model states
    const [availableModels, setAvailableModels] = useState(FALLBACK_MODELS);
    const [keyStatus, setKeyStatus] = useState('idle'); // 'idle' | 'validating' | 'valid' | 'invalid'
    const [keyError, setKeyError] = useState('');

    // Validate API key and fetch available models from Google API
    const validateAndFetchModels = useCallback(async (key) => {
        if (!key || !key.trim()) {
            setKeyStatus('idle');
            setKeyError('');
            setAvailableModels(FALLBACK_MODELS);
            return;
        }

        setKeyStatus('validating');
        setKeyError('');

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}&pageSize=100`
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `Erro ${response.status}`;
                setKeyStatus('invalid');
                setKeyError(
                    response.status === 400 ? 'Chave da API inválida.' :
                    response.status === 403 ? 'Chave da API sem permissão.' :
                    errMsg
                );
                setAvailableModels(FALLBACK_MODELS);
                return;
            }

            const data = await response.json();
            const models = (data.models || [])
                .filter(m =>
                    m.supportedGenerationMethods?.includes('generateContent') &&
                    !m.name?.includes('embedding') &&
                    !m.name?.includes('aqa')
                )
                .map(m => {
                    const id = m.name.replace('models/', '');
                    return {
                        value: id,
                        label: m.displayName || id,
                    };
                })
                // Sort: Gemini 2.5 first, then 2.0, then others
                .sort((a, b) => {
                    const order = (v) => {
                        if (v.includes('2.5')) return 0;
                        if (v.includes('2.0')) return 1;
                        if (v.includes('1.5')) return 2;
                        return 3;
                    };
                    return order(a.value) - order(b.value);
                });

            if (models.length === 0) {
                setKeyStatus('invalid');
                setKeyError('Nenhum modelo compatível encontrado para esta chave.');
                setAvailableModels(FALLBACK_MODELS);
                return;
            }

            setAvailableModels(models);
            setKeyStatus('valid');

            // If current model is not in the new list, auto-select the first available
            if (!models.find(m => m.value === model)) {
                setModel(models[0].value);
            }
        } catch (err) {
            setKeyStatus('invalid');
            setKeyError('Erro de conexão ao validar a chave.');
            setAvailableModels(FALLBACK_MODELS);
        }
    }, [model]);

    // Fetch current AI settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['aiSettings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ai_settings')
                .select('*');

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching AI settings:', error);
                return [];
            }
            return data || [];
        }
    });

    // Initialize form from settings
    useEffect(() => {
        if (settings?.length) {
            const promptSetting = settings.find(s => s.setting_key === 'technical_analysis_prompt');
            const modelSetting = settings.find(s => s.setting_key === 'gemini_model');
            const tokensSetting = settings.find(s => s.setting_key === 'max_output_tokens');
            const apiKeySetting = settings.find(s => s.setting_key === 'gemini_api_key');
            const chatPromptSetting = settings.find(s => s.setting_key === 'chat_system_prompt');

            if (promptSetting?.setting_value) setPrompt(promptSetting.setting_value);
            if (modelSetting?.setting_value) setModel(modelSetting.setting_value);
            if (tokensSetting?.setting_value) setMaxTokens(tokensSetting.setting_value);
            if (apiKeySetting?.setting_value) {
                setApiKey(apiKeySetting.setting_value);
                // Auto-validate saved key on load
                validateAndFetchModels(apiKeySetting.setting_value);
            }
            if (chatPromptSetting?.setting_value) setChatPrompt(chatPromptSetting.setting_value);
        }
    }, [settings]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async ({ key, value, description }) => {
            const { error } = await supabase
                .from('ai_settings')
                .upsert({
                    setting_key: key,
                    setting_value: value,
                    description: description,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'setting_key' });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
        },
        onError: (err) => {
            alert({ title: 'Erro', message: 'Erro ao salvar: ' + err.message, type: 'error' });
        }
    });

    const handleSaveAll = async () => {
        try {
            await saveMutation.mutateAsync({
                key: 'gemini_model',
                value: model,
                description: 'Nome do modelo Gemini a ser usado'
            });
            await saveMutation.mutateAsync({
                key: 'max_output_tokens',
                value: maxTokens,
                description: 'Número máximo de tokens na resposta'
            });
            await saveMutation.mutateAsync({
                key: 'technical_analysis_prompt',
                value: prompt,
                description: 'Prompt usado para gerar análise técnica automática via Gemini AI'
            });
            // Salvar API key apenas se preenchida
            if (apiKey.trim()) {
                await saveMutation.mutateAsync({
                    key: 'gemini_api_key',
                    value: apiKey.trim(),
                    description: 'Chave da API do Gemini (sobrescreve .env)'
                });
            }
            // Salvar prompt do chat apenas se preenchido
            if (chatPrompt.trim()) {
                await saveMutation.mutateAsync({
                    key: 'chat_system_prompt',
                    value: chatPrompt.trim(),
                    description: 'Prompt do sistema para o assistente de chat'
                });
            }
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err) {
            // Error handled in mutation
        }
    };

    const DEFAULT_CHAT_PROMPT = `Você é um assistente técnico especialista em tratamento de águas da WGA Brasil.
Seu objetivo é ajudar o técnico de campo com dúvidas sobre o relatório, análises químicas, dosagens ou interpretação de resultados.

ESCOPO DE ATUAÇÃO E ASSUNTOS PERMITIDOS:
Você deve responder EXCLUSIVAMENTE sobre os seguintes temas:
1. WGA Limpeza de Reservatórios
2. Análises de Água
3. 3D TRASAR da Nalco
4. Tratamento de potabilidade
5. Tratamento de Água de Caldeiras
6. Tratamento de Água de Resfriamento
7. Tratamento de Efluentes
8. Biotecnologia
9. Economia e Reuso de Água

IMPORTANTE:
- Para qualquer assunto fora destes tópicos, responda educadamente que não pode ajudar com esse assunto.
- Mantenha o tom profissional e técnico.
- Responda de forma curta, direta e técnica.

VARIÁVEIS DISPONÍVEIS:
{{client_name}} - Nome do cliente
{{results}} - Resultados analíticos
{{dosages}} - Dosagens aplicadas`;

    const handleReset = () => {
        setModel('gemini-2.5-flash');
        setMaxTokens('2048');
        setPrompt(`Você é um engenheiro químico sênior especializado em tratamento de água e efluentes da WGA Brasil.

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

Responda em português brasileiro:`);
    };

    const handleResetChatPrompt = () => {
        setChatPrompt(DEFAULT_CHAT_PROMPT);
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
                <p className="text-slate-500">Configure o modelo e prompt usados pela IA para gerar análises técnicas.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Configurações do Modelo</CardTitle>
                    <CardDescription>Escolha o modelo Gemini e limite de tokens.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Model Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="model">Modelo Gemini</Label>
                                {keyStatus === 'valid' && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                        {availableModels.length} modelos disponíveis
                                    </span>
                                )}
                            </div>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o modelo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModels.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                {keyStatus === 'valid'
                                    ? 'Lista atualizada com base na sua API key.'
                                    : 'Valide sua API key para ver os modelos disponíveis.'
                                }
                            </p>
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-2">
                            <Label htmlFor="maxTokens">Máximo de Tokens</Label>
                            <Input
                                id="maxTokens"
                                type="number"
                                value={maxTokens}
                                onChange={(e) => setMaxTokens(e.target.value)}
                                min="256"
                                max="8192"
                                step="256"
                            />
                            <p className="text-xs text-slate-500">Controla o tamanho da resposta (recomendado: 2048).</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* API Key Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="w-5 h-5 text-amber-600" />
                        Chave da API Gemini
                    </CardTitle>
                    <CardDescription>
                        Configure e valide a chave da API do Gemini. A validação busca os modelos disponíveis automaticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        // Reset validation status when key changes
                                        if (keyStatus !== 'idle') {
                                            setKeyStatus('idle');
                                            setKeyError('');
                                            setAvailableModels(FALLBACK_MODELS);
                                        }
                                    }}
                                    placeholder="AIza..."
                                    className="pr-10 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => validateAndFetchModels(apiKey)}
                                disabled={!apiKey.trim() || keyStatus === 'validating'}
                                className="shrink-0"
                            >
                                {keyStatus === 'validating' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : keyStatus === 'valid' ? (
                                    <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />
                                ) : keyStatus === 'invalid' ? (
                                    <ShieldX className="w-4 h-4 mr-2 text-red-500" />
                                ) : (
                                    <Key className="w-4 h-4 mr-2" />
                                )}
                                {keyStatus === 'validating' ? 'Validando...' : 'Validar Chave'}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Insira sua chave da API do Google AI Studio (Gemini) e clique em "Validar Chave".
                        </p>
                    </div>

                    {/* Validation Status */}
                    {keyStatus === 'valid' && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-700">
                                Chave válida! ({apiKey.substring(0, 8)}...) — {availableModels.length} modelos disponíveis.
                            </span>
                        </div>
                    )}
                    {keyStatus === 'invalid' && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">
                            <ShieldX className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm text-red-700">
                                {keyError || 'Chave da API inválida ou sem permissão.'}
                            </span>
                        </div>
                    )}
                    {keyStatus === 'idle' && apiKey && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="text-sm text-amber-700">
                                Chave não validada. Clique em "Validar Chave" para verificar e carregar os modelos disponíveis.
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Prompt de Análise Técnica</CardTitle>
                    <CardDescription>
                        Este texto é enviado ao Gemini junto com os dados da visita.
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
                            rows={16}
                            className="font-mono text-sm"
                            placeholder="Digite o prompt para a IA..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-start pt-4 border-t">
                        <Button variant="outline" onClick={handleReset}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Restaurar Padrão
                        </Button>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-700">
                            <strong>Atenção:</strong> Alterações afetam todas as futuras análises de IA.
                            Modelo atual: <code className="bg-amber-100 px-1 rounded">{model}</code> |
                            Tokens: <code className="bg-amber-100 px-1 rounded">{maxTokens}</code>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Chat Prompt Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Prompt do Assistente de Chat
                    </CardTitle>
                    <CardDescription>
                        Configure o comportamento do assistente de chat durante as visitas técnicas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Variables Reference */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <h4 className="font-semibold text-blue-800 text-sm mb-2">Variáveis Disponíveis:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                            <div><code className="bg-blue-100 px-1 rounded">{"{{client_name}}"}</code> Nome do cliente</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{results}}"}</code> Resultados analíticos</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{dosages}}"}</code> Dosagens aplicadas</div>
                        </div>
                    </div>

                    {/* Chat Prompt Editor */}
                    <div className="space-y-2">
                        <Label htmlFor="chatPrompt" className="text-sm font-medium">Prompt do Sistema</Label>
                        <Textarea
                            id="chatPrompt"
                            value={chatPrompt}
                            onChange={(e) => setChatPrompt(e.target.value)}
                            rows={12}
                            className="font-mono text-sm"
                            placeholder="Digite o prompt do sistema para o chat assistente..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-start pt-2 border-t">
                        <Button variant="outline" onClick={handleResetChatPrompt}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Restaurar Padrão
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Save All Button - Fixed at bottom */}
            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveAll} disabled={saveMutation.isPending} size="lg">
                    {saveMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : isSaved ? (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {isSaved ? 'Salvo!' : 'Salvar Tudo'}
                </Button>
            </div>
        </div>
    );
}
