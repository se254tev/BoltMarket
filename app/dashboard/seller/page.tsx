"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Listing, type SellerSubscription, type SubscriptionPlan } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, DollarSign, TrendingUp, Eye } from 'lucide-react';
import { toast } from 'sonner';
import UpgradeModal from '@/components/UpgradeModal';
import Link from 'next/link';

export default function SellerDashboard() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [subscription, setSubscription] = useState<SellerSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, sold: 0, views: 0 });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    } else {
      setUser(user);
      fetchDashboardData(user.id);
    }
  };

  const fetchDashboardData = async (userId: string) => {
    setLoading(true);

    const [listingsRes, subscriptionRes] = await Promise.all([
      supabase.from('listings').select('*').eq('owner', userId).order('created_at', { ascending: false }),
      supabase
        .from('seller_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('seller_id', userId)
        .eq('active', true)
        .maybeSingle(),
    ]);

    const listingsData = listingsRes.data || [];
    setListings(listingsData);

    const totalViews = listingsData.reduce((sum, l) => sum + l.views, 0);
    setStats({
      total: listingsData.length,
      active: listingsData.filter((l) => l.status === 'active').length,
      sold: listingsData.filter((l) => l.status === 'sold').length,
      views: totalViews,
    });

    if (subscriptionRes.data) {
      setSubscription(subscriptionRes.data);
      setPlan(subscriptionRes.data.subscription_plans as unknown as SubscriptionPlan);
    } else {
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('code', 'FREE')
        .maybeSingle();
      setPlan(freePlan);
    }

    setLoading(false);

    const channel = supabase
      .channel('seller-listings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `owner=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setListings((prev) => [payload.new as Listing, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setListings((prev) => prev.map((l) => (l.id === payload.new.id ? (payload.new as Listing) : l)));
          } else if (payload.eventType === 'DELETE') {
            setListings((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const canAddListing = () => {
    if (!plan) return false;
    if (plan.listings_limit === null) return true;
    return listings.length < plan.listings_limit;
  };

  if (!user || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and track performance</p>
        </div>
        <Button size="lg" disabled={!canAddListing()} onClick={() => router.push('/dashboard/seller/new-listing')}>
          <Plus className="mr-2 h-5 w-5" />
          New Listing
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {plan?.listings_limit ? `of ${plan.listings_limit} allowed` : 'Unlimited'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sold}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.views}</div>
            <p className="text-xs text-muted-foreground">Across all listings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>{plan?.name || 'Free Plan'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold">
                {plan?.currency} {plan?.price}/month
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Listings Allowed:</span>
              <span className="font-semibold">{plan?.listings_limit || 'Unlimited'}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setShowUpgrade(true)}>
            Upgrade Plan
          </Button>
        </CardFooter>
      </Card>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        userId={user?.id ?? null}
        onSuccess={async (selectedPlan) => {
          // Optionally refresh subscription from server
          toast.message(`Upgrade initiated to ${selectedPlan.name}.`);
          // Refresh current plan shown in UI
          const { data: freshPlan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('code', selectedPlan.code)
            .maybeSingle();
          if (freshPlan) setPlan(freshPlan as unknown as SubscriptionPlan);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>My Listings</CardTitle>
          <CardDescription>Manage and edit your active listings</CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">You haven't created any listings yet</p>
              <Button onClick={() => router.push('/dashboard/seller/new-listing')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{listing.title}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-bold text-primary">
                        {listing.currency} {listing.price.toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          listing.status === 'active'
                            ? 'default'
                            : listing.status === 'sold'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {listing.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{listing.views} views</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/listing/${listing.id}`)}>
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/seller/edit/${listing.id}`)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
