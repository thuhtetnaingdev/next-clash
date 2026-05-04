/* eslint-disable */
import yaml from 'js-yaml';

// Helper functions

function b64Decode(str: string): string {
  try {
    const safeStr = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (safeStr.length % 4)) % 4);
    const decoded = atob(safeStr + padding);
    return decodeURIComponent(escape(decoded));
  } catch {
    return '';
  }
}

function b64Encode(str: string, urlSafe = false): string {
  const binaryStr = unescape(encodeURIComponent(str));
  const encoded = btoa(binaryStr);
  if (urlSafe) {
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  return encoded;
}

function listByLineOrComma(str: string): string[] {
  if (!str || typeof str !== 'string') return [];
  return str.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

function safeParseInt(value: any, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function isIpAddress(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6Regex = /:/;
  return ipv4Regex.test(str) || ipv6Regex.test(str);
}

function genWgReserved(anyStr: string): string {
  try {
    const list = anyStr.replace(/[\[\]\s]/g, '').split(',');
    if (list.length === 3) {
      const ba = new Uint8Array(3);
      for (let i = 0; i < 3; i++) {
        const num = parseInt(list[i], 10);
        if (isNaN(num)) return anyStr;
        ba[i] = num;
      }
      const binary = String.fromCharCode(...ba);
      return btoa(binary);
    }
    return anyStr;
  } catch {
    return anyStr;
  }
}

function isMultiPort(portStr: string): boolean {
  if (!portStr) return false;
  return portStr.includes('-') || portStr.includes(',');
}

function hopPortsToSingboxList(s: string): string[] {
  return s.split(',').map(it => {
    const pRange = it.replace('-', ':');
    return pRange.includes(':') ? pRange : null;
  }).filter(Boolean) as string[];
}

// Bean classes

class AbstractBean {
  serverAddress = '127.0.0.1';
  serverPort = 1080;
  name = '';
  initializeDefaultValues() {
    if (!this.name) this.name = '';
    if (!this.serverAddress) this.serverAddress = '127.0.0.1';
    if (this.serverPort == null) this.serverPort = 1080;
  }
  displayName() {
    return (this.name || `${this.serverAddress}:${this.serverPort}`).trim();
  }
  toUri(): string {
    throw new Error('toUri() not implemented');
  }
}

class StandardV2RayBean extends AbstractBean {
  uuid = '';
  encryption = '';
  type = 'tcp';
  host = '';
  path = '';
  security = 'none';
  sni = '';
  alpn = '';
  utlsFingerprint = '';
  allowInsecure = false;
  realityPubKey = '';
  realityShortId = '';
  packetEncoding = 0;
  wsMaxEarlyData = 0;
  earlyDataHeaderName = '';
  certificates = '';
  enableECH = false;
  echConfig = '';
  enableMux = false;
  muxPadding = false;
  muxType = 0;
  muxConcurrency = 1;
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (!this.uuid) this.uuid = '';
    if (!this.type) this.type = 'tcp';
    if (!this.host) this.host = '';
    if (!this.path) this.path = '';
    if (!this.security) this.security = 'none';
    if (!this.sni) this.sni = '';
    if (!this.alpn) this.alpn = '';
    if (!this.utlsFingerprint) this.utlsFingerprint = '';
    if (this.allowInsecure == null) this.allowInsecure = false;
    if (!this.realityPubKey) this.realityPubKey = '';
    if (!this.realityShortId) this.realityShortId = '';
    if (this.packetEncoding == null) this.packetEncoding = 0;
    if (this.wsMaxEarlyData == null) this.wsMaxEarlyData = 0;
    if (!this.earlyDataHeaderName) this.earlyDataHeaderName = '';
    if (!this.certificates) this.certificates = '';
    if (this.enableECH == null) this.enableECH = false;
    if (!this.echConfig) this.echConfig = '';
    if (this.enableMux == null) this.enableMux = false;
    if (this.muxPadding == null) this.muxPadding = false;
    if (this.muxType == null) this.muxType = 0;
    if (this.muxConcurrency == null) this.muxConcurrency = 1;
  }
  isTLS() {
    return this.security === 'tls' || this.security === 'reality';
  }
  isVLESS() {
    return false;
  }
  toUri(isTrojan = false): string {
    const protocol = isTrojan ? 'trojan' : (this.isVLESS() ? 'vless' : 'vmess');
    if (protocol === 'vmess') {
      const vmessQRCode: any = {
        v: '2',
        ps: this.name,
        add: this.serverAddress,
        port: this.serverPort.toString(),
        id: this.uuid,
        aid: (this as any).alterId?.toString() ?? '0',
        scy: this.encryption || 'auto',
        net: this.type,
        type: 'none',
        host: this.host,
        path: this.path,
        tls: this.isTLS() ? (this.realityPubKey ? 'reality' : 'tls') : 'none',
        sni: this.sni,
        alpn: this.alpn,
        fp: this.utlsFingerprint,
      };
      return `vmess://${b64Encode(JSON.stringify(vmessQRCode))}`;
    }
    const userInfo = isTrojan ? (this as any).password : this.uuid;
    let link = `${protocol}://${encodeURIComponent(userInfo)}@${this.serverAddress}:${this.serverPort}`;
    const params = new URLSearchParams();
    if (this.type !== 'tcp') params.set('type', this.type);
    if (this.security !== 'none') {
      const securityType = this.realityPubKey ? 'reality' : this.security;
      params.set('security', securityType);
      if (this.sni) params.set('sni', this.sni);
      if (this.alpn) params.set('alpn', this.alpn);
      if (this.allowInsecure) params.set('allowInsecure', '1');
      if (this.utlsFingerprint) params.set('fp', this.utlsFingerprint);
      if (securityType === 'reality') {
        if (this.realityPubKey) params.set('pbk', this.realityPubKey);
        if (this.realityShortId) params.set('sid', this.realityShortId);
      }
    }
    if (this.isVLESS() && this.encryption && this.encryption !== 'auto') {
      params.set('flow', this.encryption);
    }
    if (this.type === 'ws' || this.type === 'http') {
      if (this.host) params.set('host', this.host);
      if (this.path) params.set('path', this.path);
    } else if (this.type === 'grpc') {
      if (this.path) params.set('serviceName', this.path);
    }
    const queryString = params.toString();
    if (queryString) link += `?${queryString}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class VMessBean extends StandardV2RayBean {
  alterId = 0;
  isVLESS() {
    return this.alterId === -1;
  }
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (this.alterId == null) this.alterId = 0;
    if (this.isVLESS()) {
      this.encryption = this.encryption || '';
    } else {
      this.encryption = this.encryption || 'auto';
    }
  }
}

class TrojanBean extends StandardV2RayBean {
  password = '';
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (!this.security) this.security = 'tls';
    if (!this.password) this.password = '';
  }
  toUri() {
    return super.toUri(true);
  }
}

class ShadowsocksBean extends AbstractBean {
  method = 'aes-256-gcm';
  password = '';
  plugin = '';
  sUoT = false;
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (!this.method) this.method = 'aes-256-gcm';
    if (!this.password) this.password = '';
    if (!this.plugin) this.plugin = '';
    if (this.sUoT == null) this.sUoT = false;
  }
  toUri() {
    const creds = b64Encode(`${this.method}:${this.password}`, true);
    let link = `ss://${creds}@${this.serverAddress}:${this.serverPort}`;
    const params = new URLSearchParams();
    if (this.plugin) {
      const pluginParts = this.plugin.split(';');
      const pluginName = pluginParts[0];
      const pluginOpts = pluginParts.slice(1).join(';');
      params.set('plugin', `${pluginName};${pluginOpts}`);
    }
    const queryString = params.toString();
    if (queryString) link += `?${queryString}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class SocksBean extends AbstractBean {
  protocol = 2;
  username = '';
  password = '';
  sUoT = false;
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (this.protocol == null) this.protocol = 2;
    if (!this.username) this.username = '';
    if (!this.password) this.password = '';
    if (this.sUoT == null) this.sUoT = false;
  }
  protocolVersionName() {
    switch (this.protocol) {
      case 0: return '4';
      case 1: return '4a';
      default: return '5';
    }
  }
  toUri() {
    const protocolMap: Record<number, string> = { 0: 'socks4', 1: 'socks4a', 2: 'socks' };
    const protocol = protocolMap[this.protocol] || 'socks';
    let userInfo = '';
    if (this.username) {
      userInfo += encodeURIComponent(this.username);
      if (this.password) userInfo += `:${encodeURIComponent(this.password)}`;
      userInfo += '@';
    }
    let link = `${protocol}://${userInfo}${this.serverAddress}:${this.serverPort}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class HttpBean extends StandardV2RayBean {
  username = '';
  password = '';
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (!this.username) this.username = '';
    if (!this.password) this.password = '';
  }
  toUri() {
    const protocol = this.isTLS() ? 'https' : 'http';
    let userInfo = '';
    if (this.username) {
      userInfo += encodeURIComponent(this.username);
      if (this.password) userInfo += `:${encodeURIComponent(this.password)}`;
      userInfo += '@';
    }
    let link = `${protocol}://${userInfo}${this.serverAddress}:${this.serverPort}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class HysteriaBean extends AbstractBean {
  protocolVersion = 2;
  serverPorts = '443';
  authPayload = '';
  obfuscation = '';
  sni = '';
  uploadMbps = 0;
  downloadMbps = 0;
  allowInsecure = false;
  alpn = '';
  protocol = 0;
  authPayloadType = 1;
  caText = '';
  streamReceiveWindow = 0;
  connectionReceiveWindow = 0;
  disableMtuDiscovery = false;
  hopInterval = 10;
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (this.protocolVersion == null) this.protocolVersion = 2;
    if (!this.serverPorts) this.serverPorts = '443';
    if (!this.authPayload) this.authPayload = '';
    if (!this.obfuscation) this.obfuscation = '';
    if (!this.sni) this.sni = '';
    if (this.allowInsecure == null) this.allowInsecure = false;
    if (this.protocolVersion === 1) {
      if (this.uploadMbps == null) this.uploadMbps = 10;
      if (this.downloadMbps == null) this.downloadMbps = 50;
      if (!this.alpn) this.alpn = '';
    } else {
      if (this.uploadMbps == null) this.uploadMbps = 0;
      if (this.downloadMbps == null) this.downloadMbps = 0;
    }
    if (this.protocol == null) this.protocol = 0;
    if (this.authPayloadType == null) this.authPayloadType = 1;
    if (!this.caText) this.caText = '';
    if (this.streamReceiveWindow == null) this.streamReceiveWindow = 0;
    if (this.connectionReceiveWindow == null) this.connectionReceiveWindow = 0;
    if (this.disableMtuDiscovery == null) this.disableMtuDiscovery = false;
    if (this.hopInterval == null) this.hopInterval = 10;
  }
  toUri() {
    const protocol = this.protocolVersion === 2 ? 'hy2' : 'hysteria';
    const port = this.serverPorts.split(',')[0].split('-')[0];
    let userInfo = '';
    if (this.protocolVersion === 2 && this.authPayload) {
      userInfo = `${encodeURIComponent(this.authPayload)}@`;
    }
    let link = `${protocol}://${userInfo}${this.serverAddress}:${port}`;
    const params = new URLSearchParams();
    if (this.sni) params.set(this.protocolVersion === 1 ? 'peer' : 'sni', this.sni);
    if (this.allowInsecure) params.set('insecure', '1');
    if (this.protocolVersion === 1) {
      if (this.authPayload) params.set('auth', this.authPayload);
      params.set('upmbps', String(this.uploadMbps));
      params.set('downmbps', String(this.downloadMbps));
      if (this.alpn) params.set('alpn', this.alpn);
      if (this.obfuscation) params.set('obfsParam', this.obfuscation);
      const p = { 1: 'faketcp', 2: 'wechat-video' }[this.protocol];
      if (p) params.set('protocol', p);
    } else {
      if (this.obfuscation) params.set('obfs-password', this.obfuscation);
    }
    const queryString = params.toString();
    if (queryString) link += `?${queryString}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class TuicBean extends AbstractBean {
  protocolVersion = 5;
  uuid = '';
  token = '';
  sni = '';
  congestionController = 'cubic';
  udpRelayMode = 'native';
  alpn = '';
  allowInsecure = false;
  disableSNI = false;
  reduceRTT = false;
  caText = '';
  mtu = 1400;
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (this.protocolVersion == null) this.protocolVersion = 5;
    if (!this.uuid) this.uuid = '';
    if (!this.token) this.token = '';
    if (!this.sni) this.sni = '';
    if (!this.congestionController) this.congestionController = 'cubic';
    if (!this.udpRelayMode) this.udpRelayMode = 'native';
    if (!this.alpn) this.alpn = '';
    if (this.allowInsecure == null) this.allowInsecure = false;
    if (this.disableSNI == null) this.disableSNI = false;
    if (this.reduceRTT == null) this.reduceRTT = false;
    if (!this.caText) this.caText = '';
    if (this.mtu == null) this.mtu = 1400;
  }
  toUri() {
    let link = `tuic://${encodeURIComponent(this.uuid)}:${encodeURIComponent(this.token)}@${this.serverAddress}:${this.serverPort}`;
    const params = new URLSearchParams();
    if (this.sni) params.set('sni', this.sni);
    if (this.congestionController !== 'cubic') params.set('congestion_control', this.congestionController);
    if (this.udpRelayMode !== 'native') params.set('udp_relay_mode', this.udpRelayMode);
    if (this.alpn) params.set('alpn', this.alpn);
    if (this.allowInsecure) params.set('allow_insecure', '1');
    if (this.disableSNI) params.set('disable_sni', '1');
    if (this.reduceRTT) params.set('reduce_rtt', '1');
    const queryString = params.toString();
    if (queryString) link += `?${queryString}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class WireGuardBean extends AbstractBean {
  localAddress = '';
  privateKey = '';
  peerPublicKey = '';
  peerPreSharedKey = '';
  mtu = 1420;
  reserved = '';
  initializeDefaultValues() {
    super.initializeDefaultValues();
    if (!this.localAddress) this.localAddress = '';
    if (!this.privateKey) this.privateKey = '';
    if (!this.peerPublicKey) this.peerPublicKey = '';
    if (!this.peerPreSharedKey) this.peerPreSharedKey = '';
    if (this.mtu == null) this.mtu = 1420;
    if (!this.reserved) this.reserved = '';
  }
  toUri() {
    let link = `wg://${encodeURIComponent(this.privateKey)}@${this.serverAddress}:${this.serverPort}`;
    const params = new URLSearchParams();
    params.set('public_key', this.peerPublicKey);
    if (this.peerPreSharedKey) params.set('preshared_key', this.peerPreSharedKey);
    if (this.localAddress) params.set('address', this.localAddress.split(',')[0]);
    if (this.reserved) params.set('reserved', this.reserved);
    if (this.mtu !== 1420) params.set('mtu', String(this.mtu));
    const queryString = params.toString();
    if (queryString) link += `?${queryString}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

class SSHBean extends AbstractBean {
  username = 'root';
  password = '';
  authType = 'password';
  privateKey = '';
  privateKeyPassphrase = '';
  publicKey = '';
  initializeDefaultValues() {
    if (this.serverPort == null || this.serverPort === 1080) this.serverPort = 22;
    super.initializeDefaultValues();
    if (!this.username) this.username = 'root';
    if (!this.password) this.password = '';
    if (!this.authType) this.authType = 'password';
    if (!this.privateKey) this.privateKey = '';
    if (!this.privateKeyPassphrase) this.privateKeyPassphrase = '';
    if (!this.publicKey) this.publicKey = '';
  }
  toUri() {
    let userInfo = encodeURIComponent(this.username);
    if (this.authType === 'password' && this.password) userInfo += `:${encodeURIComponent(this.password)}`;
    let link = `ssh://${userInfo}@${this.serverAddress}:${this.serverPort}`;
    const params = new URLSearchParams();
    if (this.authType === 'private_key') {
      params.set('private_key', this.privateKey);
      if (this.privateKeyPassphrase) params.set('passphrase', this.privateKeyPassphrase);
    }
    if (this.publicKey) params.set('host_key', this.publicKey);
    const queryString = params.toString();
    if (queryString) link += `?${queryString}`;
    if (this.name) link += `#${encodeURIComponent(this.name)}`;
    return link;
  }
}

// Parsers

function parseV2RayN(link: string): VMessBean {
  const data = b64Decode(link.substring('vmess://'.length));
  const vmessQRCode = JSON.parse(data);
  const bean = new VMessBean();
  bean.name = vmessQRCode.ps || '';
  bean.serverAddress = vmessQRCode.add || '';
  bean.serverPort = parseInt(vmessQRCode.port, 10) || 443;
  bean.uuid = vmessQRCode.id || '';
  bean.alterId = parseInt(vmessQRCode.aid, 10) || 0;
  bean.encryption = vmessQRCode.scy || 'auto';
  bean.type = vmessQRCode.net || 'tcp';
  bean.host = vmessQRCode.host || '';
  bean.path = vmessQRCode.path || '';
  if (vmessQRCode.tls === 'tls' || vmessQRCode.tls === 'reality') {
    bean.security = vmessQRCode.tls === 'reality' ? 'reality' : 'tls';
    bean.sni = vmessQRCode.sni || bean.host;
    bean.alpn = vmessQRCode.alpn || '';
    bean.utlsFingerprint = vmessQRCode.fp || '';
  }
  return bean;
}

function parseDuckSoft(url: URL, bean: VMessBean | TrojanBean): VMessBean | TrojanBean {
  bean.serverAddress = url.hostname;
  bean.serverPort = parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80);
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  if (bean instanceof TrojanBean) {
    (bean as TrojanBean).password = decodeURIComponent(url.username);
  } else {
    bean.uuid = decodeURIComponent(url.username);
  }
  bean.type = url.searchParams.get('type') || 'tcp';
  bean.security = url.searchParams.get('security') || (bean instanceof TrojanBean ? 'tls' : 'none');
  if (bean.security === 'tls' || bean.security === 'reality') {
    bean.allowInsecure = url.searchParams.get('allowInsecure') === '1' || url.searchParams.get('allowInsecure') === 'true';
    bean.sni = url.searchParams.get('sni') || url.searchParams.get('peer') || url.searchParams.get('host') || '';
    bean.alpn = url.searchParams.get('alpn') || '';
    bean.utlsFingerprint = url.searchParams.get('fp') || '';
    if (bean.security === 'reality' || url.searchParams.get('pbk')) {
      bean.security = 'reality';
      bean.realityPubKey = url.searchParams.get('pbk') || '';
      bean.realityShortId = url.searchParams.get('sid') || '';
    }
  }
  switch (bean.type) {
    case 'ws':
      bean.host = url.searchParams.get('host') || '';
      bean.path = url.searchParams.get('path') || '/';
      break;
    case 'http':
      bean.host = url.searchParams.get('host') || '';
      bean.path = url.searchParams.get('path') || '/';
      break;
    case 'grpc':
      bean.path = url.searchParams.get('serviceName') || '';
      break;
  }
  if (bean instanceof VMessBean && bean.isVLESS()) {
    bean.encryption = url.searchParams.get('flow') || '';
  }
  return bean;
}

function parseV2Ray(link: string): VMessBean | TrojanBean {
  const protocol = link.split('://')[0];
  if (protocol === 'vmess' && !link.includes('@')) {
    try {
      return parseV2RayN(link);
    } catch {}
  }
  const bean = protocol === 'trojan' ? new TrojanBean() : new VMessBean();
  if (protocol === 'vless') bean.alterId = -1;
  const urlString = link.replace(`${protocol}://`, 'https://');
  const url = new URL(urlString);
  return parseDuckSoft(url, bean);
}

function parseShadowsocks(link: string): ShadowsocksBean {
  const bean = new ShadowsocksBean();
  const hashIndex = link.indexOf('#');
  const uriPart = hashIndex === -1 ? link.substring(5) : link.substring(5, hashIndex);
  bean.name = hashIndex === -1 ? '' : decodeURIComponent(link.substring(hashIndex + 1));
  if (!uriPart.includes('@')) {
    const decoded = b64Decode(uriPart);
    const atIndex = decoded.indexOf('@');
    if (atIndex === -1) throw new Error('Invalid Base64-encoded SS format');
    const credsPart = decoded.substring(0, atIndex);
    const serverPart = decoded.substring(atIndex + 1);
    const [method, password] = credsPart.split(':');
    const [serverAddress, serverPortStr] = serverPart.split(':');
    bean.method = method;
    bean.password = password;
    bean.serverAddress = serverAddress;
    bean.serverPort = parseInt(serverPortStr, 10) || 443;
  } else {
    const url = new URL(`https://${uriPart}`);
    bean.serverAddress = url.hostname;
    bean.serverPort = parseInt(url.port, 10) || 443;
    bean.plugin = url.searchParams.get('plugin') || '';
    if (url.password) {
      bean.method = decodeURIComponent(url.username);
      bean.password = decodeURIComponent(url.password);
    } else {
      const decoded = b64Decode(decodeURIComponent(url.username));
      const [method, password] = decoded.split(':');
      bean.method = method;
      bean.password = password;
    }
  }
  if (bean.plugin.startsWith('simple-obfs')) {
    bean.plugin = bean.plugin.replace('simple-obfs', 'obfs-local');
  }
  return bean;
}

function parseSocks(link: string): SocksBean {
  const bean = new SocksBean();
  const protocol = link.split('://')[0];
  switch (protocol) {
    case 'socks4': bean.protocol = 0; break;
    case 'socks4a': bean.protocol = 1; break;
    default: bean.protocol = 2; break;
  }
  const url = new URL(link.replace(protocol, 'http'));
  bean.serverAddress = url.hostname;
  bean.serverPort = parseInt(url.port, 10) || 1080;
  bean.username = decodeURIComponent(url.username);
  bean.password = decodeURIComponent(url.password);
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  if (!bean.password && bean.username) {
    try {
      const decoded = b64Decode(bean.username);
      if (decoded.includes(':')) {
        [bean.username, bean.password] = decoded.split(':', 2);
      }
    } catch {}
  }
  return bean;
}

function parseHttp(link: string): HttpBean {
  const bean = new HttpBean();
  const url = new URL(link);
  bean.security = url.protocol === 'https:' ? 'tls' : 'none';
  bean.serverAddress = url.hostname;
  bean.serverPort = parseInt(url.port, 10) || (bean.isTLS() ? 443 : 80);
  bean.username = decodeURIComponent(url.username);
  bean.password = decodeURIComponent(url.password);
  bean.sni = url.searchParams.get('sni') || '';
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  return bean;
}

function parseHysteria1(url: URL): HysteriaBean {
  const bean = new HysteriaBean();
  bean.protocolVersion = 1;
  bean.serverAddress = url.hostname;
  bean.serverPorts = url.port || '443';
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  bean.serverPorts = url.searchParams.get('mport') || bean.serverPorts;
  bean.sni = url.searchParams.get('peer') || '';
  bean.authPayload = url.searchParams.get('auth') || '';
  if (bean.authPayload) bean.authPayloadType = 1;
  bean.allowInsecure = url.searchParams.get('insecure') === '1';
  bean.uploadMbps = safeParseInt(url.searchParams.get('upmbps'), 10);
  bean.downloadMbps = safeParseInt(url.searchParams.get('downmbps'), 50);
  bean.alpn = url.searchParams.get('alpn') || '';
  bean.obfuscation = url.searchParams.get('obfsParam') || '';
  const protocolStr = url.searchParams.get('protocol');
  if (protocolStr === 'faketcp') bean.protocol = 1;
  if (protocolStr === 'wechat-video') bean.protocol = 2;
  return bean;
}

function parseHysteria2(url: URL): HysteriaBean {
  const bean = new HysteriaBean();
  bean.protocolVersion = 2;
  bean.serverAddress = url.hostname;
  bean.serverPorts = url.port || '443';
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  if (url.username) {
    bean.authPayload = decodeURIComponent(url.username);
    if (url.password) bean.authPayload += `:${decodeURIComponent(url.password)}`;
  }
  bean.serverPorts = url.searchParams.get('mport') || bean.serverPorts;
  bean.sni = url.searchParams.get('sni') || '';
  bean.allowInsecure = url.searchParams.get('insecure') === '1';
  bean.obfuscation = url.searchParams.get('obfs-password') || '';
  return bean;
}

function parseHysteria(link: string): HysteriaBean {
  const protocol = link.split('://')[0].toLowerCase();
  const urlString = link.replace(protocol + '://', 'https://');
  const url = new URL(urlString);
  return protocol === 'hysteria' ? parseHysteria1(url) : parseHysteria2(url);
}

function parseTuic(link: string): TuicBean {
  const bean = new TuicBean();
  const url = new URL(link.replace('tuic://', 'https://'));
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  bean.uuid = decodeURIComponent(url.username);
  bean.token = decodeURIComponent(url.password);
  bean.serverAddress = url.hostname;
  bean.serverPort = parseInt(url.port, 10) || 443;
  bean.sni = url.searchParams.get('sni') || '';
  bean.congestionController = url.searchParams.get('congestion_control') || 'cubic';
  bean.udpRelayMode = url.searchParams.get('udp_relay_mode') || 'native';
  bean.alpn = url.searchParams.get('alpn') || '';
  bean.allowInsecure = url.searchParams.get('allow_insecure') === '1';
  bean.disableSNI = url.searchParams.get('disable_sni') === '1';
  bean.reduceRTT = url.searchParams.get('reduce_rtt') === '1';
  return bean;
}

function parseWireGuard(link: string): WireGuardBean {
  const bean = new WireGuardBean();
  const url = new URL(link.replace('wg://', 'http://'));
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  bean.privateKey = decodeURIComponent(url.username);
  bean.serverAddress = url.hostname;
  bean.serverPort = parseInt(url.port, 10) || 51820;
  bean.peerPublicKey = url.searchParams.get('public_key') || url.searchParams.get('peer_public_key') || '';
  bean.peerPreSharedKey = url.searchParams.get('preshared_key') || '';
  bean.localAddress = url.searchParams.get('address') || '';
  const mtu = url.searchParams.get('mtu');
  if (mtu) bean.mtu = parseInt(mtu, 10);
  bean.reserved = url.searchParams.get('reserved') || '';
  return bean;
}

function parseSSH(link: string): SSHBean {
  const bean = new SSHBean();
  const url = new URL(link.replace('ssh://', 'http://'));
  bean.name = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
  bean.serverAddress = url.hostname;
  bean.serverPort = parseInt(url.port, 10) || 22;
  bean.username = decodeURIComponent(url.username);
  bean.password = decodeURIComponent(url.password) || url.searchParams.get('password') || '';
  bean.privateKey = url.searchParams.get('private_key') || '';
  bean.privateKeyPassphrase = url.searchParams.get('passphrase') || '';
  bean.publicKey = url.searchParams.get('host_key') || '';
  bean.authType = bean.privateKey ? 'private_key' : 'password';
  return bean;
}

function parseLink(link: string): any | null {
  if (!link || typeof link !== 'string') return null;
  const protocol = link.split('://')[0].toLowerCase();
  try {
    switch (protocol) {
      case 'vmess':
      case 'vless':
      case 'trojan':
        return parseV2Ray(link);
      case 'ss':
        return parseShadowsocks(link);
      case 'socks':
      case 'socks4':
      case 'socks4a':
      case 'socks5':
        return parseSocks(link);
      case 'http':
      case 'https':
        return parseHttp(link);
      case 'hysteria':
      case 'hy2':
      case 'hysteria2':
        return parseHysteria(link);
      case 'tuic':
        return parseTuic(link);
      case 'wg':
        return parseWireGuard(link);
      case 'ssh':
        return parseSSH(link);
      default:
        return null;
    }
  } catch (e) {
    console.warn(`[!] Failed to parse link "${link}": ${e}`);
    return null;
  }
}

function postProcessBean(bean: any, options: any = {}): any {
  bean.initializeDefaultValues();
  if (bean instanceof StandardV2RayBean) {
    if (bean.isTLS() && !bean.sni && bean.host && !isIpAddress(bean.host)) {
      bean.sni = bean.host;
    }
  }
  return bean;
}

function parseRawContent(content: string): any[] {
  try {
    if (content.includes('proxies:')) {
      const config = yaml.load(content) as any;
      if (config && config.proxies) {
        const proxies = config.proxies as any[];
        const beans: any[] = [];
        const globalClientFingerprint = config['global-client-fingerprint'] || '';
        for (const proxy of proxies) {
          let bean: any = null;
          try {
            switch (proxy.type) {
              case 'socks5': {
                const b = new SocksBean();
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPort = proxy.port;
                b.username = proxy.username || '';
                b.password = proxy.password || '';
                b.protocol = 2;
                bean = b;
                break;
              }
              case 'http': {
                const b = new HttpBean();
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPort = proxy.port;
                b.username = proxy.username || '';
                b.password = proxy.password || '';
                if (proxy.tls) { b.security = 'tls'; b.sni = proxy.sni || ''; b.allowInsecure = proxy['skip-cert-verify'] || false; }
                bean = b;
                break;
              }
              case 'ss': {
                const b = new ShadowsocksBean();
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPort = proxy.port;
                b.password = proxy.password;
                b.method = proxy.cipher === 'dummy' ? 'none' : proxy.cipher;
                if (proxy.plugin && proxy['plugin-opts']) {
                  const opts = proxy['plugin-opts'] as any;
                  let pluginStr = `${proxy.plugin};`;
                  pluginStr += Object.entries(opts).map(([k, v]) => `${k}=${v}`).join(';');
                  b.plugin = pluginStr;
                }
                bean = b;
                break;
              }
              case 'vmess':
              case 'vless':
              case 'trojan': {
                const b = proxy.type === 'trojan' ? new TrojanBean() : new VMessBean();
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPort = proxy.port;
                if (proxy.type === 'vless') { b.alterId = -1; b.packetEncoding = 2; if (String(proxy.flow).includes('xtls-rprx-vision')) b.encryption = 'xtls-rprx-vision'; }
                if (proxy.type === 'trojan') b.password = proxy.password;
                if (proxy.type === 'vmess') { b.uuid = proxy.uuid; b.alterId = proxy.alterId; b.encryption = proxy.cipher; }
                b.uuid = proxy.uuid || b.uuid;
                b.allowInsecure = proxy['skip-cert-verify'] || false;
                b.sni = proxy.servername || proxy.sni || '';
                b.alpn = (proxy.alpn || []).join(',');
                b.utlsFingerprint = proxy['client-fingerprint'] || '';
                if (proxy.tls) b.security = 'tls';
                if (proxy['reality-opts']) {
                  b.security = 'reality';
                  b.realityPubKey = proxy['reality-opts']['public-key'] || '';
                  b.realityShortId = proxy['reality-opts']['short-id'] || '';
                }
                b.type = proxy.network || 'tcp';
                if (b.type === 'h2') b.type = 'http';
                const wsOpts = proxy['ws-opts'] || {};
                if (wsOpts.path) b.path = wsOpts.path;
                if (wsOpts.headers && wsOpts.headers.Host) b.host = wsOpts.headers.Host;
                const grpcOpts = proxy['grpc-opts'] || {};
                if (grpcOpts['grpc-service-name']) b.path = grpcOpts['grpc-service-name'];
                bean = b;
                break;
              }
              case 'hysteria': {
                const b = new HysteriaBean();
                b.protocolVersion = 1;
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPorts = String(proxy.port);
                if (proxy.ports) b.serverPorts = String(proxy.ports);
                b.uploadMbps = parseInt(String(proxy.up).split(' ')[0], 10) || 10;
                b.downloadMbps = parseInt(String(proxy.down).split(' ')[0], 10) || 50;
                b.authPayload = proxy['auth_str'] || '';
                if (b.authPayload) b.authPayloadType = 1;
                b.obfuscation = proxy.obfs || '';
                b.protocol = proxy.protocol === 'faketcp' ? 1 : 0;
                b.sni = proxy.sni || '';
                b.allowInsecure = proxy['skip-cert-verify'] || false;
                b.alpn = (proxy.alpn || []).join(',');
                bean = b;
                break;
              }
              case 'hysteria2': {
                const b = new HysteriaBean();
                b.protocolVersion = 2;
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPorts = String(proxy.port);
                if (proxy.ports) b.serverPorts = String(proxy.ports);
                b.uploadMbps = parseInt(String(proxy.up).split(' ')[0], 10) || 0;
                b.downloadMbps = parseInt(String(proxy.down).split(' ')[0], 10) || 0;
                b.authPayload = proxy.password || '';
                b.obfuscation = proxy['obfs-password'] || '';
                b.sni = proxy.sni || '';
                b.allowInsecure = proxy['skip-cert-verify'] || false;
                bean = b;
                break;
              }
              case 'tuic': {
                const b = new TuicBean();
                b.name = proxy.name;
                b.serverAddress = proxy.server;
                b.serverPort = proxy.port;
                b.uuid = proxy.uuid || '';
                b.token = proxy.password || '';
                if (proxy.token) { b.protocolVersion = 4; b.token = proxy.token; }
                b.sni = proxy.sni || '';
                b.alpn = (proxy.alpn || []).join(',');
                b.allowInsecure = proxy['skip-cert-verify'] || false;
                b.disableSNI = proxy['disable-sni'] || false;
                b.congestionController = proxy['congestion-controller'] || 'cubic';
                b.udpRelayMode = proxy['udp-relay-mode'] || 'native';
                b.reduceRTT = proxy['reduce-rtt'] || false;
                if (proxy.ip && !isIpAddress(b.serverAddress)) { b.sni = b.serverAddress; b.serverAddress = proxy.ip; }
                bean = b;
                break;
              }
            }
            if (bean) {
              if (bean instanceof StandardV2RayBean && bean.security === 'reality' && !bean.utlsFingerprint && globalClientFingerprint) {
                bean.utlsFingerprint = globalClientFingerprint;
              }
              beans.push(bean);
            }
          } catch (e) {
            console.warn(`[!] Failed to parse a proxy from Clash config: ${proxy.name || proxy.server}. Error: ${e}`);
          }
        }
        return beans;
      }
    }
  } catch {}
  try {
    if (content.includes('[Interface]') && content.includes('[Peer]')) {
      const lines = content.split('\n').map(l => l.trim());
      let interfaceSection: any = {};
      let currentPeer: any = null;
      let peers: any[] = [];
      let inInterface = false, inPeer = false;
      for (const line of lines) {
        if (line.startsWith('[Interface]')) { inInterface = true; inPeer = false; continue; }
        if (line.startsWith('[Peer]')) { inPeer = true; inInterface = false; if (currentPeer) peers.push(currentPeer); currentPeer = {}; continue; }
        if (!line || line.startsWith('#')) continue;
        const [key, value] = line.split('=').map(s => s.trim());
        if (inInterface) {
          if (key === 'Address') interfaceSection.Address = (interfaceSection.Address || []).concat(value.split(','));
          else interfaceSection[key] = value;
        } else if (inPeer && currentPeer) {
          currentPeer[key] = value;
        }
      }
      if (currentPeer) peers.push(currentPeer);
      if (!interfaceSection.PrivateKey) return [];
      const wires: WireGuardBean[] = [];
      for (const peer of peers) {
        if (!peer.Endpoint || !peer.PublicKey) continue;
        const [serverAddress, serverPort] = peer.Endpoint.split(':');
        const bean = new WireGuardBean();
        bean.privateKey = interfaceSection.PrivateKey;
        bean.localAddress = (interfaceSection.Address || []).join(',');
        bean.mtu = safeParseInt(interfaceSection.MTU, 1420);
        bean.serverAddress = serverAddress;
        bean.serverPort = safeParseInt(serverPort);
        bean.peerPublicKey = peer.PublicKey;
        bean.peerPreSharedKey = peer.PresharedKey || '';
        wires.push(bean);
      }
      if (wires.length > 0) return wires;
    }
  } catch {}
  try {
    const decoded = b64Decode(content);
    const links = decoded.split(/[\n\s]+/).filter(Boolean);
    if (links.some(l => l.includes('://'))) return links.map(parseLink).filter(Boolean);
  } catch {}
  const links = content.split(/[\n\s]+/).filter(Boolean);
  if (links.some(l => l.includes('://'))) return links.map(parseLink).filter(Boolean);
  return [];
}

// Outbound builders

function buildSingboxMux(bean: any): any {
  if (!bean.enableMux) return undefined;
  return { enabled: true, protocol: bean.muxType === 1 ? 'h2mux' : 'smux', max_streams: bean.muxConcurrency, padding: bean.muxPadding };
}

function buildSingboxTLS(bean: any, globalAllowInsecure = false): any {
  if (!bean.isTLS()) return undefined;
  const tls: any = { enabled: true, insecure: bean.allowInsecure || globalAllowInsecure };
  if (bean.sni) tls.server_name = bean.sni;
  if (bean.alpn) tls.alpn = listByLineOrComma(bean.alpn);
  if (bean.certificates) tls.certificate = bean.certificates;
  let fp = bean.utlsFingerprint;
  if (bean.security === 'reality') {
    tls.reality = { enabled: true, public_key: bean.realityPubKey, short_id: bean.realityShortId };
    if (!fp) fp = 'chrome';
  }
  if (fp) tls.utls = { enabled: true, fingerprint: fp };
  if (bean.enableECH && bean.echConfig) tls.ech = { enabled: true, config: listByLineOrComma(bean.echConfig) };
  return tls;
}

function buildSingboxStreamSettings(bean: any): any {
  switch (bean.type) {
    case 'tcp': return undefined;
    case 'ws': {
      const ws: any = { type: 'ws', headers: {} };
      if (bean.host) ws.headers.Host = bean.host;
      if (bean.path && bean.path.includes('?ed=')) {
        ws.path = bean.path.substring(0, bean.path.indexOf('?ed='));
        ws.max_early_data = parseInt(bean.path.substring(bean.path.indexOf('?ed=') + 4), 10) || 2048;
        ws.early_data_header_name = 'Sec-WebSocket-Protocol';
      } else {
        ws.path = bean.path || '/';
      }
      if (bean.wsMaxEarlyData > 0) ws.max_early_data = bean.wsMaxEarlyData;
      if (bean.earlyDataHeaderName) ws.early_data_header_name = bean.earlyDataHeaderName;
      return ws;
    }
    case 'http': {
      const http: any = { type: 'http', path: bean.path || '/' };
      if (bean.host) http.host = listByLineOrComma(bean.host);
      if (!bean.isTLS()) http.method = 'GET';
      return http;
    }
    case 'grpc':
      return { type: 'grpc', service_name: bean.path };
    case 'quic':
      return { type: 'quic' };
    case 'httpupgrade':
      return { type: 'httpupgrade', host: bean.host, path: bean.path };
    default:
      return undefined;
  }
}

function buildSingboxVMess(bean: any, options: any): any {
  const base: any = {
    tag: bean.displayName(),
    server: bean.serverAddress,
    server_port: bean.serverPort,
    uuid: bean.uuid,
    multiplex: buildSingboxMux(bean),
    tls: buildSingboxTLS(bean, options.globalAllowInsecure),
    transport: buildSingboxStreamSettings(bean),
  };
  let packetEncodingStr = '';
  if (bean.packetEncoding === 1) packetEncodingStr = 'packetaddr';
  if (bean.packetEncoding === 2) packetEncodingStr = 'xudp';
  if (bean.isVLESS()) {
    const vless: any = { ...base, type: 'vless', packet_encoding: packetEncodingStr || undefined };
    if (bean.encryption && bean.encryption !== 'auto') vless.flow = bean.encryption;
    return vless;
  }
  return { ...base, type: 'vmess', alter_id: bean.alterId, security: bean.encryption || 'auto', packet_encoding: packetEncodingStr || undefined };
}

function buildSingboxTrojan(bean: any, options: any): any {
  return {
    tag: bean.displayName(),
    type: 'trojan',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    password: bean.password,
    multiplex: buildSingboxMux(bean),
    tls: buildSingboxTLS(bean, options.globalAllowInsecure),
    transport: buildSingboxStreamSettings(bean),
  };
}

function buildSingboxShadowsocks(bean: any): any {
  const outbound: any = {
    tag: bean.displayName(),
    type: 'shadowsocks',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    method: bean.method,
    password: bean.password,
  };
  if (bean.plugin) {
    const parts = bean.plugin.split(';');
    outbound.plugin = parts[0];
    outbound.plugin_opts = parts.slice(1).join(';');
  }
  if (bean.sUoT) outbound.udp_over_tcp = true;
  return outbound;
}

function buildSingboxSocks(bean: any): any {
  const outbound: any = {
    tag: bean.displayName(),
    type: 'socks',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    version: bean.protocolVersionName(),
    username: bean.username || undefined,
    password: bean.password || undefined,
  };
  if (bean.sUoT) outbound.udp_over_tcp = true;
  return outbound;
}

function buildSingboxHttp(bean: any, options: any): any {
  return {
    tag: bean.displayName(),
    type: 'http',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    username: bean.username || undefined,
    password: bean.password || undefined,
    tls: buildSingboxTLS(bean, options.globalAllowInsecure),
  };
}

function buildSingboxHysteria(bean: any, options: any): any {
  const tls: any = {
    enabled: true,
    insecure: bean.allowInsecure || options.globalAllowInsecure,
    server_name: bean.sni || undefined,
    certificate: bean.caText || undefined,
  };
  if (bean.protocolVersion === 1) {
    if (bean.alpn) tls.alpn = listByLineOrComma(bean.alpn);
    const outbound: any = {
      tag: bean.displayName(),
      type: 'hysteria',
      server: bean.serverAddress,
      up_mbps: bean.uploadMbps,
      down_mbps: bean.downloadMbps,
      obfs: bean.obfuscation || undefined,
      auth_str: bean.authPayloadType === 1 ? bean.authPayload : undefined,
      auth: bean.authPayloadType === 2 ? bean.authPayload : undefined,
      hop_interval: `${bean.hopInterval}s`,
      disable_mtu_discovery: bean.disableMtuDiscovery,
      tls,
    };
    if (isMultiPort(bean.serverPorts)) outbound.server_ports = hopPortsToSingboxList(bean.serverPorts);
    else outbound.server_port = safeParseInt(bean.serverPorts);
    if (bean.streamReceiveWindow > 0) outbound.recv_window_conn = bean.streamReceiveWindow;
    if (bean.connectionReceiveWindow > 0) outbound.recv_window = bean.connectionReceiveWindow;
    return outbound;
  }
  tls.alpn = ['h3'];
  const obfs = bean.obfuscation ? { type: 'salamander', password: bean.obfuscation } : undefined;
  const outbound: any = {
    tag: bean.displayName(),
    type: 'hysteria2',
    server: bean.serverAddress,
    up_mbps: bean.uploadMbps,
    down_mbps: bean.downloadMbps,
    password: bean.authPayload,
    obfs,
    tls,
  };
  if (isMultiPort(bean.serverPorts)) outbound.server_ports = hopPortsToSingboxList(bean.serverPorts);
  else outbound.server_port = safeParseInt(bean.serverPorts);
  return outbound;
}

function buildSingboxTuic(bean: any, options: any): any {
  return {
    tag: bean.displayName(),
    type: 'tuic',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    uuid: bean.uuid,
    password: bean.token,
    congestion_control: bean.congestionController,
    zero_rtt_handshake: bean.reduceRTT,
    tls: {
      enabled: true,
      insecure: bean.allowInsecure || options.globalAllowInsecure,
      server_name: bean.sni || undefined,
      alpn: listByLineOrComma(bean.alpn),
      disable_sni: bean.disableSNI,
      certificate: bean.caText || undefined,
    },
  };
}

function buildSingboxWireguard(bean: any): any {
  const outbound: any = {
    tag: bean.displayName(),
    type: 'wireguard',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    local_address: listByLineOrComma(bean.localAddress),
    private_key: bean.privateKey,
    peer_public_key: bean.peerPublicKey,
    mtu: bean.mtu,
  };
  if (bean.peerPreSharedKey) outbound.pre_shared_key = bean.peerPreSharedKey;
  if (bean.reserved) outbound.reserved = genWgReserved(bean.reserved);
  return outbound;
}

function buildSingboxSSH(bean: any): any {
  const outbound: any = {
    tag: bean.displayName(),
    type: 'ssh',
    server: bean.serverAddress,
    server_port: bean.serverPort,
    user: bean.username,
  };
  if (bean.publicKey) outbound.host_key = listByLineOrComma(bean.publicKey);
  if (bean.authType === 'private_key') {
    outbound.private_key = bean.privateKey;
    outbound.private_key_passphrase = bean.privateKeyPassphrase || undefined;
  } else {
    outbound.password = bean.password;
  }
  return outbound;
}

function buildSingboxOutbound(bean: any, options: any): any {
  if (bean instanceof VMessBean) return buildSingboxVMess(bean, options);
  if (bean instanceof TrojanBean) return buildSingboxTrojan(bean, options);
  if (bean instanceof ShadowsocksBean) return buildSingboxShadowsocks(bean, options);
  if (bean instanceof SocksBean) return buildSingboxSocks(bean, options);
  if (bean instanceof HttpBean) return buildSingboxHttp(bean, options);
  if (bean instanceof HysteriaBean) return buildSingboxHysteria(bean, options);
  if (bean instanceof TuicBean) return buildSingboxTuic(bean, options);
  if (bean instanceof WireGuardBean) return buildSingboxWireguard(bean, options);
  if (bean instanceof SSHBean) return buildSingboxSSH(bean, options);
  throw new Error(`Unsupported bean type: ${bean?.constructor?.name}`);
}

// Main convert function for the page

export async function convert(input: string): Promise<string> {
  const beans = parseRawContent(input);
  const outbounds: any[] = [];
  for (let bean of beans) {
    try {
      bean = postProcessBean(bean, {});
      const sb = buildSingboxOutbound(bean, { globalAllowInsecure: false });
      outbounds.push(sb);
    } catch (e) {
      console.warn(`[!] Failed to convert bean "${bean.displayName()}": ${e}`);
    }
  }
  return yaml.dump({ outbounds });
}
