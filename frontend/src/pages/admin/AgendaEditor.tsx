import { useEffect, useState } from 'react'

import { TrashIcon } from '../../components/icons'
import { Badge, Modal, Spinner, useToast } from '../../components/ui'
import { api } from '../../lib/api'
import { classNames } from '../../lib/format'
import type { AgendaItem, AgendaSectionKey, Bullet } from '../../lib/types'

const SECTIONS: { key: AgendaSectionKey; label: string }[] = [
  { key: 'ceremony', label: 'Church ceremony' },
  { key: 'reception', label: 'Reception' },
  { key: 'afterparty', label: 'After party' },
]

/** Bullets are edited as plain text, one per line; "- " marks a sub-bullet. */
function bulletsToText(bullets: Bullet[]): string {
  return bullets
    .map((bullet) => {
      if (typeof bullet === 'string') return bullet
      const children = (bullet.children ?? []).map((child) => `- ${child}`)
      return [bullet.text, ...children].join('\n')
    })
    .join('\n')
}

function textToBullets(text: string): Bullet[] {
  const bullets: Bullet[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('- ')) {
      const child = line.slice(2).trim()
      const previous = bullets.at(-1)
      if (previous === undefined) {
        bullets.push(child)
      } else if (typeof previous === 'string') {
        bullets[bullets.length - 1] = { text: previous, children: [child] }
      } else {
        previous.children = [...(previous.children ?? []), child]
      }
    } else {
      bullets.push(line)
    }
  }
  return bullets
}

const BLANK: Partial<AgendaItem> = {
  section: 'reception',
  time_label: '',
  summary_en: '',
  summary_rw: '',
  bullets_en: [],
  bullets_rw: [],
  is_active: true,
}

export function AgendaEditor() {
  const { notify } = useToast()
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<AgendaItem> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AgendaItem | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await api.adminAgenda())
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load the agenda.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async (draft: Partial<AgendaItem>) => {
    setBusy(true)
    try {
      if (draft.id) {
        await api.updateAgendaItem(draft.id, draft)
      } else {
        const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order), 0)
        await api.createAgendaItem({ ...draft, sort_order: maxOrder + 10 })
      }
      notify('Agenda saved.')
      setEditing(null)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Save failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: AgendaItem) => {
    setBusy(true)
    try {
      await api.deleteAgendaItem(item.id)
      notify('Item removed.')
      setConfirmDelete(null)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Delete failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const move = async (item: AgendaItem, direction: -1 | 1) => {
    const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const index = ordered.findIndex((candidate) => candidate.id === item.id)
    const target = index + direction
    if (target < 0 || target >= ordered.length) return

    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    // Optimistic reorder so the arrows feel instant; reconciled below.
    setItems(ordered.map((entry, position) => ({ ...entry, sort_order: (position + 1) * 10 })))

    try {
      setItems(await api.reorderAgenda(ordered.map((entry) => entry.id)))
    } catch {
      notify('Could not save the new order.', 'error')
      await load()
    }
  }

  const restore = async () => {
    if (
      !window.confirm(
        'Replace the entire agenda with the original programme from the wedding documents? Any edits will be lost.',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      setItems(await api.restoreAgenda())
      notify('Agenda restored to the original programme.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Restore failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-primary sm:text-3xl">Agenda</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Both languages are edited side by side. Guests see the one they select.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={restore} disabled={busy} className="btn-ghost text-sm">
            Restore original
          </button>
          <button type="button" onClick={() => setEditing({ ...BLANK })} className="btn-primary">
            Add item
          </button>
        </div>
      </header>

      <div className="space-y-8">
        {SECTIONS.map((section) => {
          const sectionItems = items
            .filter((item) => item.section === section.key)
            .sort((a, b) => a.sort_order - b.sort_order)

          return (
            <section key={section.key}>
              <h2 className="mb-3 font-heading text-lg text-primary">{section.label}</h2>
              {sectionItems.length === 0 ? (
                <p className="rounded-md border border-dashed border-hairline px-4 py-6 text-center text-sm text-ink-muted">
                  Nothing scheduled in this section.
                </p>
              ) : (
                <ul className="space-y-3">
                  {sectionItems.map((item) => (
                    <li
                      key={item.id}
                      className={classNames(
                        'card flex flex-wrap items-start gap-4 p-4',
                        !item.is_active && 'opacity-55',
                      )}
                    >
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => move(item, -1)}
                          className="rounded-sm px-2 py-0.5 text-xs text-ink-muted hover:bg-ink/5"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => move(item, 1)}
                          className="rounded-sm px-2 py-0.5 text-xs text-ink-muted hover:bg-ink/5"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading text-base font-semibold text-accent lining-nums">
                            {item.time_label}
                          </p>
                          {!item.is_active && <Badge tone="neutral">Hidden</Badge>}
                        </div>

                        <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wider text-ink-muted">
                              English
                            </p>
                            <p className="whitespace-pre-line text-ink">
                              {item.summary_en || bulletsToText(item.bullets_en) || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wider text-ink-muted">
                              Kinyarwanda
                            </p>
                            <p className="whitespace-pre-line text-ink">
                              {item.summary_rw || bulletsToText(item.bullets_rw) || '—'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          className="btn border border-hairline px-4 py-2 text-xs text-ink-muted hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(item)}
                          className="btn border border-hairline px-2.5 py-2 text-ink-muted hover:border-danger/40 hover:text-danger"
                          aria-label="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {editing && (
        <AgendaItemModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          busy={busy}
        />
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <div className="p-7">
          <h2 className="text-xl text-primary">Remove this agenda item?</h2>
          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirmDelete && remove(confirmDelete)}
              disabled={busy}
              className="btn-danger flex-1"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AgendaItemModal({
  draft,
  onClose,
  onSave,
  busy,
}: {
  draft: Partial<AgendaItem>
  onClose: () => void
  onSave: (draft: Partial<AgendaItem>) => void
  busy: boolean
}) {
  const [form, setForm] = useState(draft)
  const [bulletsEn, setBulletsEn] = useState(bulletsToText(draft.bullets_en ?? []))
  const [bulletsRw, setBulletsRw] = useState(bulletsToText(draft.bullets_rw ?? []))

  const submit = () => {
    onSave({
      ...form,
      summary_en: form.summary_en?.trim() || null,
      summary_rw: form.summary_rw?.trim() || null,
      bullets_en: textToBullets(bulletsEn),
      bullets_rw: textToBullets(bulletsRw),
    })
  }

  return (
    <Modal open onClose={onClose} wide>
      <div className="space-y-5 p-7">
        <h2 className="text-xl text-primary">
          {form.id ? 'Edit agenda item' : 'New agenda item'}
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Section</label>
            <select
              value={form.section}
              onChange={(event) =>
                setForm({ ...form, section: event.target.value as AgendaSectionKey })
              }
              className="field-input"
            >
              {SECTIONS.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Time label</label>
            <input
              type="text"
              value={form.time_label ?? ''}
              onChange={(event) => setForm({ ...form, time_label: event.target.value })}
              placeholder="07:00 PM – 07:30 PM"
              className="field-input"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Single line — English</label>
            <input
              type="text"
              value={form.summary_en ?? ''}
              onChange={(event) => setForm({ ...form, summary_en: event.target.value })}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Single line — Kinyarwanda</label>
            <input
              type="text"
              value={form.summary_rw ?? ''}
              onChange={(event) => setForm({ ...form, summary_rw: event.target.value })}
              className="field-input"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="field-label">Bullet points — English</label>
            <textarea
              rows={6}
              value={bulletsEn}
              onChange={(event) => setBulletsEn(event.target.value)}
              className="field-input resize-y font-mono text-xs"
            />
          </div>
          <div>
            <label className="field-label">Bullet points — Kinyarwanda</label>
            <textarea
              rows={6}
              value={bulletsRw}
              onChange={(event) => setBulletsRw(event.target.value)}
              className="field-input resize-y font-mono text-xs"
            />
          </div>
        </div>

        <p className="rounded-md bg-surface-alt px-4 py-3 text-xs leading-relaxed text-ink-muted">
          One bullet per line. Start a line with <code className="font-mono">-</code> to
          nest it under the bullet above. Use the single-line fields for simple slots
          (like the church programme) and the bullet fields for the reception.
        </p>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            className="h-5 w-5 accent-[color:rgb(var(--c-primary))]"
          />
          <span className="text-sm text-ink">Visible to guests</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className="btn-primary flex-1">
            {busy && <Spinner className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
