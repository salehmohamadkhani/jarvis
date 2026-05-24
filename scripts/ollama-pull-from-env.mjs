/**
 * خواندن LLM_MODEL از .env.local (و در صورت نبود از .env) و اجرای: ollama pull <model>
 * استفاده: npm run ollama:pull
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(name) {
  const p = join(root, name)
  if (!existsSync(p)) return {}
  const out = {}
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') }
const model = (env.LLM_MODEL || 'llama3.2').trim()
if (!model) {
  console.error('LLM_MODEL خالی است.')
  process.exit(1)
}

console.log(`→ ollama pull ${model}\n`)
const r = spawnSync('ollama', ['pull', model], { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' })
process.exit(r.status === 0 ? 0 : r.status ?? 1)
