#!/usr/bin/env node
/**
 * یک بار اجرا کن تا با اکانت تلگرام لاگین کنی و session بگیري.
 * خروجی (رشتهٔ session) را در .env.local در TELEGRAM_SESSION_STRING بگذار.
 *
 * استفاده:
 *   TELEGRAM_API_ID=12345 TELEGRAM_API_HASH=abcdef node scripts/telegram-login.mjs
 * یا اول در .env.local بگذار: TELEGRAM_API_ID, TELEGRAM_API_HASH بعد:
 *   node scripts/telegram-login.mjs
 */
import { createInterface } from 'readline';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const apiHash = (process.env.TELEGRAM_API_HASH || '').trim();

if (!apiId || !apiHash) {
  console.error('لطفاً TELEGRAM_API_ID و TELEGRAM_API_HASH را در .env.local بگذار (از my.telegram.org).');
  process.exit(1);
}

const { getTelegramProxy } = await import('../lib/telegramProxy.js');
const proxy = getTelegramProxy();
if (proxy) console.log('استفاده از پراکسی برای اتصال به تلگرام:', proxy.ip + ':' + proxy.port);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  const { TelegramClient } = await import('telegram');
  const { StringSession } = await import('telegram/sessions/index.js');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    timeout: 30,
    retryDelay: 2000,
    autoReconnect: false,
    ...(proxy && { proxy }),
  });

  console.log('اتصال به تلگرام...');
  await client.start({
    phoneNumber: async () => {
      console.log('\n>>> Enter your phone number NOW (e.g. +989123456789) then press Enter:');
      return await ask('شماره موبایل (با کد کشور مثلاً +989123456789): ');
    },
    phoneCode: async () => {
      console.log('\n>>> Enter the code you received in Telegram, then press Enter:');
      return await ask('کد دریافتی در تلگرام: ');
    },
    password: async () => await ask('رمز دومرحله‌ای (اگر داری؛ وگرنه Enter بزن): ') || undefined,
    onError: (e) => console.error(e),
  });

  const saved = client.session.save();
  rl.close();

  console.log('\n--- تمام. این مقدار را در .env.local قرار بده ---\n');
  console.log('TELEGRAM_SESSION_STRING=' + saved);
  console.log('\n---');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
