import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Visit, Client, Location, LocationEquipment, TestResult, TestDefinition, Equipment, EquipmentTest, VisitPhoto, User, VisitDosage, VisitEquipmentSample, Product, EquipmentDosageParams, ClientProduct, AnalysisGroupItem, LocationEquipmentTest } from "@/api/entities";

export function useReportData(id) {
    return useQuery({
        queryKey: ['fullReport', id],
        queryFn: async () => {
            if (!id) return null;

            // 1. Get Visit first
            const { data: visit, error: visitError } = await supabase
                .from('visits')
                .select('*')
                .eq('id', id)
                .single();

            if (visitError || !visit) throw new Error("Visita não encontrada");

            // 2. Fetch Client and Locations
            const [clientRes, primaryLocationRes, allLocationsRes] = await Promise.all([
                visit.client_id ? supabase.from('clients').select('*').eq('id', visit.client_id).single() : Promise.resolve({ data: null }),
                visit.location_id ? supabase.from('locations').select('*').eq('id', visit.location_id).single() : Promise.resolve({ data: null }),
                visit.client_id ? supabase.from('locations').select('*').eq('client_id', visit.client_id).limit(200) : Promise.resolve({ data: [] })
            ]);

            const client = clientRes.data;
            const primaryLocation = primaryLocationRes.data;
            const allLocations = allLocationsRes.data || [];

            // 3. Fetch LocationEquipments
            const locationEquipmentPromises = allLocations.map(loc =>
                LocationEquipment.filter({ location_id: loc.id }, undefined, 100)
            );
            const locationEquipmentsResults = await Promise.all(locationEquipmentPromises);
            const allLocationEquipments = locationEquipmentsResults.flat();

            // 4. Fetch remaining data (Results, Definitions, Equipment, Tests, Photos, Users, Dosages, Samples, Products, DosageParams, ClientProducts, AnalysisGroupItems)
            const [
                allResults,
                allDefinitions,
                allEquipments,
                allEquipmentTests,
                photos,
                allUsers,
                allDosages,
                allSamples,
                allProducts,
                allDosageParams,
                clientProducts,
                allAnalysisGroupItems,
                allLocationTests // NEW: Custom Tests
            ] = await Promise.all([
                TestResult.filter({ visit_id: id }, undefined, 10000),
                TestDefinition.list(undefined, 10000),
                Equipment.list(undefined, 10000),
                EquipmentTest.list(undefined, 10000),
                VisitPhoto.filter({ visit_id: id }, undefined, 100),
                User.list(undefined, 10000),
                VisitDosage.filter({ visit_id: id }, undefined, 10000),
                VisitEquipmentSample.filter({ visit_id: id }, undefined, 10000),
                Product.list(undefined, 10000),
                EquipmentDosageParams.list(undefined, 10000),
                visit.client_id ? ClientProduct.filter({ client_id: visit.client_id }, undefined, 10000) : Promise.resolve([]),
                AnalysisGroupItem.list(undefined, 10000),
                LocationEquipmentTest.list(undefined, 10000) // Fetch Custom Tests
            ]);

            // Attempt to find technician
            let technicianUser = null;
            if (visit.technician_email && visit.technician_email !== 'current_user') {
                technicianUser = allUsers.find(u => u.email === visit.technician_email);
            }
            if (!technicianUser && visit.created_by) {
                technicianUser = allUsers.find(u => u.email === visit.created_by);
            }

            // Structure Data by Location -> Equipment
            const fullReportStructure = allLocations.map(loc => {
                const equipmentsWithTests = allLocationEquipments
                    .filter(le => le.location_id === loc.id)
                    .map(le => {
                        const catalogItem = allEquipments.find(e => e.id === le.equipment_id);
                        if (!catalogItem) return null;

                        // Attach Sample Info (Time, Complementary)
                        const sampleInfo = allSamples.find(s => s.location_equipment_id === le.id);

                        // 1. Tests linked via Equipment Configuration (Standard)
                        const linkedTestsData = allEquipmentTests.filter(et => et.equipment_id === catalogItem.id);
                        const linkedTestIds = linkedTestsData.map(et => et.test_definition_id);

                        // 2. Custom Tests from LocationEquipmentTest (Overrides/Additions)
                        const customTestsData = allLocationTests ? allLocationTests.filter(letest => letest.location_equipment_id === le.id) : [];
                        const customTestIds = customTestsData.map(ct => ct.test_definition_id);

                        // 3. Tests linked via Selected Analysis Group (if any)
                        let groupTestIds = [];
                        if (sampleInfo?.analysis_group_id && allAnalysisGroupItems) {
                            groupTestIds = allAnalysisGroupItems
                                .filter(agi => agi.group_id === sampleInfo.analysis_group_id)
                                .map(agi => agi.test_definition_id);
                        }

                        // 4. Merge Lists (Standard + Custom + Group)
                        const allTestIds = [...new Set([...linkedTestIds, ...customTestIds, ...groupTestIds])];

                        const tests = allDefinitions.filter(t => allTestIds.includes(t.id));

                        const testsWithResults = tests.map(test => {
                            const result = allResults.find(r =>
                                r.test_definition_id === test.id &&
                                (r.equipment_id === le.id || r.equipment_id === catalogItem.id) // Check both instance and catalog IDs
                            );

                            // Priority 1: Custom Override (LocationEquipmentTest)
                            const customOverride = customTestsData.find(ct => ct.test_definition_id === test.id);

                            // Priority 2: Standard Config (EquipmentTest)
                            const standardConfig = linkedTestsData.find(et => et.test_definition_id === test.id);

                            const getValidVal = (val) => (val !== null && val !== undefined && val !== "") ? val : undefined;

                            const effectiveTest = {
                                ...test,
                                min_value: getValidVal(customOverride?.min_value) ?? getValidVal(standardConfig?.min_value) ?? test.min_value,
                                max_value: getValidVal(customOverride?.max_value) ?? getValidVal(standardConfig?.max_value) ?? test.max_value,
                                unit: getValidVal(customOverride?.unit) ?? getValidVal(standardConfig?.unit) ?? test.unit,
                                result
                            };

                            return effectiveTest;
                        });

                        // Attach Dosages - Only products CONFIGURED for this equipment
                        // Get configured products from equipment_dosage_params
                        const configuredParams = allDosageParams.filter(dp => dp.location_equipment_id === le.id);

                        const dosages = configuredParams.map(param => {
                            const product = allProducts.find(p => p.id === param.product_id);
                            if (!product) return null;

                            // Check if there's a visit-specific record (user modified value)
                            const visitRecord = allDosages.find(d => d.location_equipment_id === le.id && d.product_id === param.product_id);

                            // Get stock from client_products
                            const clientInventory = clientProducts?.find(cp => cp.product_id === param.product_id);
                            const stockValue = clientInventory?.current_stock;

                            // Use visit record if exists, otherwise use defaults from params
                            const record = visitRecord || {
                                current_stock: stockValue ?? null, // Use client inventory stock
                                dosage_applied: param.recommended_dosage, // Use recommended as default
                                isDefault: true // Flag to identify it's a default value
                            };

                            // If visit record exists but doesn't have stock, use client inventory
                            if (record && !record.current_stock && stockValue) {
                                record.current_stock = stockValue;
                            }

                            return { product, record, recommended_dosage: param.recommended_dosage, complementary_info: param.complementary_info };
                        }).filter(Boolean);

                        return {
                            equipment: { ...catalogItem, id: le.id }, // id is LocationEquipment ID
                            tests: testsWithResults,
                            sample: sampleInfo,
                            dosages: dosages
                        };
                    })
                    .filter(item => item && (item.tests.length > 0 || item.dosages.length > 0)); // Keep if has tests OR dosages

                return {
                    location: loc,
                    equipments: equipmentsWithTests
                };
            }).filter(loc => loc.equipments.length > 0);

            // Fetch Report Settings (logo, sequential number)
            const { data: reportSettings } = await supabase
                .from('report_settings')
                .select('*')
                .limit(1)
                .single();

            // Fetch Active Technical Responsibles (for potential listing or context)
            const { data: technicalResponsibles } = await supabase
                .from('technical_responsibles')
                .select('*')
                .eq('active', true);

            // Fetch Selected Technical Responsible (specifically for this visit, regardless of active status)
            let selectedTechnicalResponsible = null;
            if (visit.technical_responsible_id) {
                const { data: resp } = await supabase
                    .from('technical_responsibles')
                    .select('*')
                    .eq('id', visit.technical_responsible_id)
                    .single();
                selectedTechnicalResponsible = resp;
            }

            // Fetch Client Contact (Signer) - NEW
            let clientContact = null;
            if (visit.client_contact_id) {
                const { data: cc } = await supabase.from('client_contacts').select('*').eq('id', visit.client_contact_id).single();
                if (cc) clientContact = cc;
            }

            // Fetch Chart Settings and Historical Data for Trend Charts
            let historicalChartData = null;
            if (visit.client_id) {
                try {
                    const { data: chartSettingsArr } = await supabase
                        .from('client_report_chart_settings')
                        .select('*')
                        .eq('client_id', visit.client_id)
                        .limit(1);

                    const chartSettings = chartSettingsArr?.[0] || null;

                    if (chartSettings?.enabled) {
                        const periodDays = chartSettings.period_days || 365;
                        const clientOverrides = chartSettings.chart_test_overrides || {};
                        const cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - periodDays);
                        const cutoffISO = cutoffDate.toISOString().split('T')[0];

                        // Fetch all test definitions (needed for show_in_chart fallback)
                        const { data: allTestDefsForChart } = await supabase
                            .from('test_definitions')
                            .select('id, name, unit, min_value, max_value, show_in_chart');

                        const { data: histVisits } = await supabase
                            .from('visits')
                            .select('id, visit_date')
                            .eq('client_id', visit.client_id)
                            .gte('visit_date', cutoffISO)
                            .not('status', 'eq', 'draft')
                            .order('visit_date', { ascending: true });

                        if (histVisits?.length > 0) {
                            const histVisitIds = histVisits.map(v => v.id);

                            // Fetch ALL results (hierarchy decides per equipment which tests to show)
                            let histResults = [];
                            const chunkSize = 50;
                            for (let i = 0; i < histVisitIds.length; i += chunkSize) {
                                const chunk = histVisitIds.slice(i, i + chunkSize);
                                const { data: results } = await supabase
                                    .from('test_results')
                                    .select('*')
                                    .in('visit_id', chunk);
                                if (results) histResults = [...histResults, ...results];
                            }

                            const CHART_COLORS = ['#2563eb', '#dc2626', '#0ea5e9', '#eab308', '#16a34a', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899', '#14b8a6'];
                            const histVisitMap = new Map(histVisits.map(v => [v.id, v]));
                            const locationMap = new Map(allLocations.map(l => [l.id, l]));
                            const equipCatalogMap = new Map(allEquipments.map(e => [e.id, e]));
                            const locEquipLookup = new Map(allLocationEquipments.map(le => [le.id, le]));

                            // Only include equipment that has measurements in the CURRENT visit
                            const currentVisitEquipmentIds = new Set(allResults.map(r => r.equipment_id));
                            const allEquipmentIds = [...new Set(histResults.map(r => r.equipment_id))]
                                .filter(eqId => currentVisitEquipmentIds.has(eqId));

                            const charts = allEquipmentIds.map(eqId => {
                                const locEquip = locEquipLookup.get(eqId);
                                const loc = locEquip ? locationMap.get(locEquip.location_id) : null;
                                const equip = locEquip ? equipCatalogMap.get(locEquip.equipment_id) : null;
                                const equipmentName = equip?.name || 'Equipamento';
                                const locationName = loc?.name || '';

                                // Hierarchy per test: Equipment override > Client override > Test global (show_in_chart)
                                const visibleTestDefs = (allTestDefsForChart || []).filter(t => {
                                    if (locEquip?.chart_test_overrides?.[t.id] !== undefined)
                                        return locEquip.chart_test_overrides[t.id];
                                    if (clientOverrides[t.id] !== undefined)
                                        return clientOverrides[t.id];
                                    return !!t.show_in_chart;
                                });
                                if (visibleTestDefs.length === 0) return null;

                                const eqResults = histResults.filter(r => r.equipment_id === eqId);

                                const tests = visibleTestDefs.map((testDef, testIdx) => {
                                    const testId = testDef.id;

                                    const data = eqResults
                                        .filter(r => r.test_definition_id === testId)
                                        .map(r => {
                                            const hv = histVisitMap.get(r.visit_id);
                                            if (!hv || r.measured_value === null || r.measured_value === undefined || r.measured_value === '') return null;
                                            const numVal = parseFloat(r.measured_value);
                                            if (isNaN(numVal)) return null;
                                            return { date: hv.visit_date, value: numVal };
                                        })
                                        .filter(Boolean)
                                        .sort((a, b) => a.date.localeCompare(b.date));

                                    if (data.length === 0) return null;
                                    return {
                                        testId, testName: testDef.name, unit: testDef.unit || '',
                                        minVmp: testDef.min_value !== null ? parseFloat(testDef.min_value) : null,
                                        maxVmp: testDef.max_value !== null ? parseFloat(testDef.max_value) : null,
                                        color: CHART_COLORS[testIdx % CHART_COLORS.length],
                                        data
                                    };
                                }).filter(Boolean);

                                if (tests.length === 0) return null;
                                return { equipmentId: eqId, equipmentName, locationName, tests };
                            }).filter(Boolean);

                            historicalChartData = { chartSettings, charts, clientName: client?.name || '' };
                        } else {
                            historicalChartData = { chartSettings, charts: [], clientName: client?.name || '' };
                        }
                    }
                } catch (chartError) {
                    console.warn('Error fetching chart data:', chartError);
                    // Non-critical: don't block report generation
                }
            }

            return { visit, client, primaryLocation, fullReportStructure, photos, technicianUser, reportSettings, technicalResponsibles, selectedTechnicalResponsible, clientContact, historicalChartData };
        },
        // Cache for 5 minutes
        staleTime: 1000 * 60 * 5
    });
}
