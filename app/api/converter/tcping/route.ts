import { NextResponse } from 'next/server';
import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

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

function parseProxyUri(link: string): {
  host: string; port: number; protocol: string; uuid?: string; password?: string; originalLink: string; sni?: string; flow?: string
} | null {
  try {
    link = decodeHtmlEntities(link);
    const protocolMatch = link.match(/^([a-z]+):\/\//i);
    if (!protocolMatch) return null;
    const protocol = protocolMatch[1].toLowerCase();

    if (protocol === 'vmess') {
      try {
        const base64Part = link.split('vmess://')[1].split('#')[0];
        const jsonStr = Buffer.from(base64Part, 'base64').toString('utf-8');
        const cfg = JSON.parse(jsonStr);
        let host = cfg.host || cfg.add || '';
        host = host.trim();
        if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
        const port = parseInt(cfg.port || '443', 10) || 443;
        return {
          host,
          port,
          protocol: 'vmess',
          uuid: cfg.id || cfg.uuid || undefined,
          password: undefined,
          originalLink: link,
          sni: cfg.sni || undefined,
        };
      } catch {
        return null;
      }
    }

    const afterProto = link.slice(protocol.length + 3);
    const atIndex = afterProto.indexOf('@');
    let uuid: string | undefined;
    let password: string | undefined;
    if (atIndex !== -1) {
      const creds = afterProto.slice(0, atIndex);
      if (protocol === 'vless') {
        uuid = creds;
      } else if (protocol === 'trojan') {
        password = creds;
      }
    }

    let flow: string | undefined;
    const flowMatch = link.match(/[?&]flow=([^&?#]+)/);
    if (flowMatch) {
      flow = decodeURIComponent(flowMatch[1]);
    }

    const urlStr = link.replace(/^[a-z]+:\/\//i, 'https://');
    const url = new URL(urlStr);

    let host = url.hostname;
    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1);
    }

    const isTlsProtocol = protocol === 'vless' || protocol === 'vmess' || protocol === 'trojan' || protocol === 'https';
    const defaultPort = isTlsProtocol ? 443 : 80;
    const port = parseInt(url.port || String(defaultPort), 10);

    return { host, port, protocol, uuid, password, originalLink: link, sni: undefined, flow };
  } catch {
    return null;
  }
}

const TEST_HOST = 'www.gstatic.com';
const TEST_PATH = '/generate_204';
const TEST_PORT = 80;

function isIPAddress(host: string): boolean {
  return net.isIP(host) !== 0;
}

function extractSNI(originalLink: string, fallbackHost: string): string {
  let sni = fallbackHost;
  const sniMatch = originalLink.match(/[?&]sni=([^&?#]+)/);
  if (sniMatch) sni = decode(sniMatch[1]);
  const hostMatch = originalLink.match(/[?&]host=([^&?#]+)/);
  if (hostMatch && hostMatch[1]) sni = decode(hostMatch[1]);
  return isIPAddress(sni) ? '' : sni;
}

function buildAddrBuf(domain: string, port: number): Buffer {
  const domainBuf = Buffer.from(domain, 'utf-8');
  const buf = Buffer.alloc(1 + 1 + domainBuf.length + 2);
  buf.writeUInt8(0x03, 0);
  buf.writeUInt8(domainBuf.length, 1);
  domainBuf.copy(buf, 2);
  buf.writeUInt16BE(port, 2 + domainBuf.length);
  return buf;
}

function checkHTTPResponse(socket: net.Socket, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const tid = setTimeout(() => {
      if (!done) { done = true; socket.destroy(); resolve(false); }
    }, timeout);

    socket.write(`GET ${TEST_PATH} HTTP/1.1\r\nHost: ${TEST_HOST}\r\nConnection: close\r\n\r\n`);

    let buffer = '';
    const onData = (data: Buffer) => {
      if (done) return;
      buffer += data.toString();
      if (/HTTP\/1\.[01] 204/.test(buffer)) {
        done = true; clearTimeout(tid); socket.destroy(); resolve(true);
      } else if (/HTTP\/1\.[01] \d{3}/.test(buffer)) {
        done = true; clearTimeout(tid); socket.destroy(); resolve(true);
      }
    };

    socket.on('data', onData);
    const cleanup = () => { if (!done) { done = true; clearTimeout(tid); resolve(false); } };
    socket.on('error', cleanup);
    socket.on('close', cleanup);
  });
}

function testTrojan(host: string, port: number, password: string, originalLink: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha224').update(password).digest('hex');
    const sni = extractSNI(originalLink, host);
    const socket = tls.connect({
      host, port, rejectUnauthorized: false, timeout,
      ...(sni ? { servername: sni } : {}),
    });
    const tid = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);

    socket.on('secureConnect', () => {
      clearTimeout(tid);
      socket.write(hash + '\r\n');
      socket.write(buildAddrBuf(TEST_HOST, TEST_PORT));
      checkHTTPResponse(socket, timeout * 2).then(resolve);
    });

    socket.on('error', () => { clearTimeout(tid); resolve(false); });
    socket.on('timeout', () => { clearTimeout(tid); socket.destroy(); resolve(false); });
  });
}

function testVLess(host: string, port: number, uuid: string, originalLink: string, timeout: number, flow?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isTls = originalLink.includes('security=tls') || port === 443;
    const sni = extractSNI(originalLink, host);
    const socket: net.Socket = isTls
      ? tls.connect({ host, port, rejectUnauthorized: false, timeout, ...(sni ? { servername: sni } : {}) })
      : net.connect({ host, port, timeout });
    const tid = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);

    const sendData = () => {
      clearTimeout(tid);
      const uuidHex = uuid.replace(/-/g, '');
      const uuidBuf = Buffer.from(uuidHex, 'hex');
      const domainBuf = Buffer.from(TEST_HOST, 'utf-8');
      const flowBuf = flow ? Buffer.from(flow, 'utf-8') : null;
      const flowLen = flowBuf ? flowBuf.length : 0;
      const addrLen = 2 + 1 + 1 + domainBuf.length;
      const buf = Buffer.alloc(1 + 16 + 1 + addrLen + 1 + flowLen);
      let offset = 0;
      buf.writeUInt8(0x00, offset++);
      uuidBuf.copy(buf, offset); offset += 16;
      buf.writeUInt8(0x01, offset++);
      buf.writeUInt16BE(TEST_PORT, offset); offset += 2;
      buf.writeUInt8(0x02, offset++);
      buf.writeUInt8(domainBuf.length, offset++);
      domainBuf.copy(buf, offset); offset += domainBuf.length;
      buf.writeUInt8(flowLen, offset++);
      if (flowBuf) flowBuf.copy(buf, offset);

      socket.write(buf);
      checkHTTPResponse(socket, timeout * 2).then(resolve);
    };

    if (isTls) socket.on('secureConnect', sendData);
    else socket.on('connect', sendData);

    socket.on('error', () => { clearTimeout(tid); resolve(false); });
    socket.on('timeout', () => { clearTimeout(tid); socket.destroy(); resolve(false); });
  });
}

function testTLSHTTP(host: string, port: number, originalLink: string, timeout: number, customSni?: string): Promise<boolean> {
  const sni = customSni ?? extractSNI(originalLink, host);
  return new Promise((resolve) => {
    const socket = tls.connect({
      host, port, rejectUnauthorized: false, timeout,
      ...(sni ? { servername: sni } : {}),
    });
    const tid = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);

    socket.on('secureConnect', () => {
      clearTimeout(tid);
      checkHTTPResponse(socket, timeout * 2).then(resolve);
    });

    socket.on('error', () => { clearTimeout(tid); resolve(false); });
    socket.on('timeout', () => { clearTimeout(tid); socket.destroy(); resolve(false); });
  });
}

function testHTTPProxy(host: string, port: number, useTls: boolean, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket: net.Socket = useTls
      ? tls.connect({ host, port, rejectUnauthorized: false, timeout })
      : net.connect({ host, port, timeout });
    const tid = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);

    const onConnect = () => {
      clearTimeout(tid);
      const proxyReq = `GET http://${TEST_HOST}${TEST_PATH} HTTP/1.1\r\nHost: ${TEST_HOST}\r\nConnection: close\r\nProxy-Connection: close\r\n\r\n`;

      let done = false;
      const respTid = setTimeout(() => { if (!done) { done = true; socket.destroy(); resolve(false); } }, timeout * 2);

      socket.write(proxyReq);

      let buffer = '';
      socket.on('data', (data: Buffer) => {
        if (done) return;
        buffer += data.toString();
        if (/HTTP\/1\.[01] \d{3}/.test(buffer)) {
          done = true; clearTimeout(respTid); socket.destroy(); resolve(true);
        }
      });

      socket.on('error', () => { if (!done) { done = true; clearTimeout(respTid); resolve(false); } });
      socket.on('close', () => { if (!done) { done = true; clearTimeout(respTid); resolve(false); } });
    };

    if (useTls) (socket as tls.TLSSocket).on('secureConnect', onConnect);
    else socket.on('connect', onConnect);

    socket.on('error', () => { clearTimeout(tid); resolve(false); });
    socket.on('timeout', () => { clearTimeout(tid); socket.destroy(); resolve(false); });
  });
}

function testSOCKS5(host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const tid = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);
    let state = 0;
    let buf = Buffer.alloc(0);

    socket.on('connect', () => {
      socket.write(Buffer.from([0x05, 0x01, 0x00]));
    });

    socket.on('data', (data: Buffer) => {
      buf = Buffer.concat([buf, data]);

      if (state === 0 && buf.length >= 2) {
        if (buf[0] === 0x05 && buf[1] === 0x00) {
          state = 1;
          buf = Buffer.alloc(0);
          const domainBuf = Buffer.from(TEST_HOST, 'utf-8');
          const req = Buffer.alloc(4 + 1 + domainBuf.length + 2);
          req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x03;
          req[4] = domainBuf.length;
          domainBuf.copy(req, 5);
          req.writeUInt16BE(TEST_PORT, 5 + domainBuf.length);
          socket.write(req);
        } else {
          clearTimeout(tid); socket.destroy(); resolve(false);
        }
      } else if (state === 1 && buf.length >= 4) {
        if (buf[1] === 0x00) {
          state = 2;
          const remaining = buf.subarray(4);
          socket.removeAllListeners('data');
          clearTimeout(tid);
          checkHTTPResponseWithBuffer(socket, remaining, timeout * 2).then(resolve);
        } else {
          clearTimeout(tid); socket.destroy(); resolve(false);
        }
      }
    });

    socket.on('error', () => { clearTimeout(tid); resolve(false); });
    socket.on('timeout', () => { clearTimeout(tid); socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function checkHTTPResponseWithBuffer(socket: net.Socket, initialBuffer: Buffer, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const tid = setTimeout(() => {
      if (!done) { done = true; socket.destroy(); resolve(false); }
    }, timeout);

    socket.write(`GET ${TEST_PATH} HTTP/1.1\r\nHost: ${TEST_HOST}\r\nConnection: close\r\n\r\n`);

    let buffer = initialBuffer.toString();
    if (/HTTP\/1\.[01] \d{3}/.test(buffer)) {
      done = true; clearTimeout(tid); socket.destroy(); resolve(true);
      return;
    }

    const onData = (data: Buffer) => {
      if (done) return;
      buffer += data.toString();
      if (/HTTP\/1\.[01] \d{3}/.test(buffer)) {
        done = true; clearTimeout(tid); socket.destroy(); resolve(true);
      }
    };

    socket.on('data', onData);
    const cleanup = () => { if (!done) { done = true; clearTimeout(tid); resolve(false); } };
    socket.on('error', cleanup);
    socket.on('close', cleanup);
  });
}

async function testURL(uri: string, timeout: number): Promise<{ ok: boolean; latency: number } | null> {
  const parsed = parseProxyUri(uri);
  if (!parsed) return null;

  const { protocol, host, port, uuid, password, originalLink, sni, flow } = parsed;
  const start = Date.now();

  const run = async (fn: () => Promise<boolean>) => {
    try { return await fn(); } catch { return false; }
  };

  let ok = false;
  switch (protocol) {
    case 'trojan':
      ok = await run(() => testTrojan(host, port, password!, originalLink, timeout));
      break;
    case 'vless':
      ok = await run(() => testVLess(host, port, uuid!, originalLink, timeout, flow));
      break;
    case 'vmess':
      ok = await run(() => testTLSHTTP(host, port, originalLink, timeout, sni));
      if (!ok) ok = await run(() => testHTTPProxy(host, port, false, timeout));
      break;
    case 'socks':
    case 'socks5':
      ok = await run(() => testSOCKS5(host, port, timeout));
      if (!ok) ok = await run(() => testHTTPProxy(host, port, false, timeout));
      break;
    case 'http':
      ok = await run(() => testHTTPProxy(host, port, false, timeout));
      break;
    case 'https':
      ok = await run(() => testHTTPProxy(host, port, true, timeout));
      if (!ok) ok = await run(() => testTLSHTTP(host, port, originalLink, timeout));
      break;
    default:
      ok = await run(() => testHTTPProxy(host, port, false, timeout));
      if (!ok) ok = await run(() => testSOCKS5(host, port, timeout));
      break;
  }

  return { ok, latency: Date.now() - start };
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
    if (parseProxyUri(line)) {
      uris.push(line);
    }
  }

  return uris;
}

export async function POST(request: Request) {
  try {
    const { subscriptionUrl, batchSize = 1000, testUrl } = await request.json();

    if (!subscriptionUrl) {
      return NextResponse.json({ error: 'subscriptionUrl is required' }, { status: 400 });
    }

    let response: Response;
    try {
      response = await fetch(subscriptionUrl, {
        headers: { 'User-Agent': 'Clash-Subscription-Manager/1.0' },
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchErr: any) {
      console.error('Subscription fetch failed:', fetchErr?.cause?.message || fetchErr?.message);
      return NextResponse.json({
        error: 'Failed to fetch subscription',
        detail: fetchErr?.cause?.code || fetchErr?.cause?.message || fetchErr?.message,
      }, { status: 502 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Subscription HTTP error ${response.status}` }, { status: 400 });
    }

    const text = await response.text();
    const uris = parseUris(text);

    if (uris.length === 0) {
      return NextResponse.json({ error: 'No v2ray URIs found' }, { status: 400 });
    }

    const results: { uri: string; latency: number }[] = [];

    console.log(`URL testing ${uris.length} proxies (batch size: ${batchSize})...`);

    for (let i = 0; i < uris.length; i += batchSize) {
      const batch = uris.slice(i, i + batchSize);
      console.log(`Testing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uris.length / batchSize)} (${batch.length} proxies)...`);
      const batchResults = await Promise.all(
        batch.map((uri) => testURL(uri, 15000))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j];
        if (r?.ok) {
          results.push({ uri: batch[j], latency: r.latency });
        }
      }
    }

    console.log(`URL test complete. ${results.length}/${uris.length} proxies working.`);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('URL test error:', error);
    if (error?.name === 'AbortError' || error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return NextResponse.json({ error: 'Subscription URL timed out' }, { status: 408 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
