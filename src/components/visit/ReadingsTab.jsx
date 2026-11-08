import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Location, LocationEquipment, Equipment, EquipmentTest, TestDefinition, TestResult, Visit, AnalysisGroup, AnalysisGroupItem, VisitEquipmentSample, LocationEquipmentTest } from "@/api/entities";
import { Input } from "@/components/ui/input";
import { calculateStatus, getStatusColor } from "@/components/analysisUtils";
import { AlertCircle, CheckCircle, MinusCircle, Beaker, ChevronDown, ChevronUp, MapPin, ChevronsUpDown, Save, Loader2, Clock, FileText, Layers, Info, CloudRain, Navigation, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WEATHER_OPTIONS, CURRENT_WEATHER_OPTIONS, RAIN_HISTORY_OPTIONS, parseWeatherState, buildWeatherConditionValue, getWeatherReportLabel, parseSampleRecord, serializeSampleWithMeta, formatGpsForReport } from "@/lib/fieldMetadataUtils";

import { supabase } from "@/lib/supabase";

function WeatherBatchCard({ globalWeatherValue, setGlobalWeatherValue, visitSamples, applyWeatherToAllMutation, weatherAppliedNotice }) {
    const firstSavedWeather = visitSamples?.map(s => parseSampleRecord(s)?.weather_condition).find(Boolean);
    const activeWeatherRaw = globalWeatherValue !== 'none' ? globalWeatherValue : (firstSavedWeather || null);
    const { current: activeCurrent, history: activeHistory } = parseWeatherState(activeWeatherRaw);
    const activeSummary = getWeatherReportLabel(activeWeatherRaw);

    const handleGlobalTagClick = (type, value) => {
        const nextCur = type === 'current' ? (activeCurrent === value ? null : value) : activeCurrent;
        const nextHist = type === 'history' ? (activeHistory === value ? null : value) : activeHistory;
        const nextCombined = buildWeatherConditionValue(nextCur, nextHist) || 'none';
        setGlobalWeatherValue(nextCombined);
        applyWeatherToAllMutation.mutate(nextCombined);
    };

    return (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-blue-100/70 border-b border-blue-200">
                <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-blue-950">
                        🌤️ Indicador de Chuva / Fator Climático (Aplicar a Todos os Testes)
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {activeSummary && (
                        <span className="text-[11px] font-medium text-blue-800 bg-white/90 border border-blue-200 px-2 py-0.5 rounded-full">
                            {activeSummary}
                        </span>
                    )}
                    {weatherAppliedNotice && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                            ✓ Aplicado a todos!
                        </span>
                    )}
                </div>
            </div>

            <div className="p-3.5 space-y-3">
                <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700 block">
                        1. Clima Atual <span className="font-normal text-slate-500">(Como está o clima no MOMENTO da coleta?)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {CURRENT_WEATHER_OPTIONS.map(opt => {
                            const isSelected = activeCurrent === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={applyWeatherToAllMutation.isPending}
                                    onClick={() => handleGlobalTagClick('current', opt.value)}
                                    className={`min-h-[40px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center text-center select-none active:scale-[0.98] ${
                                        isSelected
                                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-blue-100">
                    <span className="text-xs font-semibold text-slate-700 block">
                        2. Histórico de Chuvas <span className="font-normal text-slate-500">(Houve chuva RECENTE na região?)</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {RAIN_HISTORY_OPTIONS.map(opt => {
                            const isSelected = activeHistory === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    disabled={applyWeatherToAllMutation.isPending}
                                    onClick={() => handleGlobalTagClick('history', opt.value)}
                                    className={`min-h-[40px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center text-center select-none active:scale-[0.98] ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300'
                                            : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EquipmentWeatherTags({ sampleData, readOnly, onChange }) {
    const { current: eqCur, history: eqHist } = parseWeatherState(sampleData?.weather_condition);
    const handleEqTagClick = (type, value) => {
        if (readOnly) return;
        const nextCur = type === 'current' ? (eqCur === value ? null : value) : eqCur;
        const nextHist = type === 'history' ? (eqHist === value ? null : value) : eqHist;
        const nextVal = buildWeatherConditionValue(nextCur, nextHist);
        onChange(nextVal);
    };

    return (
        <div className="space-y-1.5 bg-white/90 p-2 rounded-lg border border-blue-200">
            <div className="flex flex-wrap gap-1">
                {CURRENT_WEATHER_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleEqTagClick('current', opt.value)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                            eqCur === opt.value
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
                        }`}
                    >
                        {opt.shortLabel}
                    </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                {RAIN_HISTORY_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleEqTagClick('history', opt.value)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                            eqHist === opt.value
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50'
                        }`}
                    >
                        {opt.shortLabel}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function ReadingsTab({ visit, readOnly }) {
    if (!visit) return null;
    const queryClient = useQueryClient();
    const [openItems, setOpenItems] = React.useState({});
    const [allExpanded, setAllExpanded] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [localValues, setLocalValues] = React.useState({});
    const [gpsLoadingByEq, setGpsLoadingByEq] = React.useState({});
    const [gpsFeedbackByEq, setGpsFeedbackByEq] = React.useState({});
    const [globalWeatherValue, setGlobalWeatherValue] = React.useState("none");
    const [weatherAppliedNotice, setWeatherAppliedNotice] = React.useState(false);
    const gpsAutoCapturedRef = React.useRef({});

    const toggleItem = (id) => {
        setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Queries ---
    const { data: locations } = useQuery({ queryKey: ['locations', visit.client_id], queryFn: () => Location.filter({ client_id: visit.client_id }, undefined, 1000) });
    const { data: allLocationEquipments } = useQuery({ queryKey: ['locationEquipments'], queryFn: () => LocationEquipment.list(undefined, 10000) });
    const { data: allEquipments } = useQuery({ queryKey: ['equipments'], queryFn: () => Equipment.list(undefined, 10000) });
    const { data: equipmentTestsLinks } = useQuery({ queryKey: ['equipmentTests'], queryFn: () => EquipmentTest.list(undefined, 10000) });
    // Fetch custom tests for this client's equipments
    // We can fetch all LocationEquipmentTests and filter in memory since we don't have a simple "in" filter for list() yet without custom query, 
    // but if list() gets too big, we should filter by location_equipment ids.
    // For now assuming list() is okay or improvements later.
    const { data: allLocationTests } = useQuery({
        queryKey: ['locationEquipmentTests'],
        queryFn: () => LocationEquipmentTest.list(undefined, 10000),
        enabled: !!allLocationEquipments
    });

    const { data: allTests } = useQuery({ queryKey: ['testDefinitions'], queryFn: () => TestDefinition.list(undefined, 10000) });
    const { data: results } = useQuery({ queryKey: ['results', visit.id], queryFn: () => TestResult.filter({ visit_id: visit.id }, undefined, 10000) });
    const { data: analysisGroups } = useQuery({ queryKey: ['analysisGroups'], queryFn: () => AnalysisGroup.list() });
    const { data: analysisGroupItems } = useQuery({ queryKey: ['analysisGroupItems'], queryFn: () => AnalysisGroupItem.list(undefined, 10000) });
    const { data: visitSamples } = useQuery({
        queryKey: ['visitSamples', visit.id],
        queryFn: () => VisitEquipmentSample.filter({ visit_id: visit.id }, undefined, 10000)
    });

    // --- Mutations ---
    const saveResultMutation = useMutation({
        mutationFn: async ({ testId, equipmentId, value, min, max, tolerance }) => {
            setIsSaving(true);
            const isEmpty = value === '' || value === null || value === undefined;
            const numValue = isEmpty ? null : parseFloat(value);
            if (!isEmpty && isNaN(numValue)) return;
            const status = isEmpty ? 'neutral' : calculateStatus(numValue, min, max, tolerance);

            // Check if record exists
            const { data: existingData } = await supabase
                .from('test_results')
                .select('*')
                .eq('visit_id', visit.id)
                .eq('equipment_id', equipmentId)
                .eq('test_definition_id', testId);

            if (existingData && existingData.length > 0) {
                // Record exists - UPDATE
                const { data: updateData, error: updateError } = await supabase
                    .from('test_results')
                    .update({ measured_value: numValue, status_light: status, updated_date: new Date().toISOString() })
                    .eq('visit_id', visit.id)
                    .eq('equipment_id', equipmentId)
                    .eq('test_definition_id', testId)
                    .select();

                if (updateError) throw updateError;
                return updateData?.[0];
            } else {
                // Record doesn't exist - INSERT
                const { data: insertData, error: insertError } = await supabase
                    .from('test_results')
                    .insert({
                        visit_id: visit.id,
                        equipment_id: equipmentId,
                        test_definition_id: testId,
                        measured_value: numValue,
                        status_light: status,
                        created_date: new Date().toISOString(),
                        updated_date: new Date().toISOString()
                    })
                    .select();

                if (insertError) throw insertError;
                return insertData?.[0];
            }
        },
        onSettled: async () => {
            queryClient.invalidateQueries({ queryKey: ['results', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

            // Fetch fresh visit data to check service_start_time
            const { data: freshVisit } = await supabase.from('visits').select('*').eq('id', visit.id).single();

            // Auto-capture service_start_time on first change
            if (freshVisit && !freshVisit.service_start_time && freshVisit.status !== 'completed') {
                await supabase.from('visits').update({ service_start_time: new Date().toISOString() }).eq('id', visit.id);
                queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
            }

            if (freshVisit?.status === 'scheduled') {
                await supabase.from('visits').update({ status: 'in_progress' }).eq('id', visit.id);
                queryClient.invalidateQueries({ queryKey: ['visit', visit.id] });
            }

            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const saveSampleMutation = useMutation({
        mutationFn: async ({ locationEquipmentId, field, value, updates }) => {
            setIsSaving(true);
            return await upsertSampleRecord(locationEquipmentId, updates || { [field]: value });
            const rawExisting = visitSamples?.find(s => s.location_equipment_id === locationEquipmentId);
            const parsedExisting = parseSampleRecord(rawExisting) || {};

            const patch = updates || { [field]: value };

            // Determine clean complementary info and metadata state
            const nextCleanComp = patch.complementary_info !== undefined
                ? patch.complementary_info
                : (parsedExisting.complementary_info || '');

            const nextMeta = {
                weather_condition: patch.weather_condition !== undefined ? patch.weather_condition : parsedExisting.weather_condition,
                weather_notes: patch.weather_notes !== undefined ? patch.weather_notes : parsedExisting.weather_notes,
                gps_status: patch.gps_status !== undefined ? patch.gps_status : parsedExisting.gps_status,
                gps_latitude: patch.gps_latitude !== undefined ? patch.gps_latitude : parsedExisting.gps_latitude,
                gps_longitude: patch.gps_longitude !== undefined ? patch.gps_longitude : parsedExisting.gps_longitude,
                gps_accuracy: patch.gps_accuracy !== undefined ? patch.gps_accuracy : parsedExisting.gps_accuracy,
                gps_captured_at: patch.gps_captured_at !== undefined ? patch.gps_captured_at : parsedExisting.gps_captured_at,
            };

            const serializedComp = serializeSampleWithMeta(nextCleanComp, nextMeta);

            // Standard payload (guaranteed columns in any DB version)
            const basePayload = {
                complementary_info: serializedComp,
            };
            if (patch.collection_time !== undefined) basePayload.collection_time = patch.collection_time || null;
            if (patch.analysis_group_id !== undefined) basePayload.analysis_group_id = patch.analysis_group_id || null;

            // Extended payload (includes native DDL columns if migration has been applied)
            const extendedPayload = {
                ...basePayload,
                weather_condition: nextMeta.weather_condition && nextMeta.weather_condition !== 'none' ? nextMeta.weather_condition : null,
                weather_notes: nextMeta.weather_notes || null,
                gps_status: nextMeta.gps_status || null,
                gps_latitude: nextMeta.gps_latitude ?? null,
                gps_longitude: nextMeta.gps_longitude ?? null,
                gps_accuracy: nextMeta.gps_accuracy ?? null,
                gps_captured_at: nextMeta.gps_captured_at || null,
            };

            try {
                if (rawExisting) {
                    return await VisitEquipmentSample.update(rawExisting.id, extendedPayload);
                } else {
                    return await VisitEquipmentSample.create({
                        visit_id: visit.id,
                        location_equipment_id: locationEquipmentId,
                        ...extendedPayload
                    });
                }
            } catch (err) {
                // Transparent fallback if native DDL columns are not yet created in Supabase
                if (rawExisting) {
                    return await VisitEquipmentSample.update(rawExisting.id, basePayload);
                } else {
                    return await VisitEquipmentSample.create({
                        visit_id: visit.id,
                        location_equipment_id: locationEquipmentId,
                        ...basePayload
                    });
                }
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['visitSamples', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['fullReport', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const applyGroupMutation = useMutation({
        mutationFn: async ({ locationEquipmentId, groupId, equipmentId }) => {
            setIsSaving(true);
            const existingSample = visitSamples?.find(s => s.location_equipment_id === locationEquipmentId);
            if (existingSample) {
                await VisitEquipmentSample.update(existingSample.id, { analysis_group_id: groupId });
            } else {
                await VisitEquipmentSample.create({ visit_id: visit.id, location_equipment_id: locationEquipmentId, analysis_group_id: groupId });
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['visitSamples', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    // --- Helpers ---
    const upsertSampleRecord = async (locationEquipmentId, patch) => {
        let rawExisting = visitSamples?.find(s => s.location_equipment_id === locationEquipmentId);
        try {
            const { data: freshRows } = await supabase
                .from('visit_equipment_samples')
                .select('*')
                .eq('visit_id', visit.id)
                .eq('location_equipment_id', locationEquipmentId)
                .limit(1);
            if (freshRows && freshRows.length > 0) {
                rawExisting = freshRows[0];
            }
        } catch {
            // Fallback to cached visitSamples
        }

        const parsedExisting = parseSampleRecord(rawExisting) || {};
        const nextCleanComp = patch.complementary_info !== undefined
            ? patch.complementary_info
            : (parsedExisting.complementary_info || '');

        const nextMeta = {
            weather_condition: patch.weather_condition !== undefined ? patch.weather_condition : parsedExisting.weather_condition,
            weather_notes: patch.weather_notes !== undefined ? patch.weather_notes : parsedExisting.weather_notes,
            gps_status: patch.gps_status !== undefined ? patch.gps_status : parsedExisting.gps_status,
            gps_latitude: patch.gps_latitude !== undefined ? patch.gps_latitude : parsedExisting.gps_latitude,
            gps_longitude: patch.gps_longitude !== undefined ? patch.gps_longitude : parsedExisting.gps_longitude,
            gps_accuracy: patch.gps_accuracy !== undefined ? patch.gps_accuracy : parsedExisting.gps_accuracy,
            gps_captured_at: patch.gps_captured_at !== undefined ? patch.gps_captured_at : parsedExisting.gps_captured_at,
        };

        const serializedComp = serializeSampleWithMeta(nextCleanComp, nextMeta);
        const basePayload = { complementary_info: serializedComp };
        if (patch.collection_time !== undefined) basePayload.collection_time = patch.collection_time || null;
        if (patch.analysis_group_id !== undefined) basePayload.analysis_group_id = patch.analysis_group_id || null;

        const extendedPayload = {
            ...basePayload,
            weather_condition: nextMeta.weather_condition && nextMeta.weather_condition !== 'none' ? nextMeta.weather_condition : null,
            weather_notes: nextMeta.weather_notes || null,
            gps_status: nextMeta.gps_status || null,
            gps_latitude: nextMeta.gps_latitude ?? null,
            gps_longitude: nextMeta.gps_longitude ?? null,
            gps_accuracy: nextMeta.gps_accuracy ?? null,
            gps_captured_at: nextMeta.gps_captured_at || null,
        };

        try {
            if (rawExisting) {
                return await VisitEquipmentSample.update(rawExisting.id, extendedPayload);
            }
            return await VisitEquipmentSample.create({
                visit_id: visit.id,
                location_equipment_id: locationEquipmentId,
                ...extendedPayload
            });
        } catch {
            if (rawExisting) {
                return await VisitEquipmentSample.update(rawExisting.id, basePayload);
            }
            return await VisitEquipmentSample.create({
                visit_id: visit.id,
                location_equipment_id: locationEquipmentId,
                ...basePayload
            });
        }
    };

    const applyWeatherToAllMutation = useMutation({
        mutationFn: async (weatherValue) => {
            if (!groupedData || readOnly) return;
            setIsSaving(true);
            const normalizedWeather = weatherValue === 'none' ? null : weatherValue;
            const allEquipmentIds = groupedData.flatMap(loc => loc.equipments.map(eq => eq.uniqueId));
            await Promise.all(
                allEquipmentIds.map(locEqId =>
                    upsertSampleRecord(locEqId, { weather_condition: normalizedWeather })
                )
            );
        },
        onSuccess: () => {
            setWeatherAppliedNotice(true);
            setTimeout(() => setWeatherAppliedNotice(false), 3000);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['visitSamples', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['fullReport', visit.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setTimeout(() => setIsSaving(false), 500);
        }
    });

    const ensureAutoGpsForEquipment = (locationEquipmentId) => {
        if (readOnly) return;
        const currentSample = getSample(locationEquipmentId);
        const alreadyHasGps = currentSample?.gps_status === 'captured'
            || currentSample?.gps_status === 'confined_area'
            || (currentSample?.gps_latitude !== null && currentSample?.gps_latitude !== undefined);
        if (!alreadyHasGps && !gpsLoadingByEq[locationEquipmentId] && !gpsAutoCapturedRef.current[locationEquipmentId]) {
            gpsAutoCapturedRef.current[locationEquipmentId] = true;
            handleCaptureGps(locationEquipmentId, true);
        }
    };
    const handleValueChange = (testId, equipmentId, value) => {
        setLocalValues(prev => ({ ...prev, [`${testId}_${equipmentId}`]: value }));
    };

    const handleBlur = (test, equipmentId, value) => {
        setLocalValues(prev => {
            const next = { ...prev };
            delete next[`${test.id}_${equipmentId}`];
            return next;
        });
        saveResultMutation.mutate({
            testId: test.id,
            equipmentId,
            value,
            min: test.min_value,
            max: test.max_value,
            tolerance: test.tolerance_percent
        });
        if (value !== '' && value !== null && value !== undefined) {
            ensureAutoGpsForEquipment(equipmentId);
        }
        const _noop = ({
        });
    };

    const handleSampleChange = (locationEquipmentId, field, value) => {
        saveSampleMutation.mutate({ locationEquipmentId, field, value });

        // Auto-captura silenciosa de GPS ao preencher Hora da Coleta (se o ponto ainda não tiver GPS registrado)
        if (field === 'collection_time' && value) {
            const currentSample = getSample(locationEquipmentId);
            if (!currentSample?.gps_status && currentSample?.gps_latitude === null) {
                handleCaptureGps(locationEquipmentId, true);
            }
        }
    };

    const handleCaptureGps = (locationEquipmentId, isSilent = false) => {
        if (readOnly) return;
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            if (!isSilent) {
                setGpsFeedbackByEq(prev => ({
                    ...prev,
                    [locationEquipmentId]: 'Navegador sem suporte a GPS. Use "Área Confinada / Sem Sinal".'
                }));
            }
            return;
        }

        setGpsLoadingByEq(prev => ({ ...prev, [locationEquipmentId]: true }));
        setGpsFeedbackByEq(prev => ({ ...prev, [locationEquipmentId]: '' }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                saveSampleMutation.mutate({
                    locationEquipmentId,
                    updates: {
                        gps_status: 'captured',
                        gps_latitude: Number(latitude.toFixed(6)),
                        gps_longitude: Number(longitude.toFixed(6)),
                        gps_accuracy: accuracy ? Math.round(accuracy) : null,
                        gps_captured_at: new Date().toISOString()
                    }
                });
                setGpsLoadingByEq(prev => ({ ...prev, [locationEquipmentId]: false }));
            },
            (error) => {
                setGpsLoadingByEq(prev => ({ ...prev, [locationEquipmentId]: false }));
                if (!isSilent) {
                    const msg = error.code === 1
                        ? 'Permissão de localização negada no navegador. Habilite o GPS ou marque "Área Confinada".'
                        : 'Sinal de GPS fraco ou indisponível no local. Tente novamente ou marque "Área Confinada".';
                    setGpsFeedbackByEq(prev => ({ ...prev, [locationEquipmentId]: msg }));
                }
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    };

    const handleSetConfinedArea = (locationEquipmentId) => {
        if (readOnly) return;
        setGpsFeedbackByEq(prev => ({ ...prev, [locationEquipmentId]: '' }));
        saveSampleMutation.mutate({
            locationEquipmentId,
            updates: {
                gps_status: 'confined_area',
                gps_latitude: null,
                gps_longitude: null,
                gps_accuracy: null,
                gps_captured_at: new Date().toISOString()
            }
        });
    };

    const getResult = (testId, equipmentId) => results?.find(r => r.test_definition_id === testId && r.equipment_id === equipmentId);
    const getSample = (locEqId) => parseSampleRecord(visitSamples?.find(s => s.location_equipment_id === locEqId));


    // --- Data Preparation ---
    const groupedData = useMemo(() => {
        if (!locations || !allLocationEquipments || !allEquipments || !equipmentTestsLinks || !allTests) return null;

        return locations.map(location => {
            const equipmentsWithTests = allLocationEquipments
                .filter(le => le.location_id === location.id)
                .map(le => {
                    const catalogItem = allEquipments.find(e => e.id === le.equipment_id);
                    if (!catalogItem) return null;

                    // 1. Tests linked via Equipment Configuration (Standard)
                    const linkedTestsData = equipmentTestsLinks.filter(et => et.equipment_id === catalogItem.id);
                    const linkedTestIds = linkedTestsData.map(et => et.test_definition_id);

                    // 2. Custom Tests from LocationEquipmentTest (Overrides/Additions)
                    const customTestsData = allLocationTests ? allLocationTests.filter(letest => letest.location_equipment_id === le.id) : [];
                    const customTestIds = customTestsData.map(ct => ct.test_definition_id);
                    // Use Set to combine IDs
                    const allRelevantTestIds = [...new Set([...linkedTestIds, ...customTestIds])];

                    // 3. Tests linked via Selected Analysis Group (if any)
                    // Currently analysis groups link to Test Definitions directly.
                    let groupTestIds = [];
                    const sample = getSample(le.id);
                    if (sample?.analysis_group_id && analysisGroupItems) {
                        groupTestIds = analysisGroupItems
                            .filter(agi => agi.group_id === sample.analysis_group_id)
                            .map(agi => agi.test_definition_id);
                    }

                    // Final Merge
                    const finalTestIds = [...new Set([...allRelevantTestIds, ...groupTestIds])];

                    const tests = finalTestIds.map(testId => {
                        const originalTest = allTests.find(t => t.id === testId);
                        if (!originalTest) return null;

                        // Check for override in Custom Tests (First Priority)
                        const customOverride = customTestsData.find(ct => ct.test_definition_id === testId);

                        // Check for standard config (Second Priority)
                        const standardConfig = linkedTestsData.find(et => et.test_definition_id === testId);

                        const getValidVal = (val) => (val !== null && val !== undefined && val !== "") ? val : undefined;

                        return {
                            ...originalTest, // Base definition
                            // Priorities: Custom Override > Standard Config > Base Definition
                            min_value: getValidVal(customOverride?.min_value) ?? getValidVal(standardConfig?.min_value) ?? originalTest.min_value,
                            max_value: getValidVal(customOverride?.max_value) ?? getValidVal(standardConfig?.max_value) ?? originalTest.max_value,
                            unit: getValidVal(customOverride?.unit) ?? getValidVal(standardConfig?.unit) ?? originalTest.unit,
                            isCustom: !!customOverride
                        };
                    }).filter(Boolean)
                        // Sort: Custom/Configured first, then alphabetical? Or use display_order?
                        // Using name for simplicity or standard sort.
                        .sort((a, b) => a.name.localeCompare(b.name));

                    return {
                        ...catalogItem,
                        id: le.id, // LocationEquipment ID (Instance)
                        catalog_id: catalogItem.id, // Catalog ID
                        tests,
                        uniqueId: le.id,
                        sample
                    };
                })
                .filter(item => item !== null);

            return { ...location, equipments: equipmentsWithTests };
        }).filter(l => l.equipments.length > 0);
    }, [locations, allLocationEquipments, allEquipments, equipmentTestsLinks, allLocationTests, allTests, visitSamples, analysisGroupItems]);

    // Auto-apply default analysis group for equipments that have one configured
    useEffect(() => {
        if (!allLocationEquipments || !visitSamples || readOnly) return;

        allLocationEquipments.forEach(le => {
            // Check if equipment has a default group and no sample exists with a group
            if (le.default_analysis_group_id) {
                const existingSample = visitSamples.find(s => s.location_equipment_id === le.id);
                // Only auto-apply if no group is currently selected
                if (!existingSample?.analysis_group_id) {
                    applyGroupMutation.mutate({
                        locationEquipmentId: le.id,
                        groupId: le.default_analysis_group_id,
                        equipmentId: le.equipment_id
                    });
                }
            }
        });
    }, [allLocationEquipments, visitSamples?.length, readOnly]);


    const toggleAll = () => {
        if (!groupedData) return;
        const newState = !allExpanded;
        setAllExpanded(newState);
        const newOpenItems = {};
        groupedData.forEach(loc => {
            loc.equipments.forEach(eq => newOpenItems[eq.uniqueId] = newState);
        });
        setOpenItems(newOpenItems);
    };

    React.useEffect(() => {
        if (groupedData && Object.keys(openItems).length === 0) {
            const initialOpen = {};
            groupedData.forEach(loc => loc.equipments.forEach(eq => initialOpen[eq.uniqueId] = true));
            setOpenItems(initialOpen);
        }
    }, [groupedData]);


    if (!groupedData) return <div className="p-4 text-center"><Loader2 className="animate-spin inline mr-2" />Carregando configurações...</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Toolbar */}
            {!readOnly && (
                <WeatherBatchCard globalWeatherValue={globalWeatherValue} setGlobalWeatherValue={setGlobalWeatherValue} visitSamples={visitSamples} applyWeatherToAllMutation={applyWeatherToAllMutation} weatherAppliedNotice={weatherAppliedNotice} />
            )}
            {false && (
                <div className="hidden">
                    <div className="flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                            <span className="text-xs font-bold text-blue-950 block">Indicador de Chuva / Fator Climático (Aplicar a Todos os Testes)</span>
                            <span className="text-[11px] text-blue-700">Selecione abaixo para replicar a condição climática em todos os equipamentos da visita de uma só vez:</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={globalWeatherValue}
                            onValueChange={(val) => {
                                setGlobalWeatherValue(val);
                                applyWeatherToAllMutation.mutate(val);
                            }}
                            disabled={applyWeatherToAllMutation.isPending}
                        >
                            <SelectTrigger className="h-8 w-full sm:w-[240px] bg-white text-xs border-blue-300 font-medium">
                                <SelectValue placeholder="Aplicar clima a todos..." />
                            </SelectTrigger>
                            <SelectContent>
                                {WEATHER_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {weatherAppliedNotice && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded whitespace-nowrap">
                                ✓ Aplicado a todos!
                            </span>
                        )}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin text-blue-600" /><span>Salvando...</span></> : <><Save className="w-4 h-4 text-green-600" /><span>Dados salvos</span></>}
                </div>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-8">
                    <ChevronsUpDown className="w-3 h-3 mr-1" />{allExpanded ? 'Recolher Todos' : 'Expandir Todos'}
                </Button>
            </div>

            {groupedData.map(location => (
                <div key={location.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500 uppercase text-xs font-bold tracking-wider pl-1 border-b border-slate-100 pb-1">
                        <MapPin className="w-3 h-3" />{location.name}
                    </div>

                    {location.equipments.map(equipment => {
                        const isOpen = openItems[equipment.uniqueId] ?? true;
                        const sampleData = equipment.sample;

                        return (
                            <Collapsible
                                key={equipment.uniqueId}
                                open={isOpen}
                                onOpenChange={() => toggleItem(equipment.uniqueId)}
                                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all"
                            >
                                <div className="bg-blue-600 text-white">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-blue-700 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Beaker className="w-4 h-4 opacity-75" />
                                            <h3 className="font-semibold text-sm tracking-wide uppercase text-left">{equipment.name}</h3>
                                        </div>
                                        {isOpen ? <ChevronUp className="w-4 h-4 opacity-75" /> : <ChevronDown className="w-4 h-4 opacity-75" />}
                                    </CollapsibleTrigger>
                                </div>

                                <CollapsibleContent>

                                    {/* V1.1 + WGA 360: Equipment Header Inputs (Time, Weather, Group, Complementary, GPS) */}
                                    <div className="p-4 bg-blue-50/30 border-b border-blue-100 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            {/* Hora */}
                                            <div className="md:col-span-2">
                                                <label className="text-xs font-semibold text-slate-500 flex items-center mb-1"><Clock className="w-3 h-3 mr-1" />Hora Coleta</label>
                                                <Input
                                                    type="time"
                                                    className="h-8 bg-white"
                                                    defaultValue={sampleData?.collection_time ? sampleData.collection_time.substring(0, 5) : ''}
                                                    onBlur={(e) => handleSampleChange(equipment.uniqueId, 'collection_time', e.target.value)}
                                                    disabled={readOnly}
                                                />
                                            </div>

                                            {/* Fator Climático (Chuvas) */}
                                            <div className="md:col-span-3">
                                                <label className="text-xs font-semibold text-slate-500 flex items-center mb-1">
                                                    <CloudRain className="w-3 h-3 mr-1 text-blue-600" />Fator Climático (Chuvas)
                                                    {!readOnly && sampleData?.weather_condition && sampleData.weather_condition !== 'none' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setGlobalWeatherValue(sampleData.weather_condition);
                                                                applyWeatherToAllMutation.mutate(sampleData.weather_condition);
                                                            }}
                                                            className="ml-auto text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold"
                                                            title="Aplicar este indicador de chuva a todos os equipamentos da visita"
                                                        >
                                                            Aplicar a todos
                                                        </button>
                                                    )}
                                                </label>
                                                <Select
                                                    disabled={readOnly}
                                                    value={sampleData?.weather_condition || "none"}
                                                    onValueChange={(val) => handleSampleChange(equipment.uniqueId, 'weather_condition', val === 'none' ? null : val)}
                                                >
                                                <EquipmentWeatherTags sampleData={sampleData} readOnly={readOnly} onChange={(val) => handleSampleChange(equipment.uniqueId, 'weather_condition', val)} />
                                                <SelectTrigger className="hidden">
                                                        <SelectValue placeholder="Condição climática..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {WEATHER_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Grupo */}
                                            <div className="md:col-span-3">
                                                <label className="text-xs font-semibold text-slate-500 flex items-center mb-1"><Layers className="w-3 h-3 mr-1" />Grupo de Análise</label>
                                                <Select
                                                    disabled={readOnly}
                                                    value={sampleData?.analysis_group_id || ""}
                                                    onValueChange={(val) => applyGroupMutation.mutate({ locationEquipmentId: equipment.uniqueId, groupId: val, equipmentId: equipment.catalog_id })}
                                                >
                                                    <SelectTrigger className="h-8 bg-white"><SelectValue placeholder="Selecione um Kit..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {analysisGroups?.map(g => (
                                                            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {/* Helper to show what's in the group */}
                                                {sampleData?.analysis_group_id && analysisGroupItems && allTests && (
                                                    <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                                                        <span className="font-semibold">Inclui: </span>
                                                        {analysisGroupItems
                                                            .filter(i => i.group_id === sampleData.analysis_group_id)
                                                            .map(i => allTests.find(t => t.id === i.test_definition_id)?.name)
                                                            .filter(Boolean)
                                                            .join(', ') || "Nenhum teste vinculado."
                                                        }
                                                    </div>
                                                )}
                                            </div>

                                            {/* Análises Complementares */}
                                            <div className="md:col-span-4">
                                                <label className="text-xs font-semibold text-slate-500 flex items-center mb-1"><FileText className="w-3 h-3 mr-1" />Análises Complementares em Laboratório</label>
                                                <Input
                                                    className="h-8 bg-white"
                                                    placeholder="Ex: Ferro total, Cobre..."
                                                    defaultValue={sampleData?.complementary_info || ''}
                                                    onBlur={(e) => handleSampleChange(equipment.uniqueId, 'complementary_info', e.target.value)}
                                                    disabled={readOnly}
                                                />
                                            </div>
                                        </div>

                                        {/* Barra de Rastreabilidade Geográfica (GPS) no Ponto de Coleta */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-blue-100/80 text-xs">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-slate-600 flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                                    Geolocalização (GPS):
                                                </span>
                                                {sampleData?.gps_status === 'captured' && sampleData?.gps_latitude !== null ? (
                                                    <span className="bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-mono font-semibold text-[11px]">
                                                        📍 {formatGpsForReport(sampleData)}
                                                    </span>
                                                ) : sampleData?.gps_status === 'confined_area' ? (
                                                    <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium text-[11px]">
                                                        🏢 Área confinada / Sinal indisponível
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">
                                                        Registro automático no momento da leitura
                                                    </span>
                                                )}
                                                {gpsFeedbackByEq[equipment.uniqueId] && (
                                                    <span className="text-amber-700 text-[11px] font-medium">
                                                        ({gpsFeedbackByEq[equipment.uniqueId]})
                                                    </span>
                                                )}
                                            </div>

                                            {!readOnly && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleCaptureGps(equipment.uniqueId, false)}
                                                        disabled={!!gpsLoadingByEq[equipment.uniqueId]}
                                                    >
                                                        {gpsLoadingByEq[equipment.uniqueId] ? (
                                                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Obtendo GPS...</>
                                                        ) : (
                                                            <><Navigation className="w-3 h-3 mr-1" />Atualizar GPS</>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-7 text-xs border ${sampleData?.gps_status === 'confined_area' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                                        onClick={() => handleSetConfinedArea(equipment.uniqueId)}
                                                        title="Registrar que o ponto fica em casa de caldeira, subsolo ou área sem sinal de satélite"
                                                    >
                                                        <Building2 className="w-3 h-3 mr-1" />
                                                        Área Confinada / Sem Sinal
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Results - Mobile card layout */}
                                    <div className="md:hidden divide-y divide-slate-100">
                                        {equipment.tests.map((test, idx) => {
                                            const result = getResult(test.id, equipment.id);
                                            const status = result?.status_light || 'neutral';
                                            return (
                                                <div key={test.id} className="p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-slate-700">{test.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            {status === 'red' && <div className="w-3 h-3 rounded-full bg-red-500" />}
                                                            {status === 'green' && <div className="w-3 h-3 rounded-full bg-green-500" />}
                                                            {status === 'yellow' && <div className="w-3 h-3 rounded-full bg-yellow-400" />}
                                                            {status === 'neutral' && <div className="w-3 h-3 rounded-full bg-slate-200" />}
                                                        </div>
                                                    </div>
                                                    {test.observation && <div className="text-xs text-slate-400">{test.observation}</div>}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-slate-500">VMP: {test.min_value} - {test.max_value} {test.unit}</span>
                                                        <Input
                                                            type="number" step="0.01"
                                                            value={localValues[`${test.id}_${equipment.id}`] ?? result?.measured_value?.toString() ?? ''}
                                                            placeholder="Resultado"
                                                            className={`h-9 flex-1 text-right font-mono ${getStatusColor(status)}`}
                                                            onChange={(e) => handleValueChange(test.id, equipment.id, e.target.value)}
                                                            onBlur={(e) => handleBlur(test, equipment.id, e.target.value)}
                                                            disabled={readOnly}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Results - Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs border-b">
                                                <tr>
                                                    <th className="px-4 py-2">Parâmetro</th>
                                                    <th className="px-4 py-2 text-center">VMP</th>
                                                    <th className="px-4 py-2 text-center">Unid.</th>
                                                    <th className="px-4 py-2 text-right">Resultado</th>
                                                    <th className="px-4 py-2 text-center w-12">St</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {equipment.tests.map((test, idx) => {
                                                    const result = getResult(test.id, equipment.id);
                                                    const status = result?.status_light || 'neutral';
                                                    return (
                                                        <tr key={test.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                                            <td className="px-4 py-2 font-medium text-slate-700">
                                                                {test.name}
                                                                {test.observation && <div className="text-[10px] text-slate-400 font-normal">{test.observation}</div>}
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono text-slate-600 text-xs bg-slate-50/50">
                                                                {test.min_value} - {test.max_value}
                                                            </td>
                                                            <td className="px-4 py-2 text-center text-slate-500 text-xs">{test.unit}</td>
                                                            <td className="px-4 py-1.5 text-right">
                                                                <Input
                                                                    type="number" step="0.01"
                                                                    value={localValues[`${test.id}_${equipment.id}`] ?? result?.measured_value?.toString() ?? ''}
                                                                    placeholder="-"
                                                                    className={`h-7 w-24 ml-auto text-right font-mono text-sm ${getStatusColor(status)}`}
                                                                    onChange={(e) => handleValueChange(test.id, equipment.id, e.target.value)}
                                                                    onBlur={(e) => handleBlur(test, equipment.id, e.target.value)}
                                                                    disabled={readOnly}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                {status === 'red' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 mx-auto shadow-sm" />}
                                                                {status === 'green' && <div className="w-2.5 h-2.5 rounded-full bg-green-500 mx-auto shadow-sm" />}
                                                                {status === 'yellow' && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mx-auto shadow-sm" />}
                                                                {status === 'neutral' && <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto" />}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </div>
            ))}

            {groupedData.length === 0 && (
                <Card className="bg-slate-50 border-dashed"><CardContent className="p-8 text-center text-slate-500"><p>Nenhum local vinculado a este cliente.</p></CardContent></Card>
            )}
        </div>
    );
}