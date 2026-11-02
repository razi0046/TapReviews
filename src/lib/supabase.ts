import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read credentials strictly from environment variables
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabasePublishableKey =
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY');

let cachedClient: SupabaseClient | null = null;

/**
 * Returns true if both VITE_SUPABASE_URL and Supabase key are set.
 */
export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl || getEnvVar('VITE_SUPABASE_URL');
  const key =
    supabasePublishableKey ||
    getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('VITE_SUPABASE_ANON_KEY');
  return Boolean(url && key);
}

/**
 * Creates and returns one browser-safe Supabase client from VITE_SUPABASE_URL
 * and VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY.
 */
export function getSupabase(): SupabaseClient | null {
  const url = supabaseUrl || getEnvVar('VITE_SUPABASE_URL');
  const key =
    supabasePublishableKey ||
    getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Safe config reader for UI status check without localStorage
 */
export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: supabaseUrl,
    anonKey: supabasePublishableKey,
  };
}

/**
 * Disallowed localStorage override: no-op per security requirements
 */
export function setStoredSupabaseConfig(_url?: string, _anonKey?: string): void {
  // No-op: credentials must only come from environment variables
}

/**
 * Test connectivity using the configured client
 */
export async function testSupabaseConnection(
  _url?: string,
  _anonKey?: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials are not configured in environment variables.',
    };
  }
  try {
    const { error } = await client.from('businesses').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase! (Note: tables not yet created, run supabase-schema.sql in SQL editor)',
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Connected successfully to Supabase!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection failed' };
  }
}
