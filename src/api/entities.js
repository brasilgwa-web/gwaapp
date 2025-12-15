import { supabase } from '../lib/supabase';

// Helper to create a standard CRUD adapter for a table
const createAdapter = (tableName) => ({
    list: async (orderBy = 'created_at', limit = 100) => {
        // Handle sorting if string provided like '-visit_date'
        let orderCol = 'created_date';
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

        // Map legacy column names if needed
        if (orderCol === 'visit_date') orderCol = 'visit_date';
        if (orderCol === 'created_at') orderCol = 'created_date';

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

        const { data, error } = await query;
        if (error) {
            console.error(`Error filtering ${tableName}:`, error);
            throw error;
        }
        return data || [];
    }
});

export const Client = createAdapter('clients');
export const Location = createAdapter('locations');
export const Equipment = createAdapter('equipments');
export const TestDefinition = createAdapter('test_definitions');
export const Visit = createAdapter('visits');
export const TestResult = createAdapter('test_results');
export const VisitPhoto = createAdapter('visit_photos');
export const EquipmentTest = createAdapter('equipment_tests');
// V1.1 New Entities
export const Product = createAdapter('products');
export const DosagePlan = createAdapter('dosage_plans');
export const AnalysisGroup = createAdapter('analysis_groups');
export const AnalysisGroupItem = createAdapter('analysis_group_items');
export const ObservationTemplate = createAdapter('observation_templates');
export const ReportSequence = createAdapter('report_sequences');
export const VisitEquipmentSample = createAdapter('visit_equipment_samples');
export const VisitDosage = createAdapter('visit_dosages');
// Helper to get formatted Report Number
export const getNextReportNumber = async () => {
    // This would likely be a server-side function or an RPC, 
    // but for now we might handle it via a direct insert/update logic in the component 
    // or a specialized RPC if we created one. 
    // Leaving as placeholder or manual implementation in the UI for now.
    return null;
};
export const LocationEquipment = createAdapter('location_equipments');

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