-- Idempotent migration: add foreign key constraints for delivery_requests and applied_commissions
DO $$
BEGIN
  -- delivery_requests.listing_id -> public.listings(id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'delivery_requests_listing_id_fkey') THEN
      ALTER TABLE public.delivery_requests
      ADD CONSTRAINT delivery_requests_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
    END IF;

    -- ensure index on listing_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'delivery_requests' AND indexname = 'delivery_requests_listing_id_idx') THEN
      CREATE INDEX delivery_requests_listing_id_idx ON public.delivery_requests(listing_id);
    END IF;
  END IF;

  -- applied_commissions foreign key checks/creation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applied_commissions') THEN
    -- escrow_commission_id -> escrow_commissions(id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applied_commissions_escrow_commission_id_fkey') THEN
      ALTER TABLE public.applied_commissions
      ADD CONSTRAINT applied_commissions_escrow_commission_id_fkey
      FOREIGN KEY (escrow_commission_id) REFERENCES public.escrow_commissions(id) ON DELETE SET NULL;
    END IF;

    -- listing_id -> listings(id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applied_commissions_listing_id_fkey') THEN
      ALTER TABLE public.applied_commissions
      ADD CONSTRAINT applied_commissions_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;
    END IF;

    -- payment_id -> payments(id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applied_commissions_payment_id_fkey') THEN
      ALTER TABLE public.applied_commissions
      ADD CONSTRAINT applied_commissions_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
    END IF;

    -- seller_id -> auth.users(id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applied_commissions_seller_id_fkey') THEN
      ALTER TABLE public.applied_commissions
      ADD CONSTRAINT applied_commissions_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- buyer_id -> auth.users(id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applied_commissions_buyer_id_fkey') THEN
      ALTER TABLE public.applied_commissions
      ADD CONSTRAINT applied_commissions_buyer_id_fkey
      FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- ensure indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'applied_commissions' AND indexname = 'applied_commissions_listing_idx') THEN
      CREATE INDEX applied_commissions_listing_idx ON public.applied_commissions(listing_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'applied_commissions' AND indexname = 'applied_commissions_payment_idx') THEN
      CREATE INDEX applied_commissions_payment_idx ON public.applied_commissions(payment_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'applied_commissions' AND indexname = 'applied_commissions_seller_idx') THEN
      CREATE INDEX applied_commissions_seller_idx ON public.applied_commissions(seller_id);
    END IF;
  END IF;
END $$;
