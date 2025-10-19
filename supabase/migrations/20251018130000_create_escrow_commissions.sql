-- Idempotent migration to create tables for escrow commissions and applied commissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_commissions') THEN
    CREATE TABLE public.escrow_commissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      description text,
      min_amount numeric(12,2) DEFAULT 0,
      max_amount numeric(12,2),
      rate numeric(5,4) NOT NULL, -- fraction (e.g., 0.025 = 2.5%)
      fixed_amount numeric(12,2) DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applied_commissions') THEN
    CREATE TABLE public.applied_commissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      escrow_commission_id uuid REFERENCES public.escrow_commissions(id) ON DELETE SET NULL,
      listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
      payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
      seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      amount numeric(12,2) NOT NULL,
      rate numeric(5,4) NOT NULL,
      fixed_amount numeric(12,2) DEFAULT 0,
      description text,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Trigger to update updated_at on escrow_commissions
CREATE OR REPLACE FUNCTION public.set_updated_at_commissions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'escrow_commissions_set_updated_at') THEN
    CREATE TRIGGER escrow_commissions_set_updated_at
    BEFORE UPDATE ON public.escrow_commissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_commissions();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS applied_commissions_listing_idx ON public.applied_commissions (listing_id);
CREATE INDEX IF NOT EXISTS applied_commissions_payment_idx ON public.applied_commissions (payment_id);
CREATE INDEX IF NOT EXISTS applied_commissions_seller_idx ON public.applied_commissions (seller_id);
