import { NextRequest, NextResponse } from 'next/server';

const marketplaceUrl = (process.env.MARKETPLACE_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminKey = process.env.ADMIN_SECRET_KEY || '';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ orderNumber: string }> }
) {
    const { orderNumber } = await params;
    const body = await request.json();

    const res = await fetch(`${marketplaceUrl}/api/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
