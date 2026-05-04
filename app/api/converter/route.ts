import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { converters } from '@/lib/db/schema';
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

    const converterList = await db
      .select({
        id: converters.id,
        name: converters.name,
        subscriptionUrl: converters.subscriptionUrl,
        createdAt: converters.createdAt,
        updatedAt: converters.updatedAt,
      })
      .from(converters)
      .where(eq(converters.userId, payload.userId))
      .orderBy(desc(converters.createdAt));

    return NextResponse.json(converterList);
  } catch (error) {
    console.error('GET converters error:', error);
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

    const { name, subscriptionUrl, convertedProxies, interval } = await request.json();

    if (!name || !subscriptionUrl) {
      return NextResponse.json(
        { error: 'Name and subscription URL are required' },
        { status: 400 }
      );
    }

    const newConverter = await db
      .insert(converters)
      .values({
        userId: payload.userId,
        name,
        subscriptionUrl,
        convertedProxies: convertedProxies || '',
        interval: interval || 0,
      })
      .returning();

    return NextResponse.json(newConverter[0]);
  } catch (error: any) {
    console.error('POST converter error:', error);
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'A converter with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const { id, name, subscriptionUrl, convertedProxies, interval } = await request.json();

    if (!id || !name || !subscriptionUrl) {
      return NextResponse.json(
        { error: 'ID, name and subscription URL are required' },
        { status: 400 }
      );
    }

    const updated = await db
      .update(converters)
      .set({
        name,
        subscriptionUrl,
        convertedProxies: convertedProxies || '',
        interval: interval || 0,
        updatedAt: new Date(),
      })
      .where(eq(converters.id, id))
      .where(eq(converters.userId, payload.userId))
      .returning();

    if (!updated.length) {
      return NextResponse.json(
        { error: 'Converter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error('PUT converter error:', error);
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'A converter with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(converters)
      .where(eq(converters.id, parseInt(id, 10)))
      .where(eq(converters.userId, payload.userId))
      .returning();

    if (!deleted.length) {
      return NextResponse.json(
        { error: 'Converter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE converter error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}