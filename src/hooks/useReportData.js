import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Visit, Client, Location, LocationEquipment, TestResult, TestDefinition, Equipment, EquipmentTest, VisitPhoto, User, VisitDosage, VisitEquipmentSample, Product, EquipmentDosageParams, ClientProduct, AnalysisGroupItem } from "@/api/entities";

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
                allAnalysisGroupItems
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
                AnalysisGroupItem.list(undefined, 10000)
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

                        // 1. Tests linked via Equipment Configuration
                        const linkedTestIds = allEquipmentTests
                            .filter(et => et.equipment_id === catalogItem.id)
                            .map(et => et.test_definition_id);

                        // 2. Tests linked via Selected Analysis Group (if any)
                        let groupTestIds = [];
                        if (sampleInfo?.analysis_group_id && allAnalysisGroupItems) {
                            groupTestIds = allAnalysisGroupItems
                                .filter(agi => agi.group_id === sampleInfo.analysis_group_id)
                                .map(agi => agi.test_definition_id);
                        }

                        // 3. Merge Lists
                        const allTestIds = [...new Set([...linkedTestIds, ...groupTestIds])];

                        const tests = allDefinitions.filter(t => allTestIds.includes(t.id));

                        const testsWithResults = tests.map(test => {
                            const result = allResults.find(r =>
                                r.test_definition_id === test.id &&
                                (r.equipment_id === le.id || r.equipment_id === catalogItem.id) // Check both instance and catalog IDs
                            );

                            // Check for override in allEquipmentTests (only for linked ones, but simplified here)
                            // We should technically look for override in allEquipmentTests...
                            // But for report purposes, using base definition is usually fine unless limits are critical.
                            // Let's replicate ReadingsTab logic for limits overriding if present in linkedTests
                            const override = allEquipmentTests.find(et => et.equipment_id === catalogItem.id && et.test_definition_id === test.id);

                            const effectiveTest = {
                                ...test,
                                min_value: override?.min_value ?? test.min_value,
                                max_value: override?.max_value ?? test.max_value,
                                unit: override?.unit ?? test.unit,
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

            return { visit, client, primaryLocation, fullReportStructure, photos, technicianUser, reportSettings, technicalResponsibles, selectedTechnicalResponsible, clientContact };
        },
        // Cache for 5 minutes
        staleTime: 1000 * 60 * 5
    });
}
