import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Pre-defined color palette matching the reference images
const CHART_COLORS = [
    '#2563eb', // blue-600 (dark blue line)
    '#dc2626', // red-600 (red line)
    '#0ea5e9', // sky-500 (light blue line)
    '#eab308', // yellow-500 (yellow/orange line)
    '#16a34a', // green-600
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
];

// Deterministic hash function: same equipmentId always gets the same color
function hashStringToIndex(str, max) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) % max;
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

            // If no settings or disabled, return early
            if (!chartSettings || !chartSettings.enabled) {
                return { chartSettings: null, charts: [] };
            }

            const periodDays = chartSettings.period_days || 365;
            const selectedTestIds = chartSettings.selected_test_ids || [];

            if (selectedTestIds.length === 0) {
                return { chartSettings, charts: [] };
            }

            // 2. Fetch all visits for this client within the period
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

            // 3. Fetch test results for these visits and selected tests
            // Supabase .in() has a limit, so chunk if needed
            let allResults = [];
            const chunkSize = 50;
            for (let i = 0; i < visitIds.length; i += chunkSize) {
                const chunk = visitIds.slice(i, i + chunkSize);
                const { data: results } = await supabase
                    .from('test_results')
                    .select('*')
                    .in('visit_id', chunk)
                    .in('test_definition_id', selectedTestIds);
                if (results) allResults = [...allResults, ...results];
            }

            // 4. Fetch test definitions for selected tests
            const { data: testDefs } = await supabase
                .from('test_definitions')
                .select('*')
                .in('id', selectedTestIds);

            // 5. Fetch location_equipments and locations for naming
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

            // Fetch equipment catalog names
            const equipIds = [...new Set(allLocEquips.map(le => le.equipment_id))];
            let allEquipments = [];
            if (equipIds.length > 0) {
                const { data: equips } = await supabase
                    .from('equipments')
                    .select('id, name')
                    .in('id', equipIds);
                allEquipments = equips || [];
            }

            // Build lookup maps
            const visitMap = new Map(visits.map(v => [v.id, v]));
            const locationMap = new Map(locations?.map(l => [l.id, l]) || []);
            const equipMap = new Map(allEquipments.map(e => [e.id, e]));
            const locEquipMap = new Map(allLocEquips.map(le => [le.id, le]));

            // Get equipment name for a location_equipment_id (used as equipment_id in results)
            const getPointName = (equipmentId) => {
                // equipmentId in test_results might be location_equipment ID or catalog equipment ID
                const locEquip = locEquipMap.get(equipmentId);
                if (locEquip) {
                    const loc = locationMap.get(locEquip.location_id);
                    const equip = equipMap.get(locEquip.equipment_id);
                    return `${equip?.name || 'Equipamento'} | ${loc?.name || 'Local'}`;
                }
                // Fallback: try catalog equipment
                const equip = equipMap.get(equipmentId);
                return equip?.name || 'Ponto';
            };

            // 6. Build chart data grouped by test_definition
            const charts = (testDefs || []).map(testDef => {
                const testResults = allResults.filter(r => r.test_definition_id === testDef.id);

                if (testResults.length === 0) return null;

                // Group by equipment (point of consumption)
                const byEquipment = {};
                testResults.forEach(r => {
                    const eqId = r.equipment_id;
                    if (!byEquipment[eqId]) {
                        byEquipment[eqId] = {
                            name: getPointName(eqId),
                            data: []
                        };
                    }
                    const visit = visitMap.get(r.visit_id);
                    if (visit && r.measured_value !== null && r.measured_value !== undefined && r.measured_value !== '') {
                        const numValue = parseFloat(r.measured_value);
                        if (!isNaN(numValue)) {
                            byEquipment[eqId].data.push({
                                date: visit.visit_date,
                                value: numValue,
                                visitId: visit.id
                            });
                        }
                    }
                });

                // Sort each series by date
                const series = Object.entries(byEquipment)
                    .filter(([_, s]) => s.data.length > 0)
                    .map(([eqId, s]) => ({
                        ...s,
                        color: CHART_COLORS[hashStringToIndex(eqId, CHART_COLORS.length)],
                        data: s.data.sort((a, b) => a.date.localeCompare(b.date))
                    }));

                if (series.length === 0) return null;

                // Fetch VMP from equipment_tests or test_definition
                // Use test_definition min/max as default
                return {
                    testId: testDef.id,
                    testName: testDef.name,
                    unit: testDef.unit || '',
                    minVmp: testDef.min_value !== null ? parseFloat(testDef.min_value) : null,
                    maxVmp: testDef.max_value !== null ? parseFloat(testDef.max_value) : null,
                    series
                };
            }).filter(Boolean);

            // Get client city for chart title
            const { data: clientData } = await supabase
                .from('clients')
                .select('city_state')
                .eq('id', clientId)
                .single();

            return {
                chartSettings,
                charts,
                clientCity: clientData?.city_state || ''
            };
        },
        enabled: !!clientId && enabled,
        staleTime: 1000 * 60 * 5 // 5 min cache
    });
}
