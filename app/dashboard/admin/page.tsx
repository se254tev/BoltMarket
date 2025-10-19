"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Users, Package, Shield, DollarSign, Activity, Phone } from 'lucide-react';
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type ActivityItem = { id: string; type: string; message: string; timestamp: string; };

export default function AdminDashboardPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ users: 0, listings: 0, escrow: 0, payments: 0 });
  const [flags, setFlags] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [escrowTransactions, setEscrowTransactions] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [liveActivity, setLiveActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/auth/login');
            return;
        }
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (!profile?.is_admin) {
            toast.error("Access Denied");
            router.push('/dashboard/buyer');
        } else {
            setIsAdmin(true);
            fetchDashboardData();
        }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const addActivity = (item: Omit<ActivityItem, 'id'>) => {
      const newItem = { ...item, id: crypto.randomUUID() };
      setLiveActivity(prev => [newItem, ...prev.slice(0, 19)]);
    };

    const channels = [
      supabase.channel('admin-profiles-changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          addActivity({ type: 'success', message: `New user signed up: ${payload.new.full_name || 'New User'}`, timestamp: new Date().toISOString() });
          fetchDashboardData();
        }).subscribe(),
      supabase.channel('admin-listings-changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' },
        (payload) => {
          addActivity({ type: 'info', message: `New listing created: ${payload.new.title}`, timestamp: new Date().toISOString() });
          fetchDashboardData();
        }).subscribe(),
      supabase.channel('admin-escrow-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_transactions' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldData = payload.old as { id?: string };
            addActivity({ type: 'error', message: `Escrow transaction deleted: ${oldData.id?.slice(0, 8) || 'Unknown'}`, timestamp: new Date().toISOString() });
          } else {
            const newData = payload.new as { id: string; status: string };
            addActivity({ type: 'warning', message: `Escrow transaction ${newData.id.slice(0, 8)} updated to ${newData.status}`, timestamp: new Date().toISOString() });
          }
          fetchDashboardData();          
        }).subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    setLoading(true);

    const [usersRes, listingsRes, escrowRes, paymentsRes, flagsRes, allListingsRes, allUsersRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('listings').select('id', { count: 'exact', head: true }),
      supabase.from('escrow_transactions').select('id', { count: 'exact', head: true }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('flags').select('*, listings(title), profiles!flags_reporter_id_fkey(full_name)').eq('resolved', false),
      supabase.from('listings').select('*, profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ]);

    setStats({
      users: usersRes.count || 0,
      listings: listingsRes.count || 0,
      escrow: escrowRes.count || 0,
      payments: recentPayments.length,
    });

    const { data: escrowsWithDetails } = await supabase.from('escrow_transactions').select('*, buyer:buyer_id(full_name), seller:seller_id(full_name)');

    setFlags(flagsRes.data || []);
    setEscrowTransactions(escrowsWithDetails || []);
    setRecentPayments(paymentsRes.data || []);
    setAllListings(allListingsRes.data || []);
    setAllUsers(allUsersRes.data || []);
    setLoading(false);
  };

  const updateEscrowStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('escrow_transactions').update({ status: newStatus }).eq('id', id);
    if (error) toast.error(`Failed to update escrow: ${error.message}`);
    toast.success(`Escrow status updated to ${newStatus}`);
    fetchDashboardData();
  };

  const deleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this listing? This action cannot be undone.')) {
      return;
    }
    const { error } = await supabase.from('listings').delete().eq('id', listingId);
    if (error) toast.error(`Failed to delete listing: ${error.message}`);
    else toast.success('Listing deleted successfully');
    fetchDashboardData();
  }

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', userId);
    if (error) toast.error(`Failed to update user: ${error.message}`);
    else toast.success(`User admin status updated.`);
    fetchDashboardData();
  };

  if (!isAdmin || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  const activityColor = (type: string) => {
    if (type === 'success') return 'text-green-500';
    if (type === 'warning') return 'text-yellow-500';
    return 'text-blue-500';
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.listings}</div>
            <p className="text-xs text-muted-foreground">Across the platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Escrow Transactions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.escrow}</div>
            <p className="text-xs text-muted-foreground">Total secure transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payments}</div>
            <p className="text-xs text-muted-foreground">In the last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="escrow">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="escrow">Escrow</TabsTrigger>
              <TabsTrigger value="listings">Listings</TabsTrigger>
              <TabsTrigger value="sellers">Sellers</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
            </TabsList>

            <TabsContent value="flags" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Flags</CardTitle>
                  <CardDescription>Review and resolve user-reported content.</CardDescription>
                </CardHeader>
                <CardContent>
                  {flags.length > 0 ? flags.map((flag: any) => (
                    <div key={flag.id} className="flex items-center justify-between p-3 border-b">
                      <div>
                        <p><strong>{flag.listings?.title || 'N/A'}</strong> reported by {flag.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{flag.reason}</p>
                      </div>
                      <Button variant="outline" size="sm">Resolve</Button>
                    </div>
                  )) : <p className="text-muted-foreground">No active flags.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="escrow" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escrow Management</CardTitle>
                  <CardDescription>Oversee all escrow transactions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {escrowTransactions.map((tx: any) => (
                    <div key={tx.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">Buyer: {tx.buyer.full_name} | Seller: {tx.seller.full_name}</p>
                          <p className="text-sm">Amount: {tx.currency} {tx.amount.toLocaleString()}</p>
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateEscrowStatus(tx.id, 'funds_held')}>Hold</Button>
                          <Button size="sm" onClick={() => updateEscrowStatus(tx.id, 'completed')}>Release</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="listings" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>All Listings</CardTitle>
                    <CardDescription>Create, view, and remove any listing on the platform.</CardDescription>
                  </div>
                  <Button asChild>
                    <a href="/dashboard/admin/new-listing">Create Listing</a>
                  </Button>
                </CardHeader>
                <CardContent>
                  {allListings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No listings found.</div>
                  ) : (
                    <div className="space-y-4">
                      {allListings.map((listing: any) => (
                        <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-semibold">{listing.title}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Owner: {listing.profiles?.full_name || 'N/A'}</span>
                              <span>Price: {listing.currency} {listing.price.toLocaleString()}</span>
                              <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>{listing.status}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/listing/${listing.id}`)}>View</Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteListing(listing.id)}>Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sellers" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Seller Management</CardTitle>
                  <CardDescription>View and manage all users on the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">{user.full_name || 'Unnamed User'}</p>
                        <p className="text-sm text-muted-foreground">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id={`admin-switch-${user.id}`} checked={user.is_admin} onCheckedChange={() => toggleAdminStatus(user.id, user.is_admin)} />
                          <Label htmlFor={`admin-switch-${user.id}`}>Admin</Label>
                        </div>
                        <Button variant="outline" size="sm">View Details</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Live Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {liveActivity.length > 0 ? liveActivity.map(item => (
                <div key={item.id} className="text-sm">
                  <p className={activityColor(item.type)}>{item.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</p>
                </div>
              )) : <p className="text-muted-foreground text-sm">No recent activity.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                For urgent issues or direct assistance, contact the system manager.
              </p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+254797819571" className="underline">+254797819571</a>
              </div>
              <Button className="w-full" asChild>
                <a href="https://wa.me/254797819571" target="_blank" rel="noopener noreferrer">Contact via WhatsApp</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}