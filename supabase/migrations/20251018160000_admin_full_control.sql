-- Enable full admin control for listings
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='listings') THEN
    -- Allow admins to insert listings for any user
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Admins can insert any listing') THEN
      EXECUTE E'CREATE POLICY "Admins can insert any listing" ON public.listings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
    -- Allow admins to delete any listing
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Admins can delete any listing') THEN
      EXECUTE E'CREATE POLICY "Admins can delete any listing" ON public.listings FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))';
    END IF;
  END IF;
END$$;

-- You can run this migration in Supabase SQL editor or as a migration file.