import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, phone, userId, planCode } = body;

    if (!amount || !phone || !userId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const url = new URL(`${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/api/payments/mpesa`);
    url.searchParams.set("action", "initiate");
    url.searchParams.set("amount", amount.toString());
    url.searchParams.set("phone", phone);
    url.searchParams.set("userId", userId);
    url.searchParams.set("type", "subscription");

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.MPESA_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("initiate mpesa error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
