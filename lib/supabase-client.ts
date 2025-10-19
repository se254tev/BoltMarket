import { createClient } from '@supabase/supabase-js';
import type {
  Profile,
  Category,
  Listing,
  EscrowTransaction,
  Payment,
  Message,
  SubscriptionPlan,
  SellerSubscription
} from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client is intended for use in client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Re-export types for convenience
export type {
  Profile, Category, Listing, EscrowTransaction, Payment, Message, SubscriptionPlan, SellerSubscription
};