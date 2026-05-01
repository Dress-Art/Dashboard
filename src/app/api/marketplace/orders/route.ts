import { NextRequest, NextResponse } from 'next/server';

const marketplaceUrl = (process.env.MARKETPLACE_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminKey = process.env.ADMIN_SECRET_KEY || '';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();

    const res = await fetch(`${marketplaceUrl}/api/orders/admin${qs ? `?${qs}` : ''}`, {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
