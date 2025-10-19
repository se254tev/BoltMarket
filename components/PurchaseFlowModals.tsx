"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Listing } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShoppingCart, Truck, Package, Store } from 'lucide-react';

type Props = {
  listing: Listing | null;
  sellerName: string;
  open: boolean;
  onClose: () => void;
};

export default function PurchaseFlowModals({ listing, sellerName, open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'confirm' | 'delivery'>('confirm');
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express' | 'pickup'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!listing) return null;

  const handleProceedToDelivery = () => {
    setStep('delivery');
  };

  const handleConfirmPurchase = async () => {
    setIsProcessing(true);
    toast.info(`Delivery method selected: ${deliveryMethod}. Redirecting to payment...`);

    // Here you would typically create a transaction record in Supabase
    // and then redirect to your payment/escrow page.
    // For now, we'll simulate with a console log and a delay.

    console.log({
      listingId: listing.id,
      amount: listing.price,
      deliveryMethod,
    });

    setTimeout(() => {
      // Example: router.push(`/checkout?listingId=${listing.id}&delivery=${deliveryMethod}`);
      setIsProcessing(false);
      onClose(); // Close the modal after finishing
    }, 2000);
  };

  const resetAndClose = () => {
    onClose();
    // Reset state after a short delay to allow the modal to close gracefully
    setTimeout(() => {
      setStep('confirm');
      setIsProcessing(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && resetAndClose()}>
      <DialogContent>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Confirm Your Purchase</DialogTitle>
              <DialogDescription>
                You are about to purchase <strong>{listing.title}</strong> from <strong>{sellerName}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center text-2xl font-bold">
              Pay {listing.currency} {listing.price.toLocaleString()}?
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
              <Button onClick={handleProceedToDelivery}>Yes, Proceed</Button>
            </DialogFooter>
          </>
        )}

        {step === 'delivery' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Select Delivery Method</DialogTitle>
              <DialogDescription>Choose how you'd like to receive your item.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup defaultValue="standard" onValueChange={(value: 'standard' | 'express' | 'pickup') => setDeliveryMethod(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="standard" id="standard" />
                  <Label htmlFor="standard" className="flex items-center gap-2 cursor-pointer"><Package className="h-4 w-4" /> Standard Delivery</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="express" id="express" />
                  <Label htmlFor="express" className="flex items-center gap-2 cursor-pointer"><Truck className="h-4 w-4" /> Express Delivery</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer"><Store className="h-4 w-4" /> Pickup from Seller</Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('confirm')}>Back</Button>
              <Button onClick={handleConfirmPurchase} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Confirm & Pay'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}