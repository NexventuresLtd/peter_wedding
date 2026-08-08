import { useEffect, useState } from 'react'

import { TrashIcon } from '../../components/icons'
import { Badge, Modal, Spinner, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import type { AdminRole, AdminUser } from '../../lib/types'

const ROLES: { key: AdminRole; label: string; description: string }[] = [
  {
    key: 'moderator',
    label: 'Moderator',
    description: 'Reviews the upload queue — approve and reject only.',
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Everything a moderator can do, plus theme, images, agenda and deletion.',
  },
  {
    key: 'superadmin',
    label: 'Superadmin',
    description: 'Full control, including managing these accounts.',
  },
]

const ROLE_TONE: Record<AdminRole, 'gold' | 'green' | 'neutral'> = {
  superadmin: 'gold',
  admin: 'green',
  moderator: 'neutral',
}

export function UsersManager() {
  const { user: me } = useAuth()
  const { notify } = useToast()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await api.adminUsers())
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not load accounts.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const changeRole = async (user: AdminUser, role: AdminRole) => {
    try {
      await api.updateUser(user.id, { role })
      notify(`${user.full_name} is now a ${role}.`)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error')
      await load()
    }
  }

  const toggleActive = async (user: AdminUser) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active })
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Update failed.', 'error')
    }
  }

  const remove = async (user: AdminUser) => {
    setBusy(true)
    try {
      await api.deleteUser(user.id)
      notify('Account deleted.')
      setConfirmDelete(null)
      await load()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Delete failed.', 'error')
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
          <h1 className="text-2xl text-primary sm:text-3xl">Admin users</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Give family members a moderator account so they can help clear the queue.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary">
          Add account
        </button>
      </header>

      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div key={role.key} className="rounded-md border border-hairline bg-surface p-4">
            <Badge tone={ROLE_TONE[role.key]}>{role.label}</Badge>
            <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
              {role.description}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[46rem] border-collapse bg-surface text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Last signed in</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isMe = user.id === me?.id
              return (
                <tr key={user.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {user.full_name}
                    {isMe && <span className="ml-2 text-xs text-ink-muted">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(event) =>
                        changeRole(user, event.target.value as AdminRole)
                      }
                      className="rounded-sm border border-hairline bg-surface px-2 py-1 text-xs"
                    >
                      {ROLES.map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {user.last_login_at ? formatDateTime(user.last_login_at) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(user)}
                      disabled={isMe}
                      className="disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Badge tone={user.is_active ? 'green' : 'red'}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(user)}
                      disabled={isMe}
                      className="rounded-sm p-1.5 text-ink-muted transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Delete account"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            await load()
          }}
        />
      )}

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)}>
        <div className="p-7">
          <h2 className="text-xl text-primary">Delete this account?</h2>
          <p className="mt-3 text-sm text-ink-muted">
            {confirmDelete?.full_name} will lose access immediately. Uploads they already
            reviewed are unaffected.
          </p>
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
              {busy && <Spinner className="h-4 w-4" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { notify } = useToast()
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'moderator' as AdminRole,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (form.password.length < 8) {
      setError('The password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await api.createUser({ ...form, email: form.email.trim().toLowerCase() })
      notify('Account created.')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-5 p-7">
        <h2 className="text-xl text-primary">New admin account</h2>

        <div>
          <label className="field-label">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="off"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="new-password"
            className="field-input"
          />
          <p className="field-hint">At least 8 characters. Share it privately.</p>
        </div>

        <div>
          <label className="field-label">Role</label>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as AdminRole })}
            className="field-input"
          >
            {ROLES.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label} — {role.description}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy} className="btn-primary flex-1">
            {busy && <Spinner className="h-4 w-4" />}
            Create
          </button>
        </div>
      </div>
    </Modal>
  )
}
