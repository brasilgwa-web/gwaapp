// Gemini AI Service for WGA Brasil
// Uses Google's Gemini API - Settings loaded from database

import { supabase } from './supabase';

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

    const { client, results, dosages, observations } = visitData;

    // Build context from results
    const resultsText = results?.map(r => {
        const status = r.status_light === 'red' ? '🔴 CRÍTICO' :
            r.status_light === 'yellow' ? '🟡 ALERTA' : '🟢 OK';
        return `- ${r.test_name || r.test_definition_id}: ${r.measured_value} ${r.unit || ''} [${status}]`;
    }).join('\n') || 'Nenhum resultado disponível';

    // Build context from dosages
    const dosagesText = dosages?.map(d =>
        `- ${d.product_name}: Estoque ${d.current_stock || '-'}, Aplicado ${d.dosage_applied || '-'}`
    ).join('\n') || 'Nenhuma dosagem registrada';

    // Use custom prompt from DB if available, otherwise use default
    let prompt;
    if (aiSettings.prompt) {
        // Replace variables in custom prompt
        prompt = aiSettings.prompt
            .replace('{{client_name}}', client?.name || 'N/A')
            .replace('{{client_address}}', client?.address || 'N/A')
            .replace('{{results}}', resultsText)
            .replace('{{dosages}}', dosagesText)
            .replace('{{observations}}', observations || 'Nenhuma observação prévia');
    } else {
        // Default prompt
        prompt = `
Você é um engenheiro químico sênior especializado em tratamento de água e efluentes da WGA Brasil.

DADOS DA VISITA TÉCNICA:
Cliente: ${client?.name || 'N/A'}
Endereço: ${client?.address || 'N/A'}

RESULTADOS ANALÍTICOS:
${resultsText}

DOSAGENS APLICADAS:
${dosagesText}

OBSERVAÇÕES DO TÉCNICO:
${observations || 'Nenhuma observação prévia'}

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
    }

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
            console.error('Gemini API Error:', errorData);
            throw new Error(errorData.error?.message || 'Erro na API Gemini');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Resposta vazia da API Gemini');
        }

        return text.trim();
    } catch (error) {
        console.error('Gemini Service Error:', error);
        throw error;
    }
}

export default { generateTechnicalAnalysis };
