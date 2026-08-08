import { useState, type FormEvent } from 'react'

import { Ornament, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'

export function AdminLogin() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt/60 px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-script text-4xl text-primary">Peter &amp; Yvette</p>
          <Ornament className="mt-3" />
          <h1 className="mt-5 text-xl text-primary">Admin sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5 p-7">
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="field-input"
            />
          </div>

          {error && (
            <p
              className="rounded-md border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
