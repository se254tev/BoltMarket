"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Listing } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import DeliveryOptions from '@/components/DeliveryOptions';

type Props = {
  listingId: string;
};

export default function ListingClient({ listingId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [seller, setSeller] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: listingData, error: listingErr } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .maybeSingle();

        if (listingErr) {
          console.error('Listing fetch error:', listingErr);
          setError('Unable to load listing');
          setLoading(false);
          return;
        }

        if (!listingData) {
          setError('Listing not found');
          setLoading(false);
          return;
        }

        setListing(listingData as Listing);

        const { data: imagesData } = await supabase.from('listing_images').select('*').eq('listing_id', listingId).order('rank');
        setImages(imagesData || []);

        const { data: sellerData } = await supabase.from('profiles').select('*').eq('id', listingData.owner).maybeSingle();
        setSeller(sellerData || null);
      } catch (err) {
        console.error(err);
        setError('Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [listingId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error ?? 'Listing not found'}</p>
            <div className="mt-4">
              <Button onClick={() => router.back()}>Go back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{listing.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-3xl font-bold">{listing.currency} {listing.price.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{listing.location}</p>
              </div>

              {images && images.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {images.map((img: any) => (
                    <div key={img.id} className="w-full bg-muted rounded overflow-hidden">
                      <div className="w-full" style={{ aspectRatio: '4 / 3' }}>
                        <img src={supabase.storage.from('listing-images').getPublicUrl(img.storage_path).data.publicUrl} alt={img.alt_text || listing.title} className="object-cover w-full h-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full bg-muted rounded mb-4 flex items-center justify-center" style={{ aspectRatio: '4 / 3' }}>No images</div>
              )}

              <div className="prose">
                <p>{listing.description}</p>
              </div>

              <div className="mt-4">
                <DeliveryOptions listingId={listing.id} escrowEnabled={!!listing.escrow_enabled} />
              </div>

              <div className="mt-6">
                {listing.escrow_enabled && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" /> Escrow Protected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Seller</h3>
              {seller ? (
                <div className="space-y-2">
                  <p className="font-medium">{seller.full_name || 'Seller'}</p>
                  {seller.phone_number && (
                    <p className="text-sm">Phone: <a href={`tel:${seller.phone_number}`}>{seller.phone_number}</a></p>
                  )}
                  <p className="text-xs text-muted-foreground">Member since: {new Date(seller.created_at).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Seller information not available</p>
              )}

              <div className="mt-4">
                <Button asChild>
                  <a href={`tel:${seller?.phone_number || ''}`}>Call Seller</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
