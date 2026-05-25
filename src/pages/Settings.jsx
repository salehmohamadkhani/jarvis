import { DSPage, DSSection, DSCard, DSButton } from '../design-system'
import { useMemo, useState } from 'react'
import { getCommandRegistry, saveCommandRegistry } from '../commands/registry.js'
import { IconPlus, IconTrash } from '@tabler/icons-react'

const SLOT_TYPES = [
  { value: 'string', label: 'string' },
  { value: 'text', label: 'text' },
  { value: 'number', label: 'number' },
  { value: 'datetime', label: 'datetime' },
  { value: 'enum', label: 'enum' },
  { value: 'entity:project', label: 'entity:project' },
  { value: 'entity:collaborator', label: 'entity:collaborator (single)' },
  { value: 'entity:collaborator[]', label: 'entity:collaborator[] (multiple)' },
]

function controlStyle(extra = {}) {
  return {
    width: '100%',
    height: 44,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.25)',
    color: 'rgba(255, 255, 255, 1)',
    direction: 'ltr',
    outline: 'none',
    ...extra,
  }
}

function selectStyle() {
  // Keep native select arrow (browser-consistent), but force dark menu colors via CSS below.
  return controlStyle({
    backgroundImage: 'none',
    backgroundClip: 'unset',
    WebkitBackgroundClip: 'unset',
  })
}

function safeId(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseTriggers(text) {
  return (text || '')
    .split(/[\n,،]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
}

function formatTriggers(triggers) {
  return Array.isArray(triggers) ? triggers.join(', ') : ''
}

function blankCommand() {
  return {
    id: '',
    title: '',
    triggers: [],
    kind: 'action',
    targetPageId: undefined,
    slots: [],
  }
}

function blankSlot() {
  return {
    key: '',
    type: 'string',
    required: false,
    question: '',
    options: [],
  }
}

export default function Settings() {
  const initial = useMemo(() => getCommandRegistry(), [])
  const [registry, setRegistry] = useState(() => initial)
  const [selectedId, setSelectedId] = useState(() => initial.commands?.[0]?.id || '')
  const [draft, setDraft] = useState(() => {
    const first = initial.commands?.find((c) => c.id === selectedId) || initial.commands?.[0]
    return first ? structuredClone(first) : blankCommand()
  })
  const [status, setStatus] = useState('')

  function persist(next) {
    try {
      const saved = saveCommandRegistry(next)
      setRegistry(saved)
      setStatus('')
      return saved
    } catch (e) {
      setStatus(`Save failed: ${e?.message || String(e)}`)
      return null
    }
  }

  function selectCommand(id) {
    setSelectedId(id)
    const cmd = (registry.commands || []).find((c) => c.id === id)
    setDraft(cmd ? structuredClone(cmd) : blankCommand())
    setStatus('')
  }

  function isMeaningfulCommand(cmd) {
    if (!cmd) return false
    if ((cmd.title || '').trim()) return true
    if (Array.isArray(cmd.triggers) && cmd.triggers.some((t) => (t || '').trim())) return true
    if ((cmd.replyText || '').trim()) return true
    if (Array.isArray(cmd.slots) && cmd.slots.length) return true
    return false
  }

  function addCommand() {
    const newCmd = blankCommand()
    newCmd.id = `custom_${Date.now()}`
    newCmd.title = 'New command'
    newCmd.triggers = ['new command']
    const next = { ...registry, commands: [...(registry.commands || []), newCmd] }
    const saved = persist(next)
    if (saved) {
      selectCommand(newCmd.id)
      setStatus('Created.')
      setTimeout(() => setStatus(''), 1200)
    }
  }

  function deleteCommandById(id) {
    if (!id) return
    const cmd = (registry.commands || []).find((c) => c.id === id)
    const hasContent = isMeaningfulCommand(cmd)
    const label = cmd?.title || cmd?.id || 'this command'
    if (hasContent) {
      const ok = window.confirm(`Delete "${label}"? This will remove its content permanently.`)
      if (!ok) return
    }
    const nextCommands = (registry.commands || []).filter((c) => c.id !== id)
    const next = { ...registry, commands: nextCommands }
    const saved = persist(next)
    if (!saved) return
    if (selectedId === id) {
      const first = saved.commands?.[0]
      setSelectedId(first?.id || '')
      setDraft(first ? structuredClone(first) : blankCommand())
    }
    setStatus('Deleted.')
    setTimeout(() => setStatus(''), 1200)
  }

  const pages = registry.pages || []
  const commands = registry.commands || []

  function updateDraft(patchOrFn) {
    setDraft((prev) => {
      const nextDraft = typeof patchOrFn === 'function' ? patchOrFn(prev) : { ...prev, ...patchOrFn }
      const nextRegistry = {
        ...registry,
        commands: (registry.commands || []).map((c) => (c.id === selectedId ? nextDraft : c)),
      }
      const saved = persist(nextRegistry)
      if (saved) {
        // If title changes, reflect it in list immediately (registry is the source).
        // Keep selectedId stable unless the user changed ID.
      }
      return nextDraft
    })
  }

  return (
    <div dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
      <DSPage title="Settings">
      <DSSection title="Settings">
        <DSCard>
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>
            Coming soon: workspace settings, integrations and account options.
          </p>
        </DSCard>
      </DSSection>

      <DSSection
        title="Commands registry"
        description="UI builder for command routes (offline)."
      >
        <DSCard className="settings-commands-card">
          <style>{`
            .settings-commands-card select {
              background-color: rgba(0,0,0,0.25);
              color: rgba(255,255,255,1);
            }
            .settings-commands-card select option {
              background-color: #0f0f18;
              color: rgba(255,255,255,1);
            }
            .settings-commands-card .cmd-icon-btn {
              width: 44px !important;
              height: 44px !important;
              padding: 0 !important;
              border-radius: 50% !important;
              flex: 0 0 44px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              line-height: 1;
              opacity: 1 !important;
            }
            .settings-commands-card .cmd-icon-btn--add {
              background: var(--gradient-primary) !important;
              border: none !important;
              color: #fff !important;
              box-shadow: var(--shadow-glow) !important;
            }
            .settings-commands-card .cmd-icon-btn--add:hover {
              box-shadow: var(--shadow-glow-strong) !important;
              transform: translateY(-1px);
            }
            .settings-commands-card .cmd-icon-btn--delete {
              background: rgba(239, 68, 68, 0.14) !important;
              border: 1px solid rgba(239, 68, 68, 0.28) !important;
              color: #fca5a5 !important;
            }
            .settings-commands-card .cmd-icon-btn--delete:hover {
              background: rgba(239, 68, 68, 0.22) !important;
              border-color: rgba(239, 68, 68, 0.45) !important;
              color: #fecaca !important;
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>
              Stored in browser localStorage (no rebuild needed).
            </div>
            {status ? (
              <div style={{ fontSize: 13, color: status.startsWith('Save failed') ? '#ff6b6b' : 'var(--color-muted)' }}>
                {status}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <DSButton
                  onClick={addCommand}
                  title="Add command"
                  aria-label="Add command"
                  className="cmd-icon-btn cmd-icon-btn--add"
                >
                  <IconPlus size={18} stroke={2} aria-hidden />
                </DSButton>
              </div>

              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                {(commands || []).map((c) => {
                  const active = c.id === selectedId
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectCommand(c.id)}
                      style={{
                        padding: 10,
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: active ? 'rgba(140, 140, 255, 0.10)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || c.id}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.kind === 'navigation' ? `navigation → ${c.targetPageId}` : c.kind === 'reply' ? 'reply' : 'action'} • {(c.triggers || []).slice(0, 3).join(', ')}
                        </div>
                      </div>
                      <DSButton
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteCommandById(c.id)
                        }}
                        title={`Delete "${c.title || c.id}"`}
                        aria-label={`Delete ${c.title || c.id}`}
                        className="cmd-icon-btn cmd-icon-btn--delete"
                      >
                        <IconTrash size={18} stroke={2} aria-hidden />
                      </DSButton>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!selectedId ? (
                <div style={{ color: 'var(--color-muted)' }}>Select a command to edit.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>Title</div>
                      <input
                        value={draft.title || ''}
                        onChange={(e) => updateDraft((d) => ({ ...d, title: e.target.value }))}
                        style={controlStyle()}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>ID</div>
                      <input
                        value={draft.id || ''}
                        onChange={(e) => {
                          const nextId = safeId(e.target.value)
                          if (!nextId) return
                          // Rename command ID (and selection) safely.
                          const exists = (registry.commands || []).some((c) => c.id === nextId && c.id !== selectedId)
                          if (exists) {
                            setStatus('Save failed: ID already exists.')
                            return
                          }
                          const nextCommands = (registry.commands || []).map((c) =>
                            c.id === selectedId ? { ...draft, id: nextId } : c
                          )
                          const nextRegistry = { ...registry, commands: nextCommands }
                          const saved = persist(nextRegistry)
                          if (!saved) return
                          setSelectedId(nextId)
                          setDraft((d) => ({ ...d, id: nextId }))
                        }}
                        style={controlStyle()}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>Kind</div>
                      <select
                        value={draft.kind || 'action'}
                        onChange={(e) => {
                          const kind = e.target.value
                          updateDraft((d) => ({
                            ...d,
                            kind,
                            targetPageId: kind === 'navigation' ? (d.targetPageId || pages[0]?.id) : undefined,
                            slots: kind === 'action' ? (d.slots || []) : [],
                          }))
                        }}
                        style={selectStyle()}
                      >
                        <option value="action">action</option>
                        <option value="navigation">navigation</option>
                        <option value="reply">reply</option>
                      </select>
                    </div>
                    {draft.kind === 'navigation' ? (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>Target page</div>
                        <select
                          value={draft.targetPageId || ''}
                          onChange={(e) => updateDraft((d) => ({ ...d, targetPageId: e.target.value || undefined }))}
                          style={selectStyle()}
                        >
                          <option value="">(none)</option>
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title} ({p.path})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>Triggers (comma/newline separated)</div>
                    <textarea
                      value={formatTriggers(draft.triggers)}
                      onChange={(e) => updateDraft((d) => ({ ...d, triggers: parseTriggers(e.target.value) }))}
                      spellCheck={false}
                      style={{
                        ...controlStyle({ height: 'auto' }),
                        minHeight: 80,
                        resize: 'vertical',
                        color: 'rgba(255,255,255,0.92)',
                        direction: 'ltr',
                      }}
                    />
                  </div>

                  {draft.kind === 'reply' ? (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>Reply text (shown to the user)</div>
                      <textarea
                        value={draft.replyText || ''}
                        onChange={(e) => updateDraft((d) => ({ ...d, replyText: e.target.value }))}
                        spellCheck={false}
                        style={{
                          ...controlStyle({ height: 'auto' }),
                          minHeight: 100,
                          resize: 'vertical',
                          color: 'rgba(255,255,255,0.92)',
                        }}
                      />
                    </div>
                  ) : null}

                  {draft.kind === 'navigation' ? (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-muted)' }}>
                        <input
                          type="checkbox"
                          checked={draft.requiresGoVerb !== false}
                          onChange={(e) => updateDraft((d) => ({ ...d, requiresGoVerb: e.target.checked }))}
                        />
                        Require explicit “go/open/show” wording
                      </label>
                    </div>
                  ) : null}

                  {draft.kind === 'action' ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Slots</div>
                        <DSButton
                          variant="secondary"
                          onClick={() => updateDraft((d) => ({ ...d, slots: [...(d.slots || []), blankSlot()] }))}
                        >
                          Add slot
                        </DSButton>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(draft.slots || []).map((s, idx) => (
                          <div key={`${s.key || 'slot'}-${idx}`} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 90px', gap: 8, alignItems: 'center' }}>
                              <input
                                placeholder="key (e.g. dueAt)"
                                value={s.key || ''}
                                onChange={(e) => {
                                  const key = safeId(e.target.value)
                                  updateDraft((d) => {
                                    const nextSlots = [...(d.slots || [])]
                                    nextSlots[idx] = { ...nextSlots[idx], key }
                                    return { ...d, slots: nextSlots }
                                  })
                                }}
                                style={controlStyle()}
                              />
                              <select
                                value={s.type || 'string'}
                                onChange={(e) => {
                                  const type = e.target.value
                                  updateDraft((d) => {
                                    const nextSlots = [...(d.slots || [])]
                                    const existing = nextSlots[idx]
                                    nextSlots[idx] = { ...existing, type, options: type === 'enum' ? (existing.options || []) : [] }
                                    return { ...d, slots: nextSlots }
                                  })
                                }}
                                style={selectStyle()}
                              >
                                {SLOT_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--color-muted)' }}>
                                <input
                                  type="checkbox"
                                  checked={!!s.required}
                                  onChange={(e) => {
                                    const required = e.target.checked
                                    updateDraft((d) => {
                                      const nextSlots = [...(d.slots || [])]
                                      nextSlots[idx] = { ...nextSlots[idx], required }
                                      return { ...d, slots: nextSlots }
                                    })
                                  }}
                                />
                                required
                              </label>
                              <DSButton
                                variant="secondary"
                                onClick={() => {
                                  updateDraft((d) => {
                                    const nextSlots = [...(d.slots || [])]
                                    nextSlots.splice(idx, 1)
                                    return { ...d, slots: nextSlots }
                                  })
                                }}
                              >
                                Remove
                              </DSButton>
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <input
                                placeholder="question (shown to user when missing)"
                                value={s.question || ''}
                                onChange={(e) => {
                                  const question = e.target.value
                                  updateDraft((d) => {
                                    const nextSlots = [...(d.slots || [])]
                                    nextSlots[idx] = { ...nextSlots[idx], question }
                                    return { ...d, slots: nextSlots }
                                  })
                                }}
                                style={controlStyle()}
                              />
                            </div>

                            {s.type === 'enum' ? (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6 }}>Enum options (one per line: value|label)</div>
                                <textarea
                                  value={(s.options || []).map((o) => `${o.value}|${o.label}`).join('\n')}
                                  onChange={(e) => {
                                    const options = (e.target.value || '')
                                      .split('\n')
                                      .map((line) => line.trim())
                                      .filter(Boolean)
                                      .map((line) => {
                                        const [valueRaw, ...labelParts] = line.split('|')
                                        const label = labelParts.join('|').trim()
                                        const v = valueRaw.trim()
                                        const valueNum = /^\d+$/.test(v) ? Number(v) : v
                                        return { value: valueNum, label: label || String(valueNum) }
                                      })
                                    updateDraft((d) => {
                                      const nextSlots = [...(d.slots || [])]
                                      nextSlots[idx] = { ...nextSlots[idx], options }
                                      return { ...d, slots: nextSlots }
                                    })
                                  }}
                                  spellCheck={false}
                                  style={{
                                    width: '100%',
                                    minHeight: 90,
                                    resize: 'vertical',
                                    padding: 10,
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(0,0,0,0.25)',
                                    color: 'rgba(255,255,255,0.92)',
                                    outline: 'none',
                                    direction: 'ltr',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                    fontSize: 12,
                                  }}
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-muted)', fontSize: 13 }} />
                  )}

                  <div style={{ marginTop: 6, color: 'var(--color-muted)', fontSize: 12 }}>
                    Auto-saved.
                  </div>
                </>
              )}
            </div>
          </div>
        </DSCard>
      </DSSection>
      </DSPage>
    </div>
  )
}
