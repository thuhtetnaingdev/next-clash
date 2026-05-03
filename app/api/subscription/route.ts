import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { subscriptions, configs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, payload.userId))
      .limit(1);

    if (!subscription.length) {
      return NextResponse.json({ link: '' });
    }

    return NextResponse.json({ link: subscription[0].link });
  } catch (error) {
    console.error('GET subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { link } = await request.json();

    if (!link) {
      return NextResponse.json(
        { error: 'Link is required' },
        { status: 400 }
      );
    }

    // Fetch content from subscription URL
    let configContent = '';
    try {
      const fetchResponse = await fetch(link, {
        headers: {
          'User-Agent': 'Clash-Subscription-Manager/1.0',
        },
      });

      if (!fetchResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch subscription: ${fetchResponse.status}` },
          { status: 400 }
        );
      }

      configContent = await fetchResponse.text();
    } catch (fetchError) {
      console.error('Fetch subscription error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch from subscription URL' },
        { status: 400 }
      );
    }

    // Check if subscription exists
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, payload.userId))
      .limit(1);

    let subscriptionResult;
    if (existingSubscription.length > 0) {
      // Update existing subscription
      const updated = await db
        .update(subscriptions)
        .set({ link, updatedAt: new Date() })
        .where(eq(subscriptions.userId, payload.userId))
        .returning();

      subscriptionResult = updated[0];
    } else {
      // Create new subscription
      const newSubscription = await db
        .insert(subscriptions)
        .values({ userId: payload.userId, link })
        .returning();

      subscriptionResult = newSubscription[0];
    }

    // Also save/update the config content
    const existingConfig = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, payload.userId))
      .limit(1);

    if (existingConfig.length > 0) {
      await db
        .update(configs)
        .set({ content: configContent, updatedAt: new Date() })
        .where(eq(configs.userId, payload.userId));
    } else {
      await db
        .insert(configs)
        .values({ userId: payload.userId, content: configContent });
    }

    return NextResponse.json(subscriptionResult);
  } catch (error) {
    console.error('POST subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
