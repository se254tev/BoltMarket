import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export type Profile = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  is_admin: boolean;
  theme: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type ListingStatus = 'active' | 'sold' | 'expired' | 'archived';

export type Listing = {
  id: string;
  owner: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category_id: string | null;
  location: string | null;
  escrow_enabled: boolean;
  status: ListingStatus;
  views: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EscrowStatus = 'pending' | 'funds_held' | 'delivered' | 'completed' | 'disputed' | 'refunded';

export type EscrowTransaction = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  escrow_fee: number;
  payment_ref: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentStatus = 'initiated' | 'success' | 'failed' | 'cancelled';

export type Payment = {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  mpesa_transaction_id: string | null;
  mpesa_checkout_request_id: string | null;
  status: PaymentStatus;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type MessageType = 'text' | 'system' | 'media';

export type Message = {
  id: string;
  listing_id: string | null;
  sender_id: string;
  receiver_id: string;
  type: MessageType;
  body: string | null;
  attachments: Record<string, any>;
  read: boolean;
  created_at: string;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  listings_limit: number | null;
  billing_interval: string;
  created_at: string;
};

export type SellerSubscription = {
  id: string;
  seller_id: string;
  plan_id: string;
  started_at: string;
  expires_at: string | null;
  active: boolean;
  mpesa_tx_id: string | null;
  created_at: string;
  updated_at: string;
};
