import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BarChart3, Save, Loader2, RotateCcw } from "lucide-react";

function TestToggleRow({ test, override, inheritedValue, onOverride, onReset }) {
    const hasOverride = override !== undefined && override !== null;
    const effectiveValue = hasOverride ? override : inheritedValue;

    return (
        <div className={`flex items-center justify-between px-3 py-2 border-b last:border-0 ${hasOverride ? 'bg-white' : 'bg-slate-50/60'}`}>
            <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm truncate ${hasOverride ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                    {test.name}
                </span>
                {test.unit && <span className="text-xs text-slate-400 flex-shrink-0">({test.unit})</span>}
                {!hasOverride && (
                    <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded flex-shrink-0">
                        global
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                    checked={!!effectiveValue}
                    onCheckedChange={(val) => onOverride(val)}
                />
                {hasOverride && (
                    <button
                        onClick={onReset}
                        title="Voltar ao padrão global"
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                )}
                {!hasOverride && <div className="w-5" />}
            </div>
        </div>
    );
}

export default function ClientChartSettingsManager({ client }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [periodDays, setPeriodDays] = useState('365');
    const [overrides, setOverrides] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    const { data: existingSettings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['chartSettings', client?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('client_report_chart_settings')
                .select('*')
                .eq('client_id', client.id)
                .limit(1);
            return data?.[0] || null;
        },
        enabled: !!client?.id
    });

    // Fetch all tests linked to this client's equipment
    const { data: availableTests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['clientAvailableTests', client?.id],
        queryFn: async () => {
            const { data: locations } = await supabase
                .from('locations').select('id').eq('client_id', client.id);
            if (!locations?.length) return [];

            const { data: locEquips } = await supabase
                .from('location_equipments').select('equipment_id')
                .in('location_id', locations.map(l => l.id));
            if (!locEquips?.length) return [];

            const equipIds = [...new Set(locEquips.map(le => le.equipment_id))];
            const { data: eqTests } = await supabase
                .from('equipment_tests').select('test_definition_id')
                .in('equipment_id', equipIds);
            if (!eqTests?.length) return [];

            const testDefIds = [...new Set(eqTests.map(et => et.test_definition_id))];
            const { data: testDefs } = await supabase
                .from('test_definitions').select('*')
                .in('id', testDefIds).order('name');
            return testDefs || [];
        },
        enabled: !!client?.id
    });

    useEffect(() => {
        if (existingSettings) {
            setEnabled(existingSettings.enabled !== false);
            setPeriodDays(String(existingSettings.period_days || 365));
            setOverrides(existingSettings.chart_test_overrides || {});
        }
    }, [existingSettings]);

    const handleOverride = (testId, value) => {
        setOverrides(prev => ({ ...prev, [testId]: value }));
        setHasChanges(true);
    };

    const handleReset = (testId) => {
        setOverrides(prev => {
            const next = { ...prev };
            delete next[testId];
            return next;
        });
        setHasChanges(true);
    };

    const resetAll = () => {
        setOverrides({});
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Derive selected_test_ids for backward compat
            const selectedTestIds = (availableTests || [])
                .filter(t => overrides[t.id] !== undefined ? overrides[t.id] : t.show_in_chart)
                .map(t => t.id);

            const payload = {
                client_id: client.id,
                enabled,
                period_days: parseInt(periodDays),
                selected_test_ids: selectedTestIds,
                chart_test_overrides: overrides,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('client_report_chart_settings')
                .upsert(payload, { onConflict: 'client_id' });

            if (error) throw error;

            setHasChanges(false);
            queryClient.invalidateQueries({ queryKey: ['chartSettings', client.id] });
            queryClient.invalidateQueries({ queryKey: ['historicalChartData'] });
            queryClient.invalidateQueries({ queryKey: ['fullReport'] });
        } catch (error) {
            console.error('Error saving chart settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const overrideCount = Object.keys(overrides).length;
    const effectiveCount = (availableTests || []).filter(t =>
        overrides[t.id] !== undefined ? overrides[t.id] : t.show_in_chart
    ).length;

    if (isLoadingSettings || isLoadingTests) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Carregando configurações de gráficos...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            Gráficos de Tendência
                        </CardTitle>
                        <CardDescription>
                            Configure quais testes aparecem nos gráficos para este cliente.
                            Testes sem override seguem o padrão global (definição do teste).
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="chart-enabled" className="text-sm text-slate-500">
                            {enabled ? 'Habilitado' : 'Desabilitado'}
                        </Label>
                        <Switch
                            id="chart-enabled"
                            checked={enabled}
                            onCheckedChange={(val) => { setEnabled(val); setHasChanges(true); }}
                        />
                    </div>
                </div>
            </CardHeader>

            {enabled && (
                <CardContent className="space-y-5">
                    {/* Period */}
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Período do Gráfico</Label>
                            <p className="text-xs text-slate-400">Quantos dias de histórico exibir</p>
                        </div>
                        <Select value={periodDays} onValueChange={(val) => { setPeriodDays(val); setHasChanges(true); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="90">Últimos 90 dias</SelectItem>
                                <SelectItem value="180">Últimos 180 dias</SelectItem>
                                <SelectItem value="365">Últimos 365 dias</SelectItem>
                                <SelectItem value="730">Últimos 2 anos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Testes — nível Cliente</Label>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {effectiveCount} ativos · {overrideCount} override{overrideCount !== 1 ? 's' : ''} explícito{overrideCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {overrideCount > 0 && (
                                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-blue-500" onClick={resetAll}>
                                    <RotateCcw className="w-3 h-3 mr-1" /> Limpar overrides
                                </Button>
                            )}
                        </div>

                        <div className="border rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
                            {availableTests?.length > 0 ? (
                                availableTests.map(test => (
                                    <TestToggleRow
                                        key={test.id}
                                        test={test}
                                        override={overrides[test.id]}
                                        inheritedValue={!!test.show_in_chart}
                                        onOverride={(val) => handleOverride(test.id, val)}
                                        onReset={() => handleReset(test.id)}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 italic text-center py-6">
                                    Nenhum teste configurado para os equipamentos deste cliente.
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-slate-400">
                            <span className="font-medium text-slate-500">↩ ícone</span> = remover override e voltar ao padrão global do teste.
                            Cinza = herdado do global.
                        </p>
                    </div>

                    {hasChanges && (
                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                                {isSaving
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                                    : <><Save className="w-4 h-4 mr-2" /> Salvar Configurações</>
                                }
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
