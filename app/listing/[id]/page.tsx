import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
};

const ListingClient = dynamic(() => import('@/components/ListingClient'), { ssr: false });

export default async function ListingPage({ params }: Props) {
  const id = params.id;

  // Quick server-side check: try to fetch minimal listing to allow static rendering when public
  try {
    const { data: listingData } = await supabase
      .from('listings')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    // If the server-side fetch returned null it means the listing doesn't exist
    // (as far as the anon key can see). Only show 404 in that explicit case.
    // If the fetch silently failed because of RLS or restrictions, we fall
    // through to client rendering where the browser auth session can access it.
    if (listingData === null) {
      notFound();
    }
  } catch (err) {
    // If the server-side check fails (RLS or service restrictions), we still render the client component
    console.warn('Server-side listing id check failed, falling back to client render', err);
  }

  // Render client-side component that will fetch using the browser session (avoids RLS anon issues)
  return <ListingClient listingId={id} />;
}
