// Gemini AI Service for WGA Brasil
// Uses Google's Gemini API - Settings loaded from database

import { supabase } from './supabase';
import { Logger } from './logger';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Default values if DB settings not available
const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_TOKENS = 2048;

// Fetch AI settings from database
async function getAISettings() {
    try {
        const { data, error } = await supabase
            .from('ai_settings')
            .select('setting_key, setting_value');

        if (error) {
            console.warn('Could not load AI settings from DB, using defaults:', error);
            return { model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS, prompt: null };
        }

        const settings = {};
        data?.forEach(s => {
            settings[s.setting_key] = s.setting_value;
        });

        return {
            model: settings.gemini_model || DEFAULT_MODEL,
            maxTokens: parseInt(settings.max_output_tokens) || DEFAULT_MAX_TOKENS,
            prompt: settings.technical_analysis_prompt || null
        };
    } catch (e) {
        console.warn('Error fetching AI settings:', e);
        return { model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS, prompt: null };
    }
}

export async function generateTechnicalAnalysis(visitData) {
    if (!GEMINI_API_KEY) {
        console.error('VITE_GEMINI_API_KEY not configured');
        throw new Error('API key não configurada. Configure VITE_GEMINI_API_KEY no .env');
    }

    // Load settings from DB
    const aiSettings = await getAISettings();
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
        // Replace variables in custom prompt
        prompt = aiSettings.prompt
            .replace('{{client_name}}', client?.name || 'N/A')
            .replace('{{client_address}}', client?.address || 'N/A')
            .replace('{{results}}', analysisData)
            .replace('{{dosages}}', dosagesText)
            .replace('{{observations}}', observations || 'Nenhuma observação prévia');
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

FORMATO DA RESPOSTA:
**Resumo Geral:**
(1-2 frases sobre o estado geral do sistema)

**Análise por Equipamento:**
Para cada equipamento, liste:
- Nome do equipamento
- Status dos parâmetros
- Anomalias ou conformidades
- Recomendações específicas

**Recomendações Finais:**
(Ações práticas prioritárias)

Responda em português brasileiro:`;
    }

    // Função para fazer request com retry
    const makeRequest = async (attempt = 1, maxAttempts = 3, delayMs = 3000) => {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
                throw new Error('Resposta vazia da API Gemini');
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

export default { generateTechnicalAnalysis };
