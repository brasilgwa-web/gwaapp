import { supabase } from '../lib/supabase';

// Helper to create a standard CRUD adapter for a table
const createAdapter = (tableName, defaultSortField = 'created_at') => ({
    list: async (orderBy = defaultSortField, limit = 10000) => {
        // Handle sorting
        let orderCol = orderBy;
        let ascending = false;

        if (typeof orderBy === 'string') {
            if (orderBy.startsWith('-')) {
                orderCol = orderBy.substring(1);
                ascending = false;
            } else {
                orderCol = orderBy;
                ascending = true;
            }
        }

        if (orderCol === 'created_at' && defaultSortField === 'created_date') {
            orderCol = 'created_date';
        }

        let allData = [];
        let from = 0;
        const chunkSize = 1000;

        while (true) {
            const to = from + chunkSize - 1;
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order(orderCol, { ascending })
                .range(from, to);

            if (error) {
                console.error(`Error fetching ${tableName}:`, error);
                throw error;
            }

            if (!data || data.length === 0) break;

            allData = [...allData, ...data];

            if (data.length < chunkSize) break;
            if (allData.length >= limit) break;

            from += chunkSize;
        }

        return allData.slice(0, limit);
    },

    create: async (data) => {
        const { id, ...payload } = data;
        const { data: created, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error(`Error creating in ${tableName}:`, error);
            throw error;
        }
        return created;
    },

    update: async (id, updates) => {
        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${tableName}:`, error);
            throw error;
        }
        return data;
    },

    delete: async (id) => {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting from ${tableName}:`, error);
            throw error;
        }
        return true;
    },

    // Used for specific queries like filter({ client_id: '...' })
    filter: async (criteria = {}, orderBy, limit = 10000) => {
        let allData = [];
        let from = 0;
        const chunkSize = 1000;

        // Sorting logic for filter (minimal support compared to list, but consistent)
        let orderCol = orderBy || 'created_at';
        let ascending = false; // Default desc usually? 
        // NOTE: The previous code didn't handle orderBy in filter well ("Simple sort if needed...").
        // We will stick to simple default or implied sort to avoid breaking compilation of query.
        // But for range() to work reliably, we NEED a stable sort order.
        // Assuming 'id' or defaultSortField if not provided. Use defaultSortField from adapter closure.

        let sortField = orderBy || defaultSortField;
        if (sortField === 'created_at' && defaultSortField === 'created_date') {
            sortField = 'created_date';
        }

        while (true) {
            let query = supabase.from(tableName).select('*');

            Object.entries(criteria).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            // We MUST order for range pagination to be stable
            // If orderBy is not provided, use defaultSortField
            query = query.order(sortField, { ascending: true }); // Default ascending for stability? Or specific?
            // Original code: "We will skip explicit sort unless passed". 
            // Issue: Range pagination WITHOUT sort is unstable in Postgres. 
            // We should enforce sort. 'id' is safest if available, or defaultSortField.

            const to = from + chunkSize - 1;
            query = query.range(from, to);

            const { data, error } = await query;

            if (error) {
                console.error(`Error filtering ${tableName}:`, error);
                throw error;
            }

            if (!data || data.length === 0) break;

            allData = [...allData, ...data];

            if (data.length < chunkSize) break;
            if (allData.length >= limit) break;

            from += chunkSize;
        }

        return allData.slice(0, limit);
    }
});

// Legacy Tables (Check DB schema or existing code usage to confirm 'created_date')
// Assuming these use 'created_date' based on the bug report context
export const Client = createAdapter('clients', 'created_date');
export const Location = createAdapter('locations', 'created_date');
export const Equipment = createAdapter('equipments', 'created_date');
export const TestDefinition = createAdapter('test_definitions', 'created_date');
export const Visit = createAdapter('visits', 'created_date');
export const TestResult = createAdapter('test_results', 'created_date');
export const VisitPhoto = createAdapter('visit_photos', 'created_date');
export const EquipmentTest = createAdapter('equipment_tests', 'created_date');

// V1.1 New Entities (Standard 'created_at')
export const Product = createAdapter('products', 'created_at');
export const DosagePlan = createAdapter('dosage_plans', 'created_at'); // Deprecated/Legacy in V1.2? usage might be replaced by EquipmentDosageParams
export const AnalysisGroup = createAdapter('analysis_groups', 'created_at');
export const AnalysisGroupItem = createAdapter('analysis_group_items', 'created_at');
export const ObservationTemplate = createAdapter('observation_templates', 'created_at');
export const ReportSequence = createAdapter('report_sequences', 'created_at');
export const VisitEquipmentSample = createAdapter('visit_equipment_samples', 'created_at');
export const VisitDosage = createAdapter('visit_dosages', 'created_at');
export const LocationEquipment = createAdapter('location_equipments', 'created_at');

// V1.2 New Entities
export const ClientProduct = createAdapter('client_products', 'created_at');
export const EquipmentDosageParams = createAdapter('equipment_dosage_params', 'created_at');
export const ClientContact = createAdapter('client_contacts', 'created_at');
export const ClientReportChartSettings = createAdapter('client_report_chart_settings', 'created_at');

// V1.3 RBAC Entities
export const Role = createAdapter('roles', 'created_at');
export const RolePermission = createAdapter('role_permissions', 'created_at');

// V1.4 Commercial Proposal Entities
export const LocationEquipmentTest = createAdapter('location_equipment_tests', 'created_at');

// Helper to get formatted Report Number
export const getNextReportNumber = async () => {
    // This would likely be a server-side function or an RPC, 
    // but for now we might handle it via a direct insert/update logic in the component 
    // or a specialized RPC if we created one. 
    // Leaving as placeholder or manual implementation in the UI for now.
    return null;
};

// Mock User auth object to satisfy generic calls if any (Auth is handled via Context now)
export const User = {
    list: async () => {
        // For assigning technicians, we might need a list of users.
        // We can create a secure function or use profiles table.
        // Falling back to profiles.
        const { data, error } = await supabase.from('profiles').select('*').eq('is_deleted', false).eq('status', 'active');
        if (error) return [];
        return data || [];
    }
};

