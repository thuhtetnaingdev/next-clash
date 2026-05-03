import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { configVersions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

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

    const versions = await db
      .select()
      .from(configVersions)
      .where(eq(configVersions.userId, payload.userId))
      .orderBy(desc(configVersions.createdAt));

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('GET versions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}