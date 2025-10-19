import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Note: This API route expects the user to be authenticated client-side and to
// include a Supabase auth cookie (or pass the access token). If your project
// uses a different server-side auth pattern, adapt accordingly.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, method, fullName, phone, address, notes, freeWithEscrow } = body;

    if (!listingId || !method) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    // Optionally accept buyerId from the client (preferred when you have the client-side user id available)
    const buyerId = body.buyerId || null;

    const insert = {
      listing_id: listingId,
      buyer_id: buyerId,
      method,
      full_name: fullName || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      free_with_escrow: !!freeWithEscrow,
    };

    const { data, error } = await supabase.from('delivery_requests').insert(insert).select().maybeSingle();
    if (error) {
      // Log full DB error on the server for diagnostics, but return a generic message to the client
      console.error('Delivery insert error', error);
      return NextResponse.json({ error: 'Could not save delivery preference' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e: any) {
    console.error('Delivery route error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
