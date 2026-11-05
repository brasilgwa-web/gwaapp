// Utilitários para Seleção de Capas / Modelos de Relatório (Técnico vs Analítico)
// Funciona com 100% de compatibilidade com os registros atuais de `report_settings` e `visits`,
// antes e depois da execução de scripts SQL de migração (Dual-Layer Persistence).

import { parseLabReportData, serializeLabReportData } from './labReportMetadataUtils.js';

export const REPORT_TYPE_OPTIONS = [
    {
        value: 'technical',
        label: 'Relatório de Serviço Técnico (Atendimento em Campo)',
        shortLabel: 'Serviço Técnico (Campo)',
        defaultTitle: 'Relatório de Atendimento Técnico em Campo'
    },
    {
        value: 'laboratory',
        label: 'Relatório de Serviço Analítico (Ensaio Laboratorial)',
        shortLabel: 'Serviço Analítico (Laboratório)',
        defaultTitle: 'Relatório de Ensaio Analítico'
    }
];

/**
 * Resolve o registro correto de `report_settings` para o tipo solicitado ('technical' ou 'laboratory'),
 * preservando a numeração sequencial global (`current_report_number`) para nunca regredir a numeração.
 */
export function resolveReportSettingsByType(allSettings, requestedType = 'technical') {
    if (!Array.isArray(allSettings) || allSettings.length === 0) {
        return null;
    }

    const normalizedType = requestedType === 'laboratory' ? 'laboratory' : 'technical';

    // Numeração global máxima para garantir que a troca de capa/modelo nunca reinicie o contador de relatórios
    const maxCurrentNumber = Math.max(1, ...allSettings.map(s => Number(s?.current_report_number) || 0));
    const maxHighestEmitted = Math.max(0, ...allSettings.map(s => Number(s?.highest_emitted_number) || 0));

    // 1. Busca por marcador explícito (coluna `type` ou `cover_style_config.report_type`)
    let matched = allSettings.find(
        s => s?.type === normalizedType || s?.cover_style_config?.report_type === normalizedType
    );

    // 2. Fallback inteligente pelos registros já existentes no banco de dados (pelo título configurado)
    if (!matched) {
        if (normalizedType === 'laboratory') {
            matched = allSettings.find(s => /anal[ií]tico|laborat[oó]rio|ensaio/i.test(s?.report_title || ''));
        } else {
            // Para 'technical', prioriza o registro principal (maior current_report_number) ou título técnico/WGA
            matched = allSettings.find(s => Number(s?.current_report_number) === maxCurrentNumber)
                || allSettings.find(s => /t[eé]cnico|campo|integra/i.test(s?.report_title || ''))
                || allSettings[0];
        }
    }

    if (!matched) {
        matched = allSettings[0];
    }

    return {
        ...matched,
        current_report_number: maxCurrentNumber,
        highest_emitted_number: maxHighestEmitted
    };
}

/**
 * Obtém o tipo de relatório selecionado para uma visita ('technical' | 'laboratory'),
 * lendo tanto da coluna nativa `visit.report_type` quanto do metadado Dual-Layer em `lab_report_comments`.
 */
export function getVisitReportType(visit) {
    if (!visit) return 'technical';
    if (visit.report_type === 'laboratory' || visit.report_type === 'technical') {
        return visit.report_type;
    }
    const parsedLab = parseLabReportData(visit);
    if (parsedLab.metadata?.report_type === 'laboratory' || parsedLab.metadata?.report_type === 'technical') {
        return parsedLab.metadata.report_type;
    }
    return 'technical';
}

/**
 * Monta o payload Dual-Layer para salvar a escolha do tipo de relatório/capa na visita,
 * funcionando mesmo quando a coluna `report_type` ainda não foi criada na tabela `visits`.
 */
export function buildVisitReportTypePayload(visit, newReportType) {
    const normalizedType = newReportType === 'laboratory' ? 'laboratory' : 'technical';
    const parsedLab = parseLabReportData(visit);
    const nextMeta = {
        ...parsedLab.metadata,
        report_type: normalizedType
    };

    const serializedLab = serializeLabReportData({
        comments: parsedLab.comments,
        aiDraft: parsedLab.aiDraft,
        editLog: parsedLab.editLog,
        metadata: nextMeta
    });

    return {
        extendedPayload: {
            report_type: normalizedType,
            ...serializedLab
        },
        safeFallbackPayload: {
            lab_report_comments: serializedLab.lab_report_comments
        }
    };
}
