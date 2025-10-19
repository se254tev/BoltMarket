"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Props = {
  listingId: string;
  escrowEnabled: boolean;
};

export default function DeliveryOptions({ listingId, escrowEnabled }: Props) {
  const [method, setMethod] = useState<'contact' | 'platform'>('contact');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  function validate() {
    if (method === 'platform') {
      if (!fullName.trim()) {
        toast.error('Full name is required for platform delivery');
        return false;
      }
      if (!phone.trim()) {
        toast.error('Contact phone is required for platform delivery');
        return false;
      }
      if (!address.trim()) {
        toast.error('Delivery address is required for platform delivery');
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    const payload = {
      listingId,
      method,
      fullName: fullName.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      freeWithEscrow: escrowEnabled,
      savedAt: new Date().toISOString(),
    };

    // POST to server API to create a delivery request. The API will validate and persist.
    try {
      const res = await fetch('/api/delivery-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Delivery API error', body);
        toast.error(body?.error || 'Could not save delivery preference');
        return;
      }

      toast.success('Delivery preference saved. The seller will be notified.');
    } catch (e) {
      console.error('Could not save delivery preference', e);
      toast.error('Could not save delivery preference');
    }
  };

  return (
    <div className="mt-6 border rounded p-4">
      <h3 className="text-lg font-semibold mb-2">Delivery</h3>
      <p className="text-sm text-muted-foreground mb-3">Choose how you want to receive this item.</p>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="delivery"
            checked={method === 'contact'}
            onChange={() => setMethod('contact')}
            className="scale-105"
          />
          <div>
            <div className="font-medium">Contact seller directly</div>
            <div className="text-xs text-muted-foreground">Arrange pickup/delivery directly with the seller.</div>
          </div>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="delivery"
            checked={method === 'platform'}
            onChange={() => setMethod('platform')}
            className="scale-105"
          />
          <div>
            <div className="font-medium">Platform delivery service</div>
            <div className="text-xs text-muted-foreground">Cost depends on location. Free delivery if you pay using escrow.</div>
          </div>
        </label>
      </div>

      {method === 'platform' && (
        <div className="mt-4 space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Recipient full name" />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2547XXXXXXXX" />
          </div>
          <div>
            <Label>Delivery address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, county, street or pickup point" />
          </div>
          <div>
            <Label>Additional notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any directions or preferences" />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button onClick={handleSave}>Save delivery preference</Button>
        <Button variant="ghost" onClick={() => {
          setMethod('contact'); setFullName(''); setPhone(''); setAddress(''); setNotes('');
        }}>Reset</Button>
      </div>
    </div>
  );
}
