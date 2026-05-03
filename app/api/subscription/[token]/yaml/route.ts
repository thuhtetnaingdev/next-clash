import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { users, configs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (token !== process.env.SUBSCRIPTION_TOKEN) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const user = await db.select().from(users).limit(1);

    if (!user.length) {
      return new NextResponse('', { status: 404 });
    }

    const config = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, user[0].id))
      .limit(1);

    if (!config.length || !config[0].content) {
      return new NextResponse('', {
        status: 404,
        headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
      });
    }

    return new NextResponse(config[0].content, {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('GET subscription YAML error:', error);
    return new NextResponse('', { status: 500 });
  }
}