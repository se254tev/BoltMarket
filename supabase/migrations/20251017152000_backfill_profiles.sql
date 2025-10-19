-- Backfill profiles from auth.users
-- Run with service role credentials in Supabase SQL editor or psql

DO $$
BEGIN
  -- If profiles table doesn't exist, abort safely
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='profiles') THEN
    RAISE NOTICE 'public.profiles table not found. Skipping backfill.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number, phone_verified, is_admin, theme, created_at, updated_at)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', NULL),
    COALESCE(u.raw_user_meta_data->>'phone_number', NULL),
    false,
    false,
    'system',
    COALESCE(u.created_at, now()),
    now()
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

  RAISE NOTICE 'Backfill complete.';
END$$;
