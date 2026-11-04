import test from 'node:test';
import assert from 'node:assert/strict';
import {
    EMPTY_LAB_METADATA,
    parseLabReportData,
    serializeLabReportData,
    buildValidatedOpinionText,
    parseGeminiLabJson
} from '../src/lib/labReportMetadataUtils.js';

test('Fase 3.1 - Retrocompatibilidade 100% com laudos legados (---AI_DRAFT--- e ---LOG---)', () => {
    const legacyComments = 'Parâmetros dentro da normalidade.\n---AI_DRAFT---\nSugestão antiga da IA\n---LOG---\nEditado por João em 10/10/2025';
    const parsed = parseLabReportData({ lab_report_comments: legacyComments });

    assert.equal(parsed.comments, 'Parâmetros dentro da normalidade.');
    assert.equal(parsed.aiDraft, 'Sugestão antiga da IA');
    assert.equal(parsed.editLog, 'Editado por João em 10/10/2025');
    assert.equal(parsed.metadata.report_number, '');
    assert.equal(parsed.metadata.validated, false);
    assert.equal(parsed.metadata.include_in_report, true);
});

test('Fase 3.2 - Serialização e Deserialização Dual-Layer dos 4 Metadados Regulatórios e Validação Técnica', () => {
    const metadataInput = {
        ...EMPTY_LAB_METADATA,
        report_number: 'WGA-LAB-2026-991',
        collection_date: '01/11/2026',
        release_date: '04/11/2026',
        sampling_point: 'Caldeira B-02',
        parameters_summary: [
            { parameter: 'pH', value: '10.8', vmp: '10.5 - 11.5', status: 'OK' },
            { parameter: 'Sílica', value: '185 ppm', vmp: 'Máx 150 ppm', status: 'CRITICO' }
        ],
        validated: true,
        validated_by: 'Eng. André Silva (CRQ-IV 0441122)',
        validated_at: '2026-11-04T15:00:00.000Z',
        include_in_report: true
    };

    const serialized = serializeLabReportData({
        comments: 'Parecer oficial validado.',
        aiDraft: 'Rascunho preliminar da IA.',
        editLog: 'Validado e autorizado tecnicamente por Eng. André Silva em 04/11/2026',
        metadata: metadataInput
    });

    // Cenário A: Banco sem a coluna lab_report_metadata (lendo apenas lab_report_comments)
    const parsedFallback = parseLabReportData({
        lab_report_comments: serialized.lab_report_comments
    });
    assert.equal(parsedFallback.comments, 'Parecer oficial validado.');
    assert.equal(parsedFallback.aiDraft, 'Rascunho preliminar da IA.');
    assert.equal(parsedFallback.metadata.report_number, 'WGA-LAB-2026-991');
    assert.equal(parsedFallback.metadata.collection_date, '01/11/2026');
    assert.equal(parsedFallback.metadata.release_date, '04/11/2026');
    assert.equal(parsedFallback.metadata.sampling_point, 'Caldeira B-02');
    assert.equal(parsedFallback.metadata.validated, true);
    assert.equal(parsedFallback.metadata.parameters_summary.length, 2);

    // Cenário B: Banco com a coluna nativa lab_report_metadata preenchida
    const parsedNative = parseLabReportData({
        lab_report_comments: serialized.lab_report_comments,
        lab_report_metadata: serialized.lab_report_metadata
    });
    assert.equal(parsedNative.metadata.report_number, 'WGA-LAB-2026-991');
    assert.equal(parsedNative.metadata.validated_by, 'Eng. André Silva (CRQ-IV 0441122)');
});

test('Fase 3.3 - Formatação do Parecer Validado com Rastreabilidade Regulatória (buildValidatedOpinionText)', () => {
    const text = buildValidatedOpinionText({
        metadata: {
            report_number: 'LAB-7788',
            collection_date: '02/11/2026',
            release_date: '04/11/2026',
            sampling_point: 'Torre de Resfriamento TR-01'
        },
        opinionText: 'Constatou-se condutividade acima do VMP (3200 uS/cm vs máx 2500 uS/cm). Recomenda-se abertura de purga.'
    });

    assert.match(text, /Relatório Nº LAB-7788/);
    assert.match(text, /Coleta: 02\/11\/2026/);
    assert.match(text, /Liberação: 04\/11\/2026/);
    assert.match(text, /Ponto de Amostragem: Torre de Resfriamento TR-01/);
    assert.match(text, /Constatou-se condutividade acima do VMP/);
});

test('Fase 3.4 - Parse seguro da resposta multimodal Gemini Vision (JSON puro, bloco ```json e fallback texto)', () => {
    const fencedJson = `\`\`\`json
    {
      "report_number": "ENS-2026-405",
      "collection_date": "28/10/2026",
      "release_date": "03/11/2026",
      "sampling_point": "Afluente ETE",
      "parameters_summary": [
        { "parameter": "DQO", "value": "420 mg/L", "vmp": "< 500 mg/L", "status": "OK" }
      ],
      "technical_opinion": "Os resultados do Relatório ENS-2026-405 mostram conformidade."
    }
    \`\`\``;

    const parsed = parseGeminiLabJson(fencedJson);
    assert.equal(parsed.report_number, 'ENS-2026-405');
    assert.equal(parsed.collection_date, '28/10/2026');
    assert.equal(parsed.release_date, '03/11/2026');
    assert.equal(parsed.sampling_point, 'Afluente ETE');
    assert.equal(parsed.parameters_summary.length, 1);
    assert.equal(parsed.parameters_summary[0].status, 'OK');

    // Fallback quando a IA retorna texto livre
    const proseFallback = parseGeminiLabJson('Parecer em texto corrido sem formato JSON.');
    assert.equal(proseFallback.technical_opinion, 'Parecer em texto corrido sem formato JSON.');
    assert.equal(proseFallback.report_number, '');
});

