import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/session';
import { db } from '@/lib/db/client';
import { converters } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nameslug: string }> }
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

    const { nameslug } = await params;

    // Decode and lowercase the nameslug for case-insensitive matching
    const slug = decodeURIComponent(nameslug).toLowerCase();

    const converter = await db
      .select()
      .from(converters)
      .where(sql`LOWER(${converters.name}) = ${slug}`)
      .where(eq(converters.userId, payload.userId))
      .limit(1);

    if (!converter.length) {
      return NextResponse.json(
        { error: 'Converter not found' },
        { status: 404 }
      );
    }

    const { convertedProxies, name: converterName } = converter[0];

    if (!convertedProxies) {
      return NextResponse.json(
        { error: 'No converted proxies found' },
        { status: 400 }
      );
    }

    // Parse the YAML proxies
    let proxies: any[] = [];
    try {
      const parsed = yaml.load(convertedProxies) as any;
      proxies = parsed?.proxies || [];
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid proxy data' },
        { status: 400 }
      );
    }

    if (proxies.length === 0) {
      return NextResponse.json(
        { error: 'No proxies to export' },
        { status: 400 }
      );
    }

    // Build proxies section using yaml.dump
    const proxyEntries = yaml.dump({ proxies }, { forceQuotes: true, indent: 2 })
      .replace(/^proxies:\n/, '');

    const proxyNames = proxies.map((p) => p.name).join('\n        - ');

    // Read template
    const templatePath = path.join(process.cwd(), 'template.yaml');
    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders
    template = template.replace('{{PROXIES}}', proxyEntries);
    template = template.replace('{{PROXY_NAMES}}', proxyNames);

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `inline; filename="${converterName}.yaml"`,
      },
    });
  } catch (error) {
    console.error('GET converted-sub error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}