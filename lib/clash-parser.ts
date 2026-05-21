import yaml from 'js-yaml';

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

function parseProxyLink(link: string): any | null {
  try {
    link = decodeHtmlEntities(link);
    const protocol = link.split('://')[0].toLowerCase();
    // Build a standard URL for parsing
    const urlStr = link.replace(/^[a-z]+:\/\//i, 'https://');
    const url = new URL(urlStr);

    let host = url.hostname;
    // Remove IPv6 brackets
    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1);
    }

    // Determine default port based on protocol
    const isTlsProtocol = protocol === 'vless' || protocol === 'vmess' || protocol === 'trojan' || protocol === 'https';
    const defaultPort = isTlsProtocol ? 443 : 80;
    const port = parseInt(url.port || String(defaultPort), 10);

    const name = url.hash
      ? decode(url.hash.substring(1)).trim()
      : `${host}:${port}`;

    const proxy: any = {
      name,
      type: protocol,
      server: host,
      port,
    };

    // Common fields added for all proxies
    proxy.udp = true;
    proxy['skip-cert-verify'] = true; // default to true, as most subscriptions expect

    const params = url.searchParams;

    switch (protocol) {
      case 'vless':
      case 'vmess':
      case 'trojan': {
        // Keep the raw (possibly percent‑encoded) username as UUID/password
        const rawUuid = link.substring(link.indexOf('://') + 3).split('@')[0];
        if (protocol === 'trojan') {
          proxy.password = rawUuid;
        } else {
          proxy.uuid = rawUuid;
        }
        const aid = parseInt(params.get('aid') || '0', 10);
        const encryption = params.get('encryption') || '';
        const security = params.get('security') || (protocol === 'trojan' ? 'tls' : 'none');
        const sni = params.get('sni') || params.get('peer') || '';
        const alpn = params.get('alpn') || '';
        const fp = params.get('fp') || '';
        const pbk = (params.get('pbk') || '').trim();
        const sid = (params.get('sid') || '').trim();
        if (sid && !isValidShortId(sid)) {
          return null;
        }
        const network = (params.get('type') || 'tcp').trim();
        let net = network;
        if (net === 'httpupgrade') {
          net = 'http';
        }
        const path = (params.get('path') || params.get('serviceName') || '').trim();
        const hostHeader = params.get('host') || '';
        let flow = params.get('flow') || '';
        const allowedFlows = ['xtls-rprx-vision', 'xtls-rprx-vision-udp443'];
        if (flow && !allowedFlows.includes(flow)) {
          flow = '';
        }

        // Detect headerType=http conversion (type=tcp + headerType=http => http transport)
        const headerType = (params.get('headerType') || '').trim();
        if (headerType === 'http' && net === 'tcp') {
          net = 'http';
        }

        // Only add alterId when it's non‑zero (commonly 0, can be omitted)
        if (aid > 0) proxy.alterId = aid;
        // No cipher field for vless/vmess/trojan per Clash Meta spec
        proxy.tls = security !== 'none';
        if (sni) proxy.servername = sni;

        const packetEncoding = params.get('packetEncoding') || '';
        if (packetEncoding) {
          proxy['packet-encoding'] = packetEncoding;
        }

        const fpVal = params.get('fp') || '';
        if (fpVal) {
          proxy['client-fingerprint'] = fpVal;
        }

        if (flow) proxy.flow = flow;

        let validPublicKey = false;
        if (pbk) {
          try {
            const decoded = atob(pbk);
            if (decoded.length === 32) {
              validPublicKey = true;
            }
          } catch {
            // invalid base64
          }
        }
        if (pbk && validPublicKey) {
          proxy['reality-opts'] = {
            'public-key': pbk,
            'short-id': sid,
          };
        }

        // Add network field only when the type is a known non‑TCP network
        if (net !== 'tcp') {
          if (net === 'ws') {
            proxy.network = net;
            let wsPath = path || '/';
            if (!wsPath.startsWith('/')) wsPath = '/' + wsPath;
            const wsOpts: any = { path: wsPath };
            // Fallback: use sni, then server, then hostHeader
            let finalHost = hostHeader;
            if (!finalHost) finalHost = sni;
            if (!finalHost) finalHost = proxy.server;
            if (finalHost) wsOpts.headers = { Host: finalHost };
            proxy['ws-opts'] = wsOpts;
          } else if (net === 'grpc') {
            proxy.network = net;
            const serviceName = path || '';
            proxy['grpc-opts'] = { 'grpc-service-name': serviceName };
          } else if (net === 'http') {
            proxy.network = net;
            proxy.tls = false;
            const httpOpts: any = {};
            httpOpts.method = params.get('method') || 'GET';
            let httpPath = params.get('path') || '/';
            if (httpPath && !httpPath.startsWith('/')) httpPath = '/' + httpPath;
            httpOpts.path = [httpPath];
            const httpHost = params.get('host') || '';
            if (httpHost) {
              httpOpts.headers = { Host: [httpHost] };
            }
            proxy['http-opts'] = httpOpts;
          }
          // For unknown network types (e.g. xhttp) we omit network altogether
        }
        break;
      }
      case 'ss': {
        // --- Extract method & password ---
        if (url.password) {
          proxy.method = decode(url.username);
          proxy.password = decode(url.password);
        } else {
          // Try base64-encoded credentials
          try {
            const creds = atob(decode(url.username));
            const [method, password] = creds.split(':');
            proxy.method = method;
            proxy.password = password;
          } catch {
            // Not base64 – treat as plaintext or UUID
            const rawUser = decode(url.username);
            // If it contains a colon, it's method:password in plaintext
            if (rawUser.includes(':')) {
              const [method, password] = rawUser.split(':');
              proxy.method = method;
              proxy.password = password;
            } else {
              // UUID as password, unknown method – skip
              return null;
            }
          }
        }

        // If no valid credentials, skip this proxy
        if (!proxy.method || !proxy.password) return null;

        // --- Handle transport (ws / grpc) ---
        const transport = params.get('type') || '';
        const host = params.get('host') || '';
        const path = params.get('path') || '';
        const security = params.get('security') || '';

        if (transport === 'ws') {
          proxy.plugin = 'v2ray-plugin';
          proxy['plugin-opts'] = {
            mode: 'websocket',
            host: host || undefined,
            path: path ? decode(path) : '/',
            tls: security === 'tls',
          };
          // Some subscriptions use 'sni' for TLS SNI
          if (security === 'tls') {
            const sni = params.get('sni') || '';
            if (sni) proxy['plugin-opts'].host = sni;
          }
          // Shadowsocks over ws does not use the bare 'plugin' param from query
          delete proxy.plugin;
        } else if (transport === 'grpc') {
          // Clash Meta doesn't support ss + gRPC natively → skip
          return null;
        } else {
          // Plain ss, keep the 'plugin' from the original query if any
          const plugin = params.get('plugin') || '';
          if (plugin) proxy.plugin = plugin;
        }
        break;
      }
      case 'socks':
      case 'socks5': {
        proxy.type = 'socks5';
        proxy.username = decode(url.username);
        proxy.password = decode(url.password);
        break;
      }
      case 'http':
      case 'https': {
        proxy.type = 'http';
        proxy.username = decode(url.username);
        proxy.password = decode(url.password);
        proxy.tls = protocol === 'https';
        break;
      }
      case 'hysteria':
      case 'hy2': {
        proxy.type = protocol === 'hy2' ? 'hysteria2' : 'hysteria';
        proxy.password = decode(url.username);
        proxy.sni = params.get('sni') || '';
        if (protocol === 'hysteria') {
          proxy.up = params.get('upmbps') || '10';
          proxy.down = params.get('downmbps') || '50';
          proxy.protocol_type = params.get('protocol') || '';
          proxy.obfs = params.get('obfsParam') || '';
        } else {
          proxy['obfs-password'] = params.get('obfs-password') || '';
        }
        break;
      }
      case 'tuic': {
        proxy.type = 'tuic';
        proxy.uuid = decode(url.username);
        proxy.password = decode(url.password);
        proxy.sni = params.get('sni') || '';
        proxy['congestion_controller'] =
          params.get('congestion_control') || 'cubic';
        proxy['udp_relay_mode'] = params.get('udp_relay_mode') || 'native';
        break;
      }
      case 'wg': {
        proxy.type = 'wireguard';
        proxy.private_key = decode(url.username);
        proxy.public_key = params.get('public_key') || '';
        proxy.address = params.get('address') || '';
        proxy.preshared_key = params.get('preshared_key') || '';
        break;
      }
      case 'ssh': {
        proxy.type = 'ssh';
        proxy.username = decode(url.username);
        proxy.password =
          decode(url.password) || params.get('password') || '';
        proxy.private_key = params.get('private_key') || '';
        break;
      }
      default:
        return null;
    }

    // Remove keys with undefined values
    Object.keys(proxy).forEach((key) => {
      if (proxy[key] === undefined) delete proxy[key];
    });

    return proxy;
  } catch {
    return null;
  }
}

function deduplicateProxies(proxies: any[]): any[] {
  const nameCount = new Map<string, number>();
  for (const p of proxies) {
    const name = p.name?.replace(/`+$/, '').trim() || '';
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
  }
  const nameSeen = new Map<string, number>();
  return proxies.map(p => {
    const orig = p.name?.replace(/`+$/, '').trim() || '';
    const total = nameCount.get(orig) ?? 1;
    if (total === 1) return p;
    const seen = (nameSeen.get(orig) || 0) + 1;
    nameSeen.set(orig, seen);
    if (seen === 1) return p;
    return { ...p, name: `${orig} ${seen}` };
  });
}

function isValidShortId(id: string): boolean {
  // Must be a string, even length, max 16 chars, only hex
  return (
    typeof id === 'string' &&
    id.length % 2 === 0 &&
    id.length <= 16 &&
    /^[0-9a-fA-F]*$/.test(id)
  );
}

export async function parseClashContent(content: string): Promise<string> {
  let data = content;
  // Try base64 decode
  try {
    data = atob(content);
  } catch {
    // keep as is
  }

  // Try parse as YAML
  try {
    const doc = yaml.load(data) as any;
    if (doc && Array.isArray(doc.proxies)) {
      const needsQuoting = (name: string) =>
        name.length > 0 &&
        (/^[@!&*[\-:?>|#%`~\[}]/.test(name[0]) || /[:\s]+$/.test(name));

      const cleanName = (name: string) => name.replace(/^'+|'+$/g, '').replace(/`+$/, '').trim();

      const uniqueProxies = doc.proxies.map((p: any, idx: number) => {
        const { _originalLink, ...clean } = p;
        return { ...clean, name: `free ${idx + 1}` };
      });

      const result: any = { proxies: uniqueProxies };

      if (doc['allow-lan'] !== undefined) result['allow-lan'] = doc['allow-lan'];
      if (doc['ipv6'] !== undefined) result.ipv6 = doc.ipv6;
      if (doc['log-level']) result['log-level'] = doc['log-level'];
      if (doc['mixed-port'] !== undefined) result['mixed-port'] = doc['mixed-port'];
      if (doc.mode) result.mode = doc.mode;

      if (doc['proxy-groups'] && Array.isArray(doc['proxy-groups'])) {
        result['proxy-groups'] = doc['proxy-groups'].map((group: any) => {
          const cleanGroup: any = {};
          if (group.name) cleanGroup.name = group.name;
          if (group.type) cleanGroup.type = group.type;
          if (group.proxies) {
            cleanGroup.proxies = (Array.isArray(group.proxies) ? group.proxies : []).map((p: string) => cleanName(p));
          }
          if (group.interval !== undefined) cleanGroup.interval = group.interval;
          if (group.tolerance !== undefined) cleanGroup.tolerance = group.tolerance;
          if (group.url) cleanGroup.url = group.url;
          if (group.lazy !== undefined) cleanGroup.lazy = group.lazy;
          // discard any unexpected fields like “-interval”
          return cleanGroup;
        });
      }

      if (doc.rules && Array.isArray(doc.rules)) {
        result.rules = doc.rules;
      }

      return yaml.dump(result, { forceQuotes: true });
    }
  } catch {
    // not YAML, continue
  }

  // Treat as one proxy per line
  const lines = data
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('://'));
  if (lines.length === 0) {
    throw new Error('No proxies found in the subscription data');
  }

  const proxies: any[] = [];
  for (const line of lines) {
    const proxy = parseProxyLink(line);
    if (proxy) {
      proxy._originalLink = line;
      proxies.push(proxy);
    }
  }

  if (proxies.length === 0) {
    throw new Error('Unable to parse any proxy from the subscription data');
  }

  const uniqueProxies = proxies.map((p, idx) => {
    const newName = `free ${idx + 1}`;
    const { _originalLink, ...clean } = p;
    return { ...clean, name: newName };
  });

  return yaml.dump({ proxies: uniqueProxies }, { forceQuotes: true });
}
