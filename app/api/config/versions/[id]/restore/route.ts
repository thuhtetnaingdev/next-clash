import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { configs, configVersions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
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
    const versionId = parseInt(id);

    // Get the version to restore
    const version = await db
      .select()
      .from(configVersions)
      .where(eq(configVersions.id, versionId))
      .limit(1);

    if (!version.length) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    // Save current config as a version before restoring
    const currentConfig = await db
      .select()
      .from(configs)
      .where(eq(configs.userId, payload.userId))
      .limit(1);

    if (currentConfig.length && currentConfig[0].content) {
      await db
        .insert(configVersions)
        .values({ userId: payload.userId, content: currentConfig[0].content });
    }

    // Restore the version
    if (currentConfig.length > 0) {
      await db
        .update(configs)
        .set({ content: version[0].content, updatedAt: new Date() })
        .where(eq(configs.userId, payload.userId));
    } else {
      await db
        .insert(configs)
        .values({ userId: payload.userId, content: version[0].content });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST restore error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}