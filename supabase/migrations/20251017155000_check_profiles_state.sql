-- Diagnostic checks for profiles/signup state
-- Run with service-role connection string or in Supabase SQL editor.

-- 1) List trigger(s) named on_auth_user_created
SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 2) Show trigger function definition (if exists)
SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
WHERE p.proname = 'handle_new_auth_user';

-- 3) List RLS policies for public.profiles
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='profiles';

-- 4) Show columns of public.profiles
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;

-- 5) Show latest 10 auth.users and corresponding profiles rows (join)
SELECT u.id, u.email, u.created_at AS auth_created_at, p.created_at AS profile_created_at, p.email AS profile_email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;
