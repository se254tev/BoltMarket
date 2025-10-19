import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GuidelinesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Community Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Welcome to Bolt Marketplace. Our community thrives when members act with respect,
              transparency, and a commitment to secure trading. Please follow these guidelines to
              keep the platform safe and reliable for everyone.
            </p>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Respectful behaviour</h3>
              <p className="text-sm text-muted-foreground">Treat other users courteously. No hate speech, harassment, or discriminatory language. Be clear and honest about items and conditions.</p>
            </section>

            <section className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Transparency</h3>
              <p className="text-sm text-muted-foreground">Provide accurate descriptions, photos, and contact details. Do not misrepresent items or attempt to defraud other users.</p>
            </section>

            <section className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Secure trading</h3>
              <p className="text-sm text-muted-foreground">Use the platform's escrow service for payments when available. Avoid off-platform transactions that offer no buyer protection.</p>
            </section>

            {/* Payment and Delivery Guidelines */}
            <section className="space-y-3 mt-6">
              <h3 className="text-lg font-semibold">Payment Options</h3>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>Escrow Payment:</strong> Funds are securely held until the buyer confirms receipt of the item in good condition.
                </li>
                <li>
                  <strong>Direct Contact:</strong> Buyers may choose to contact the seller directly to complete the transaction outside escrow.
                </li>
              </ul>
            </section>

            <section className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Delivery Management</h3>
              <p className="text-sm text-muted-foreground">
                If the buyer chooses not to pay using escrow, system managers will select the most suitable delivery service and notify the buyer. Delivery fees will depend on the buyer’s geographic location, and current shipping rates will apply.
              </p>
            </section>

            <section className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Courier Options</h3>
              <p className="text-sm text-muted-foreground">
                Deliveries may be handled through G4S, Fargo, or other approved courier services. Buyers who choose these options will be responsible for any applicable delivery charges.
              </p>
            </section>

            <section className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Bolt Delivery Agents</h3>
              <p className="text-sm text-muted-foreground">
                If the buyer is located near one of Bolt’s delivery agents, the delivery cost will be minimal — starting from KSh 50, depending on the type and size of the item.
              </p>
            </section>

            <section className="space-y-3 mt-4">
              <h3 className="text-lg font-semibold">Contact Support</h3>
              <p className="text-sm text-muted-foreground">
                For assistance or special delivery arrangements, buyers can contact the Bolt system managers directly:
              </p>
              <ul className="list-none pl-0 text-sm text-muted-foreground">
                <li>📞 Phone: <a href="tel:+254797819571" className="underline">+254797819571</a></li>
                <li>💬 WhatsApp: <a href="https://wa.me/254797819571" className="underline" target="_blank" rel="noopener noreferrer">+254797819571</a></li>
              </ul>
            </section>

            {/* Existing Escrow Payment Commission Rates section follows */}
            <section className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Escrow Payment Commission Rates</h3>

              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Transaction Type</th>
                      <th className="py-2 pr-4">Commission Rate</th>
                      <th className="py-2">Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-3 pr-4">🛍️ <strong>Standard Escrow Sale</strong></td>
                      <td className="py-3 pr-4"><strong>2.5% - 3%</strong> of total amount</td>
                      <td className="py-3">Low enough to attract sellers, yet sustainable for platform growth.</td>
                    </tr>

                    <tr>
                      <td className="py-3 pr-4">⚡ <strong>High-Value Transactions (KES 10,000+)</strong></td>
                      <td className="py-3 pr-4"><strong>1.5% - 2%</strong></td>
                      <td className="py-3">Encourage large transactions while maintaining platform trust.</td>
                    </tr>

                    <tr>
                      <td className="py-3 pr-4">🧾 <strong>Dispute Handling Fee (optional)</strong></td>
                      <td className="py-3 pr-4"><strong>KES 50 fixed</strong> (only if dispute occurs)</td>
                      <td className="py-3">Covers admin time and escrow resolution overhead.</td>
                    </tr>

                    <tr>
                      <td className="py-3 pr-4">🪙 <strong>Subscription Upgrade Payments</strong></td>
                      <td className="py-3 pr-4"><strong>0%</strong></td>
                      <td className="py-3">Sellers already pay subscription — no need for extra commission.</td>
                    </tr>

                    <tr>
                      <td className="py-3 pr-4">💸 <strong>Escrow Refunds</strong></td>
                      <td className="py-3 pr-4"><strong>0% fee on refunds</strong></td>
                      <td className="py-3">Builds user trust; platform only earns on successful sales.</td>
                    </tr>

                    <tr>
                      <td className="py-3 pr-4">👮 <strong>Admin Settlement/Manual Release</strong></td>
                      <td className="py-3 pr-4"><strong>KES 30 service charge</strong> (optional)</td>
                      <td className="py-3">Only when admin manually resolves escrow release.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Subscription Plans</h3>
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Listings</th>
                      <th className="py-2">Billing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-3 pr-4">Free</td>
                      <td className="py-3 pr-4">KES 0</td>
                      <td className="py-3 pr-4">5</td>
                      <td className="py-3">Forever</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Extra 5</td>
                      <td className="py-3 pr-4">KES 20</td>
                      <td className="py-3 pr-4">10</td>
                      <td className="py-3">One-time</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Unlimited</td>
                      <td className="py-3 pr-4">KES 50</td>
                      <td className="py-3 pr-4">∞</td>
                      <td className="py-3">Monthly</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground mt-3">Payment via M-Pesa with instant activation.</p>
            </section>

            <div className="mt-6 text-sm">
              <p>By using this platform, you agree to abide by these guidelines.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
