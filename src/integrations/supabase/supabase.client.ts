import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? 'http://localhost:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';
  return createClient(url, key);
}
