import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Zap, MessageCircle, TrendingUp, Lock, Smartphone } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="py-20 px-4 md:py-32 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Trade Securely with <span className="text-primary">Escrow Protection</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Buy and sell goods and services with confidence. Real-time updates, secure escrow transactions, and M-Pesa payments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Bolt?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full w-fit">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Secure Escrow</h3>
                <p className="text-muted-foreground">
                  Funds held safely until both parties confirm transaction completion. Full buyer and seller protection.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full w-fit">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Real-Time Updates</h3>
                <p className="text-muted-foreground">
                  See new listings instantly. Chat, escrow status, and payment confirmations update live.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full w-fit">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">M-Pesa Integration</h3>
                <p className="text-muted-foreground">
                  Pay securely with M-Pesa. Instant payment verification and automatic escrow funding.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full w-fit">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Live Chat</h3>
                <p className="text-muted-foreground">
                  Communicate directly with buyers and sellers. Real-time messaging for quick negotiations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full w-fit">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Data Security</h3>
                <p className="text-muted-foreground">
                  Row-level security, encrypted connections, and secure authentication protect your data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full w-fit">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Seller Subscriptions</h3>
                <p className="text-muted-foreground">
                  Start free with 5 listings. Flexible plans to scale as your business grows.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Start Trading?</h2>
          <p className="text-xl max-w-2xl mx-auto opacity-90">
            Join thousands of buyers and sellers transacting securely on Bolt Marketplace.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-lg">
            <Link href="/auth/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 Bolt Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
