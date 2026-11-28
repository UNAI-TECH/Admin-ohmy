import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Admin] Supabase URL or Anon Key is missing from environment variables.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Disable navigator.locks to avoid 5000ms lock contention across concurrent admin queries
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn();
      },
    },
  }
);
