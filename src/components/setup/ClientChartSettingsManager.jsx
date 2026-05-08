import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { BarChart3, Save, Loader2, RotateCcw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

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

function CascadeDialog({ open, onClose, onConfirm, isCascading, items, changedTests }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Replicar alterações?
                    </DialogTitle>
                    <DialogDescription>
                        {items.length} equipamento{items.length !== 1 ? 's' : ''} {items.length !== 1 ? 'têm' : 'tem'} configurações manuais para {changedTests.length === 1 ? 'o teste alterado' : 'os testes alterados'}.
                        Deseja limpar esses overrides para que herdem as novas configurações do cliente?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                        Testes afetados
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {changedTests.map(t => (
                            <span key={t.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                                {t.name}
                            </span>
                        ))}
                    </div>

                    <button
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mt-1"
                        onClick={() => setExpanded(e => !e)}
                    >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {expanded ? 'Ocultar' : 'Ver'} equipamentos afetados ({items.length})
                    </button>

                    {expanded && (
                        <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                            {items.map(item => (
                                <div key={item.leId} className="px-3 py-2 border-b last:border-0 text-sm flex items-center justify-between">
                                    <span className="font-medium text-slate-700">{item.equipmentName}</span>
                                    <span className="text-xs text-slate-400">{item.overrideSummary}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isCascading}>
                        Não, manter overrides
                    </Button>
                    <Button onClick={onConfirm} disabled={isCascading} className="bg-amber-500 hover:bg-amber-600 text-white">
                        {isCascading
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aplicando...</>
                            : 'Sim, limpar overrides'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ClientChartSettingsManager({ client }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [isCascading, setIsCascading] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [periodDays, setPeriodDays] = useState('365');
    const [overrides, setOverrides] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [cascadeDialog, setCascadeDialog] = useState(null); // { items, changedTests, changedTestIds }

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

    const showSuccess = () => {
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 3000);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
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
            showSuccess();
            queryClient.invalidateQueries({ queryKey: ['chartSettings', client.id] });
            queryClient.invalidateQueries({ queryKey: ['historicalChartData'] });
            queryClient.invalidateQueries({ queryKey: ['fullReport'] });

            // Check cascade: which tests changed?
            const prevOverrides = existingSettings?.chart_test_overrides || {};
            const allKeys = new Set([...Object.keys(prevOverrides), ...Object.keys(overrides)]);
            const changedTestIds = [...allKeys].filter(tid => prevOverrides[tid] !== overrides[tid]);

            if (changedTestIds.length > 0) {
                await checkEquipmentCascade(changedTestIds);
            }
        } catch (err) {
            console.error('Error saving chart settings:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const checkEquipmentCascade = async (changedTestIds) => {
        const { data: locations } = await supabase
            .from('locations').select('id').eq('client_id', client.id);
        if (!locations?.length) return;

        const { data: locEquips } = await supabase
            .from('location_equipments')
            .select('id, chart_test_overrides, equipment_id')
            .in('location_id', locations.map(l => l.id))
            .not('chart_test_overrides', 'is', null);

        const affected = (locEquips || []).filter(le =>
            changedTestIds.some(tid => le.chart_test_overrides?.[tid] !== undefined)
        );
        if (!affected.length) return;

        const equipIds = [...new Set(affected.map(le => le.equipment_id))];
        const { data: equips } = await supabase
            .from('equipments').select('id, name').in('id', equipIds);
        const equipMap = new Map((equips || []).map(e => [e.id, e]));

        const testMap = new Map((availableTests || []).map(t => [t.id, t]));
        const changedTests = changedTestIds.map(tid => testMap.get(tid)).filter(Boolean);

        const items = affected.map(le => {
            const equipName = equipMap.get(le.equipment_id)?.name || 'Equipamento';
            const overriddenTests = changedTestIds
                .filter(tid => le.chart_test_overrides?.[tid] !== undefined)
                .map(tid => `${testMap.get(tid)?.name || tid}: ${le.chart_test_overrides[tid] ? 'ON' : 'OFF'}`)
                .join(', ');
            return { leId: le.id, equipmentName: equipName, overrideSummary: overriddenTests, chartTestOverrides: le.chart_test_overrides };
        });

        setCascadeDialog({ items, changedTests, changedTestIds });
    };

    const handleCascadeConfirm = async () => {
        if (!cascadeDialog) return;
        setIsCascading(true);
        try {
            await Promise.all(cascadeDialog.items.map(item => {
                const newOverrides = { ...item.chartTestOverrides };
                cascadeDialog.changedTestIds.forEach(tid => delete newOverrides[tid]);
                const val = Object.keys(newOverrides).length > 0 ? newOverrides : null;
                return supabase
                    .from('location_equipments')
                    .update({ chart_test_overrides: val })
                    .eq('id', item.leId);
            }));
            queryClient.invalidateQueries({ queryKey: ['locationEquipments'] });
            queryClient.invalidateQueries({ queryKey: ['historicalChartData'] });
            queryClient.invalidateQueries({ queryKey: ['fullReport'] });
        } finally {
            setIsCascading(false);
            setCascadeDialog(null);
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
        <>
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

                        <div className="flex items-center justify-end gap-3">
                            {savedOk && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium animate-in fade-in slide-in-from-right-2">
                                    <CheckCircle2 className="w-4 h-4" /> Configurações salvas!
                                </span>
                            )}
                            {hasChanges && (
                                <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                                    {isSaving
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                                        : <><Save className="w-4 h-4 mr-2" /> Salvar Configurações</>
                                    }
                                </Button>
                            )}
                        </div>
                    </CardContent>
                )}

                {!enabled && savedOk && (
                    <CardContent>
                        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Configurações salvas!
                        </span>
                    </CardContent>
                )}
            </Card>

            {cascadeDialog && (
                <CascadeDialog
                    open={!!cascadeDialog}
                    onClose={() => setCascadeDialog(null)}
                    onConfirm={handleCascadeConfirm}
                    isCascading={isCascading}
                    items={cascadeDialog.items}
                    changedTests={cascadeDialog.changedTests}
                />
            )}
        </>
    );
}
