-- Cleanup legacy RLS policies and the public.users mirror (idempotent)
-- WARNING: This will DROP the legacy `public.users` table if present. Only run if you intend to rely on auth.users + public.profiles as the source of truth.

DO $$
DECLARE
  p RECORD;
BEGIN
  -- Drop known legacy policies on public.profiles if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    EXECUTE 'DROP POLICY "Users can insert own profile" ON public.profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles are publicly readable') THEN
    EXECUTE 'DROP POLICY "Profiles are publicly readable" ON public.profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile or admin') THEN
    EXECUTE 'DROP POLICY "Users can update own profile or admin" ON public.profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Only admins can delete profiles') THEN
    EXECUTE 'DROP POLICY "Only admins can delete profiles" ON public.profiles';
  END IF;

  -- Drop legacy public.users-related policies/tables if present
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='users') THEN
    -- Drop any named policies attached to public.users
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users' LOOP
      EXECUTE format('DROP POLICY %I ON public.users', p.policyname);
    END LOOP;

    -- Drop the public.users table if it is the legacy mirror
    BEGIN
      EXECUTE 'DROP TABLE IF EXISTS public.users CASCADE';
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not drop public.users: %', SQLERRM;
    END;
  END IF;
END$$;

-- Also attempt to drop any duplicate policies on other tables that commonly cause problems
DO $$
DECLARE
  problematic_policies text[] := ARRAY[
    'Users can create own listings',
    'Active listings are publicly readable'
  ];
  p text;
BEGIN
  FOREACH p IN ARRAY problematic_policies LOOP
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = p) THEN
      EXECUTE format('DROP POLICY %I ON %s', p, (SELECT tablename FROM pg_policies WHERE policyname = p LIMIT 1));
    END IF;
  END LOOP;
END$$;

-- End cleanup migration
