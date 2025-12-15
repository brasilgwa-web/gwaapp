import { supabase } from '../lib/supabase';

// Helper to create a standard CRUD adapter for a table
const createAdapter = (tableName, defaultSortField = 'created_at') => ({
    list: async (orderBy = defaultSortField, limit = 100) => {
        // Handle sorting if string provided like '-visit_date'
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

        // Standardize default sorting if passed explicitly as 'created_at' but table uses 'created_date'
        if (orderCol === 'created_at' && defaultSortField === 'created_date') {
            orderCol = 'created_date';
        }

        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order(orderCol, { ascending })
            .limit(limit);

        if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            throw error;
        }
        return data || [];
    },

    create: async (data) => {
        // Remove 'id' if present to let DB generate it (uuid)
        const { id, ...payload } = data;
        const { data: created, error } = await supabase
            .from(tableName)
            .insert([payload])
            .select() // Needed to return the object
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
    filter: async (criteria = {}, orderBy, limit = 100) => {
        let query = supabase.from(tableName).select('*');

        Object.entries(criteria).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        if (limit) query = query.limit(limit);

        // Simple sort if needed, strictly defaulting to created_at if not specified might be risky if column missing,
        // but typically filter() usage in this app doesn't rely heavily on implicit sort.
        // We will skip explicit sort unless passed to avoid "column does not exist" errors in filter too.

        const { data, error } = await query;
        if (error) {
            console.error(`Error filtering ${tableName}:`, error);
            throw error;
        }
        return data || [];
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
export const DosagePlan = createAdapter('dosage_plans', 'created_at');
export const AnalysisGroup = createAdapter('analysis_groups', 'created_at');
export const AnalysisGroupItem = createAdapter('analysis_group_items', 'created_at');
export const ObservationTemplate = createAdapter('observation_templates', 'created_at');
export const ReportSequence = createAdapter('report_sequences', 'created_at');
export const VisitEquipmentSample = createAdapter('visit_equipment_samples', 'created_at');
export const VisitDosage = createAdapter('visit_dosages', 'created_at');
export const LocationEquipment = createAdapter('location_equipments', 'created_at');

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
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) return [];
        return data || [];
    }
};