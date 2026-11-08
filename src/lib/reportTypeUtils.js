// Utilitários para Seleção de Capas / Modelos de Relatório (Técnico vs Analítico)
// Funciona com 100% de compatibilidade com os registros atuais de `report_settings` e `visits`,
// antes e depois da execução de scripts SQL de migração (Dual-Layer Persistence).

import { parseLabReportData, serializeLabReportData } from './labReportMetadataUtils.js';

export const REPORT_PROFILES_MARKER_START = '<!--WGA_REPORT_PROFILES:';
export const REPORT_PROFILES_MARKER_END = '-->';

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

const PROFILE_KEYS = [
    'report_title',
    'footer_text',
    'logo_url',
    'logo2_url',
    'comments_orientations_enabled',
    'comments_orientations_text',
    'email_subject_default',
    'email_body_default',
    'cover_enabled',
    'cover_content',
    'cover_background_color',
    'cover_image_url'
];

/**
 * Remove o marcador oculto Dual-Layer (`<!--WGA_REPORT_PROFILES:...-->`) de qualquer HTML de capa.
 */
export function stripReportProfilesMetadata(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    const idx = rawText.indexOf(REPORT_PROFILES_MARKER_START);
    if (idx === -1) return rawText;
    return rawText.slice(0, idx).trimEnd();
}

/**
 * Extrai o conteúdo limpo da capa e os perfis (`technical` e `laboratory`) embutidos via Dual-Layer.
 */
export function parseReportSettingsProfiles(rawCoverContent) {
    if (!rawCoverContent || typeof rawCoverContent !== 'string') {
        return { cleanCoverContent: '', profiles: null };
    }
    const startIdx = rawCoverContent.indexOf(REPORT_PROFILES_MARKER_START);
    if (startIdx === -1) {
        return { cleanCoverContent: rawCoverContent, profiles: null };
    }
    const cleanCoverContent = rawCoverContent.slice(0, startIdx).trimEnd();
    const jsonStart = startIdx + REPORT_PROFILES_MARKER_START.length;
    const endIdx = rawCoverContent.indexOf(REPORT_PROFILES_MARKER_END, jsonStart);
    if (endIdx === -1) {
        return { cleanCoverContent, profiles: null };
    }
    try {
        const parsed = JSON.parse(rawCoverContent.slice(jsonStart, endIdx));
        return { cleanCoverContent, profiles: parsed && typeof parsed === 'object' ? parsed : null };
    } catch {
        return { cleanCoverContent, profiles: null };
    }
}

/**
 * Serializa o HTML da capa principal junto com o dicionário Dual-Layer de perfis (`technical` e `laboratory`).
 */
export function serializeReportSettingsProfiles(cleanCoverContent, profiles) {
    const cleanBase = stripReportProfilesMetadata(cleanCoverContent || '');
    if (!profiles || typeof profiles !== 'object') {
        return cleanBase;
    }
    const sanitizedProfiles = {};
    for (const typeKey of ['technical', 'laboratory']) {
        if (profiles[typeKey] && typeof profiles[typeKey] === 'object') {
            sanitizedProfiles[typeKey] = {};
            for (const k of PROFILE_KEYS) {
                if (k === 'cover_content') {
                    sanitizedProfiles[typeKey][k] = stripReportProfilesMetadata(profiles[typeKey][k] || '');
                } else if (profiles[typeKey][k] !== undefined) {
                    sanitizedProfiles[typeKey][k] = profiles[typeKey][k];
                }
            }
        }
    }
    return `${cleanBase}\n${REPORT_PROFILES_MARKER_START}${JSON.stringify(sanitizedProfiles)}${REPORT_PROFILES_MARKER_END}`;
}

function extractProfileFields(sourceObj = {}) {
    const out = {};
    for (const k of PROFILE_KEYS) {
        if (k === 'cover_content') {
            out[k] = stripReportProfilesMetadata(sourceObj[k] || '');
        } else if (sourceObj[k] !== undefined) {
            out[k] = sourceObj[k];
        }
    }
    return out;
}

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
 * respeitando 100% as configurações independentes de Geral, Email e Capa de cada modelo e
 * preservando a numeração sequencial global (`current_report_number`).
 */
export function resolveReportSettingsByType(allSettings, requestedType = 'technical') {
    if (!Array.isArray(allSettings) || allSettings.length === 0) {
        return null;
    }

    const normalizedType = requestedType === 'laboratory' ? 'laboratory' : 'technical';

    // Numeração global máxima para garantir que a troca de capa/modelo nunca reinicie o contador de relatórios
    const maxCurrentNumber = Math.max(1, ...allSettings.map(s => Number(s?.current_report_number) || 0));
    const maxHighestEmitted = Math.max(0, ...allSettings.map(s => Number(s?.highest_emitted_number) || 0));

    // Localiza a linha primária que armazena os perfis Dual-Layer (ou a primeira linha da tabela)
    const rowWithProfiles = allSettings.find(
        s => typeof s?.cover_content === 'string' && s.cover_content.includes(REPORT_PROFILES_MARKER_START)
    );
    const primaryRow = rowWithProfiles
        || allSettings.find(s => s?.type === 'technical')
        || allSettings[0];

    const { cleanCoverContent: primaryCleanCover, profiles: embeddedProfiles } = parseReportSettingsProfiles(primaryRow?.cover_content);

    // 1. Se existir o perfil salvo via Dual-Layer para o tipo solicitado, usa-o com prioridade
    if (embeddedProfiles && embeddedProfiles[normalizedType]) {
        const profileData = embeddedProfiles[normalizedType];
        return {
            ...primaryRow,
            ...profileData,
            cover_content: stripReportProfilesMetadata(profileData.cover_content ?? primaryCleanCover),
            id: primaryRow.id,
            resolved_type: normalizedType,
            current_report_number: maxCurrentNumber,
            highest_emitted_number: maxHighestEmitted
        };
    }

    // 2. Busca por linha dedicada no banco (coluna `type` ou `cover_style_config.report_type`)
    let matched = allSettings.find(
        s => s?.type === normalizedType || s?.cover_style_config?.report_type === normalizedType
    );

    // 3. Fallback inteligente pelos registros já existentes no banco de dados (pelo título configurado)
    if (!matched) {
        if (normalizedType === 'laboratory') {
            matched = allSettings.find(
                s => s.id !== primaryRow.id && /anal[ií]tico|laborat[oó]rio|ensaio/i.test(s?.report_title || '')
            ) || allSettings.find(s => /anal[ií]tico|laborat[oó]rio|ensaio/i.test(s?.report_title || ''));
        } else {
            matched = allSettings.find(s => Number(s?.current_report_number) === maxCurrentNumber)
                || allSettings.find(s => /t[eé]cnico|campo|integra/i.test(s?.report_title || ''))
                || primaryRow;
        }
    }

    const defaultLabCoverUrl = (typeof window !== 'undefined' && window.location?.origin)
        ? `${window.location.origin}/capa-ensaio-analitico.jpg`
        : '/capa-ensaio-analitico.jpg';

    if (!matched) {
        matched = primaryRow;
        if (normalizedType === 'laboratory') {
            return {
                ...matched,
                report_title: 'Relatório de Ensaio Analítico',
                cover_image_url: defaultLabCoverUrl,
                cover_content: primaryCleanCover,
                resolved_type: 'laboratory',
                current_report_number: maxCurrentNumber,
                highest_emitted_number: maxHighestEmitted
            };
        }
    } else if (normalizedType === 'laboratory' && !matched.cover_image_url) {
        return {
            ...matched,
            cover_image_url: defaultLabCoverUrl,
            cover_content: stripReportProfilesMetadata(matched.cover_content),
            resolved_type: 'laboratory',
            current_report_number: maxCurrentNumber,
            highest_emitted_number: maxHighestEmitted
        };
    }

    return {
        ...matched,
        cover_content: stripReportProfilesMetadata(matched.cover_content),
        resolved_type: normalizedType,
        current_report_number: maxCurrentNumber,
        highest_emitted_number: maxHighestEmitted
    };
}

/**
 * Monta o payload de gravação em `report_settings` preservando 100% de independência
 * entre os modelos `technical` e `laboratory` para Geral, Email e Capa, sem depender
 * de colunas inexistentes no banco de dados.
 */
export function buildReportSettingsSavePayload(allSettings, selectedType, formData) {
    const normalizedType = selectedType === 'laboratory' ? 'laboratory' : 'technical';
    const otherType = normalizedType === 'technical' ? 'laboratory' : 'technical';

    const rowWithProfiles = Array.isArray(allSettings)
        ? allSettings.find(s => typeof s?.cover_content === 'string' && s.cover_content.includes(REPORT_PROFILES_MARKER_START))
        : null;
    const primaryRow = rowWithProfiles
        || (Array.isArray(allSettings) ? (allSettings.find(s => s?.type === 'technical') || allSettings[0]) : null);

    const { profiles: existingEmbedded } = parseReportSettingsProfiles(primaryRow?.cover_content);

    // Resolve o estado atual do outro modelo para preservá-lo intacto
    const otherResolved = resolveReportSettingsByType(allSettings, otherType) || {};
    const otherProfile = (existingEmbedded && existingEmbedded[otherType])
        ? existingEmbedded[otherType]
        : extractProfileFields(otherResolved);

    const currentProfile = extractProfileFields(formData);

    const nextProfiles = {
        ...(existingEmbedded || {}),
        [otherType]: otherProfile,
        [normalizedType]: currentProfile
    };

    const technicalProfile = nextProfiles.technical || currentProfile;

    // Colunas padrão da linha primária (mantém os dados principais e embute ambos os perfis em cover_content)
    const primaryPayload = {
        current_report_number: parseInt(formData.current_report_number) || 1,
        logo_url: technicalProfile.logo_url ?? null,
        logo2_url: technicalProfile.logo2_url ?? null,
        footer_text: technicalProfile.footer_text ?? '',
        report_title: technicalProfile.report_title ?? '',
        email_subject_default: technicalProfile.email_subject_default ?? '',
        email_body_default: technicalProfile.email_body_default ?? '',
        cover_enabled: technicalProfile.cover_enabled !== false,
        cover_content: serializeReportSettingsProfiles(technicalProfile.cover_content, nextProfiles),
        cover_background_color: technicalProfile.cover_background_color || '#1e40af',
        cover_image_url: technicalProfile.cover_image_url ?? null,
        comments_orientations_enabled: technicalProfile.comments_orientations_enabled !== false,
        comments_orientations_text: technicalProfile.comments_orientations_text ?? ''
    };

    // Se houver uma segunda linha dedicada no banco para o modelo laboratorial, também a mantém sincronizada
    const secondaryRow = Array.isArray(allSettings) && primaryRow
        ? allSettings.find(s => s.id !== primaryRow.id && s?.type === 'laboratory')
        : null;

    let secondaryPayload = null;
    if (secondaryRow && normalizedType === 'laboratory') {
        secondaryPayload = {
            current_report_number: parseInt(formData.current_report_number) || 1,
            ...currentProfile
        };
    }

    return {
        primaryId: primaryRow?.id || null,
        primaryPayload,
        secondaryId: secondaryRow?.id || null,
        secondaryPayload
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
