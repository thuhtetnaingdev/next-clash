import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { converters, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseClashContent } from '@/lib/clash-parser';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    let userId: number | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // Use first user if not authenticated (for development)
    if (!userId) {
      const userList = await db.select().from(users).limit(1);
      if (userList.length === 0) {
        return NextResponse.json(
          { error: 'No users found' },
          { status: 404 }
        );
      }
      userId = userList[0].id;
    }

    const converterList = await db
      .select()
      .from(converters)
      .where(eq(converters.userId, userId));

    if (converterList.length === 0) {
      return NextResponse.json(
        { error: 'No converters found' },
        { status: 404 }
      );
    }

    const results: { id: number; name: string; success: boolean; error?: string }[] = [];

    for (const converter of converterList) {
      const { id, name, subscriptionUrl } = converter;

      if (!subscriptionUrl) {
        results.push({ id, name, success: false, error: 'No subscription URL' });
        continue;
      }

      try {
        const response = await fetch(subscriptionUrl, {
          headers: {
            'User-Agent': 'Clash-Subscription-Manager/1.0',
          },
        });

        if (!response.ok) {
          results.push({ id, name, success: false, error: `HTTP error ${response.status}` });
          continue;
        }

        const text = await response.text();
        const convertedProxies = await parseClashContent(text);

        await db
          .update(converters)
          .set({
            convertedProxies,
            updatedAt: new Date(),
          })
.where(and(eq(converters.id, id), eq(converters.userId, userId)));

        results.push({ id, name, success: true });
      } catch (err) {
        results.push({ id, name, success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      total: converterList.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error('POST converted-sub/refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}