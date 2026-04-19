"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  useSearchParams(); // consumed for dynamic rendering

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    setError("");

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
    });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div style={{
      position: "relative", minHeight: "100vh", overflow: "hidden",
      background: "#0D0B1A",
      fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatA {
          0%   { transform: translate(0px, 0px); }
          100% { transform: translate(20px, -30px); }
        }
        @keyframes floatB {
          0%   { transform: translate(0px, 0px); }
          100% { transform: translate(-25px, 20px); }
        }
        @keyframes floatC {
          0%   { transform: translate(0px, 0px); }
          100% { transform: translate(15px, 25px); }
        }
        @keyframes floatD {
          0%   { transform: translate(0px, 0px); }
          100% { transform: translate(-18px, -22px); }
        }

        .blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
          z-index: 0;
        }
        .blob-1 {
          width: 400px; height: 400px;
          background: rgba(91,76,245,0.12);
          top: -80px; left: -80px;
          animation: floatA 18s ease-in-out infinite alternate;
        }
        .blob-2 {
          width: 350px; height: 350px;
          background: rgba(11,171,108,0.08);
          bottom: -60px; right: -60px;
          animation: floatB 22s ease-in-out infinite alternate;
        }
        .blob-3 {
          width: 260px; height: 260px;
          background: rgba(91,76,245,0.08);
          bottom: 20%; left: 10%;
          animation: floatC 20s ease-in-out infinite alternate;
        }
        .blob-4 {
          width: 200px; height: 200px;
          background: rgba(123,110,248,0.1);
          top: 30%; right: 12%;
          animation: floatD 16s ease-in-out infinite alternate;
        }

        .fade-1 { animation: fadeUp 0.5s 0.05s ease forwards; opacity: 0; }
        .fade-2 { animation: fadeUp 0.5s 0.12s ease forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.5s 0.20s ease forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.5s 0.28s ease forwards; opacity: 0; }
        .fade-5 { animation: fadeUp 0.5s 0.36s ease forwards; opacity: 0; }

        .glass-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 48px;
          position: relative;
          z-index: 10;
          box-shadow: 0 8px 40px rgba(0,0,0,0.4);
        }

        .email-input {
          width: 100%;
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 13px 16px;
          color: #FFFFFF;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.3); }
        .email-input:focus {
          border-color: rgba(91,76,245,0.8);
          box-shadow: 0 0 0 3px rgba(91,76,245,0.25);
        }

        .submit-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 12px;
          background: #5B4CF5;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.01em;
        }
        .submit-btn:hover:not(:disabled) {
          background: #4A3CE0;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(91,76,245,0.3);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        @media (max-width: 480px) {
          .glass-card { padding: 36px 24px; }
        }
      `}</style>

      {/* Floating blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />

      {/* Glass card */}
      <div className="glass-card">

        {/* Wordmark */}
        <div className="fade-1" style={{ marginBottom: "28px", textAlign: "center" }}>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#5B4CF5", letterSpacing: "-0.5px" }}>
            Portl<span style={{ color: "#5B4CF5" }}>.</span>
          </span>
        </div>

        {sent ? (
          /* Sent state */
          <div className="fade-2" style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: "44px", marginBottom: "16px", lineHeight: 1 }}>📬</div>
            <h2 style={{ color: "#FFFFFF", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
              Check your inbox
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "13.5px", lineHeight: 1.6 }}>
              Magic link sent to{" "}
              <span style={{ color: "#5B4CF5", fontWeight: 600 }}>{email}</span>
            </p>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div className="fade-2" style={{ marginBottom: "28px", textAlign: "center" }}>
              <h1 style={{
                fontSize: "26px", fontWeight: 700, color: "#FFFFFF",
                marginBottom: "8px", letterSpacing: "-0.4px",
              }}>
                Welcome back.
              </h1>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                Enter your email and we&apos;ll send you a magic link.
              </p>
            </div>

            {/* Input */}
            <div className="fade-3" style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 600,
                color: "rgba(255,255,255,0.45)", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: "8px",
              }}>
                Email Address
              </label>
              <input
                className="email-input"
                type="email"
                placeholder="you@studio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoComplete="email"
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: "12px",
                background: "rgba(232,93,117,0.07)", border: "1px solid rgba(232,93,117,0.2)",
                borderRadius: "10px", padding: "9px 14px",
                fontSize: "13px", color: "#d94f6a",
              }}>
                {error}
              </div>
            )}

            {/* Button */}
            <div className="fade-4" style={{ marginBottom: "16px" }}>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <span style={{
                      width: "14px", height: "14px", flexShrink: 0,
                      border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff",
                      borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block",
                    }} />
                    Sending…
                  </span>
                ) : "Send magic link →"}
              </button>
            </div>

            {/* Footer note */}
            <div className="fade-5" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                No password needed. No account required.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
