import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Important: Use the SERVICE_ROLE_KEY for server-side operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client is for server-side use ONLY (API routes, server components, etc.)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});