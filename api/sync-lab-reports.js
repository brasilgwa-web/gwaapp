import { google } from 'googleapis';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Vercel Serverless Function
export default async function handler(request, response) {
    // CORS
    response.setHeader('Access-Control-Allow-Credentials', true)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')

    if (request.method === 'OPTIONS') {
        return response.status(200).json({})
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Obter a configuração da pasta Inbox do DB
        const { data: aiSettings, error: aiSettingsError } = await supabase
            .from('ai_settings')
            .select('setting_key, setting_value')
            .eq('setting_key', 'google_drive_inbox_folder_id')
            .single();

        let inboxFolderId = aiSettings?.setting_value;
        if (!inboxFolderId) {
            return response.status(400).json({ error: 'ID da pasta Inbox não configurado no banco de dados (ai_settings).' });
        }

        // Auth Google Drive
        let auth;
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        if (clientId && clientSecret && refreshToken) {
            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            auth = oauth2Client;
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive'],
            });
        } else {
            const keyFilePath = path.join(process.cwd(), 'api', 'service-account.json');
            auth = new google.auth.GoogleAuth({
                keyFile: keyFilePath,
                scopes: ['https://www.googleapis.com/auth/drive'],
            });
        }

        const drive = google.drive({ version: 'v3', auth });

        // 2. Listar arquivos na Inbox
        const resList = await drive.files.list({
            q: `'${inboxFolderId}' in parents and trashed = false and mimeType = 'application/pdf'`,
            fields: 'files(id, name, webViewLink, parents)',
        });

        const files = resList.data.files;
        if (!files || files.length === 0) {
            return response.status(200).json({ message: 'Nenhum laudo pendente na Inbox.', processed: 0 });
        }

        let processedCount = 0;
        let results = [];

        for (const file of files) {
            try {
                // 3. Baixar conteúdo do arquivo para mandar pro Gemini
                const resFile = await drive.files.get(
                    { fileId: file.id, alt: 'media' },
                    { responseType: 'arraybuffer' }
                );

                const base64PDF = Buffer.from(resFile.data).toString('base64');

                // 4. Acionar Gemini 1.5 Pro (Nativo para PDF)
                const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
                if (!geminiApiKey) throw new Error("Gemini API Key missing");

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`;
                
                const prompt = `Você é um assistente analisando um laudo de laboratório em PDF.
Extraia APENAS as seguintes informações e retorne em formato JSON válido:
- "cliente": O nome da empresa/cliente (tente remover sufixos genéricos, pegue o nome principal).
- "data_coleta": A data em que a amostra foi coletada (no formato YYYY-MM-DD). Se não achar a de coleta, use a data de emissão.
- "comentario": Um parágrafo técnico resumindo as análises feitas e apontando anomalias se houver. (Este texto será salvo como comentário na visita).

Responda APENAS com o JSON, sem markdown \`\`\`json.`;

                const geminiRes = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { inlineData: { mimeType: 'application/pdf', data: base64PDF } },
                                { text: prompt }
                            ]
                        }],
                        generationConfig: { temperature: 0.1 }
                    })
                });

                if (!geminiRes.ok) throw new Error('Falha ao processar PDF com Gemini');
                const geminiData = await geminiRes.json();
                let textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
                
                const extracted = JSON.parse(textResult);
                
                // 5. Match com Cliente e Visita
                // Buscar clientes parecidos
                const { data: clients } = await supabase
                    .from('clients')
                    .select('id, name, google_drive_folder_id');
                
                // Busca simples de substring
                const matchedClient = clients.find(c => 
                    c.name.toLowerCase().includes(extracted.cliente.toLowerCase()) || 
                    extracted.cliente.toLowerCase().includes(c.name.toLowerCase())
                );

                if (!matchedClient) {
                    results.push({ file: file.name, status: 'error', error: `Cliente não encontrado para: ${extracted.cliente}` });
                    continue;
                }

                // Achar visita mais próxima da data
                const { data: visits } = await supabase
                    .from('visits')
                    .select('id, visit_date, lab_report_status')
                    .eq('client_id', matchedClient.id)
                    .order('visit_date', { ascending: false });

                // Lógica simples: pegar a primeira visita ou uma que bata a data
                // Para produção, você pode querer refinar isso comparando a extracted.data_coleta com a visit_date
                const targetVisit = visits.find(v => {
                    if (!v.visit_date) return false;
                    const vDate = v.visit_date.split('T')[0];
                    return vDate === extracted.data_coleta || vDate.startsWith(extracted.data_coleta.substring(0,7)); // Mesmo mês/dia
                }) || visits[0]; // Fallback pra mais recente do cliente

                if (!targetVisit) {
                    results.push({ file: file.name, status: 'error', error: 'Nenhuma visita encontrada para o cliente' });
                    continue;
                }

                // 6. Mover arquivo para a pasta do cliente no Drive
                if (matchedClient.google_drive_folder_id) {
                    const previousParents = file.parents.join(',');
                    await drive.files.update({
                        fileId: file.id,
                        addParents: matchedClient.google_drive_folder_id,
                        removeParents: previousParents,
                        fields: 'id, parents',
                    });
                }

                // 7. Atualizar a Visita
                await supabase
                    .from('visits')
                    .update({
                        lab_report_status: true,
                        lab_report_url: file.webViewLink,
                        lab_report_comments: extracted.comentario
                    })
                    .eq('id', targetVisit.id);

                processedCount++;
                results.push({ file: file.name, status: 'success', visitId: targetVisit.id });

            } catch (err) {
                console.error(`Erro processando arquivo ${file.name}:`, err);
                results.push({ file: file.name, status: 'error', error: err.message });
            }
        }

        return response.status(200).json({ message: 'Processamento concluído', processed: processedCount, results });

    } catch (error) {
        console.error("Sync Lab Reports Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
