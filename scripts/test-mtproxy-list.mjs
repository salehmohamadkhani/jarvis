#!/usr/bin/env node
/**
 * تست اتصال TCP به لیست سرورهای MTProxy.
 */
import net from 'net';

const TIMEOUT_MS = 10000;

function connect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(
      { host: host.replace(/\.$/, ''), port, timeout: TIMEOUT_MS },
      () => {
        socket.destroy();
        resolve({ ok: true });
      }
    );
    socket.on('error', (err) => resolve({ ok: false, error: err.message }));
    socket.setTimeout(TIMEOUT_MS, () => {
      socket.destroy();
      resolve({ ok: false, error: 'Timeout' });
    });
  });
}

const proxies = [
  { name: 'https.alo-alo.ink', server: 'https.alo-alo.ink', port: 8443, secret: 'dd79e7010200010007f0030386e24c3add' },
  { name: 'www.alo-alo.ink', server: 'www.alo-alo.ink', port: 8443, secret: 'dd79e7010200010007f0030386e24c3add' },
  { name: 'alo.acharbashi.info', server: 'alo.acharbashi.info', port: 4515, secret: 'eee9a4f23b1d768c04a8d7f39120ca5b6e626973636f7474692e79656b74616e65742e636f6d' },
  { name: 'www.40-rooz-gozasht.info', server: 'www.40-rooz-gozasht.info', port: 2083, secret: 'ee1603010200010001fc030386e24c3add68656c702e737465616d706f77657265642e636f6d' },
];

async function main() {
  console.log('در حال تست اتصال به', proxies.length, 'پراکسی MTProxy...\n');
  const results = [];
  for (const p of proxies) {
    process.stdout.write(p.name + ':' + p.port + ' ... ');
    const r = await connect(p.server, p.port);
    results.push({ ...p, ...r });
    console.log(r.ok ? 'وصل' : ('قطع — ' + (r.error || '')));
  }
  console.log('\n--- خلاصه ---');
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log('وصل:', ok.length, ok.map((r) => r.name + ':' + r.port).join(', ') || '—');
  console.log('قطع:', fail.length, fail.map((r) => r.name + ':' + r.port).join(', ') || '—');
  process.exit(fail.length === results.length ? 1 : 0);
}

main();
