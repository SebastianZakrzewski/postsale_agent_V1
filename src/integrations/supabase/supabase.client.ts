import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_DB_SCHEMA = 'postsale_agent_evapremium';

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? 'http://localhost:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';
  const schema = process.env.SUPABASE_DB_SCHEMA ?? DEFAULT_DB_SCHEMA;

  return createClient(url, key, {
    db: { schema },
  }) as SupabaseClient;
}
