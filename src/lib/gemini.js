// Gemini AI Service for WGA Brasil
// Uses Google's Gemini API - Settings loaded from database

import { supabase } from './supabase';
import { Logger } from './logger';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Default values if DB settings not available
const DEFAULT_MODEL = 'gemini-1.5-pro';
const DEFAULT_MAX_TOKENS = 2048;

// Fetch AI settings from database
async function getAISettings() {
    try {
        const { data, error } = await supabase
            .from('ai_settings')
            .select('setting_key, setting_value');

        if (error) {
            console.warn('Could not load AI settings from DB, using defaults:', error);
            return {
                model: DEFAULT_MODEL,
                maxTokens: DEFAULT_MAX_TOKENS,
                prompt: null,
                apiKey: GEMINI_API_KEY,
                chatPrompt: null
            };
        }

        const settings = {};
        data?.forEach(s => {
            settings[s.setting_key] = s.setting_value;
        });

        return {
            model: settings.gemini_model || DEFAULT_MODEL,
            maxTokens: parseInt(settings.max_output_tokens) || DEFAULT_MAX_TOKENS,
            prompt: settings.technical_analysis_prompt || null,
            // Usar API key do banco se disponível, senão usar do .env
            apiKey: settings.gemini_api_key || GEMINI_API_KEY,
            chatPrompt: settings.chat_system_prompt || null
        };
    } catch (e) {
        console.warn('Error fetching AI settings:', e);
        return {
            model: DEFAULT_MODEL,
            maxTokens: DEFAULT_MAX_TOKENS,
            prompt: null,
            apiKey: GEMINI_API_KEY,
            chatPrompt: null
        };
    }
}

export async function generateTechnicalAnalysis(visitData) {
    // Load settings from DB (including API key)
    const aiSettings = await getAISettings();

    if (!aiSettings.apiKey) {
        console.error('API key not configured');
        throw new Error('API key não configurada. Configure nas Configurações de IA ou no arquivo .env');
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent`;

    const { client, results, dosages, observations, equipmentDataText } = visitData;

    Logger.info('AI_GENERATION', 'Starting generation', {
        clientId: client?.id,
        resultsCount: results?.length,
        hasEquipmentData: !!equipmentDataText,
        hasHistory: !!observations
    });

    // Build context from results (fallback se não tiver equipmentDataText)
    const resultsText = results?.map(r => {
        const status = r.status_light === 'red' ? '🔴 CRÍTICO' :
            r.status_light === 'yellow' ? '🟡 ALERTA' : '🟢 OK';
        const equipInfo = r.equipment_name ? ` (${r.equipment_name})` : '';
        return `- ${r.test_name || r.test_definition_id}${equipInfo}: ${r.measured_value} ${r.unit || ''} [${status}]`;
    }).join('\n') || '';

    // Build context from dosages
    const dosagesText = dosages?.map(d =>
        `- ${d.product_name || d.product?.name || 'Produto'}: Aplicado ${d.dosage_applied || '-'} ${d.product?.unit || ''}`
    ).join('\n') || 'Nenhuma dosagem registrada';

    // Preferir dados estruturados por equipamento
    const analysisData = equipmentDataText || resultsText || 'Nenhum dado de leitura disponível';

    // Use custom prompt from DB if available, otherwise use default
    let prompt;
    if (aiSettings.prompt) {
        // Replace variables in custom prompt (suporta {{var}} e ${var} formatos)
        prompt = aiSettings.prompt
            // Formato {{var}}
            .replace(/\{\{client_name\}\}/gi, client?.name || 'N/A')
            .replace(/\{\{client_address\}\}/gi, client?.address || 'N/A')
            .replace(/\{\{results\}\}/gi, analysisData)
            .replace(/\{\{dosages\}\}/gi, dosagesText)
            .replace(/\{\{observations\}\}/gi, observations || 'Nenhuma observação prévia')
            // Formato ${var} (para prompts salvos incorretamente)
            .replace(/\$\{client\?\.name[^}]*\}/gi, client?.name || 'N/A')
            .replace(/\$\{client\?\.address[^}]*\}/gi, client?.address || 'N/A')
            .replace(/\$\{client\.name[^}]*\}/gi, client?.name || 'N/A')
            .replace(/\$\{client\.address[^}]*\}/gi, client?.address || 'N/A');
    } else {
        // Default prompt otimizado
        prompt = `
Você é um engenheiro químico sênior especializado em tratamento de água e efluentes da WGA Brasil.

DADOS DA VISITA TÉCNICA:
Cliente: ${client?.name || 'N/A'}
Endereço: ${client?.address || 'N/A'}

RESULTADOS ANALÍTICOS POR EQUIPAMENTO:
${analysisData}

DOSAGENS APLICADAS:
${dosagesText}

OBSERVAÇÕES DO TÉCNICO:
${observations || 'Nenhuma observação prévia'}

INSTRUÇÕES IMPORTANTES:
1. Faça a análise OBRIGATORIAMENTE separada por cada equipamento listado acima
2. Para cada equipamento, avalie os parâmetros medidos comparando com as faixas indicadas
3. Identifique anomalias: 🔴 CRÍTICO requer ação imediata, 🟡 ALERTA requer monitoramento
4. Sugira ações corretivas específicas para cada equipamento quando necessário
5. Se os valores estão dentro da faixa (🟢 OK), confirme que está em conformidade
6. Use linguagem técnica mas acessível
7. IMPORTANTE: Você DEVE analisar os dados fornecidos. Os resultados estão listados acima - analise cada um deles.
8. Seja conciso e direto (máximo 500 palavras)

FORMATO DA RESPOSTA (SIGA EXATAMENTE):
Comece DIRETAMENTE com "**Resumo Geral:**" - NÃO inclua parágrafos introdutórios ou saudações.

**Resumo Geral:**
(1-2 frases sobre o estado geral do sistema)

**Análise por Equipamento:**
Para cada equipamento, liste:
- Nome do equipamento em negrito
- Status dos parâmetros
- Anomalias ou conformidades
- Recomendações específicas

**Recomendações Finais:**
(Ações práticas prioritárias)

IMPORTANTE: Comece sua resposta EXATAMENTE com "**Resumo Geral:**" - sem texto antes.

Responda em português brasileiro:`;
    }

    // Função para fazer request com retry
    const makeRequest = async (attempt = 1, maxAttempts = 3, delayMs = 3000) => {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${aiSettings.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: aiSettings.maxTokens,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error?.message || 'Erro na API Gemini';

                // Se o modelo está sobrecarregado e ainda temos tentativas, retry
                if (errorMessage.includes('overloaded') && attempt < maxAttempts) {
                    console.warn(`Gemini API sobrecarregada. Tentativa ${attempt}/${maxAttempts}. Aguardando ${delayMs / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return makeRequest(attempt + 1, maxAttempts, delayMs);
                }

                console.error('Gemini API Error:', errorData);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                // Diagnóstico detalhado
                const finishReason = data.candidates?.[0]?.finishReason;
                const safetyRatings = data.candidates?.[0]?.safetyRatings;
                const blockReason = data.promptFeedback?.blockReason;
                
                console.error('Gemini empty response debug:', {
                    model: aiSettings.model,
                    finishReason,
                    blockReason,
                    safetyRatings,
                    candidatesCount: data.candidates?.length,
                    fullResponse: JSON.stringify(data).substring(0, 500)
                });

                if (blockReason) {
                    throw new Error(`Prompt bloqueado pelo filtro de segurança: ${blockReason} (modelo: ${aiSettings.model})`);
                }
                if (finishReason === 'SAFETY') {
                    throw new Error(`Resposta bloqueada por filtro de segurança (modelo: ${aiSettings.model})`);
                }
                throw new Error(`Resposta vazia da API Gemini (modelo: ${aiSettings.model}, finishReason: ${finishReason || 'N/A'})`);
            }

            return text.trim();
        } catch (error) {
            // Retry em caso de erro de rede ou timeout
            if (attempt < maxAttempts && (error.name === 'TypeError' || error.message.includes('overloaded'))) {
                console.warn(`Erro na requisição. Tentativa ${attempt}/${maxAttempts}. Aguardando ${delayMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return makeRequest(attempt + 1, maxAttempts, delayMs);
            }
            throw error;
        }
    };

    try {
        return await makeRequest();
    } catch (error) {
        console.error('Gemini Service Error:', error);
        Logger.error('AI_GENERATION', 'Error generating technical analysis', error);
        throw error;
    }
}

export async function chatWithAI(messages, contextData) {
    // Load settings from DB (including API key and chat prompt)
    const aiSettings = await getAISettings();

    if (!aiSettings.apiKey) throw new Error('API key não configurada');

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model}:generateContent`;

    // Default system prompt
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
- Para qualquer assunto fora destes tópicos listados acima, você deve responder educadamente que: "Desculpe, não tenho informações sobre este assunto. Meu foco é exclusivamente em tratamento de águas e serviços da WGA Brasil."
- NÃO responda a perguntas de conhecimentos gerais, história (ex: quem descobriu o Brasil), política, entretenimento, etc.
- Reafirme seu objetivo principal se o usuário insistir.
- Mantenha o tom profissional e técnico.

Responda de forma curta, direta e técnica.`;

    // Use custom prompt from DB if available, otherwise use default
    let basePrompt = aiSettings.chatPrompt || DEFAULT_CHAT_PROMPT;

    // Replace variables in custom prompt
    basePrompt = basePrompt
        .replace(/\{\{client_name\}\}/gi, contextData.client?.name || 'N/A')
        .replace(/\{\{results\}\}/gi, contextData.resultsText || 'N/A')
        .replace(/\{\{dosages\}\}/gi, contextData.dosagesText || 'N/A');

    // System instruction with context
    const systemInstructionText = `${basePrompt}

CONTEXTO DA VISITA ATUAL:
Cliente: ${contextData.client?.name || 'N/A'}
Resultados:
${contextData.resultsText || 'N/A'}
Dosagens:
${contextData.dosagesText || 'N/A'}
`;

    const contents = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));

    // Reinforcement: Add a scope reminder to the last user message
    if (contents.length > 0) {
        const lastMsg = contents[contents.length - 1];
        if (lastMsg.role === 'user') {
            lastMsg.parts[0].text += "\n\n(Lembrete: Responda apenas se estiver no escopo de tratamento de águas/WGA. Caso contrário, recuse.)";
        }
    }

    const makeChatRequest = async (attempt = 1, maxAttempts = 3, delayMs = 3000) => {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${aiSettings.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: systemInstructionText }] },
                    generationConfig: { temperature: 0.5, maxOutputTokens: 1000 }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                const errMsg = err.error?.message || 'Erro no chat IA';
                if ((errMsg.includes('overloaded') || response.status === 429) && attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return makeChatRequest(attempt + 1, maxAttempts, delayMs);
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
        } catch (error) {
            if (attempt < maxAttempts && (error.name === 'TypeError' || error.message.includes('overloaded'))) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return makeChatRequest(attempt + 1, maxAttempts, delayMs);
            }
            throw error;
        }
    };

    return makeChatRequest();
}

export default { generateTechnicalAnalysis, chatWithAI };
