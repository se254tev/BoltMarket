-- Idempotent migration: create delivery_requests table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_requests') THEN
    CREATE TABLE public.delivery_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id uuid NOT NULL,
      buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      method text NOT NULL,
      full_name text,
      phone text,
      address text,
      notes text,
      free_with_escrow boolean DEFAULT false,
      status text DEFAULT 'pending',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS delivery_requests_listing_id_idx ON public.delivery_requests (listing_id);
    CREATE INDEX IF NOT EXISTS delivery_requests_buyer_id_idx ON public.delivery_requests (buyer_id);
  END IF;
END $$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'delivery_requests_set_updated_at'
  ) THEN
    CREATE TRIGGER delivery_requests_set_updated_at
    BEFORE UPDATE ON public.delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
