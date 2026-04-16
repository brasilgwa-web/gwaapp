import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ClientReportChartSettings } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, Save, Loader2, CheckSquare, Square } from "lucide-react";

/**
 * ClientChartSettingsManager - Configure which parameters appear as trend charts in reports.
 * Shown in Client detail view (setup).
 */
export default function ClientChartSettingsManager({ client }) {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [periodDays, setPeriodDays] = useState('365');
    const [selectedTestIds, setSelectedTestIds] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch existing settings
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

    // Fetch all test definitions available for this client's equipments
    const { data: availableTests, isLoading: isLoadingTests } = useQuery({
        queryKey: ['clientAvailableTests', client?.id],
        queryFn: async () => {
            // Get locations for this client
            const { data: locations } = await supabase
                .from('locations')
                .select('id')
                .eq('client_id', client.id);

            if (!locations || locations.length === 0) return [];

            // Get location_equipments
            const { data: locEquips } = await supabase
                .from('location_equipments')
                .select('equipment_id')
                .in('location_id', locations.map(l => l.id));

            if (!locEquips || locEquips.length === 0) return [];

            const equipIds = [...new Set(locEquips.map(le => le.equipment_id))];

            // Get equipment_tests (which test_definitions are linked)
            const { data: eqTests } = await supabase
                .from('equipment_tests')
                .select('test_definition_id')
                .in('equipment_id', equipIds);

            if (!eqTests || eqTests.length === 0) return [];

            const testDefIds = [...new Set(eqTests.map(et => et.test_definition_id))];

            // Fetch test definitions
            const { data: testDefs } = await supabase
                .from('test_definitions')
                .select('*')
                .in('id', testDefIds)
                .order('name');

            return testDefs || [];
        },
        enabled: !!client?.id
    });

    // Initialize form when settings load
    useEffect(() => {
        if (existingSettings) {
            setEnabled(existingSettings.enabled !== false);
            setPeriodDays(String(existingSettings.period_days || 365));
            setSelectedTestIds(existingSettings.selected_test_ids || []);
        }
    }, [existingSettings]);

    const toggleTest = (testId) => {
        setSelectedTestIds(prev => {
            if (prev.includes(testId)) {
                return prev.filter(id => id !== testId);
            }
            return [...prev, testId];
        });
        setHasChanges(true);
    };

    const selectAll = () => {
        if (!availableTests) return;
        setSelectedTestIds(availableTests.map(t => t.id));
        setHasChanges(true);
    };

    const deselectAll = () => {
        setSelectedTestIds([]);
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                client_id: client.id,
                enabled,
                period_days: parseInt(periodDays),
                selected_test_ids: selectedTestIds,
                updated_at: new Date().toISOString()
            };

            if (existingSettings?.id) {
                await ClientReportChartSettings.update(existingSettings.id, payload);
            } else {
                await ClientReportChartSettings.create(payload);
            }

            setHasChanges(false);
            queryClient.invalidateQueries({ queryKey: ['chartSettings', client.id] });
        } catch (error) {
            console.error('Error saving chart settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

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
                            Gráficos de Tendência no Relatório
                        </CardTitle>
                        <CardDescription>
                            Configure quais parâmetros aparecerão como gráficos de tendência histórica nos relatórios deste cliente.
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
                <CardContent className="space-y-6">
                    {/* Period Selector */}
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Período do Gráfico</Label>
                            <p className="text-xs text-slate-400">Quantos dias de histórico exibir</p>
                        </div>
                        <Select
                            value={periodDays}
                            onValueChange={(val) => { setPeriodDays(val); setHasChanges(true); }}
                        >
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

                    {/* Parameter Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-medium">Parâmetros para Gráficos</Label>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {selectedTestIds.length} de {availableTests?.length || 0} selecionados
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAll}
                                    className="text-xs"
                                >
                                    <CheckSquare className="w-3 h-3 mr-1" />
                                    Todos
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={deselectAll}
                                    className="text-xs"
                                >
                                    <Square className="w-3 h-3 mr-1" />
                                    Nenhum
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto border rounded-md p-3 bg-slate-50/50">
                            {availableTests?.length > 0 ? (
                                availableTests.map(test => (
                                    <label
                                        key={test.id}
                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-colors text-sm ${
                                            selectedTestIds.includes(test.id)
                                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                                : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <Checkbox
                                            checked={selectedTestIds.includes(test.id)}
                                            onCheckedChange={() => toggleTest(test.id)}
                                        />
                                        <span className="truncate">
                                            {test.name}
                                            {test.unit && (
                                                <span className="text-xs text-slate-400 ml-1">({test.unit})</span>
                                            )}
                                        </span>
                                    </label>
                                ))
                            ) : (
                                <p className="text-sm text-slate-400 italic col-span-full text-center py-4">
                                    Nenhum parâmetro configurado para os equipamentos deste cliente.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Save Button */}
                    {hasChanges && (
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Salvar Configurações
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
