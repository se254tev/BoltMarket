-- Idempotent RLS fix for public.listings
-- Run with service role (Supabase SQL editor or psql / run_sql.js)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='listings') THEN

    -- Enable RLS
    EXECUTE 'ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY';

    -- INSERT: owners may create listings (owner must equal auth.uid())
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Users can create own listings') THEN
      EXECUTE E'
        CREATE POLICY "Users can create own listings"
        ON public.listings
        FOR INSERT
        TO authenticated
        WITH CHECK (owner = auth.uid())
      ';
    END IF;

    -- SELECT: active listings publicly readable, owners and admins can read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Active listings are publicly readable') THEN
      EXECUTE E'
        CREATE POLICY "Active listings are publicly readable"
        ON public.listings
        FOR SELECT
        TO authenticated
        USING (status = ''active'' OR owner = auth.uid() OR public.is_admin(auth.uid()))
      ';
    END IF;

    -- UPDATE: owners or admins can update listings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Owners and admins can update listings') THEN
      EXECUTE E'
        CREATE POLICY "Owners and admins can update listings"
        ON public.listings
        FOR UPDATE
        TO authenticated
        USING (owner = auth.uid() OR public.is_admin(auth.uid()))
        WITH CHECK (owner = auth.uid() OR public.is_admin(auth.uid()))
      ';
    END IF;

  END IF;
END$$;

-- End of migration
