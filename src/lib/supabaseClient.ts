import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable resolution for Vite and Node runtimes
const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env)
    ? process.env
    : ({} as Record<string, string | undefined>);

export const DEFAULT_SUPABASE_URL = 'https://tzqdcozwllahqmoqfawt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6cWRjb3p3bGxhaHFtb3FmYXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMTQ2MTIsImV4cCI6MjEwNjY5MDYxMn0.agWGEhP1a95ZkBm95maHM3sioBYZLiLuiyN9hk--IRc';

function getStoredConfig(): { url: string; key: string } {
  if (typeof window !== 'undefined') {
    try {
      const storedUrl = localStorage.getItem('doorbly_supabase_url');
      const storedKey = localStorage.getItem('doorbly_supabase_key');
      // Migrate away from legacy project hosts if previously cached
      if (
        storedUrl &&
        (storedUrl.includes('yvxplcqgvqxzwebhwmoc') || storedUrl.includes('sksqfbugbeoskypjtjxw'))
      ) {
        localStorage.removeItem('doorbly_supabase_url');
        localStorage.removeItem('doorbly_supabase_key');
      } else if (storedUrl && storedKey) {
        return { url: storedUrl.trim(), key: storedKey.trim() };
      }
    } catch {}
  }

  const defaultUrl =
    env.VITE_SUPABASE_URL &&
    !env.VITE_SUPABASE_URL.includes('yvxplcqgvqxzwebhwmoc') &&
    !env.VITE_SUPABASE_URL.includes('sksqfbugbeoskypjtjxw')
      ? env.VITE_SUPABASE_URL.trim()
      : DEFAULT_SUPABASE_URL;

  const defaultKey =
    env.VITE_SUPABASE_ANON_KEY &&
    !env.VITE_SUPABASE_ANON_KEY.startsWith('sb_publishable_tYHlc') &&
    !env.VITE_SUPABASE_ANON_KEY.includes('Nrc3FmYnVnYmVvc2t5cGp0anh3')
      ? env.VITE_SUPABASE_ANON_KEY.trim()
      : DEFAULT_SUPABASE_ANON_KEY;

  return { url: defaultUrl, key: defaultKey };
}

let activeConfig = getStoredConfig();

function buildClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

export let supabase: SupabaseClient = buildClient(activeConfig.url, activeConfig.key);

export function getSupabase(): SupabaseClient {
  return supabase;
}

export function isSupabaseReady(): boolean {
  return !!activeConfig.url && !!activeConfig.key;
}

export function getSupabaseConfig() {
  const isCustom = typeof window !== 'undefined' && !!localStorage.getItem('doorbly_supabase_url');
  return {
    url: activeConfig.url,
    anonKey: activeConfig.key,
    source: isCustom ? ('custom' as const) : ('env' as const)
  };
}

const listeners = new Set<() => void>();

export function saveSupabaseConfig(url: string, anonKey: string): boolean {
  if (!url || !anonKey) return false;
  activeConfig = { url: url.trim(), key: anonKey.trim() };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('doorbly_supabase_url', activeConfig.url);
      localStorage.setItem('doorbly_supabase_key', activeConfig.key);
    } catch {}
  }

  supabase = buildClient(activeConfig.url, activeConfig.key);
  listeners.forEach((l) => l());
  return true;
}

export function resetSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('doorbly_supabase_url');
      localStorage.removeItem('doorbly_supabase_key');
    } catch {}
  }
  activeConfig = getStoredConfig();
  supabase = buildClient(activeConfig.url, activeConfig.key);
  listeners.forEach((l) => l());
}

export function subscribeSupabaseConfigChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Tests live connection to Supabase safely without throwing uncaught exceptions
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const { data: catData, error: catError } = await supabase
      .from('doorbly_service_categories')
      .select('category_name')
      .limit(1);

    if (catError) {
      return {
        success: false,
        message: `Query response: ${catError.message} (Code: ${catError.code || 'UNKNOWN'})`,
        details: catError
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase (tzqdcozwllahqmoqfawt) and queried categories!',
      details: { sample: catData }
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message?.includes('Failed to fetch')
        ? 'Could not reach Supabase host. Please check internet connection or verify project URL.'
        : `Connection test failed: ${err.message || 'Unknown error'}`
    };
  }
}
