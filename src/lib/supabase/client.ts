import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './config';

let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return null;
  }
  if (!cachedBrowserClient) {
    cachedBrowserClient = createBrowserClient(url, anonKey);
  }
  return cachedBrowserClient;
}
