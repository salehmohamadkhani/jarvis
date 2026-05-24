#!/usr/bin/env node
/**
 * تست اتصال پراکسی تلگرام.
 * پراکسی را از .env.local می‌خواند (TELEGRAM_PROXY یا TELEGRAM_PROXY_IP/PORT)
 * و یک اتصال از طریق آن به سرور تلگرام امتحان می‌کند.
 *
 * استفاده: npm run test-proxy
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const { getTelegramProxy } = await import('../lib/telegramProxy.js');

const TELEGRAM_TEST_HOST = '149.154.167.91';
const TELEGRAM_TEST_PORT = 80;
const TIMEOUT_MS = 15000;

async function testMTProxy(proxy) {
  const net = await import('net');
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: proxy.ip, port: proxy.port, timeout: TIMEOUT_MS },
      () => {
        socket.destroy();
        resolve();
      }
    );
    socket.on('error', reject);
    socket.setTimeout(TIMEOUT_MS, () => {
      socket.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  const proxy = getTelegramProxy();
  if (!proxy) {
    console.error('پراکسی تنظیم نشده.');
    console.error('در .env.local یکی از این‌ها را بگذار:');
    console.error('  TELEGRAM_PROXY=socks5://آدرس:پورت');
    console.error('  TELEGRAM_MTPROXY_LINK="https://t.me/proxy?server=...&port=...&secret=..."');
    console.error('  یا: TELEGRAM_MTPROXY_SERVER=... TELEGRAM_MTPROXY_PORT=... TELEGRAM_MTPROXY_SECRET=...');
    process.exit(1);
  }

  if (proxy.MTProxy) {
    console.log('پراکسی خوانده شد: MTProxy', proxy.ip + ':' + proxy.port);
    console.log('در حال تست اتصال به سرور MTProxy...');
    try {
      await testMTProxy(proxy);
      console.log('نتیجه: سرور MTProxy در دسترس است. اتصال تلگرام از طریق این پراکسی ممکن است.');
      process.exit(0);
    } catch (err) {
      console.error('نتیجه: اتصال به MTProxy برقرار نشد.');
      console.error('خطا:', err.message || err);
      process.exit(1);
    }
    return;
  }

  console.log('پراکسی خوانده شد:', proxy.ip + ':' + proxy.port, '(SOCKS' + proxy.socksType + ')');
  console.log('در حال تست اتصال به تلگرام از طریق پراکسی...');

  const { SocksClient } = await import('socks');
  const opts = {
    proxy: {
      host: proxy.ip,
      port: proxy.port,
      type: proxy.socksType,
      userId: proxy.username || undefined,
      password: proxy.password || undefined,
    },
    command: 'connect',
    destination: { host: TELEGRAM_TEST_HOST, port: TELEGRAM_TEST_PORT },
    timeout: TIMEOUT_MS,
  };

  try {
    const info = await SocksClient.createConnection(opts);
    info.socket.destroy();
    console.log('نتیجه: پراکسی وصل است. اتصال به تلگرام از طریق این پراکسی ممکن است.');
    process.exit(0);
  } catch (err) {
    console.error('نتیجه: پراکسی وصل نیست.');
    console.error('خطا:', err.message || err);
    process.exit(1);
  }
}

main();
