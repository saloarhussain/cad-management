import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

/**
 * Standard Supabase client for browser-side use.
 * Managed by @supabase/ssr to sync with server-side cookies.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
