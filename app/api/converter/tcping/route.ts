import { NextResponse } from 'next/server';
import net from 'net';
import tls from 'tls';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseProxyUri(link: string): { host: string; port: number; originalLink: string } | null {
  try {
    link = decodeHtmlEntities(link);
    const protocol = link.split('://')[0].toLowerCase();
    const urlStr = link.replace(/^[a-z]+:\/\//i, 'https://');
    const url = new URL(urlStr);

    let host = url.hostname;
    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1);
    }

    const isTlsProtocol = protocol === 'vless' || protocol === 'vmess' || protocol === 'trojan' || protocol === 'https';
    const defaultPort = isTlsProtocol ? 443 : 80;
    const port = parseInt(url.port || String(defaultPort), 10);

    return { host, port, originalLink: link };
  } catch {
    return null;
  }
}

function checkProxy(uri: string, timeout: number = 3000): Promise<boolean> {
  const parsed = parseProxyUri(uri);
  if (!parsed) return Promise.resolve(false);
  const { host, port, originalLink } = parsed;

  // Detect if URI requires TLS
  const isTls = originalLink.includes('security=tls') ||
                port === 443 ||
                originalLink.startsWith('trojan://') ||
                originalLink.startsWith('vless://') && originalLink.includes('security=tls');

  if (!isTls) {
    // Plain TCP ping
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeoutId = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);
      socket.on('connect', () => { clearTimeout(timeoutId); socket.destroy(); resolve(true); });
      socket.on('error', () => { clearTimeout(timeoutId); resolve(false); });
      socket.connect(port, host);
    });
  }

  // TLS handshake with SNI
  return new Promise((resolve) => {
    // Extract SNI from URI if present
    let sni = host;
    const sniMatch = originalLink.match(/[?&]sni=([^&?#]+)/);
    if (sniMatch) sni = decode(sniMatch[1]);
    const hostMatch = originalLink.match(/[?&]host=([^&?#]+)/);
    if (hostMatch && hostMatch[1]) sni = decode(hostMatch[1]);

    const socket = tls.connect({
      host,
      port,
      servername: sni,
      timeout,
      rejectUnauthorized: false
    });
    const timeoutId = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);
    socket.on('secureConnect', () => {
      clearTimeout(timeoutId);
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

function parseUris(content: string): string[] {
  let data = content;
  try {
    data = atob(content);
  } catch {
    // keep as is
  }

  const lines = data
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('://'));

  const uris: string[] = [];
  for (const line of lines) {
    const parsed = parseProxyUri(line);
    if (parsed) {
      uris.push(line);
    }
  }

  return uris;
}

export async function POST(request: Request) {
  try {
    const { subscriptionUrl } = await request.json();

    if (!subscriptionUrl) {
      return NextResponse.json({ error: 'subscriptionUrl is required' }, { status: 400 });
    }

    const response = await fetch(subscriptionUrl, {
      headers: { 'User-Agent': 'Clash-Subscription-Manager/1.0' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `HTTP error ${response.status}` }, { status: 400 });
    }

    const text = await response.text();
    const uris = parseUris(text);

    if (uris.length === 0) {
      return NextResponse.json({ error: 'No v2ray URIs found' }, { status: 400 });
    }

    const parsed = uris.map((uri) => {
      const p = parseProxyUri(uri);
      return { uri, host: p!.host, port: p!.port };
    });

    const working: string[] = [];
    const batchSize = 1000;

    console.log(`Pinging ${parsed.length} proxies in batches of ${batchSize}...`);

    for (let i = 0; i < parsed.length; i += batchSize) {
      const batch = parsed.slice(i, i + batchSize);
      console.log(`Pinging batch ${i / batchSize + 1} (${batch.length} proxies)...`);
      const results = await Promise.all(
        batch.map((p) => checkProxy(p.uri, 3000))
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j]) {
          working.push(batch[j].uri);
        }
      }
    }

    console.log(`Tcping complete. ${working.length} working proxies found.`);

    return NextResponse.json({ uris: working });
  } catch (error) {
    console.error('Tcping error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
