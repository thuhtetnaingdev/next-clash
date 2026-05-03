import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { configs } from '@/lib/db/schema';
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

    const config = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, payload.userId))
      .limit(1);

    if (!config.length) {
      return new NextResponse('', {
        status: 404,
        headers: {
          'Content-Type': 'text/yaml; charset=utf-8',
        },
      });
    }

    // Return YAML content as download
    return new NextResponse(config[0].content, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="clash-config.yaml"',
      },
    });
  } catch (error) {
    console.error('GET subscription download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
