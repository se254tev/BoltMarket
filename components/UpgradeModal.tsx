"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Plan = {
  code: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
};

export default function UpgradeModal({
  open,
  onClose,
  userId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onSuccess?: (plan: Plan) => void;
}) {
  const plans: Plan[] = [
    { code: "FREE", name: "Free", price: 0, currency: "KES", features: ["Basic listing", "Community support"] },
    { code: "STANDARD", name: "Standard", price: 20, currency: "KES", features: ["25 listings", "Priority support"] },
    { code: "PREMIUM", name: "Premium", price: 50, currency: "KES", features: ["Unlimited listings", "Featured placement"] },
  ];

  const [selected, setSelected] = useState<Plan | null>(plans[0]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePhone = (p: string) => {
    // Expect 2547xxxxxxxx
    return /^2547\d{8}$/.test(p);
  };

  const handlePay = async () => {
    if (!selected) return;
    if (!validatePhone(phone)) {
      toast.error("Enter phone in 2547XXXXXXXX format");
      return;
    }
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: selected.price, phone, userId, planCode: selected.code }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to initiate payment");
        setLoading(false);
        return;
      }

      toast.success(data?.message || "Payment initiated. Complete on your phone.");

      // Optimistically update UI
      onSuccess?.(selected);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error initiating payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade Plan</DialogTitle>
          <DialogDescription>Select a subscription plan and pay via M-Pesa</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.code}
                className={`border rounded-lg p-4 cursor-pointer ${selected?.code === p.code ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelected(p)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">{p.features[0]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{p.currency} {p.price}</div>
                    <div className="text-xs text-muted-foreground">/month</div>
                  </div>
                </div>
                <ul className="mt-3 text-sm text-muted-foreground">
                  {p.features.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm text-muted-foreground mb-1">M-Pesa Phone</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={loading}>
            {loading ? "Processing..." : `Pay ${selected?.currency} ${selected?.price}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
