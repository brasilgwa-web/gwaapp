// Utilitários de Fator Climático (Chuvas) e Geolocalização (GPS) por Ponto de Coleta
// Projetado com Dual-Layer (Colunas Nativas + Fallback Transparente) para Zero Regressão

export const WEATHER_OPTIONS = [
    { value: 'none', label: 'Não informado' },
    { value: 'sunny', label: '☀️ Tempo Seco (Sem Chuva)', reportLabel: 'Tempo Seco (Sem Chuva)' },
    { value: 'light_rain', label: '🌦️ Chuva Leve / Recente', reportLabel: 'Chuva Leve / Recente' },
    { value: 'heavy_rain', label: '🌧️ Chuva Moderada / Forte (24h)', reportLabel: 'Chuva Moderada / Forte (24h)' },
    { value: 'post_rain', label: '💧 Pós-Chuva (Influência Pluvial)', reportLabel: 'Pós-Chuva (Influência Pluvial)' },
];

// Segmented Controls / Quick-Tap Tags para dispositivos móveis em campo (2 dimensões: Clima Atual + Histórico de Chuvas)
export const CURRENT_WEATHER_OPTIONS = [
    { value: 'sunny', label: '☀️ Ensolarado', shortLabel: '☀️ Ensolarado', reportLabel: 'Ensolarado' },
    { value: 'cloudy', label: '☁️ Nublado', shortLabel: '☁️ Nublado', reportLabel: 'Nublado' },
    { value: 'light_rain', label: '🌧️ Chuva Leve', shortLabel: '🌧️ Chovendo Leve', reportLabel: 'Chuva Leve' },
    { value: 'heavy_rain', label: '⛈️ Chuva Forte/T.', shortLabel: '⛈️ Tempestade', reportLabel: 'Chuva Forte / Tempestade' },
];

export const RAIN_HISTORY_OPTIONS = [
    { value: 'no_rain', label: '❌ Não Choveu', shortLabel: '❌ Não choveu', reportLabel: 'Não Choveu' },
    { value: 'rain_24h', label: '⏱️ Últimas 24h', shortLabel: '⏱️ Últimas 24h', reportLabel: 'Últimas 24h' },
    { value: 'rain_24_48h', label: '⏳ Histórico Recente (24h a 48h)', shortLabel: '⏳ De 24h a 48h atrás', reportLabel: 'Recente (24h a 48h)' },
];

/**
 * Converte o valor salvo em `weather_condition` (novo formato `current|history` ou legado)
 * em um objeto `{ current, history }` para os botões de seleção rápida (Segmented Controls).
 */
export function parseWeatherState(weatherCondition) {
    if (!weatherCondition || weatherCondition === 'none') {
        return { current: null, history: null };
    }
    const raw = String(weatherCondition).trim();
    if (raw.includes('|')) {
        const [cur, hist] = raw.split('|');
        return {
            current: cur || null,
            history: hist || null
        };
    }
    // Retrocompatibilidade com valores legados de 1 dimensão
    if (raw === 'post_rain') {
        return { current: null, history: 'rain_24_48h' };
    }
    if (CURRENT_WEATHER_OPTIONS.some(o => o.value === raw)) {
        return { current: raw, history: null };
    }
    if (RAIN_HISTORY_OPTIONS.some(o => o.value === raw)) {
        return { current: null, history: raw };
    }
    return { current: null, history: null };
}

/**
 * Codifica `{ current, history }` em uma string `current|history` compatível com a coluna `weather_condition` e Dual-Layer.
 */
export function buildWeatherConditionValue(current, history) {
    const c = current && current !== 'none' ? current : '';
    const h = history && history !== 'none' ? history : '';
    if (!c && !h) return null;
    return `${c}|${h}`;
}

/**
 * Verifica se ambas as dimensões obrigatórias do Fator Climático (1. Clima Atual e 2. Histórico de Chuvas) foram preenchidas.
 */
export function isWeatherComplete(weatherCondition) {
    const { current, history } = parseWeatherState(weatherCondition);
    return Boolean(current && history);
}

const META_MARKER = '[[WGA_META:';
const META_END = ']]';

/**
 * Extrai de forma limpa o texto de Análises Complementares e os metadados de Clima/GPS,
 * funcionando tanto com colunas dedicadas do Supabase quanto com o fallback embutido.
 */
export function parseSampleRecord(sample) {
    if (!sample) return null;

    let rawComp = sample.complementary_info || '';
    let embeddedMeta = {};

    const markerIdx = rawComp.indexOf(META_MARKER);
    if (markerIdx !== -1) {
        const endIdx = rawComp.indexOf(META_END, markerIdx);
        if (endIdx !== -1) {
            const jsonStr = rawComp.substring(markerIdx + META_MARKER.length, endIdx);
            try {
                embeddedMeta = JSON.parse(jsonStr) || {};
            } catch {
                embeddedMeta = {};
            }
            rawComp = (rawComp.substring(0, markerIdx) + rawComp.substring(endIdx + META_END.length)).trim();
        }
    }

    const weather_condition = sample.weather_condition ?? embeddedMeta.weather_condition ?? null;
    const weather_notes = sample.weather_notes ?? embeddedMeta.weather_notes ?? null;
    const gps_status = sample.gps_status ?? embeddedMeta.gps_status ?? null;

    const rawLat = sample.gps_latitude ?? embeddedMeta.gps_latitude;
    const rawLng = sample.gps_longitude ?? embeddedMeta.gps_longitude;
    const rawAcc = sample.gps_accuracy ?? embeddedMeta.gps_accuracy;

    const gps_latitude = rawLat !== null && rawLat !== undefined && rawLat !== '' ? Number(rawLat) : null;
    const gps_longitude = rawLng !== null && rawLng !== undefined && rawLng !== '' ? Number(rawLng) : null;
    const gps_accuracy = rawAcc !== null && rawAcc !== undefined && rawAcc !== '' ? Number(rawAcc) : null;
    const gps_captured_at = sample.gps_captured_at ?? embeddedMeta.gps_captured_at ?? null;

    return {
        ...sample,
        complementary_info: rawComp,
        weather_condition: weather_condition && weather_condition !== 'none' ? weather_condition : null,
        weather_notes: weather_notes || null,
        gps_status: gps_status || null,
        gps_latitude: Number.isFinite(gps_latitude) ? gps_latitude : null,
        gps_longitude: Number.isFinite(gps_longitude) ? gps_longitude : null,
        gps_accuracy: Number.isFinite(gps_accuracy) ? gps_accuracy : null,
        gps_captured_at,
    };
}

/**
 * Serializa texto complementar + metadados em uma única string caso o banco ainda
 * não tenha recebido as colunas DDL novas (fallback 100% transparente).
 */
export function serializeSampleWithMeta(cleanComplementaryInfo, meta = {}) {
    const cleanText = (cleanComplementaryInfo || '').trim();
    const compactMeta = {};

    if (meta.weather_condition && meta.weather_condition !== 'none') {
        compactMeta.weather_condition = meta.weather_condition;
    }
    if (meta.weather_notes) {
        compactMeta.weather_notes = meta.weather_notes;
    }
    if (meta.gps_status) {
        compactMeta.gps_status = meta.gps_status;
    }
    if (meta.gps_latitude !== null && meta.gps_latitude !== undefined && Number.isFinite(Number(meta.gps_latitude))) {
        compactMeta.gps_latitude = Number(meta.gps_latitude);
    }
    if (meta.gps_longitude !== null && meta.gps_longitude !== undefined && Number.isFinite(Number(meta.gps_longitude))) {
        compactMeta.gps_longitude = Number(meta.gps_longitude);
    }
    if (meta.gps_accuracy !== null && meta.gps_accuracy !== undefined && Number.isFinite(Number(meta.gps_accuracy))) {
        compactMeta.gps_accuracy = Math.round(Number(meta.gps_accuracy));
    }
    if (meta.gps_captured_at) {
        compactMeta.gps_captured_at = meta.gps_captured_at;
    }

    if (Object.keys(compactMeta).length === 0) {
        return cleanText;
    }

    const metaBlock = `${META_MARKER}${JSON.stringify(compactMeta)}${META_END}`;
    return cleanText ? `${cleanText} ${metaBlock}` : metaBlock;
}

/**
 * Retorna o rótulo amigável do Fator Climático para impressão nos relatórios Web e PDF.
 */
export function getWeatherReportLabel(weatherCondition) {
    if (!weatherCondition || weatherCondition === 'none') return null;
    const raw = String(weatherCondition).trim();
    if (raw.includes('|')) {
        const { current, history } = parseWeatherState(raw);
        const curOpt = CURRENT_WEATHER_OPTIONS.find(o => o.value === current);
        const histOpt = RAIN_HISTORY_OPTIONS.find(o => o.value === history);
        if (curOpt && histOpt) {
            return `${curOpt.reportLabel} | Chuva Recente: ${histOpt.reportLabel}`;
        }
        if (curOpt) return curOpt.reportLabel;
        if (histOpt) return `Chuva Recente: ${histOpt.reportLabel}`;
        return null;
    }
    const found = WEATHER_OPTIONS.find(o => o.value === raw);
    if (found) return found.reportLabel;
    const foundCur = CURRENT_WEATHER_OPTIONS.find(o => o.value === raw);
    if (foundCur) return foundCur.reportLabel;
    const foundHist = RAIN_HISTORY_OPTIONS.find(o => o.value === raw);
    if (foundHist) return `Chuva Recente: ${foundHist.reportLabel}`;
    return raw;
}

/**
 * Formata os dados de Geolocalização (GPS) para impressão no cabeçalho do ponto de coleta.
 * Retorna null se a visita não tiver registro de GPS (retrocompatibilidade total).
 */
export function formatGpsForReport(sample) {
    if (!sample) return null;
    const parsed = sample.gps_status !== undefined ? sample : parseSampleRecord(sample);
    if (!parsed) return null;

    if (parsed.gps_status === 'confined_area') {
        return 'Área confinada / Sinal indisponível';
    }

    if (
        (parsed.gps_status === 'captured' || (!parsed.gps_status && parsed.gps_latitude !== null)) &&
        Number.isFinite(parsed.gps_latitude) &&
        Number.isFinite(parsed.gps_longitude)
    ) {
        const latStr = Number(parsed.gps_latitude).toFixed(6);
        const lngStr = Number(parsed.gps_longitude).toFixed(6);
        const accStr = Number.isFinite(parsed.gps_accuracy) ? ` (Precisão: ±${Math.round(parsed.gps_accuracy)}m)` : '';
        return `${latStr}, ${lngStr}${accStr}`;
    }

    if (parsed.gps_status === 'unavailable') {
        return 'Sinal GPS indisponível no local';
    }

    return null;
}

/**
 * Verifica se um equipamento na estrutura de relatório possui qualquer metadado de coleta preenchido
 */
export function hasSampleMetadata(sample) {
    if (!sample) return false;
    const parsed = parseSampleRecord(sample);
    return Boolean(
        parsed?.collection_time ||
        parsed?.complementary_info ||
        parsed?.weather_condition ||
        parsed?.gps_status ||
        (parsed?.gps_latitude !== null && parsed?.gps_longitude !== null)
    );
}

