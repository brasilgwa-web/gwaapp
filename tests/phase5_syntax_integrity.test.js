import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';
import { resolveReportSettingsByType, getVisitReportType, buildVisitReportTypePayload, buildReportSettingsSavePayload, isUserAdminRole, getReportTypeFromUserRole } from '../src/lib/reportTypeUtils.js';

const PROJECT_ROOT = process.cwd();

const DELIVERED_FILES = [
    'migrations_propostas_wga_360.sql',
    'src/lib/fieldMetadataUtils.js',
    'src/lib/labReportMetadataUtils.js',
    'src/lib/reportTypeUtils.js',
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
    assert.match(labTabContent, /Laudo do Laboratório/, 'LabReportTab deve manter tela original de Laudo do Laboratório');
    assert.match(labTabContent, /Comentários Complementares/, 'LabReportTab deve manter Comentários Complementares');
    assert.match(labTabContent, /Histórico de Laudos do Cliente/, 'LabReportTab deve manter o Histórico de Laudos do Cliente e busca');

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

test('Fase 5.3 - Seletor de Capas / Tipo de Relatório (Serviço Técnico vs Serviço Analítico)', () => {
    const mockDbRows = [
        { id: 'row-tech', report_title: 'WGA INTEGRA 360', cover_image_url: 'https://example.com/cover-tech.png', current_report_number: 538, highest_emitted_number: 537 },
        { id: 'row-lab', report_title: 'Relatório de Ensaio Analitico', cover_image_url: 'https://example.com/cover-lab.png', current_report_number: 3, highest_emitted_number: 2 }
    ];

    const resolvedTech = resolveReportSettingsByType(mockDbRows, 'technical');
    assert.equal(resolvedTech.id, 'row-tech');
    assert.equal(resolvedTech.cover_image_url, 'https://example.com/cover-tech.png');
    assert.equal(resolvedTech.current_report_number, 538);

    const resolvedLab = resolveReportSettingsByType(mockDbRows, 'laboratory');
    assert.equal(resolvedLab.id, 'row-lab');
    assert.equal(resolvedLab.cover_image_url, 'https://example.com/cover-lab.png');
    // Numeração sequencial preservada em 538 mesmo ao trocar para a capa analítica
    assert.equal(resolvedLab.current_report_number, 538);

    const visitInitial = { id: 'v1', lab_report_comments: 'Parecer validado' };
    assert.equal(getVisitReportType(visitInitial), 'technical');

    const { safeFallbackPayload } = buildVisitReportTypePayload(visitInitial, 'laboratory');
    const visitAfterSave = { ...visitInitial, ...safeFallbackPayload };
    assert.equal(getVisitReportType(visitAfterSave), 'laboratory');

    // Regras de Perfil: Admin vs Técnico vs Laboratório
    assert.equal(isUserAdminRole({ role: 'admin' }), true);
    assert.equal(isUserAdminRole({ role_data: { name: 'Administrador' } }), true);
    assert.equal(isUserAdminRole({ role: 'tecnico' }), false);
    assert.equal(isUserAdminRole({ role: 'Laboratorio' }), false);

    assert.equal(getReportTypeFromUserRole({ role: 'tecnico' }), 'technical');
    assert.equal(getReportTypeFromUserRole({ role_data: { name: 'Laboratório' } }), 'laboratory');
    assert.equal(getReportTypeFromUserRole({ role: 'admin' }), null);

    // Perfil Laboratório sempre gera relatório analítico ('laboratory')
    assert.equal(getVisitReportType(visitInitial, { role: 'Laboratorio' }), 'laboratory');
    // Perfil Técnico sempre gera relatório técnico ('technical')
    assert.equal(getVisitReportType(visitAfterSave, { role: 'tecnico' }), 'technical');
    // Perfil Admin respeita a escolha salva na visita
    assert.equal(getVisitReportType(visitAfterSave, { role: 'admin' }), 'laboratory');

    // Teste de Independência Dual-Layer (Geral, Email e Capa) mesmo com apenas 1 linha em report_settings
    const singleRowDb = [{
        id: 'singleton-1',
        current_report_number: 600,
        highest_emitted_number: 599,
        report_title: 'Relatório de Atendimento Técnico em Campo',
        footer_text: 'Rodapé Técnico',
        email_subject_default: 'Assunto Técnico - {client_name}',
        email_body_default: '<div>Corpo Email Técnico</div>',
        cover_image_url: 'https://example.com/capa-tecnica.jpg',
        cover_content: '<h1>Capa Técnica</h1>'
    }];

    // Admin salva configurações para o modelo Analítico ('laboratory')
    const { primaryPayload: afterLabSave } = buildReportSettingsSavePayload(singleRowDb, 'laboratory', {
        current_report_number: 600,
        report_title: 'Relatório de Ensaio Analítico',
        footer_text: 'Rodapé Laboratório ISO 9001',
        email_subject_default: 'Laudo Analítico - {client_name}',
        email_body_default: '<div>Corpo Email Analítico</div>',
        cover_image_url: 'https://example.com/capa-analitica.jpg',
        cover_content: '<h1>Capa Analítica</h1>'
    });

    const dbAfterLabSave = [{ ...singleRowDb[0], ...afterLabSave }];

    // Verifica que ambos os modelos ('technical' e 'laboratory') mantêm Geral, Email e Capa 100% independentes
    const checkTech = resolveReportSettingsByType(dbAfterLabSave, 'technical');
    const checkLab = resolveReportSettingsByType(dbAfterLabSave, 'laboratory');

    assert.equal(checkTech.report_title, 'Relatório de Atendimento Técnico em Campo');
    assert.equal(checkTech.footer_text, 'Rodapé Técnico');
    assert.equal(checkTech.email_subject_default, 'Assunto Técnico - {client_name}');
    assert.equal(checkTech.email_body_default, '<div>Corpo Email Técnico</div>');
    assert.equal(checkTech.cover_image_url, 'https://example.com/capa-tecnica.jpg');
    assert.equal(checkTech.cover_content, '<h1>Capa Técnica</h1>');

    assert.equal(checkLab.report_title, 'Relatório de Ensaio Analítico');
    assert.equal(checkLab.footer_text, 'Rodapé Laboratório ISO 9001');
    assert.equal(checkLab.email_subject_default, 'Laudo Analítico - {client_name}');
    assert.equal(checkLab.email_body_default, '<div>Corpo Email Analítico</div>');
    assert.equal(checkLab.cover_image_url, 'https://example.com/capa-analitica.jpg');
    assert.equal(checkLab.cover_content, '<h1>Capa Analítica</h1>');
});
