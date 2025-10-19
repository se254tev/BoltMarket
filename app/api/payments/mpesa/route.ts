import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());

    await supabaseServer.from('mpesa_callbacks').insert({
      payload: body,
      headers,
      processed: false,
    });

    const resultCode = body?.Body?.stkCallback?.ResultCode;
    const checkoutRequestID = body?.Body?.stkCallback?.CheckoutRequestID;
    const mpesaReceiptNumber = body?.Body?.stkCallback?.CallbackMetadata?.Item?.find(
      (item: any) => item.Name === 'MpesaReceiptNumber'
    )?.Value;

    if (resultCode === 0 && mpesaReceiptNumber) {
      const { data: payment } = await supabaseServer
        .from('payments')
        .select('*')
        .eq('mpesa_checkout_request_id', checkoutRequestID)
        .maybeSingle();

      if (payment) {
        await supabaseServer
          .from('payments')
          .update({
            status: 'success',
            mpesa_transaction_id: mpesaReceiptNumber,
          })
          .eq('id', payment.id);

        if (payment.metadata?.type === 'escrow') {
          const { data: escrow } = await supabaseServer
            .from('escrow_transactions')
            .select('*')
            .eq('payment_ref', payment.id)
            .maybeSingle();

          if (escrow) {
            await supabaseServer
              .from('escrow_transactions')
              .update({ status: 'funds_held' })
              .eq('id', escrow.id);
          }
        } else if (payment.metadata?.type === 'subscription') {
          const subscriptionId = payment.metadata.subscription_id;
          if (subscriptionId) {
            await supabaseServer
              .from('seller_subscriptions')
              .update({
                active: true,
                mpesa_tx_id: mpesaReceiptNumber,
              })
              .eq('id', subscriptionId);
          }
        }

        await supabaseServer
          .from('mpesa_callbacks')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('payload->Body->stkCallback->CheckoutRequestID', checkoutRequestID);
      }
    } else {
      if (checkoutRequestID) {
        await supabaseServer
          .from('payments')
          .update({ status: 'failed' })
          .eq('mpesa_checkout_request_id', checkoutRequestID);

        await supabaseServer
          .from('mpesa_callbacks')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('payload->Body->stkCallback->CheckoutRequestID', checkoutRequestID);
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error: any) {
    console.error('M-Pesa callback error:', error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.MPESA_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'initiate') {
    const amount = searchParams.get('amount');
    const phone = searchParams.get('phone');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!amount || !phone || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const checkoutRequestID = `CHK${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

    const { data: payment } = await supabaseServer
      .from('payments')
      .insert({
        user_id: userId,
        amount: parseFloat(amount),
        currency: 'KES',
        mpesa_checkout_request_id: checkoutRequestID,
        status: 'initiated',
        metadata: { type, phone },
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      checkoutRequestID,
      paymentId: payment?.id,
      message: 'Payment initiated. Please complete on your phone.',
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
