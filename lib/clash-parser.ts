import yaml from 'js-yaml';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseProxyLink(link: string): any | null {
  try {
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
        const network = (params.get('type') || 'tcp').trim();
        let net = network;
        if (net === 'httpupgrade') {
          net = 'http';
        }
        const path = (params.get('path') || params.get('serviceName') || '').trim();
        const hostHeader = params.get('host') || '';
        const flow = params.get('flow') || '';

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
        if (fp) proxy['client-fingerprint'] = fp;
        if (flow) proxy.flow = flow;

        if (pbk) {
          proxy['reality-opts'] = {
            'public-key': pbk,
            'short-id': sid,
          };
        }

        // Add network field only when the type is a known non‑TCP network
        if (net !== 'tcp') {
          if (net === 'ws') {
            proxy.network = net;
            const wsOpts: any = { path };
            if (hostHeader) wsOpts.headers = { Host: hostHeader };
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
            const httpPath = params.get('path') || proxy.name;
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
        if (url.password) {
          proxy.method = decode(url.username);
          proxy.password = decode(url.password);
        } else {
          const creds = atob(decode(url.username));
          const [method, password] = creds.split(':');
          proxy.method = method;
          proxy.password = password;
        }
        const plugin = params.get('plugin') || '';
        if (plugin) {
          proxy.plugin = plugin;
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
      const trimmedProxies = doc.proxies.map((p: any) => ({
        ...p,
        name: p.name?.trim(),
      }));
      return yaml.dump({ proxies: trimmedProxies }, { forceQuotes: true });
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
      proxies.push(proxy);
    }
  }

  if (proxies.length === 0) {
    throw new Error('Unable to parse any proxy from the subscription data');
  }

  return yaml.dump({ proxies }, { forceQuotes: true });
}
