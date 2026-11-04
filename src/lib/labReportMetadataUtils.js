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

