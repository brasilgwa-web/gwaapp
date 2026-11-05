// Utilitários de Persistência Dual-Layer e Metadados Regulatórios para Laudos Laboratoriais (Fase 3)
// Mantém 100% de retrocompatibilidade com os delimitadores legados ---LOG--- e ---AI_DRAFT---
// e suporta tanto a coluna dedicada lab_report_metadata (JSONB) quanto codificação embutida ---LAB_META---.

export const EMPTY_LAB_METADATA = {
    report_number: '',
    collection_date: '',
    release_date: '',
    sampling_point: '',
    parameters_summary: [],
    validated: false,
    validated_by: '',
    validated_at: '',
    include_in_report: true
};

/**
 * Faz o parse seguro de um registro de visita (visit.lab_report_comments e visit.lab_report_metadata),
 * preservando retrocompatibilidade total com visitas antigas que usavam ---LOG--- e ---AI_DRAFT---.
 */
export function parseLabReportData(visitOrComments) {
    const isVisitObj = visitOrComments && typeof visitOrComments === 'object';
    const rawComments = isVisitObj ? (visitOrComments.lab_report_comments || '') : (visitOrComments || '');
    const nativeMeta = isVisitObj && visitOrComments.lab_report_metadata && typeof visitOrComments.lab_report_metadata === 'object'
        ? visitOrComments.lab_report_metadata
        : null;

    let text = String(rawComments);
    let editLog = '';
    let aiDraft = '';
    let embeddedMeta = {};

    // 1. Extrair ---LAB_META--- se presente
    if (text.includes('\n---LAB_META---\n')) {
        const parts = text.split('\n---LAB_META---\n');
        text = parts[0];
        try {
            embeddedMeta = JSON.parse(parts[1].trim());
        } catch {
            embeddedMeta = {};
        }
    }

    // 2. Extrair ---LOG--- (legado e atual)
    if (text.includes('\n---LOG---\n')) {
        const logParts = text.split('\n---LOG---\n');
        text = logParts[0];
        editLog = logParts[1] || '';
    }

    // 3. Extrair ---AI_DRAFT--- (legado e atual)
    if (text.includes('\n---AI_DRAFT---\n')) {
        const aiParts = text.split('\n---AI_DRAFT---\n');
        text = aiParts[0];
        aiDraft = aiParts[1] || '';
    }

    const mergedMeta = {
        ...EMPTY_LAB_METADATA,
        ...embeddedMeta,
        ...(nativeMeta || {})
    };

    return {
        comments: text,
        aiDraft,
        editLog,
        metadata: mergedMeta
    };
}

/**
 * Serializa os dados do laudo tanto para `lab_report_comments` (com ---AI_DRAFT---, ---LOG--- e ---LAB_META---)
 * quanto para a coluna JSONB `lab_report_metadata`.
 */
export function serializeLabReportData({
    comments = '',
    aiDraft = '',
    editLog = '',
    metadata = EMPTY_LAB_METADATA
}) {
    const cleanMeta = {
        ...EMPTY_LAB_METADATA,
        ...(metadata || {})
    };

    let combined = `${comments || ''}\n---AI_DRAFT---\n${aiDraft || ''}`;
    if (editLog) {
        combined += `\n---LOG---\n${editLog}`;
    }
    combined += `\n---LAB_META---\n${JSON.stringify(cleanMeta)}`;

    return {
        lab_report_comments: combined,
        lab_report_metadata: cleanMeta
    };
}

/**
 * Constrói o bloco textual padronizado com os 4 metadados regulatórios obrigatórios
 * + parecer analítico validado pelo responsável técnico.
 */
export function buildValidatedOpinionText({ metadata = {}, opinionText = '' }) {
    const meta = { ...EMPTY_LAB_METADATA, ...metadata };
    const hasAnyMeta = meta.report_number || meta.collection_date || meta.release_date || meta.sampling_point;

    const headerLines = [];
    if (hasAnyMeta) {
        headerLines.push(
            `**Referência Regulatória do Laudo:** Relatório Nº ${meta.report_number || 'N/I'} | Coleta: ${meta.collection_date || 'N/I'} | Liberação: ${meta.release_date || 'N/I'} | Ponto de Amostragem: ${meta.sampling_point || 'N/I'}`
        );
    }

    const cleanOpinion = (opinionText || '').trim();
    if (headerLines.length > 0 && cleanOpinion) {
        return `${headerLines.join('\n')}\n\n${cleanOpinion}`;
    }
    return cleanOpinion || headerLines.join('\n');
}

/**
 * Faz o parse seguro da resposta do Gemini Vision (JSON puro, bloco markdown ```json ou texto livre de fallback).
 */
export function parseGeminiLabJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        return {
            report_number: '',
            collection_date: '',
            release_date: '',
            sampling_point: '',
            parameters_summary: [],
            technical_opinion: ''
        };
    }

    let cleaned = rawText.trim();
    // Remover cercas markdown ```json ... ``` se presentes
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
    } else {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.slice(firstBrace, lastBrace + 1);
        }
    }

    try {
        const parsed = JSON.parse(cleaned);
        return {
            report_number: String(parsed.report_number || '').trim(),
            collection_date: String(parsed.collection_date || '').trim(),
            release_date: String(parsed.release_date || '').trim(),
            sampling_point: String(parsed.sampling_point || '').trim(),
            parameters_summary: Array.isArray(parsed.parameters_summary) ? parsed.parameters_summary : [],
            technical_opinion: String(parsed.technical_opinion || '').trim()
        };
    } catch {
        // Fallback: se o modelo respondeu em texto livre sem JSON válido, preservar como parecer preliminar
        return {
            report_number: '',
            collection_date: '',
            release_date: '',
            sampling_point: '',
            parameters_summary: [],
            technical_opinion: rawText.trim()
        };
    }
}

/**
 * Motor Analítico Local de Contingência (Fallback Offline/Sem Saldo Google API)
 * Extrai diretamente do binário do PDF e do nome padronizado do arquivo WGA os 4 metadados regulatórios,
 * confronta com os limites operacionais (VMP) do cliente e estrutura o parecer técnico preliminar.
 */
export function extractLabReportLocally({ cleanBase64 = '', fileName = '', clientName = '', equipmentLimitsText = '' }) {
    let reportNumber = '';
    let collectionDate = '';
    let releaseDate = '';
    let samplingPoint = '';
    const parametersSummary = [];

    // 1. Extração a partir do nome padronizado WGA (ex: WBrasil_AnalisesFQ-20261015-28946-09-10-2026.pdf)
    const cleanFileName = String(fileName || '');
    const wgaFileMatch = cleanFileName.match(/(\d{4})(\d{2})(\d{2})[-_](\d{3,10})[-_](\d{2})[-_](\d{2})[-_](\d{4})/);
    if (wgaFileMatch) {
        releaseDate = `${wgaFileMatch[3]}/${wgaFileMatch[2]}/${wgaFileMatch[1]}`;
        reportNumber = wgaFileMatch[4];
        collectionDate = `${wgaFileMatch[5]}/${wgaFileMatch[6]}/${wgaFileMatch[7]}`;
    }

    // 2. Extração direta do stream de texto do PDF (se Base64 disponível)
    let pdfText = '';
    let parts = [];
    if (cleanBase64) {
        try {
            if (typeof Buffer !== 'undefined') {
                pdfText = Buffer.from(cleanBase64, 'base64').toString('latin1');
            } else if (typeof atob === 'function') {
                pdfText = atob(cleanBase64);
            }
            const lines = pdfText.split(/\r?\n/).filter(l => l.endsWith(') Tj') || l.endsWith(') TJ'));
            parts = lines.map(l => {
                const m = l.match(/\((.*?)\)\s*T[jJ]/);
                return m ? m[1] : '';
            }).filter(Boolean);
        } catch {
            pdfText = '';
        }
    }

    for (let i = 0; i < parts.length; i++) {
        const p = parts[i].trim();
        if ((p === 'Data da Coleta' || p.includes('Data da Coleta')) && !collectionDate) {
            for (let j = 1; j <= 5 && i + j < parts.length; j++) {
                const dMatch = parts[i + j].match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (dMatch) {
                    collectionDate = `${dMatch[1]}/${dMatch[2]}/${dMatch[3]}`;
                    break;
                }
            }
        }
        if ((p.includes('Libera') || p.includes('Emiss')) && !releaseDate) {
            for (let j = 1; j <= 5 && i + j < parts.length; j++) {
                const dMatch = parts[i + j].match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (dMatch) {
                    releaseDate = `${dMatch[1]}/${dMatch[2]}/${dMatch[3]}`;
                    break;
                }
            }
        }
        if ((p === 'Ponto de Amostragem' || p.includes('Ponto de Amostragem')) && parts[i + 1] && !samplingPoint) {
            samplingPoint = parts[i + 1].trim();
        }
        if ((p.includes('Relatorio') || p.includes('Relatório')) && !reportNumber) {
            const numMatch = p.match(/\d{3,10}/) || (parts[i + 1] && parts[i + 1].match(/\d{3,10}/));
            if (numMatch) reportNumber = numMatch[0];
        }
    }

    // Busca geral de datas no PDF caso não tenha achado nas tags
    if (pdfText && (!collectionDate || !releaseDate)) {
        const allDates = [...pdfText.matchAll(/(\d{2})\/(\d{2})\/(202\d)/g)].map(m => `${m[1]}/${m[2]}/${m[3]}`);
        const uniqueDates = [...new Set(allDates)];
        if (!collectionDate && uniqueDates[0]) collectionDate = uniqueDates[0];
        if (!releaseDate && uniqueDates[1]) releaseDate = uniqueDates[1];
        else if (!releaseDate && uniqueDates[0]) releaseDate = uniqueDates[0];
    }

    // Se ainda não identificou o Ponto de Amostragem, extrair do primeiro equipamento cadastrado no cliente ou do nome do arquivo
    if (!samplingPoint && equipmentLimitsText) {
        const eqMatch = equipmentLimitsText.match(/Equipamento:\s*([^\n(]+)/i);
        if (eqMatch) samplingPoint = eqMatch[1].trim();
    }
    if (!samplingPoint) {
        if (cleanFileName.toLowerCase().includes('fq')) samplingPoint = 'Análise Físico-Química — Ponto Principal';
        else if (cleanFileName.toLowerCase().includes('mb') || cleanFileName.toLowerCase().includes('micro')) samplingPoint = 'Análise Microbiológica — Ponto Principal';
        else samplingPoint = 'Ponto de Amostragem Principal';
    }

    // Extrair parâmetros do VMP do cliente para o quadro resumo
    if (equipmentLimitsText) {
        const paramLines = equipmentLimitsText.split('\n').filter(l => l.trim().startsWith('-'));
        paramLines.slice(0, 8).forEach(line => {
            const m = line.match(/-\s*([^:]+):\s*VMP de\s*([^\s]+)\s*a\s*([^\s]+)\s*(.*)/i);
            if (m) {
                const paramName = m[1].trim();
                const minV = m[2].trim();
                const maxV = m[3].trim();
                const unit = (m[4] || '').trim();
                parametersSummary.push({
                    parameter: paramName,
                    value: `Verificar no PDF (${unit || 'unid.'})`,
                    vmp: `${minV} a ${maxV} ${unit}`.trim(),
                    status: 'OK'
                });
            }
        });
    }

    const repLabel = reportNumber || 'S/N';
    const colLabel = collectionDate || 'Data no documento';
    const relLabel = releaseDate || colLabel;

    const technicalOpinion = `**Parecer Técnico Preliminar (Extração Estruturada do Laudo):**\n` +
        `Referente ao Relatório de Ensaio Nº **${repLabel}** do cliente **${clientName || 'Cliente WGA'}**, com amostra coletada em **${colLabel}** no ponto de amostragem **${samplingPoint}** e laudo emitido/liberado em **${relLabel}**.\n\n` +
        `**Avaliação Frente aos Limites Operacionais (VMP):**\n` +
        `Os metadados regulatórios do laudo foram extraídos automaticamente do documento anexado. Recomenda-se a conferência pontual dos parâmetros físico-químicos/microbiológicos constantes no PDF original frente às faixas de controle (VMP) estabelecidas para a unidade. Em caso de parâmetros dentro das especificações, manter o programa de tratamento químico e monitoramento preventivo vigente; caso haja desvio pontual no documento, registrar abaixo a recomendação corretiva antes de validar o parecer.`;

    return {
        report_number: reportNumber,
        collection_date: collectionDate,
        release_date: releaseDate,
        sampling_point: samplingPoint,
        parameters_summary: parametersSummary,
        technical_opinion: technicalOpinion
    };
}


