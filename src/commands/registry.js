import defaultRegistry from './commands.json'

const STORAGE_KEY = 'jarvis.commandRegistry.v1'

function isPlainObject(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

function sanitizeRegistry(input) {
  const base = isPlainObject(defaultRegistry) ? structuredClone(defaultRegistry) : { version: 1, pages: [], commands: [] }
  if (!isPlainObject(input)) return base

  const out = { ...base }
  if (typeof input.version === 'number') out.version = input.version

  if (Array.isArray(input.pages)) {
    out.pages = input.pages
      .filter(isPlainObject)
      .map((p) => ({
        id: typeof p.id === 'string' ? p.id : '',
        path: typeof p.path === 'string' ? p.path : '',
        title: typeof p.title === 'string' ? p.title : '',
        keywords: Array.isArray(p.keywords) ? p.keywords.filter((k) => typeof k === 'string') : [],
      }))
      .filter((p) => p.id && p.path)
  }

  if (Array.isArray(input.commands)) {
    out.commands = input.commands
      .filter(isPlainObject)
      .map((c) => ({
        id: typeof c.id === 'string' ? c.id : '',
        title: typeof c.title === 'string' ? c.title : '',
        triggers: Array.isArray(c.triggers) ? c.triggers.filter((t) => typeof t === 'string') : [],
        kind: c.kind === 'navigation' ? 'navigation' : (c.kind === 'reply' ? 'reply' : 'action'),
        targetPageId: typeof c.targetPageId === 'string' ? c.targetPageId : undefined,
        requiresGoVerb: !!c.requiresGoVerb,
        replyText: typeof c.replyText === 'string' ? c.replyText : undefined,
        slots: Array.isArray(c.slots)
          ? c.slots
              .filter(isPlainObject)
              .map((s) => ({
                key: typeof s.key === 'string' ? s.key : '',
                type: typeof s.type === 'string' ? s.type : 'string',
                required: !!s.required,
                question: typeof s.question === 'string' ? s.question : '',
                options: Array.isArray(s.options) ? s.options : undefined,
              }))
              .filter((s) => s.key && s.type)
          : [],
      }))
      .filter((c) => c.id && (c.kind !== 'navigation' || c.targetPageId))
  }

  return out
}

export function getCommandRegistry() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sanitizeRegistry(defaultRegistry)
    return sanitizeRegistry(JSON.parse(raw))
  } catch {
    return sanitizeRegistry(defaultRegistry)
  }
}

export function saveCommandRegistry(registry) {
  const sanitized = sanitizeRegistry(registry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized, null, 2))
  return sanitized
}

export function resetCommandRegistry() {
  localStorage.removeItem(STORAGE_KEY)
  return sanitizeRegistry(defaultRegistry)
}

