
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'YOUR_SUPABASE_URL_HERE' &&
    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE';

if (!isConfigured) {
    console.warn('Supabase is not configured. Authentication is disabled. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create a mock client if not configured to prevent crash
const createSupabaseClient = () => {
    if (isConfigured) {
        try {
            return createClient(supabaseUrl, supabaseAnonKey);
        } catch (e) {
            console.error('Failed to initialize Supabase client:', e);
        }
    }

    // Fallback Mock Client to prevent app crash
    return {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: async () => ({ error: { message: 'Supabase not configured. Check console.' } }),
            signUp: async () => ({ error: { message: 'Supabase not configured. Check console.' } }),
            signOut: async () => ({ error: null }),
            signInWithOAuth: async () => ({ error: { message: 'Supabase not configured.' } }),
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
                }),
            }),
        }),
    } as any;
};

export const supabase = createSupabaseClient();
