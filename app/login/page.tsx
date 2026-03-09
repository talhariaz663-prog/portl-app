'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-outfit), sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '1.8rem', color: '#12111A' }}>Portl<span style={{ color: '#5B4CF5' }}>.</span></span>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E4E4E8', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📬</p>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#12111A', marginBottom: '0.5rem' }}>Check your email</h2>
            <p style={{ color: '#8A8A9A', fontSize: '0.9rem' }}>We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <h1 style={{ fontWeight: 700, fontSize: '1.4rem', color: '#12111A', marginBottom: '0.25rem' }}>Sign in to Portl</h1>
            <p style={{ color: '#8A8A9A', fontSize: '0.9rem', marginBottom: '1.75rem' }}>Enter your email to receive a magic link</p>
            {message && <p style={{ color: '#0BAB6C', fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>}
            {error && <p style={{ color: '#EF4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E4E4E8', fontSize: '0.95rem', fontFamily: 'inherit', marginBottom: '1rem', boxSizing: 'border-box', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', background: '#5B4CF5', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}