import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { converters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const converter = await db
      .select()
      .from(converters)
      .where(and(eq(converters.id, parseInt(id, 10)), eq(converters.userId, payload.userId)))
      .limit(1);

    if (!converter.length) {
      return NextResponse.json(
        { error: 'Converter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(converter[0]);
  } catch (error) {
    console.error('GET converter error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}