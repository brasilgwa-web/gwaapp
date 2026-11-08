import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    WEATHER_OPTIONS,
    CURRENT_WEATHER_OPTIONS,
    RAIN_HISTORY_OPTIONS,
    parseWeatherState,
    buildWeatherConditionValue,
    parseSampleRecord,
    serializeSampleWithMeta,
    getWeatherReportLabel,
    formatGpsForReport,
    hasSampleMetadata
} from '../src/lib/fieldMetadataUtils.js';

test('Fase 1: Script SQL de migração existe e é 100% aditivo (IF NOT EXISTS)', () => {
    const sql = fs.readFileSync('./migrations_propostas_wga_360.sql', 'utf8');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS weather_condition'), 'Deve incluir weather_condition');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS gps_latitude'), 'Deve incluir gps_latitude');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS gps_longitude'), 'Deve incluir gps_longitude');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS gps_accuracy'), 'Deve incluir gps_accuracy');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS gps_status'), 'Deve incluir gps_status');
    assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS lab_report_metadata'), 'Deve incluir lab_report_metadata');
    assert.ok(!/DROP\s+COLUMN|DROP\s+TABLE/i.test(sql), 'Não deve conter comandos destrutivos DROP');
});

test('Fase 2: Retrocompatibilidade total com amostras legadas (sem GPS e sem Clima)', () => {
    const legacySample = {
        id: 'sample-1',
        collection_time: '09:45:00',
        complementary_info: 'Ferro total, Cobre'
    };

    const parsed = parseSampleRecord(legacySample);
    assert.equal(parsed.complementary_info, 'Ferro total, Cobre');
    assert.equal(parsed.weather_condition, null);
    assert.equal(parsed.gps_status, null);
    assert.equal(parsed.gps_latitude, null);
    assert.equal(parsed.gps_longitude, null);
    assert.equal(formatGpsForReport(parsed), null);
    assert.equal(getWeatherReportLabel(parsed.weather_condition), null);
    assert.equal(hasSampleMetadata(parsed), true);
});

test('Fase 2: Formatação de Geolocalização (GPS) com coordenadas e precisão (±m)', () => {
    const sampleWithGps = {
        collection_time: '10:15:00',
        gps_status: 'captured',
        gps_latitude: -23.55052,
        gps_longitude: -46.633308,
        gps_accuracy: 4.2
    };

    const parsed = parseSampleRecord(sampleWithGps);
    const formatted = formatGpsForReport(parsed);
    assert.equal(formatted, '-23.550520, -46.633308 (Precisão: ±4m)');
});

test('Fase 2: Tratamento para Áreas Confinadas / Sem Sinal GPS', () => {
    const confinedSample = {
        collection_time: '11:00:00',
        gps_status: 'confined_area',
        gps_latitude: null,
        gps_longitude: null
    };

    const parsed = parseSampleRecord(confinedSample);
    assert.equal(formatGpsForReport(parsed), 'Área confinada / Sinal indisponível');
    assert.equal(hasSampleMetadata(parsed), true);
});

test('Fase 2: Dual-Layer Serialization & Parsing (Fallback transparente em complementary_info)', () => {
    const serialized = serializeSampleWithMeta('Ferro Total e Sílica', {
        weather_condition: 'heavy_rain',
        gps_status: 'captured',
        gps_latitude: -23.55052,
        gps_longitude: -46.633308,
        gps_accuracy: 5
    });

    // Simula leitura de um banco onde apenas complementary_info foi retornado
    const parsed = parseSampleRecord({
        id: 'sample-dual',
        complementary_info: serialized
    });

    assert.equal(parsed.complementary_info, 'Ferro Total e Sílica', 'Deve limpar o marcador de metadados do texto complementar');
    assert.equal(parsed.weather_condition, 'heavy_rain');
    assert.equal(getWeatherReportLabel(parsed.weather_condition), 'Chuva Moderada / Forte (24h)');
    assert.equal(parsed.gps_status, 'captured');
    assert.equal(parsed.gps_latitude, -23.55052);
    assert.equal(parsed.gps_longitude, -46.633308);
    assert.equal(parsed.gps_accuracy, 5);
    assert.equal(formatGpsForReport(parsed), '-23.550520, -46.633308 (Precisão: ±5m)');
});

test('Fase 2.1: Segmented Controls (Clima Atual + Histórico de Chuvas) — codificação, parse e rótulo de relatório', () => {
    assert.equal(CURRENT_WEATHER_OPTIONS.length, 4);
    assert.equal(RAIN_HISTORY_OPTIONS.length, 3);

    const combined = buildWeatherConditionValue('sunny', 'rain_24h');
    assert.equal(combined, 'sunny|rain_24h');

    const state = parseWeatherState(combined);
    assert.equal(state.current, 'sunny');
    assert.equal(state.history, 'rain_24h');

    const label = getWeatherReportLabel(combined);
    assert.equal(label, 'Ensolarado | Chuva Recente: Últimas 24h');
});

