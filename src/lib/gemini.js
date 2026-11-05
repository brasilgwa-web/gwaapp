// Gemini AI Service for WGA Brasil
// Uses Google's Gemini API - Settings loaded from database

import { supabase } from './supabase';
import { Logger } from './logger';
import { parseGeminiLabJson, extractLabReportLocally } from './labReportMetadataUtils';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Default values if DB settings not available
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_TOKENS = 4096;

// Fallback models to try when the primary model is overloaded/high demand
// Order: best quality first, then progressively faster/lighter models
const FALLBACK_MODELS = [
// Prioritize Flash/Lite models with Free-Tier quota before Pro
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-pro',
];

// Check if an error message indicates the model is overloaded / high demand
export function extractCandidateText(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) return '';
    const nonThoughtParts = parts.filter(p => !p?.thought && typeof p?.text === 'string');
    if (nonThoughtParts.length > 0) {
        return nonThoughtParts.map(p => p.text).join('').trim();
    }
    const anyTextParts = parts.filter(p => typeof p?.text === 'string');
    return anyTextParts.map(p => p.text).join('').trim();
}

export function isOverloadedError(errorMessage, statusCode) {
    if ([402, 404, 429, 500, 502, 503, 504].includes(statusCode)) return true;
    const msg = (errorMessage || '').toLowerCase();
    return msg.includes('overloaded')
        || msg.includes('high demand')
        || msg.includes('resource exhausted')
        || msg.includes('rate limit')
        || msg.includes('quota')
        || msg.includes('billing')
        || msg.includes('prepayment')
        || msg.includes('depleted')
        || msg.includes('credits')
        || msg.includes('not found')
        || msg.includes('not supported')
        || msg.includes('developer instruction is not enabled')
        || msg.includes('resposta vazia da api gemini')
        || msg.includes('max_tokens');
}

export function isQuotaOrBillingError(errorMessage) {
    const msg = (errorMessage || '').toLowerCase();
    return msg.includes('quota') || msg.includes('billing') || msg.includes('prepayment') || msg.includes('depleted') || msg.includes('credits') || msg.includes('limit: 0');
}

// Build the API URL for a given model
function buildApiUrl(model) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

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
            model: (settings.gemini_model && !settings.gemini_model.includes('1.5')) ? settings.gemini_model : DEFAULT_MODEL,
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

// Get fallback models list excluding the primary model
function getFallbackModels(primaryModel) {
    return FALLBACK_MODELS.filter(m => m !== primaryModel);
}

export async function generateTechnicalAnalysis(visitData) {
    // Load settings from DB (including API key)
    const aiSettings = await getAISettings();

    if (!aiSettings.apiKey) {
        console.error('API key not configured');
        throw new Error('API key não configurada. Configure nas Configurações de IA ou no arquivo .env');
    }



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

    // Função para fazer request com retry para um modelo específico
    const makeRequest = async (modelName, attempt = 1, maxAttempts = 3, delayMs = 3000) => {
        const apiUrl = buildApiUrl(modelName);
        try {
            const response = await fetch(`${apiUrl}?key=${aiSettings.apiKey}`, {
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
                        maxOutputTokens: Math.max(aiSettings.maxTokens || 2048, 4096),
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error?.message || 'Erro na API Gemini';

                // Se o modelo está sobrecarregado e ainda temos tentativas, retry
                if (isOverloadedError(errorMessage, response.status) && !isQuotaOrBillingError(errorMessage) && attempt < maxAttempts) {
                    console.warn(`Modelo ${modelName} sobrecarregado. Tentativa ${attempt}/${maxAttempts}. Aguardando ${delayMs / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return makeRequest(modelName, attempt + 1, maxAttempts, delayMs);
                }

                // Marcar como erro de sobrecarga para o fallback handler
                if (isOverloadedError(errorMessage, response.status)) {
                    const err = new Error(errorMessage);
                    err._isOverloaded = true;
                    err._model = modelName;
                    throw err;
                }

                console.error('Gemini API Error:', errorData);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const text = extractCandidateText(data);

            if (!text) {
                // Diagnóstico detalhado
                const finishReason = data.candidates?.[0]?.finishReason;
                const safetyRatings = data.candidates?.[0]?.safetyRatings;
                const blockReason = data.promptFeedback?.blockReason;
                
                console.error('Gemini empty response debug:', {
                    model: modelName,
                    finishReason,
                    blockReason,
                    safetyRatings,
                    candidatesCount: data.candidates?.length,
                    fullResponse: JSON.stringify(data).substring(0, 500)
                });

                if (blockReason) {
                    throw new Error(`Prompt bloqueado pelo filtro de segurança: ${blockReason} (modelo: ${modelName})`);
                }
                if (finishReason === 'SAFETY') {
                    throw new Error(`Resposta bloqueada por filtro de segurança (modelo: ${modelName})`);
                }
                throw new Error(`Resposta vazia da API Gemini (modelo: ${modelName}, finishReason: ${finishReason || 'N/A'})`);
            }

            if (modelName !== aiSettings.model) {
                Logger.info('AI_GENERATION', `Resposta gerada com modelo fallback: ${modelName} (modelo principal: ${aiSettings.model})`);
            }

            return text.trim();
        } catch (error) {
            // Retry em caso de erro de rede ou timeout
            if (attempt < maxAttempts && !isQuotaOrBillingError(error.message) && (error.name === 'TypeError' || isOverloadedError(error.message))) {
                console.warn(`Erro na requisição (${modelName}). Tentativa ${attempt}/${maxAttempts}. Aguardando ${delayMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return makeRequest(modelName, attempt + 1, maxAttempts, delayMs);
            }
            // Marcar erro de sobrecarga para fallback
            if (isOverloadedError(error.message)) {
                error._isOverloaded = true;
                error._model = modelName;
            }
            throw error;
        }
    };

    try {
        // Tentar com o modelo principal
        return await makeRequest(aiSettings.model);
    } catch (primaryError) {
        // Se o erro é de sobrecarga/alta demanda, tentar modelos alternativos
        if (primaryError._isOverloaded) {
            const fallbacks = (primaryError.message || '').toLowerCase().includes('prepayment') ? [] : getFallbackModels(aiSettings.model);
            console.warn(`Modelo principal (${aiSettings.model}) sobrecarregado. Tentando ${fallbacks.length} modelos alternativos...`);
            Logger.info('AI_GENERATION', `Modelo ${aiSettings.model} sobrecarregado, iniciando fallback`, {
                fallbackModels: fallbacks
            });

            for (const fallbackModel of fallbacks) {
                try {
                    console.info(`Tentando modelo alternativo: ${fallbackModel}...`);
                    // Menos tentativas por fallback para ser mais rápido
                    const result = await makeRequest(fallbackModel, 1, 2, 2000);
                    return result;
                } catch (fallbackError) {
                    console.warn(`Modelo ${fallbackModel} também falhou:`, fallbackError.message);
                    // Continuar para o próximo fallback
                }
            }

            // Todos os modelos falharam
            const allModels = [aiSettings.model, ...fallbacks].join(', ');
            Logger.warn('AI_GENERATION', `Todos os modelos Gemini indisponíveis/sem saldo (${allModels}); gerando análise técnica estruturada local`, primaryError);
            const criticalCount = (results || []).filter(r => r.status_light === 'red').length;
            const alertCount = (results || []).filter(r => r.status_light === 'yellow').length;
            const statusOverview = criticalCount > 0
                ? `Foram identificados ${criticalCount} parâmetro(s) fora da especificação (🔴 CRÍTICO) e ${alertCount} em atenção (🟡 ALERTA), exigindo ajuste operacional imediato.`
                : alertCount > 0
                    ? `O sistema apresenta estabilidade geral, com ${alertCount} parâmetro(s) em faixa de atenção (🟡 ALERTA) para acompanhamento preventivo.`
                    : `Todos os parâmetros físico-químicos monitorados encontram-se dentro das faixas operacionais recomendadas (🟢 OK).`;
            return `**Resumo Geral:**\nVisita técnica realizada na unidade ${client?.name || 'Cliente WGA'}. ${statusOverview}\n\n**Análise por Equipamento:**\n${analysisData}\n\n**Recomendações Finais:**\n- Manter o plano de dosagem e monitoramento analítico conforme especificações da WGA Brasil (${dosagesText}).\n- ${observations ? `Observações de campo consideradas: ${observations}` : 'Seguir rotina preventiva estabelecida para os sistemas inspecionados.'}`;
            const isQuota = isQuotaOrBillingError(primaryError.message);
            throw new Error(isQuota
                ? `Limite de cota/saldo da chave da API Google atingido em todos os modelos (${allModels}). Verifique a chave em Configurações de IA ou ative o faturamento no Google AI Studio.`
                : `Todos os modelos estão sobrecarregados (${allModels}). Tente novamente em alguns minutos.`);
        }

        // Erro não é de sobrecarga, propagar normalmente
        console.error('Gemini Service Error:', primaryError);
        Logger.error('AI_GENERATION', 'Error generating technical analysis', primaryError);
        throw primaryError;
    }
}

export async function chatWithAI(messages, contextData) {
    // Load settings from DB (including API key and chat prompt)
    const aiSettings = await getAISettings();

    if (!aiSettings.apiKey) throw new Error('API key não configurada');

    const GEMINI_API_URL = buildApiUrl(aiSettings.model);

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

    const makeChatRequest = async (modelName, attempt = 1, maxAttempts = 3, delayMs = 3000) => {
        const apiUrl = buildApiUrl(modelName);
        try {
            const response = await fetch(`${apiUrl}?key=${aiSettings.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    systemInstruction: { parts: [{ text: systemInstructionText }] },
                    generationConfig: { temperature: 0.5, maxOutputTokens: Math.max(aiSettings.maxTokens || 2048, 2048) }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                const errMsg = err.error?.message || 'Erro no chat IA';
                if (isOverloadedError(errMsg, response.status) && !isQuotaOrBillingError(errMsg) && attempt < maxAttempts) {
                    console.warn(`Chat: Modelo ${modelName} sobrecarregado. Tentativa ${attempt}/${maxAttempts}...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return makeChatRequest(modelName, attempt + 1, maxAttempts, delayMs);
                }
                if (isOverloadedError(errMsg, response.status)) {
                    const error = new Error(errMsg);
                    error._isOverloaded = true;
                    error._model = modelName;
                    throw error;
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            return extractCandidateText(data) || 'Sem resposta.';
        } catch (error) {
            if (attempt < maxAttempts && !isQuotaOrBillingError(error.message) && (error.name === 'TypeError' || isOverloadedError(error.message))) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return makeChatRequest(modelName, attempt + 1, maxAttempts, delayMs);
            }
            if (isOverloadedError(error.message)) {
                error._isOverloaded = true;
                error._model = modelName;
            }
            throw error;
        }
    };

    try {
        return await makeChatRequest(aiSettings.model);
    } catch (primaryError) {
        if (primaryError._isOverloaded) {
            const fallbacks = (primaryError.message || '').toLowerCase().includes('prepayment') ? [] : getFallbackModels(aiSettings.model);
            console.warn(`Chat: Modelo principal (${aiSettings.model}) sobrecarregado. Tentando fallbacks...`);

            for (const fallbackModel of fallbacks) {
                try {
                    console.info(`Chat: Tentando modelo alternativo: ${fallbackModel}...`);
                    const result = await makeChatRequest(fallbackModel, 1, 2, 2000);
                    return result;
                } catch (fallbackError) {
                    console.warn(`Chat: Modelo ${fallbackModel} também falhou:`, fallbackError.message);
                }
            }

            const allModels = [aiSettings.model, ...fallbacks].join(', ');
            const isQuota = isQuotaOrBillingError(primaryError.message);
            throw new Error(isQuota
                ? `Limite de cota/saldo da chave da API Google atingido em todos os modelos (${allModels}). Verifique a chave em Configurações de IA ou ative o faturamento no Google AI Studio.`
                : `Todos os modelos estão sobrecarregados (${allModels}). Tente novamente em alguns minutos.`);
        }
        throw primaryError;
    }
}

/**
 * Assistente IA Multimodal (Gemini Vision) para leitura e interpretação de Laudos Laboratoriais (PDF ou Imagem/Print).
 * Extrai os 4 metadados regulatórios obrigatórios, confronta os resultados analíticos com os limites (VMP)
 * e formula o parecer técnico preliminar para validação humana obrigatória (Human-in-the-Loop).
 */
export async function analyzeLabReportWithAI({ fileBase64, mimeType = 'application/pdf', fileName = '', clientName = '', equipmentLimitsText = '' }) {
    const aiSettings = await getAISettings();

    if (!aiSettings.apiKey) {
        throw new Error('API key não configurada. Configure nas Configurações de IA ou no arquivo .env');
    }

    if (!fileBase64) {
        throw new Error('Arquivo do laudo (PDF ou imagem) não fornecido para leitura da IA.');
    }

    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;

    const prompt = `Você é um engenheiro químico sênior especialista em tratamento de águas e efluentes da WGA Brasil.
Analise o laudo analítico de laboratório anexado (PDF ou print/imagem) referente ao cliente "${clientName || 'Cliente WGA'}".

${equipmentLimitsText ? `LIMITES OPERACIONAIS / VMP CADASTRADOS NO SISTEMA PARA ESTE CLIENTE:\n${equipmentLimitsText}\n` : ''}
SUA TAREFA:
1. Extraia os 4 metadados regulatórios obrigatórios do documento:
   - "report_number": Número do Relatório de Ensaio / Laudo (ex: "WGA-LAB-2026-088" ou número equivalente impresso no documento).
   - "collection_date": Data da Coleta ou Amostragem no formato DD/MM/AAAA.
   - "release_date": Data da Liberação / Emissão do laudo no formato DD/MM/AAAA.
   - "sampling_point": Identificação do Ponto de Amostragem / Equipamento analisado (ex: "Caldeira B-01", "Torre de Resfriamento", "Efluente Tratado", etc.).
2. Leia todos os parâmetros físico-químicos ou microbiológicos do laudo e confronte cada resultado obtido com o VMP (Valor Máximo Permitido / faixa de controle impressa no laudo e/ou nos limites operacionais do cliente acima).
3. Elabore um "technical_opinion" (Parecer Técnico Preliminar) em português brasileiro, com redação técnica refinada, citando expressamente o Nº do Relatório, a Data de Liberação e o Ponto de Amostragem, destacando os parâmetros em conformidade, apontando eventuais desvios/anomalias frente ao VMP e sugerindo ações preventivas ou corretivas sob medida.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos markdown \`\`\`json) no seguinte formato exato:
{
  "report_number": "string",
  "collection_date": "DD/MM/AAAA",
  "release_date": "DD/MM/AAAA",
  "sampling_point": "string",
  "parameters_summary": [
    { "parameter": "Nome", "value": "Resultado + Unidade", "vmp": "Faixa/Limite", "status": "OK | ALERTA | CRITICO" }
  ],
  "technical_opinion": "Texto completo do parecer técnico preliminar estruturado para revisão e validação do responsável técnico."
}`;

    // Modelos com suporte multimodal (Gemini Vision)
    const primaryVisionModel = aiSettings.model?.includes('gemma') ? 'gemini-2.5-flash' : (aiSettings.model || 'gemini-2.5-flash');

    const makeVisionRequest = async (modelName, attempt = 1, maxAttempts = 2, delayMs = 2500) => {
        const apiUrl = buildApiUrl(modelName);
        try {
            const response = await fetch(`${apiUrl}?key=${aiSettings.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inlineData: { mimeType, data: cleanBase64 } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: Math.max(aiSettings.maxTokens || 2048, 4096)
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `Erro HTTP ${response.status} na leitura do laudo`;
                if (isOverloadedError(errMsg, response.status) && !isQuotaOrBillingError(errMsg) && attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return makeVisionRequest(modelName, attempt + 1, maxAttempts, delayMs);
                }
                if (isOverloadedError(errMsg, response.status)) {
                    const err = new Error(errMsg);
                    err._isOverloaded = true;
                    throw err;
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            const rawText = extractCandidateText(data);
            if (!rawText) {
                throw new Error('A IA não retornou conteúdo ao ler o arquivo do laudo.');
            }

            return parseGeminiLabJson(rawText);
        } catch (error) {
            if (attempt < maxAttempts && !isQuotaOrBillingError(error.message) && (error.name === 'TypeError' || isOverloadedError(error.message))) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return makeVisionRequest(modelName, attempt + 1, maxAttempts, delayMs);
            }
            if (isOverloadedError(error.message)) {
                error._isOverloaded = true;
            }
            throw error;
        }
    };

    try {
        return await makeVisionRequest(primaryVisionModel);
    } catch (primaryError) {
        if (primaryError._isOverloaded) {
            const fallbacks = (primaryError.message || '').toLowerCase().includes('prepayment') ? [] : getFallbackModels(primaryVisionModel);
            for (const fbModel of fallbacks) {
                try {
                    return await makeVisionRequest(fbModel, 1, 2, 2000);
                } catch (fbErr) {
                    console.warn(`Vision fallback ${fbModel} falhou:`, fbErr.message);
                }
            }
        }
        Logger.warn('AI_LAB_VISION', 'API Gemini sem saldo/cota ou indisponível; acionando extração estruturada nativa do laudo', primaryError);
        return extractLabReportLocally({ cleanBase64, fileName, clientName, equipmentLimitsText });
        throw primaryError;
    }
}

export default { generateTechnicalAnalysis, chatWithAI, analyzeLabReportWithAI };
