import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Visit, Client, Location, LocationEquipment, TestResult, TestDefinition, Equipment, EquipmentTest, VisitPhoto, User, VisitDosage, VisitEquipmentSample, Product, EquipmentDosageParams } from "@/api/entities";

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

            // 4. Fetch remaining data (Results, Definitions, Equipment, Tests, Photos, Users, Dosages, Samples, Products, DosageParams)
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
                allDosageParams
            ] = await Promise.all([
                TestResult.filter({ visit_id: id }, undefined, 2000),
                TestDefinition.list(undefined, 1000),
                Equipment.list(undefined, 1000),
                EquipmentTest.list(undefined, 1000),
                VisitPhoto.filter({ visit_id: id }, undefined, 100),
                User.list(undefined, 1000),
                VisitDosage.filter({ visit_id: id }, undefined, 1000),
                VisitEquipmentSample.filter({ visit_id: id }, undefined, 1000),
                Product.list(undefined, 1000),
                EquipmentDosageParams.list(undefined, 1000)
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

                        const linkedTestIds = allEquipmentTests
                            .filter(et => et.equipment_id === catalogItem.id)
                            .map(et => et.test_definition_id);

                        const tests = allDefinitions.filter(t => linkedTestIds.includes(t.id));

                        const testsWithResults = tests.map(test => {
                            const result = allResults.find(r =>
                                r.test_definition_id === test.id &&
                                (r.equipment_id === le.id || r.equipment_id === catalogItem.id) // Check both instance and catalog IDs
                            );
                            return { ...test, result };
                        });

                        // Attach Sample Info (Time, Complementary)
                        const sampleInfo = allSamples.find(s => s.location_equipment_id === le.id);

                        // Attach Dosages - Only products CONFIGURED for this equipment
                        // Get configured products from equipment_dosage_params
                        const configuredParams = allDosageParams.filter(dp => dp.location_equipment_id === le.id);

                        const dosages = configuredParams.map(param => {
                            const product = allProducts.find(p => p.id === param.product_id);
                            if (!product) return null;

                            // Check if there's a visit-specific record (user modified value)
                            const visitRecord = allDosages.find(d => d.location_equipment_id === le.id && d.product_id === param.product_id);

                            // Use visit record if exists, otherwise use defaults from params
                            const record = visitRecord || {
                                current_stock: null, // Will show '-' in report
                                dosage_applied: param.recommended_dosage, // Use recommended as default
                                isDefault: true // Flag to identify it's a default value
                            };

                            return { product, record, recommended_dosage: param.recommended_dosage };
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

            return { visit, client, primaryLocation, fullReportStructure, photos, technicianUser };
        },
        // Cache for 5 minutes
        staleTime: 1000 * 60 * 5
    });
}
