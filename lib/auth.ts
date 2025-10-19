import { supabase } from './supabase';

// Module-scoped helper to avoid declaring functions inside blocks (TS1252)
const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  if (data.user) {
    // Wait briefly for the DB trigger (auth.users -> public.profiles) to run and create the
    // profile. This avoids an immediate client-side insert which is racey with RLS.
    const userId = data.user.id;

  // existing module-scoped `sleep` is used here

    // Poll for the profile up to N times
    const maxAttempts = 6;
    const delayMs = 500;
    let profileFound = null as any;
    for (let i = 0; i < maxAttempts; i++) {
      const { data: p, error: pErr } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (pErr) {
        // If select fails due to RLS/session not ready, wait and retry
        await sleep(delayMs);
        continue;
      }
      if (p) {
        profileFound = p;
        break;
      }
      await sleep(delayMs);
    }

    if (!profileFound) {
      // As a last resort try inserting the profile client-side. This is guarded against
      // unique-violation (duplicate key) and surfaces other DB errors.
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: fullName,
        phone_verified: false,
        is_admin: false,
        theme: 'system',
      });

      if (profileError) {
        const msg = profileError.message || '';
        const code = (profileError as any).code || '';
        if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
          // benign: profile was inserted concurrently
        } else if (/row-level security|violates row-level security|policy for table "profiles"/i.test(msg)) {
          // RLS blocked the client-side insert. This can happen immediately after signup
          // because the session or policies may not be applied yet. The DB trigger
          // (auth.users -> public.profiles) or backfill should create the profile soon.
          // Log and continue instead of surfacing a hard error to the UI.
          // eslint-disable-next-line no-console
          console.warn('Profile insert blocked by RLS; continuing and awaiting trigger/backfill to create profile. DB message:', msg);
        } else {
          // Log the detailed DB error server-side for diagnostics but throw a generic error
          console.error('Profile insert error details:', profileError);
          throw new Error('Failed to create user profile. Please contact support if this persists.');
        }
      }
    }
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<{
  full_name: string;
  phone_number: string;
  phone_verified: boolean;
  theme: 'light' | 'dark' | 'system';
}>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
