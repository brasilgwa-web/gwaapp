const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

async function testAuth() {
    try {
        console.log('Lendo credenciais de:', CREDENTIALS_PATH);
        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        const credentials = JSON.parse(content);

        console.log('Project ID:', credentials.project_id);
        console.log('Client Email:', credentials.client_email);

        // Verificar formato da chave privada
        console.log('Private Key length:', credentials.private_key ? credentials.private_key.length : 0);
        console.log('Private Key starts with:', credentials.private_key ? credentials.private_key.substring(0, 30) : 'N/A');

        // Tentar autenticar
        console.log('\nTentando autenticar...');
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'] // Escopo de leitura para teste
        });

        const client = await auth.getClient();
        console.log('Autenticação inicializada com sucesso.');

        // Tentar listar arquivos (prova real)
        const drive = google.drive({ version: 'v3', auth });
        console.log('Listando arquivos (teste de conexão)...');
        const res = await drive.files.list({
            pageSize: 1,
            fields: 'files(id, name)'
        });

        console.log('Sucesso! Arquivos encontrados:', res.data.files);

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

testAuth();
