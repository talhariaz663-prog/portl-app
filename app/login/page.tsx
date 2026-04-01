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
      background: "#0D0B1A", fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes drift1 {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(18px, -22px) rotate(8deg); }
        }
        @keyframes drift2 {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(-14px, 16px) rotate(-6deg); }
        }
        @keyframes drift3 {
          0%   { transform: translate(0px, 0px) rotate(45deg); }
          100% { transform: translate(12px, 20px) rotate(55deg); }
        }
        @keyframes drift4 {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(-20px, -12px) rotate(10deg); }
        }
        @keyframes drift5 {
          0%   { transform: translate(0px, 0px) rotate(30deg); }
          100% { transform: translate(16px, -18px) rotate(20deg); }
        }
        @keyframes drift6 {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(-10px, 14px) rotate(-8deg); }
        }
        @keyframes drift7 {
          0%   { transform: translate(0px, 0px) rotate(15deg); }
          100% { transform: translate(22px, 10px) rotate(5deg); }
        }
        @keyframes drift8 {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(-16px, -20px) rotate(12deg); }
        }

        .shape { position: absolute; pointer-events: none; }
        .s1 { top: 8%;  left: 6%;  animation: drift1 18s ease-in-out infinite alternate; }
        .s2 { top: 15%; right: 8%; animation: drift2 22s ease-in-out infinite alternate; }
        .s3 { top: 55%; left: 3%;  animation: drift3 20s ease-in-out infinite alternate; }
        .s4 { top: 70%; right: 5%; animation: drift4 17s ease-in-out infinite alternate; }
        .s5 { top: 35%; left: 45%; animation: drift5 25s ease-in-out infinite alternate; }
        .s6 { bottom: 12%; left: 18%; animation: drift6 19s ease-in-out infinite alternate; }
        .s7 { bottom: 20%; right: 15%; animation: drift7 23s ease-in-out infinite alternate; }
        .s8 { top: 42%; right: 22%; animation: drift8 16s ease-in-out infinite alternate; }

        .fade-1 { animation: fadeUp 0.6s 0.05s ease forwards; opacity: 0; }
        .fade-2 { animation: fadeUp 0.6s 0.15s ease forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.6s 0.25s ease forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.6s 0.35s ease forwards; opacity: 0; }
        .fade-5 { animation: fadeUp 0.6s 0.45s ease forwards; opacity: 0; }

        .glass-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 48px 44px;
          position: relative;
          z-index: 10;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .email-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 13px 16px;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .email-input::placeholder { color: rgba(255,255,255,0.22); }
        .email-input:focus {
          border-color: #5B4CF5;
          background: rgba(91,76,245,0.07);
        }

        .submit-btn {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 10px;
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
          background: #7B6EF8;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(91,76,245,0.35);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        @media (max-width: 480px) {
          .glass-card { padding: 36px 24px; }
        }
      `}</style>

      {/* Grid dot overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 55% 45% at 20% 50%, rgba(91,76,245,0.07) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 80% 60%, rgba(91,76,245,0.05) 0%, transparent 60%)",
      }} />

      {/* Geometric shapes */}
      {/* Triangle */}
      <svg className="shape s1" width="70" height="70" viewBox="0 0 70 70" fill="none">
        <polygon points="35,6 66,62 4,62" stroke="rgba(255,255,255,0.055)" strokeWidth="1" fill="none"/>
      </svg>
      {/* Hexagon */}
      <svg className="shape s2" width="90" height="90" viewBox="0 0 90 90" fill="none">
        <polygon points="45,5 80,25 80,65 45,85 10,65 10,25" stroke="rgba(255,255,255,0.045)" strokeWidth="1" fill="none"/>
      </svg>
      {/* Square rotated */}
      <svg className="shape s3" width="60" height="60" viewBox="0 0 60 60" fill="none">
        <rect x="8" y="8" width="44" height="44" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" transform="rotate(45 30 30)"/>
      </svg>
      {/* Triangle small */}
      <svg className="shape s4" width="50" height="50" viewBox="0 0 50 50" fill="none">
        <polygon points="25,4 48,44 2,44" stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none"/>
      </svg>
      {/* Hexagon small */}
      <svg className="shape s5" width="55" height="55" viewBox="0 0 55 55" fill="none">
        <polygon points="27.5,3 52,16 52,39 27.5,52 3,39 3,16" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none"/>
      </svg>
      {/* Square */}
      <svg className="shape s6" width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="6" y="6" width="68" height="68" stroke="rgba(255,255,255,0.045)" strokeWidth="1" fill="none"/>
      </svg>
      {/* Triangle large */}
      <svg className="shape s7" width="110" height="110" viewBox="0 0 110 110" fill="none">
        <polygon points="55,8 104,98 6,98" stroke="rgba(255,255,255,0.035)" strokeWidth="1" fill="none"/>
      </svg>
      {/* Square rotated small */}
      <svg className="shape s8" width="45" height="45" viewBox="0 0 45 45" fill="none">
        <rect x="6" y="6" width="33" height="33" stroke="rgba(255,255,255,0.055)" strokeWidth="1" fill="none" transform="rotate(45 22.5 22.5)"/>
      </svg>

      {/* Glass card */}
      <div className="glass-card">

        {/* Wordmark */}
        <div className="fade-1" style={{ marginBottom: "32px", textAlign: "center" }}>
          <span style={{ fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Portl<span style={{ color: "#5B4CF5" }}>.</span>
          </span>
        </div>

        {sent ? (
          /* Sent state */
          <div className="fade-2" style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: "44px", marginBottom: "16px", lineHeight: 1 }}>📬</div>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
              Check your inbox
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13.5px", lineHeight: 1.6 }}>
              Magic link sent to{" "}
              <span style={{ color: "#7B6EF8", fontWeight: 600 }}>{email}</span>
            </p>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div className="fade-2" style={{ marginBottom: "28px" }}>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", marginBottom: "8px", letterSpacing: "-0.3px" }}>
                Welcome back
              </h1>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>
                Enter your email to receive a magic link
              </p>
            </div>

            {/* Input */}
            <div className="fade-3" style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block", fontSize: "11px", fontWeight: 600,
                color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
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
              <div className="fade-3" style={{
                marginBottom: "12px",
                background: "rgba(232,93,117,0.1)", border: "1px solid rgba(232,93,117,0.25)",
                borderRadius: "8px", padding: "9px 14px",
                fontSize: "13px", color: "#E85D75",
              }}>
                {error}
              </div>
            )}

            {/* Button */}
            <div className="fade-4" style={{ marginBottom: "20px" }}>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <span style={{
                      width: "14px", height: "14px", flexShrink: 0,
                      border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                      borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block",
                    }} />
                    Sending…
                  </span>
                ) : "Send Magic Link →"}
              </button>
            </div>

            {/* Footer note */}
            <div className="fade-5" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.18)" }}>
                No password needed. No spam, ever.
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
