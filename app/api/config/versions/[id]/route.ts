import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { configVersions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
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

    await db
      .delete(configVersions)
      .where(eq(configVersions.id, versionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE version error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}