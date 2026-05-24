#!/usr/bin/env node
/**
 * Run this on your PC (with VPN if needed). No proxy - direct connection.
 * Uses TELEGRAM_API_ID and TELEGRAM_API_HASH from env or .env.local.
 * Output: session string to paste in server .env.local as TELEGRAM_SESSION_STRING=...
 *
 * On server: copy this file and run there, or run on PC:
 *   TELEGRAM_API_ID=32288704 TELEGRAM_API_HASH=237add1d598abe4d6e76844f7ec3f0ea node scripts/telegram-login-local.mjs
 */
import { createInterface } from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const apiHash = (process.env.TELEGRAM_API_HASH || '').trim();

if (!apiId || !apiHash) {
  console.error('Set TELEGRAM_API_ID and TELEGRAM_API_HASH (from .env.local or env).');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  const { TelegramClient } = await import('telegram');
  const { StringSession } = await import('telegram/sessions/index.js');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
    timeout: 30,
    autoReconnect: false,
  });

  console.log('Connecting to Telegram (no proxy)...');
  await client.start({
    phoneNumber: async () => await ask('Phone (e.g. +989123456789): '),
    phoneCode: async () => await ask('Code from Telegram: '),
    password: async () => await ask('2FA password (or Enter): ') || undefined,
    onError: (e) => console.error(e),
  });

  const saved = client.session.save();
  rl.close();

  console.log('\n--- Copy this line to server .env.local as TELEGRAM_SESSION_STRING=... ---\n');
  console.log(saved);
  console.log('\n---');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
