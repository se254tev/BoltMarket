"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Listing, type Category } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,

} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Search, MapPin, Eye, Shield } from 'lucide-react';
import PurchaseFlowModals from '@/components/PurchaseFlowModals';
import { toast } from "sonner";

type ListingWithSeller = Listing & { profiles: { full_name: string } | null };

export default function BuyerDashboard() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<ListingWithSeller | null>(null);

  useEffect(() => {
    checkAuth();
    fetchCategories();
    fetchListings();

    const channel = supabase
      .channel('listings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
        // For simplicity, we just refetch on changes. A more optimized approach would be to merge the new data.
        if (payload.eventType === 'INSERT') {
          toast.success('New listing added!');
        }
        fetchListings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
    } else {
      setUser(user);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  };

  const fetchListings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*, profiles(full_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setListings((data as ListingWithSeller[]) || []);
    setLoading(false);
  };

  const handleBuyNowClick = (listing: ListingWithSeller) => {
    if (!user) return router.push('/auth/login');
    setSelectedListing(listing);
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || listing.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Listings</h1>
        <p className="text-muted-foreground">Discover goods and services with secure escrow protection</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No listings found. Try adjusting your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-1">{listing.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold text-primary">
                  {listing.currency} {listing.price.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {listing.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{listing.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{listing.views} views</span>
                  </div>
                </div>
                {listing.escrow_enabled && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" /> Escrow Protected
                  </Badge>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/listing/${listing.id}`)}>
                  View Details
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleBuyNowClick(listing)}>
                  Buy Now
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <PurchaseFlowModals
        listing={selectedListing}
        sellerName={selectedListing?.profiles?.full_name || 'the seller'}
        open={!!selectedListing}
        onClose={() => setSelectedListing(null)}
      />
    </div>
  );
}