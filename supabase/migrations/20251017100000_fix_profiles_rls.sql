-- Idempotent RLS migration for public.profiles
-- Ensures safe policies exist so client-side profile creation is allowed for authenticated users.
-- Run this migration in the Supabase SQL editor (service role) or via psql with service role.

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='profiles') THEN

    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';

    -- Create INSERT policy: users may insert their own profile
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert own profile'
    ) THEN
      EXECUTE E'
        CREATE POLICY "Users can insert own profile"
        ON public.profiles
        FOR INSERT
        TO authenticated
        WITH CHECK (id = auth.uid())
      ';
    END IF;

    -- Create SELECT policy: allow authenticated users to read profiles (publicly readable minimal)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles are publicly readable'
    ) THEN
      EXECUTE E'
        CREATE POLICY "Profiles are publicly readable"
        ON public.profiles FOR SELECT
        TO authenticated
        USING (true)
      ';
    END IF;

    -- Create UPDATE policy: owners or admins can update
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile or admin'
    ) THEN
      EXECUTE E'
        CREATE POLICY "Users can update own profile or admin"
        ON public.profiles FOR UPDATE
        TO authenticated
        USING (id = auth.uid() OR public.is_admin(auth.uid()))
        WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()))
      ';
    END IF;

    -- Create DELETE policy: only admins
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Only admins can delete profiles'
    ) THEN
      EXECUTE E'
        CREATE POLICY "Only admins can delete profiles"
        ON public.profiles FOR DELETE
        TO authenticated
        USING (public.is_admin(auth.uid()))
      ';
    END IF;

  END IF;
END$$;

-- End of migration
