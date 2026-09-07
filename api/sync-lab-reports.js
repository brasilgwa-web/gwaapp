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
        
        // Forçar o ID correto (com 'N' maiúsculo) para contornar problemas no banco de dados
        inboxFolderId = '1OU4vJGcwno0wNgpZPx4Gvq8g8DLt6jxb';

        // Auth Google Drive
        let auth;
        let authEmail;
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        const hardcodedBase64 = "ew0KICAgICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsDQogICAgInByb2plY3RfaWQiOiAiZG90dGVkLXNpZ25lci00ODA4MjMtajAiLA0KICAgICJwcml2YXRlX2tleV9pZCI6ICJkYzg4NGE1YjdmNTBjNjdiNGQxZDgwZDNlY2QyNWIzZGYxNDVkZDk2IiwNCiAgICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUUM3SUpGNkl6K0hGUHFyXG55Ni9LODBhdDQxNVNlNldiWlhBR2JlZ3dCMnhoMDBuQjFDNHh0M0xBTTJGWENjcUF2bVdiRmpFUXlSYVRwRjc1XG54NFRzVGIrZ2VzbC84eDdWSG1zTVhJamE3WEVrdjNkMkVhZnJUSndHOFF4OXJwcnFWWU1uMjNGbUtrUEtIMmc4XG5qaVJpQ3NSZWcySHlWcGlzYm1RanFtMnhKZjh2Y3ExNmQvQUlCaGVKbmJ6MjFBMFF5MkJIUlZxTEVmY3Z4SFZRXG44WjNyWFBLYmxLV0ZxYnFBUy9wOTkrTUJSUDRnQVAvbWZycUxZVVBkWEFhVjc5NDFKYWF5bU5IM0ZvSDJFOFpIXG5xUEdmRkNadktGTnhHeUlLSy9IY0dtUlNLeDZ1cGp1aHZWaWxlZTgxT3NzbHlnQ3V1WG54WVNyWjREeVlpZlZ6XG5lRGRrOTQ0eEFnTUJBQUVDZ2dFQUhUVXRmOWhBbk4rMEZnYy9ubmlhYjU4dHBISTluSGtZemVnWnl4QUlPcnkxXG5VU3ZDaWhWaTNvZlJOR1N5MXZyZzluUUs5SWtaUjdKQVMzeDQrRDZxZFJkZjhZNEx6S0s5ZldYSmRyZlpFUzM4XG5MTkdxQkJyUkZSbWdKQ2lTR3V3b3JKcWVvMGtLNFF4RjdpM0JsV0ZZMnBKblFnd3MzYjB5cERQVjFmQzRXV1NvXG5tNWNzQ2tNVmRWL0V5YnhUeHlsTVJPdkNYYmRrcUhmbWNaMCthWlp2V1k5SCtTaXRsVjcwR0x2bys4b3V3MGJyXG5zaEZ4SVhhVTRSU0xXaU9GZHdWSEpxNTZJS3pvWDdJYTY2czhBQldiUGl1VkhndFAybHBjNlVFNm9TbGZwNmtuXG5GYXJXYjVQNytJY2I2dTNPWjRCZlo3bXI0OHhlMkUyMFFKUkQrTUR3Z1FLQmdRRGI4TVB1RDgrOVJXbEY1bW9GXG42VkRXbEpJMnlDRys2ejlWdWtlVDJUbHJVUzZvK0E2NTNVckF5WWxiNnYwY1NFZWJ4STZXekd4VWovOHFQbmgrXG5saVdGVTBjbkVlM2lIODZTaVVsY1YwOEN6bVowUi9JV0dnbVJ2VzRmTXVsc01hUkhjQWFvOER4Y1daRVl3YndDXG56UE50bWdnRDFabi80c0Z2R3B0T0pKa2lZd0tCZ1FEWnpwU1ZqZHRVMlc0QkdvZTRsY3pOOG02ZWxmc2E2RDVHXG4yN1hxN3k1aURVMWpwa2dVdE5maEJTNnZWaUtEUmpzRXZlZkl4MDVXQklTWFhwR0xSUW5KUDR1VEJsbklYVGN3XG5WRDRGNmlwdG5GQzlCSlFDdUZxbkNWMG9PM1BjeGU0WkQrV2g5M0x3eHNPYzJjMEdLR2srMjZpK3RHSjNsb0R2XG5zeVRmVU12bld3S0JnRStoYkU3VkNySE1YOEVmRzJQb2hZd3JYb1RYRU9DKzY3OXVJbHcxV2NTeEwrT2RiRGQvXG5GNEdWZGxZQlRvTGU2STVOTEJNTkVHdk5kdVVrbVJ1NzRQblVuUDVZVDNoL2E1dENlWDBsWDBYMDFNTmxDUkZYXG5lLzk0UmxhbGFEM3oremFpS01jaHM3ajc5THl4NkJCYmhBYzZyWXcxMmZ2N2JXMThoSjVXUWR0aEFvR0FJbmEvXG5xQkowUEM3VGF6VkplSG1ybUlMZDRoWVZUNktrQ0E1SDhNNjc1aVA0dE9YZ3pmWDNtdEY1RzZGamdLWWlQSlBZXG5FenNHT0RJcTBORFQ4dGVQdnRwaE9YaHR5SGlIZlF3M2JEUXJWb0MvZmNrMXFtQ0ZaNXpoc3JZRmxVOTBaMTdPXG5sUnhVZ2FqUjF3WFhuVHZUdTNDQ2VQcU9BaUk4Y0xGR0NsZjhpN1VDZ1lFQWh0cGtNYWprZVQvM2lvWDZrQWxMXG51NUh0OWZJNlFXbFRNRllpak5xSUh3Rmd4NEJhajlLUjNXRExJNG54V3FiVG8xSXpPa3EyaVhFNUFtd2NmeVdEXG5LaHhIU3FXU1MwRVh4bEI4RlhGcUVLR2Ywemk0ZDErZ2JacnErTWkyTCtwN0I4bFJ4OWZuRFE2OUE0TGRRYmtDXG56UE50bWdnRDFabi80c0Z2R3B0T0pKa2lZd0tCZ1FEWnpwU1ZqZHRVMlc0QkdvZTRsY3pOOG02ZWxmc2E2RDVHXG5EZjdCdVRYOTVtZWlWUlY3TVFJWStwWT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsDQogICAgImNsaWVudF9lbWFpbCI6ICJ3Z2FhcHBAZG90dGVkLXNpZ25lci00ODA4MjMtajAuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLA0KICAgICJjbGllbnRfaWQiOiAiMTEyODQzMjQ5Mjc5MTQwNzg5Mjg3IiwNCiAgICAiYXV0aF91cmkiOiAiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL2F1dGgiLA0KICAgICJ0b2tlbl91cmkiOiAiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLA0KICAgICJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwNCiAgICAiY2xpZW50X3g1MDlfY2VydF91cmwiOiAiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vcm9ib3QvdjEvbWV0YWRhdGEveDUwOS93Z2FhcHAlNDBkb3R0ZWQtc2lnbmVyLTQ4MDgyMy1qMC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsDQogICAgInVuaXZlcnNlX2RvbWFpbiI6ICJnb29nbGVhcGlzLmNvbSINCn0=";
        const decodedJson = Buffer.from(hardcodedBase64, 'base64').toString('utf8');
        const credentials = JSON.parse(decodedJson);
        authEmail = credentials.client_email;
        
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const drive = google.drive({ version: 'v3', auth });

        const resList = await drive.files.list({
            q: `'${inboxFolderId}' in parents and trashed = false`,
            fields: 'files(id, name, webViewLink, parents, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
        });

        // Filtrar PDFs no código em vez da query para garantir que vemos o que está lá
        const allFiles = resList.data.files || [];
        const files = allFiles.filter(f => f.mimeType === 'application/pdf');

        if (!files || files.length === 0) {
            const allFilesNames = allFiles.map(f => `${f.name} (${f.mimeType})`).join(', ');
            return response.status(200).json({ 
                message: `Nenhum laudo em PDF pendente na Inbox.\n\n--- DEBUG INFO ---\nTotal de arquivos achados (qualquer tipo): ${allFiles.length}\nArquivos: ${allFilesNames || 'Nenhum'}\n\nID da Pasta: ${inboxFolderId}\nConta de Serviço: ${authEmail}`, 
                processed: 0 
            });
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
                const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
                if (!geminiApiKey) throw new Error("Gemini API Key não configurada (adicione GEMINI_API_KEY nas env vars do Vercel)");

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
                
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

                if (!geminiRes.ok) {
                    const errText = await geminiRes.text();
                    throw new Error(`Falha ao processar PDF com Gemini (${geminiRes.status}): ${errText.substring(0, 200)}`);
                }
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

        const errorDetails = results.filter(r => r.status === 'error').map(r => `• ${r.file}: ${r.error}`).join('\n');
        const successDetails = results.filter(r => r.status === 'success').map(r => `• ${r.file}`).join('\n');
        const detailMsg = [
            successDetails ? `Sucesso:\n${successDetails}` : '',
            errorDetails ? `Erros:\n${errorDetails}` : ''
        ].filter(Boolean).join('\n\n');

        return response.status(200).json({ message: `Processamento concluído\n\n${detailMsg || 'Nenhum arquivo processado.'}`, processed: processedCount, results });

    } catch (error) {
        let pkSnippet = "N/A";
        if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
            try {
                const pk = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON).private_key || "";
                pkSnippet = pk.substring(0, 40).replace(/\n/g, '\\n') + " ... " + pk.substring(pk.length - 40).replace(/\n/g, '\\n');
            } catch(e) {}
        }
        console.error("Sync Lab Reports Error:", error);
        return response.status(500).json({ error: `[API] ${error.message} | PK_SNIPPET: ${pkSnippet}` });
    }
}
