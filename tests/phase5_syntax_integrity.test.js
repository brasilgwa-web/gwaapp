import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const PROJECT_ROOT = process.cwd();

const DELIVERED_FILES = [
    'migrations_propostas_wga_360.sql',
    'src/lib/fieldMetadataUtils.js',
    'src/lib/labReportMetadataUtils.js',
    'src/lib/emailTemplates.js',
    'src/lib/gemini.js',
    'src/hooks/useReportData.js',
    'src/components/visit/ReadingsTab.jsx',
    'src/components/visit/LabReportTab.jsx',
    'src/components/visit/ReportTemplate.jsx',
    'src/components/visit/ReportPdf.jsx',
    'src/components/visit/ReportTab.jsx',
    'src/pages/SetupReport.jsx',
    'src/api/integrations.js'
];

test('Fase 5.1 - Todos os arquivos dos 7 entregáveis existem e possuem conteúdo íntegro', () => {
    for (const relPath of DELIVERED_FILES) {
        const fullPath = path.join(PROJECT_ROOT, relPath);
        assert.equal(fs.existsSync(fullPath), true, `Arquivo ausente: ${relPath}`);
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.ok(content.length > 100, `Arquivo vazio ou incompleto: ${relPath}`);
        if (relPath.endsWith('.js') || relPath.endsWith('.jsx')) {
            const loader = relPath.endsWith('.jsx') ? 'jsx' : 'js';
            const transformed = esbuild.transformSync(content, { loader, sourcefile: relPath });
            assert.ok(transformed.code.length > 0, `Falha na compilação JSX/JS de ${relPath}`);
        }
    }
});

test('Fase 5.2 - Integridade das integrações nos componentes React (Zero Regression Check)', () => {
    const readingsContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/visit/ReadingsTab.jsx'), 'utf-8');
    assert.match(readingsContent, /WEATHER_OPTIONS/, 'ReadingsTab deve integrar opções climáticas');
    assert.match(readingsContent, /Área Confinada \/ Sem Sinal/, 'ReadingsTab deve conter tratamento para áreas confinadas');
    assert.match(readingsContent, /handleCaptureGps/, 'ReadingsTab deve conter captura GPS');
    assert.match(readingsContent, /ensureAutoGpsForEquipment/, 'ReadingsTab deve capturar GPS automaticamente no momento da leitura');
    assert.match(readingsContent, /applyWeatherToAllMutation/, 'ReadingsTab deve permitir aplicar indicador de chuva a todos os equipamentos de uma vez');
    assert.match(readingsContent, /Atualizar GPS/, 'ReadingsTab deve exibir botão apenas para Atualizar GPS');
    assert.match(readingsContent, /navigator\.geolocation/, 'ReadingsTab deve utilizar a API Geolocation');

    const labTabContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/visit/LabReportTab.jsx'), 'utf-8');
    assert.match(labTabContent, /analyzeLabReportWithAI/, 'LabReportTab deve integrar leitura multimodal Gemini Vision');
    assert.match(labTabContent, /Validar e Incluir nos Comentários/, 'LabReportTab deve conter botão de validação técnica formal');
    assert.match(labTabContent, /Histórico de Laudos do Cliente/, 'LabReportTab deve exibir histórico de laudos do cliente');

    const geminiContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/lib/gemini.js'), 'utf-8');
    assert.match(geminiContent, /export async function generateTechnicalAnalysis/, 'generateTechnicalAnalysis original deve permanecer intacta');
    assert.match(geminiContent, /export async function chatWithAI/, 'chatWithAI original deve permanecer intacta');
    assert.match(geminiContent, /export async function analyzeLabReportWithAI/, 'analyzeLabReportWithAI deve estar exportada');

    const reportTemplateContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/visit/ReportTemplate.jsx'), 'utf-8');
    assert.match(reportTemplateContent, /formatGpsForReport/, 'ReportTemplate deve exibir geolocalização GPS');
    assert.match(reportTemplateContent, /getWeatherReportLabel/, 'ReportTemplate deve exibir fator climático');
    assert.match(reportTemplateContent, /Análise de Laudos Laboratoriais/, 'ReportTemplate deve conter seção opcional de Laudos');

    const reportPdfContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/components/visit/ReportPdf.jsx'), 'utf-8');
    assert.match(reportPdfContent, /formatGpsForReport/, 'ReportPdf deve exibir geolocalização GPS no PDF');
    assert.match(reportPdfContent, /getWeatherReportLabel/, 'ReportPdf deve exibir fator climático no PDF');
    assert.match(reportPdfContent, /Análise de Laudos Laboratoriais/, 'ReportPdf deve conter seção opcional de Laudos no PDF');
});
