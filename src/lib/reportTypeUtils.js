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
 * Identifica se o usuário possui perfil de Administrador ('admin', 'administrador').
 */
export function isUserAdminRole(user) {
    if (!user) return false;
    const roleStr = `${user.role_data?.name || ''} ${user.role?.name || ''} ${typeof user.role === 'string' ? user.role : ''}`.toLowerCase();
    return /admin/i.test(roleStr);
}

/**
 * Determina o tipo de relatório obrigatório vinculado ao perfil do usuário:
 * - Perfil Laboratório ('laboratorio', 'laboratório', 'analitico', 'analítico') -> 'laboratory'
 * - Perfil Técnico ('tecnico', 'técnico', 'user') -> 'technical'
 * - Perfil Administrador -> null (administrador pode escolher livremente)
 */
export function getReportTypeFromUserRole(user) {
    if (!user) return null;
    if (isUserAdminRole(user)) return null;
    const roleStr = `${user.role_data?.name || ''} ${user.role?.name || ''} ${typeof user.role === 'string' ? user.role : ''}`.toLowerCase();
    if (/lab|anal[ií]t/i.test(roleStr)) {
        return 'laboratory';
    }
    if (/t[eé]c|campo|user/i.test(roleStr)) {
        return 'technical';
    }
    return null;
}

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
        if (normalizedType === 'laboratory') {
            const defaultLabCoverUrl = (typeof window !== 'undefined' && window.location?.origin)
                ? `${window.location.origin}/capa-ensaio-analitico.jpg`
                : '/capa-ensaio-analitico.jpg';
            return {
                ...matched,
                report_title: 'Relatório de Ensaio Analítico',
                cover_image_url: defaultLabCoverUrl,
                current_report_number: maxCurrentNumber,
                highest_emitted_number: maxHighestEmitted
            };
        }
    } else if (normalizedType === 'laboratory' && !matched.cover_image_url) {
        const defaultLabCoverUrl = (typeof window !== 'undefined' && window.location?.origin)
            ? `${window.location.origin}/capa-ensaio-analitico.jpg`
            : '/capa-ensaio-analitico.jpg';
        return {
            ...matched,
            cover_image_url: defaultLabCoverUrl,
            current_report_number: maxCurrentNumber,
            highest_emitted_number: maxHighestEmitted
        };
    }

    return {
        ...matched,
        current_report_number: maxCurrentNumber,
        highest_emitted_number: maxHighestEmitted
    };
}

/**
 * Obtém o tipo de relatório para uma visita ('technical' | 'laboratory'):
 * 1. Se `currentUser` for informado e NÃO for administrador:
 *    - Perfil Laboratório -> 'laboratory'
 *    - Perfil Técnico -> 'technical'
 * 2. Caso contrário (ex.: Administrador ou visualização do relatório), lê o tipo salvo na visita
 *    (coluna nativa `visit.report_type` ou metadado Dual-Layer em `lab_report_comments`).
 * 3. Se a visita não tiver tipo salvo explícito, verifica o perfil do responsável pela visita (`technicianUser`).
 * 4. Padrão: 'technical'.
 */
export function getVisitReportType(visit, currentUser = null, technicianUser = null) {
    const forcedByCurrentUser = getReportTypeFromUserRole(currentUser);
    if (forcedByCurrentUser) {
        return forcedByCurrentUser;
    }

    if (visit) {
        if (visit.report_type === 'laboratory' || visit.report_type === 'technical') {
            return visit.report_type;
        }
        const parsedLab = parseLabReportData(visit);
        if (parsedLab.metadata?.report_type === 'laboratory' || parsedLab.metadata?.report_type === 'technical') {
            return parsedLab.metadata.report_type;
        }
    }

    const fromTechnician = getReportTypeFromUserRole(technicianUser);
    if (fromTechnician) {
        return fromTechnician;
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
