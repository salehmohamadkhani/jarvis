import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { getTelegramProxy } from './telegramProxy.js';

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const apiHash = process.env.TELEGRAM_API_HASH || '';
const sessionString = process.env.TELEGRAM_SESSION_STRING || '';

let clientInstance = null;

function isConfigured() {
  return apiId > 0 && apiHash && sessionString.length > 0;
}

export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('98')) return `+${digits}`;
  if (digits.startsWith('0')) return `+98${digits.slice(1)}`;
  return `+${digits}`;
}

async function getClient() {
  if (!isConfigured()) return null;
  if (clientInstance) return clientInstance;
  const session = new StringSession(sessionString);
  const proxy = getTelegramProxy();
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
    ...(proxy && { proxy }),
  });
  await client.connect();
  if (!(await client.checkAuthorization())) {
    console.error('Telegram user client: not authorized. Run npm run telegram-login again.');
    return null;
  }
  clientInstance = client;
  return client;
}

export async function sendTelegramPm(recipient, text) {
  if (!recipient || !text) return false;
  const client = await getClient();
  if (!client) return false;
  try {
    const trimmed = recipient.trim();
    if (trimmed.startsWith('+') || /^\d+$/.test(trimmed.replace(/\D/g, ''))) {
      const phone = trimmed.startsWith('+') ? trimmed : normalizePhone(trimmed);
      if (!phone) return false;
      const resolved = await client.invoke(new Api.contacts.ResolvePhone({ phone }));
      if (!resolved || !resolved.users || !resolved.users.length) return false;
      const user = resolved.users[0];
      const inputPeer = new Api.InputPeerUser({
        userId: user.id,
        accessHash: user.accessHash,
      });
      await client.sendMessage(inputPeer, { message: text });
    } else {
      const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      await client.sendMessage(username, { message: text });
    }
    return true;
  } catch (err) {
    console.error('Telegram sendPm error:', err.message);
    return false;
  }
}

export async function notifyMeetingCreated({ title, scheduledAt, projectName, ownerOnly = false, participantTargets = [] }) {
  if (!isConfigured()) return;
  const dateStr = scheduledAt ? new Date(scheduledAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const msg = `جلسه «${title}»${projectName ? ` برای پروژه ${projectName}` : ''} در ${dateStr} ثبت شد.`;
  const ownerPhone = process.env.TELEGRAM_OWNER_PHONE || '';
  const ownerUsername = process.env.TELEGRAM_OWNER_USERNAME || '';
  if (ownerPhone) await sendTelegramPm(ownerPhone, msg);
  if (ownerUsername) await sendTelegramPm(ownerUsername, msg);
  if (ownerOnly) return;
  for (const p of participantTargets) {
    const to = p.telegramId || (p.phone ? normalizePhone(p.phone) : null);
    if (to) await sendTelegramPm(to, msg);
  }
}

export { isConfigured };
