function normalizeMTProxySecret(secret) {
  if (!secret || typeof secret !== 'string') return secret;
  const hex = secret.replace(/\s/g, '').toLowerCase();
  if (!/^[0-9a-f]+$/.test(hex)) return secret;
  if (hex.length <= 32) return hex;
  return hex.slice(0, 32);
}

function parseMTProxyLink(s) {
  if (!s || typeof s !== 'string') return null;
  s = s.trim();
  try {
    if (s.startsWith('http')) {
      const u = new URL(s);
      const server = u.searchParams.get('server') || '';
      const port = parseInt(u.searchParams.get('port') || '0', 10);
      const secret = (u.searchParams.get('secret') || '').trim();
      if (server && port && secret) return { server, port, secret };
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export function getTelegramProxy() {
  const mtLink = process.env.TELEGRAM_MTPROXY_LINK?.trim();
  const mt = mtLink ? parseMTProxyLink(mtLink) : null;
  if (mt) {
    return {
      ip: mt.server,
      port: mt.port,
      MTProxy: true,
      secret: normalizeMTProxySecret(mt.secret),
    };
  }
  const mtServer = process.env.TELEGRAM_MTPROXY_SERVER?.trim();
  const mtPort = parseInt(process.env.TELEGRAM_MTPROXY_PORT || '0', 10);
  const mtSecret = process.env.TELEGRAM_MTPROXY_SECRET?.trim();
  if (mtServer && mtPort && mtSecret) {
    return { ip: mtServer, port: mtPort, MTProxy: true, secret: normalizeMTProxySecret(mtSecret) };
  }

  const url = process.env.TELEGRAM_PROXY?.trim();
  if (url) {
    try {
      const u = new URL(url);
      const protocol = (u.protocol || '').replace(':', '').toLowerCase();
      const socksType = protocol === 'socks4' ? 4 : 5;
      const host = u.hostname || u.host;
      const port = parseInt(u.port || '1080', 10);
      if (!host || !port) return null;
      const proxy = { ip: host, port, socksType, timeout: 60 };
      if (u.username) proxy.username = decodeURIComponent(u.username);
      if (u.password) proxy.password = decodeURIComponent(u.password);
      return proxy;
    } catch {
      return null;
    }
  }
  const ip = process.env.TELEGRAM_PROXY_IP?.trim();
  const port = parseInt(process.env.TELEGRAM_PROXY_PORT || '0', 10);
  if (!ip || !port) return null;
  const socksType = parseInt(process.env.TELEGRAM_PROXY_SOCKS_TYPE || '5', 10);
  const proxy = { ip, port, socksType: socksType === 4 ? 4 : 5, timeout: 60 };
  const user = process.env.TELEGRAM_PROXY_USERNAME?.trim();
  const pass = process.env.TELEGRAM_PROXY_PASSWORD?.trim();
  if (user) proxy.username = user;
  if (pass) proxy.password = pass;
  return proxy;
}
