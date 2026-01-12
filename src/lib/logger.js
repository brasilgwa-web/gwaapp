import { supabase } from './supabase';

/**
 * Service to handle system logging to Supabase.
 * Uses fire-and-forget pattern to avoid blocking UI.
 */
export const Logger = {
    /**
     * Log an informational message.
     * @param {string} category - Category of the log (e.g., 'AI', 'USER_ACTION')
     * @param {string} message - Human readable message
     * @param {object} [details] - Optional JSON details
     */
    info: (category, message, details = {}) => {
        logToDb('info', category, message, details);
    },

    /**
     * Log a warning.
     * @param {string} category 
     * @param {string} message 
     * @param {object} [details] 
     */
    warn: (category, message, details = {}) => {
        logToDb('warn', category, message, details);
    },

    /**
     * Log an error.
     * @param {string} category 
     * @param {string} message 
     * @param {object|Error} [error] - Error object or details
     */
    error: (category, message, error = {}) => {
        const errorDetails = error instanceof Error
            ? { message: error.message, stack: error.stack, name: error.name }
            : error;

        logToDb('error', category, message, errorDetails);
    }
};

/**
 * Internal function to write to DB.
 * Is not awaited to prevent blocking.
 */
async function logToDb(level, category, message, details) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Fire and forget - we don't await this promise in the calling code
        const { error } = await supabase
            .from('system_logs')
            .insert({
                level,
                category,
                message,
                details,
                user_id: user?.id || null
            });

        if (error) {
            console.warn('[Logger] Failed to write log to DB:', error);
        }
    } catch (e) {
        console.warn('[Logger] Unexpected error writing log:', e);
    }
}
