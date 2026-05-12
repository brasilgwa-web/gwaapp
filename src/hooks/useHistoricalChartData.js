import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Extended palette with 20 visually distinct colors — used as fallback when chart_color is not set
const CHART_COLORS = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#0ea5e9', // sky-500
    '#eab308', // yellow-500
    '#16a34a', // green-600
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#7c3aed', // violet-600
    '#ea580c', // orange-600
    '#0284c7', // sky-600
    '#ca8a04', // yellow-600
    '#059669', // emerald-600
    '#be185d', // pink-700
    '#4f46e5', // indigo-600
    '#0d9488', // teal-600
    '#9333ea', // purple-600
    '#65a30d', // lime-600
];

// Hierarchy per test: Equipment override > Client override > Test global (show_in_chart)
function isTestVisible(testId, locEquip, clientOverrides, testDef) {
    if (locEquip?.chart_test_overrides?.[testId] !== undefined)
        return locEquip.chart_test_overrides[testId];
    if (clientOverrides?.[testId] !== undefined)
        return clientOverrides[testId];
    return !!testDef?.show_in_chart;
}

export function useHistoricalChartData(clientId, enabled = true) {
    return useQuery({
        queryKey: ['historicalChartData', clientId],
        queryFn: async () => {
            if (!clientId) return null;

            // 1. Load chart settings for this client
            const { data: settingsArr } = await supabase
                .from('client_report_chart_settings')
                .select('*')
                .eq('client_id', clientId)
                .limit(1);

            const chartSettings = settingsArr?.[0] || null;

            if (!chartSettings || !chartSettings.enabled) {
                return { chartSettings: null, charts: [] };
            }

            const periodDays = chartSettings.period_days || 365;
            const clientOverrides = chartSettings.chart_test_overrides || {};

            // 2. Fetch visits within period
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - periodDays);
            const cutoffISO = cutoffDate.toISOString().split('T')[0];

            const { data: visits } = await supabase
                .from('visits')
                .select('id, visit_date, client_id')
                .eq('client_id', clientId)
                .gte('visit_date', cutoffISO)
                .in('status', ['completed', 'synced'])
                .order('visit_date', { ascending: true });

            if (!visits || visits.length === 0) {
                return { chartSettings, charts: [] };
            }

            const visitIds = visits.map(v => v.id);

            // 3. Fetch locations and equipments (with chart_test_ids)
            const { data: locations } = await supabase
                .from('locations')
                .select('*')
                .eq('client_id', clientId);

            const locationIds = locations?.map(l => l.id) || [];
            let allLocEquips = [];
            if (locationIds.length > 0) {
                const { data: locEquips } = await supabase
                    .from('location_equipments')
                    .select('*')
                    .in('location_id', locationIds);
                allLocEquips = locEquips || [];
            }

            const equipIds = [...new Set(allLocEquips.map(le => le.equipment_id))];
            let allEquipments = [];
            if (equipIds.length > 0) {
                const { data: equips } = await supabase
                    .from('equipments')
                    .select('id, name')
                    .in('id', equipIds);
                allEquipments = equips || [];
            }

            // 4. Fetch ALL test definitions (needed for show_in_chart fallback)
            const { data: allTestDefs } = await supabase
                .from('test_definitions')
                .select('id, name, unit, min_value, max_value, show_in_chart, chart_color');

            // 5. Fetch ALL results for these visits (no test filter — hierarchy decides per equipment)
            let allResults = [];
            const chunkSize = 50;
            for (let i = 0; i < visitIds.length; i += chunkSize) {
                const chunk = visitIds.slice(i, i + chunkSize);
                const { data: results } = await supabase
                    .from('test_results')
                    .select('*')
                    .in('visit_id', chunk);
                if (results) allResults = [...allResults, ...results];
            }

            // Build lookup maps
            const visitMap = new Map(visits.map(v => [v.id, v]));
            const locationMap = new Map(locations?.map(l => [l.id, l]) || []);
            const equipMap = new Map(allEquipments.map(e => [e.id, e]));
            const locEquipMap = new Map(allLocEquips.map(le => [le.id, le]));

            // 6. Build a global color map: each unique test ID always gets the same fallback color
            // We sort all test definitions alphabetically to guarantee deterministic order
            const sortedTestDefs = [...(allTestDefs || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            const testColorMap = {};
            sortedTestDefs.forEach((t, idx) => {
                testColorMap[t.id] = t.chart_color || CHART_COLORS[idx % CHART_COLORS.length];
            });

            const allEquipmentIds = [...new Set(allResults.map(r => r.equipment_id))];

            const charts = allEquipmentIds.map(eqId => {
                const locEquip = locEquipMap.get(eqId);
                const loc = locEquip ? locationMap.get(locEquip.location_id) : null;
                const equip = locEquip ? equipMap.get(locEquip.equipment_id) : null;
                const equipmentName = equip?.name || 'Equipamento';
                const locationName = loc?.name || '';

                // Filter tests using per-test hierarchy
                const visibleTestDefs = (allTestDefs || []).filter(t =>
                    isTestVisible(t.id, locEquip, clientOverrides, t)
                );
                if (visibleTestDefs.length === 0) return null;

                const eqResults = allResults.filter(r => r.equipment_id === eqId);

                const tests = visibleTestDefs.map((testDef) => {
                    const testId = testDef.id;
                    if (!testDef) return null;

                    const data = eqResults
                        .filter(r => r.test_definition_id === testId)
                        .map(r => {
                            const visit = visitMap.get(r.visit_id);
                            if (!visit || r.measured_value === null || r.measured_value === undefined || r.measured_value === '') return null;
                            const numValue = parseFloat(r.measured_value);
                            if (isNaN(numValue)) return null;
                            return { date: visit.visit_date, value: numValue };
                        })
                        .filter(Boolean)
                        .sort((a, b) => a.date.localeCompare(b.date));

                    if (data.length === 0) return null;

                    return {
                        testId,
                        testName: testDef.name,
                        unit: testDef.unit || '',
                        minVmp: testDef.min_value !== null ? parseFloat(testDef.min_value) : null,
                        maxVmp: testDef.max_value !== null ? parseFloat(testDef.max_value) : null,
                        color: testDef.chart_color || testColorMap[testId] || CHART_COLORS[0],
                        data
                    };
                }).filter(Boolean);

                if (tests.length === 0) return null;
                return { equipmentId: eqId, equipmentName, locationName, tests };
            }).filter(Boolean);

            const { data: clientData } = await supabase
                .from('clients')
                .select('name, city_state')
                .eq('id', clientId)
                .single();

            return {
                chartSettings,
                charts,
                clientName: clientData?.name || '',
                clientCity: clientData?.city_state || ''
            };
        },
        enabled: !!clientId && enabled,
        staleTime: 1000 * 60 * 5
    });
}
