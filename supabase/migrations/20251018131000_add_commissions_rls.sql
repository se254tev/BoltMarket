-- Idempotent migration: enable RLS and add policies for escrow_commissions and applied_commissions
DO $$
BEGIN
  -- escrow_commissions: allow public read, only admins may create/modify/delete
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_commissions') THEN
    -- enable RLS
    EXECUTE 'ALTER TABLE public.escrow_commissions ENABLE ROW LEVEL SECURITY';

    -- public read (authenticated users can read commission rates)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'escrow_commissions_public_select') THEN
      EXECUTE 'CREATE POLICY escrow_commissions_public_select ON public.escrow_commissions FOR SELECT TO authenticated USING (true)';
    END IF;

    -- only admins may insert
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'escrow_commissions_admin_insert') THEN
      EXECUTE 'CREATE POLICY escrow_commissions_admin_insert ON public.escrow_commissions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))';
    END IF;

    -- only admins may update
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'escrow_commissions_admin_update') THEN
      EXECUTE 'CREATE POLICY escrow_commissions_admin_update ON public.escrow_commissions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;

    -- only admins may delete
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'escrow_commissions_admin_delete') THEN
      EXECUTE 'CREATE POLICY escrow_commissions_admin_delete ON public.escrow_commissions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))';
    END IF;
  END IF;

  -- applied_commissions: participants (buyer/seller) and admins can read; inserts/updates/deletes restricted to admins/service role
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applied_commissions') THEN
    EXECUTE 'ALTER TABLE public.applied_commissions ENABLE ROW LEVEL SECURITY';

    -- participants and admins can select
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applied_commissions_participant_select') THEN
      EXECUTE $policy$
        CREATE POLICY applied_commissions_participant_select ON public.applied_commissions
        FOR SELECT TO authenticated
        USING (seller_id = auth.uid() OR buyer_id = auth.uid() OR public.is_admin(auth.uid()));
      $policy$;
    END IF;

    -- admins may insert (service role can always insert)
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applied_commissions_admin_insert') THEN
      EXECUTE 'CREATE POLICY applied_commissions_admin_insert ON public.applied_commissions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))';
    END IF;

    -- admins may update
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applied_commissions_admin_update') THEN
      EXECUTE 'CREATE POLICY applied_commissions_admin_update ON public.applied_commissions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;

    -- admins may delete
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'applied_commissions_admin_delete') THEN
      EXECUTE 'CREATE POLICY applied_commissions_admin_delete ON public.applied_commissions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))';
    END IF;
  END IF;
END $$;
