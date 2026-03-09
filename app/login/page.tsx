'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setError('Invalid or expired link. Please request a new one.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: '#FAFAFA',
        fontFamily: 'var(--font-outfit), sans-serif',
      }}
    >
      {/* Logo */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2">
        <span className="text-3xl font-bold" style={{ color: '#12111A' }}>
          Portl
        </span>
        <span className="text-3xl font-bold" style={{ color: '#5B4CF5' }}>
          .
        </span>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm">
        {success ? (
          <p
            className="text-center text-lg font-medium"
            style={{ color: '#12111A' }}
          >
            Check your email — we sent you a link ✓
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-center">
              <h1
                className="text-2xl font-bold"
                style={{ color: '#12111A' }}
              >
                Welcome back
              </h1>
              <p
                className="text-sm"
                style={{ color: '#9CA3AF' }}
              >
                Enter your email to sign in
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border bg-white text-[#12111A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#5B4CF5]/30 focus:border-[#5B4CF5] disabled:opacity-50 transition-colors"
                style={{
                  borderColor: '#E4E4E8',
                }}
              />

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ background: '#5B4CF5' }}
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
