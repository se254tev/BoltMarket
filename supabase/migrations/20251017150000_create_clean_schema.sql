-- Clean, idempotent schema and RLS migration
-- Purpose: create a robust backend schema that avoids signup FK/RLS races.
-- Run this with the Supabase SQL editor (service role) or psql using service role credentials.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM ('active','sold','expired','archived');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escrow_status') THEN
    CREATE TYPE escrow_status AS ENUM ('pending','funds_held','delivered','completed','disputed','refunded');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('initiated','success','failed','cancelled');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text','system','media');
  END IF;
END$$;

-- Helper function: update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles: key decision - reference auth.users directly to avoid public.users mirror
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone_number varchar(20),
  phone_verified boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  theme varchar(10) DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Listings
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(16,2) NOT NULL CHECK (price >= 0),
  currency varchar(8) NOT NULL DEFAULT 'KES',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  location text,
  contact_phone varchar(20),
  escrow_enabled boolean DEFAULT true,
  status listing_status DEFAULT 'active',
  views integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings(owner);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_id);

-- Listing images
CREATE TABLE IF NOT EXISTS public.listing_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text text,
  rank integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  currency varchar(8) DEFAULT 'KES',
  listings_limit int,
  billing_interval text NOT NULL DEFAULT 'monthly',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seller subscriptions
CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  active boolean DEFAULT true,
  mpesa_tx_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(16,2) NOT NULL CHECK (amount >= 0),
  currency varchar(8) DEFAULT 'KES',
  mpesa_transaction_id text UNIQUE,
  mpesa_checkout_request_id text,
  status payment_status DEFAULT 'initiated',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- M-Pesa callbacks
CREATE TABLE IF NOT EXISTS public.mpesa_callbacks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payload jsonb NOT NULL,
  headers jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz
);

-- Escrow transactions
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(16,2) NOT NULL CHECK (amount >= 0),
  currency varchar(8) DEFAULT 'KES',
  status escrow_status DEFAULT 'pending',
  escrow_fee numeric(10,2) DEFAULT 0,
  payment_ref uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  dispute_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type message_type DEFAULT 'text',
  body text,
  attachments jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Flags
CREATE TABLE IF NOT EXISTS public.flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  reason text,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_table text,
  target_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Attach update triggers where needed
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='listings') THEN
    DROP TRIGGER IF EXISTS set_updated_at_listings ON public.listings;
    CREATE TRIGGER set_updated_at_listings BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='seller_subscriptions') THEN
    DROP TRIGGER IF EXISTS set_updated_at_seller_subscriptions ON public.seller_subscriptions;
    CREATE TRIGGER set_updated_at_seller_subscriptions BEFORE UPDATE ON public.seller_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='payments') THEN
    DROP TRIGGER IF EXISTS set_updated_at_payments ON public.payments;
    CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='escrow_transactions') THEN
    DROP TRIGGER IF EXISTS set_updated_at_escrow ON public.escrow_transactions;
    CREATE TRIGGER set_updated_at_escrow BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='profiles') THEN
    DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
    CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Admin helper: check profiles.is_admin safely
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean STABLE LANGUAGE plpgsql AS $$
DECLARE
  _exists boolean;
  _is_admin boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'profiles'
  ) INTO _exists;

  IF NOT _exists THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_admin, false) INTO _is_admin FROM public.profiles WHERE id = uid;
  RETURN _is_admin;
END;
$$;

-- Trigger: auto-create profile when auth.users gets a new row
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Create profile if missing
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, full_name, phone_number, phone_verified, is_admin, theme, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
      COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
      false,
      false,
      'system',
      now(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END $$;

-- Defensive RLS for core tables (profiles, listings, listing_images, subscription_plans, seller_subscriptions, payments, mpesa_callbacks, escrow_transactions, messages, flags, audit_logs)
-- We'll apply per-table checks and policies idempotently

-- Profiles policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='profiles') THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert own profile') THEN
      EXECUTE E'CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid())';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Profiles are publicly readable') THEN
      EXECUTE E'CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO authenticated USING (true)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update own profile or admin') THEN
      EXECUTE E'CREATE POLICY "Users can update own profile or admin" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()))';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Only admins can delete profiles') THEN
      EXECUTE E'CREATE POLICY "Only admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))';
    END IF;
  END IF;
END$$;

-- Listings policies
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='listings') THEN
    EXECUTE 'ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Active listings are publicly readable') THEN
      EXECUTE E'CREATE POLICY "Active listings are publicly readable" ON public.listings FOR SELECT TO authenticated USING (status = ''active'' OR owner = auth.uid() OR public.is_admin(auth.uid()))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Users can create own listings') THEN
      EXECUTE E'CREATE POLICY "Users can create own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (owner = auth.uid())';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listings' AND policyname='Owners and admins can update listings') THEN
      EXECUTE E'CREATE POLICY "Owners and admins can update listings" ON public.listings FOR UPDATE TO authenticated USING (owner = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (owner = auth.uid() OR public.is_admin(auth.uid()))';
    END IF;
  END IF;
END$$;

-- Listing images policies
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='listing_images') THEN
    EXECUTE 'ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listing_images' AND policyname='Listing images are publicly readable') THEN
      EXECUTE E'CREATE POLICY "Listing images are publicly readable" ON public.listing_images FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_images.listing_id AND (l.status = ''active'' OR l.owner = auth.uid() OR public.is_admin(auth.uid()))))';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='listing_images' AND policyname='Listing owners can add images') THEN
      EXECUTE E'CREATE POLICY "Listing owners can add images" ON public.listing_images FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner = auth.uid()))';
    END IF;
  END IF;
END$$;

-- Subscription plans & seller subscriptions
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='subscription_plans') THEN
    EXECUTE 'ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscription_plans' AND policyname='Subscription plans are publicly readable') THEN
      EXECUTE E'CREATE POLICY "Subscription plans are publicly readable" ON public.subscription_plans FOR SELECT TO authenticated USING (true)';
    END IF;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='seller_subscriptions') THEN
    EXECUTE 'ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seller_subscriptions' AND policyname='Users can view own subscriptions or admin') THEN
      EXECUTE E'CREATE POLICY "Users can view own subscriptions or admin" ON public.seller_subscriptions FOR SELECT TO authenticated USING (seller_id = auth.uid() OR public.is_admin(auth.uid()))';
    END IF;
  END IF;
END$$;

-- Payments
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='payments') THEN
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payments' AND policyname='Users can create own payments') THEN
      EXECUTE E'CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL)';
    END IF;
  END IF;
END$$;

-- Mpesa callbacks (allow insert by service role)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='mpesa_callbacks') THEN
    EXECUTE 'ALTER TABLE public.mpesa_callbacks ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mpesa_callbacks' AND policyname='Service role can insert callbacks') THEN
      EXECUTE E'CREATE POLICY "Service role can insert callbacks" ON public.mpesa_callbacks FOR INSERT WITH CHECK (true)';
    END IF;
  END IF;
END$$;

-- Escrow, messages, flags, audit_logs: create participant/admin policies
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='escrow_transactions') THEN
    EXECUTE 'ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='escrow_transactions' AND policyname='Transaction parties and admins can view escrow') THEN
      EXECUTE E'CREATE POLICY "Transaction parties and admins can view escrow" ON public.escrow_transactions FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin(auth.uid()))';
    END IF;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Participants can view messages') THEN
      EXECUTE E'CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin(auth.uid()))';
    END IF;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='flags') THEN
    EXECUTE 'ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='flags' AND policyname='Users can create flags') THEN
      EXECUTE E'CREATE POLICY "Users can create flags" ON public.flags FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid())';
    END IF;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='audit_logs') THEN
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='Only admins can view audit logs') THEN
      EXECUTE E'CREATE POLICY "Only admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()))';
    END IF;
  END IF;
END$$;

-- End of clean schema migration
