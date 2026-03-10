'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #0D0B1A;
          display: flex;
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Ambient background blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          pointer-events: none;
        }
        .blob-1 {
          width: 500px; height: 500px;
          background: #5B4CF5;
          top: -100px; left: -100px;
          animation: drift1 12s ease-in-out infinite alternate;
        }
        .blob-2 {
          width: 400px; height: 400px;
          background: #0BAB6C;
          bottom: -80px; right: -80px;
          animation: drift2 14s ease-in-out infinite alternate;
        }
        .blob-3 {
          width: 300px; height: 300px;
          background: #5B4CF5;
          bottom: 30%; right: 20%;
          opacity: 0.08;
          animation: drift1 18s ease-in-out infinite alternate-reverse;
        }

        @keyframes drift1 {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes drift2 {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(-30px, -40px) scale(1.08); }
        }

        /* Subtle grid overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* Left panel */
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 64px;
          position: relative;
          z-index: 1;
        }

        .wordmark {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 64px;
        }
        .wordmark span {
          color: #5B4CF5;
        }

        .hero-text {
          font-size: 3.2rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
        }
        .hero-text em {
          font-style: normal;
          background: linear-gradient(135deg, #7B6EF8, #0BAB6C);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
          max-width: 360px;
          margin-bottom: 48px;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transform: translateX(-16px);
          transition: all 0.5s ease;
        }
        .feature-item.visible {
          opacity: 1;
          transform: translateX(0);
        }
        .feature-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #5B4CF5;
          flex-shrink: 0;
        }
        .feature-dot.green { background: #0BAB6C; }
        .feature-text {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.6);
          font-weight: 400;
        }

        /* Right panel - login card */
        .right-panel {
          width: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          position: relative;
          z-index: 1;
        }

        .card {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 44px 40px;
          backdrop-filter: blur(20px);
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease 0.2s;
        }
        .card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .card-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.4);
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .input-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
          display: block;
        }

        .email-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-family: 'Outfit', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          margin-bottom: 16px;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.25); }
        .email-input:focus {
          border-color: #5B4CF5;
          background: rgba(91,76,245,0.08);
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #5B4CF5;
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .submit-btn:hover:not(:disabled) {
          background: #7B6EF8;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(91,76,245,0.4);
        }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .error-msg {
          font-size: 0.85rem;
          color: #EF4444;
          margin-bottom: 14px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.1);
          border-radius: 8px;
          border: 1px solid rgba(239,68,68,0.2);
        }

        .success-msg {
          font-size: 0.85rem;
          color: #0BAB6C;
          margin-bottom: 14px;
          padding: 10px 14px;
          background: rgba(11,171,108,0.1);
          border-radius: 8px;
          border: 1px solid rgba(11,171,108,0.2);
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 28px 0;
        }

        .footer-note {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.25);
          text-align: center;
          line-height: 1.5;
        }

        /* Sent state */
        .sent-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          display: block;
        }
        .sent-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .sent-desc {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
        }
        .sent-email {
          color: #7B6EF8;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .left-panel { display: none; }
          .right-panel { width: 100%; padding: 24px; }
          .card { padding: 32px 28px; }
        }
      `}</style>

      <div className="login-root">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grid-overlay" />

        {/* Left panel */}
        <div className="left-panel">
          <div className="wordmark">Portl<span>.</span></div>
          <h1 className="hero-text">
            Your studio.<br />
            <em>Your clients.</em><br />
            One portal.
          </h1>
          <p className="hero-sub">
            Send clients a link. They see your work, leave feedback, and approve — without the back-and-forth.
          </p>
          <div className="feature-list">
            {[
              { text: 'Project timelines your clients actually understand', green: false, delay: 0 },
              { text: 'File delivery with one-click approvals', green: true, delay: 100 },
              { text: 'No client account needed — just a link', green: false, delay: 200 },
              { text: 'Built for freelance designers', green: true, delay: 300 },
            ].map((f, i) => (
              <div
                key={i}
                className={`feature-item ${mounted ? 'visible' : ''}`}
                style={{ transitionDelay: `${f.delay + 400}ms` }}
              >
                <div className={`feature-dot ${f.green ? 'green' : ''}`} />
                <span className="feature-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="right-panel">
          <div className={`card ${mounted ? 'visible' : ''}`}>
            {sent ? (
              <div>
                <span className="sent-icon">📬</span>
                <p className="sent-title">Check your inbox</p>
                <p className="sent-desc">
                  We sent a magic link to{' '}
                  <span className="sent-email">{email}</span>
                  .<br />Click it to sign in — no password needed.
                </p>
                <div className="divider" />
                <p className="footer-note">
                  Didn't get it? Check your spam folder<br />or{' '}
                  <span
                    onClick={() => setSent(false)}
                    style={{ color: '#7B6EF8', cursor: 'pointer', fontWeight: 600 }}
                  >
                    try again
                  </span>
                </p>
              </div>
            ) : (
              <>
                <p className="card-title">Sign in to Portl</p>
                <p className="card-sub">Enter your email and we'll send you a magic link — no password required.</p>

                {message && <p className="success-msg">{message}</p>}
                {error && <p className="error-msg">{error}</p>}

                <form onSubmit={handleLogin}>
                  <label className="input-label">Email address</label>
                  <input
                    type="email"
                    className="email-input"
                    placeholder="you@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Sending link...' : 'Send Magic Link →'}
                  </button>
                </form>

                <div className="divider" />
                <p className="footer-note">
                  By signing in you agree to our terms of service.<br />
                  No spam, ever.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0D0B1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}