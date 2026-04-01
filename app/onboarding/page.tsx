"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SLIDES = [
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="6" width="32" height="36" rx="4" stroke="#5B4CF5" strokeWidth="2" fill="none"/>
        <path d="M16 18h16M16 25h16M16 32h10" stroke="#5B4CF5" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="18" y="2" width="12" height="6" rx="2" fill="#5B4CF5" opacity="0.7"/>
        <circle cx="36" cy="36" r="8" fill="#5B4CF5" opacity="0.12" stroke="#5B4CF5" strokeWidth="1.5"/>
        <path d="M33 36l2 2 4-4" stroke="#5B4CF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    accent: "#5B4CF5",
    title: "Welcome to Portl.",
    body: "The professional layer between you and your clients. No more email threads. No more confusion.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M6 14C6 11.8 7.8 10 10 10h8l4 4h16c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4H10c-2.2 0-4-1.8-4-4V14z" stroke="#5B4CF5" strokeWidth="2" fill="none"/>
        <path d="M24 22v8M20 26h8" stroke="#5B4CF5" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    accent: "#5B4CF5",
    title: "Create a project",
    body: "Set up a project with custom stages. Discovery, Moodboard, Design — whatever your workflow looks like.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="10" y="16" width="28" height="22" rx="3" stroke="#5B4CF5" strokeWidth="2" fill="none"/>
        <path d="M24 10v18M18 16l6-6 6 6" stroke="#5B4CF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 32h16" stroke="#5B4CF5" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    accent: "#5B4CF5",
    title: "Deliver your work",
    body: "Upload files directly to each stage. Images, PDFs, anything. Your client sees it instantly.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="16" stroke="#5B4CF5" strokeWidth="2" fill="none"/>
        <path d="M16 24l6 6 10-12" stroke="#5B4CF5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    accent: "#5B4CF5",
    title: "Request approval",
    body: "One click sends your client a formal approval request. They approve or request a revision — all tracked.",
  },
  {
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M20 24c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z" stroke="#0BAB6C" strokeWidth="2" fill="none"/>
        <path d="M8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16" stroke="#0BAB6C" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M14 24c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#0BAB6C" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
        <path d="M6 34l4-2-2 4" stroke="#0BAB6C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    accent: "#0BAB6C",
    title: "Share your portal",
    body: "Send your client one link. No account needed. They see everything, leave feedback, approve work.",
    cta: "Get Started →",
  },
];

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [slide,    setSlide]    = useState(0);
  const [visible,  setVisible]  = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (profile?.onboarding_complete) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    };
    check();
  }, [supabase, router]);

  const complete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);
    }
    router.push("/dashboard");
  };

  const goNext = () => {
    if (!visible) return;
    if (slide === SLIDES.length - 1) { complete(); return; }
    setVisible(false);
    setTimeout(() => {
      setSlide(s => s + 1);
      setVisible(true);
    }, 200);
  };

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0D0B1A",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: "18px", height: "18px",
          border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#5B4CF5",
          borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const current = SLIDES[slide];
  const isLast  = slide === SLIDES.length - 1;

  return (
    <div style={{
      minHeight: "100vh", background: "#0D0B1A",
      fontFamily: "'Outfit', sans-serif", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 16px", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-10px); }
        }
        .slide-enter { animation: slideIn 0.22s ease forwards; }
        .slide-exit  { animation: slideOut 0.18s ease forwards; }

        .next-btn {
          width: 100%; padding: 13px; border: none; border-radius: 10px;
          font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700;
          cursor: pointer; color: #fff; letter-spacing: 0.01em;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .next-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .next-btn:active { transform: translateY(0); }

        .skip-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.28); font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 500; padding: 6px 10px; border-radius: 8px;
          transition: color 0.15s;
        }
        .skip-btn:hover { color: rgba(255,255,255,0.55); }

        .dot { border-radius: 4px; transition: background 0.25s, width 0.25s; }

        @media (max-width: 480px) {
          .glass-card { padding: 36px 24px !important; }
        }
      `}</style>

      {/* Grid dot overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Ambient glow follows accent */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 55% 50% at 50% 50%, ${current.accent}0e 0%, transparent 65%)`,
        transition: "background 0.6s ease",
      }} />

      {/* Skip button */}
      {!isLast && (
        <button className="skip-btn" onClick={complete} style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 20,
        }}>
          Skip
        </button>
      )}

      {/* Glass card */}
      <div className="glass-card" style={{
        width: "100%", maxWidth: "480px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)" as React.CSSProperties["WebkitBackdropFilter"],
        padding: "48px 44px",
        position: "relative", zIndex: 10,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>

        {/* Animated slide content */}
        <div key={slide} className={visible ? "slide-enter" : "slide-exit"}>

          {/* Icon box */}
          <div style={{
            width: "76px", height: "76px", borderRadius: "18px",
            background: `${current.accent}12`,
            border: `1px solid ${current.accent}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "28px",
          }}>
            {current.icon}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: "26px", fontWeight: 800, letterSpacing: "-0.4px",
            color: "#fff", marginBottom: "12px", lineHeight: 1.2,
          }}>
            {current.title}
          </h1>

          {/* Body */}
          <p style={{
            fontSize: "15px", color: "rgba(255,255,255,0.42)",
            lineHeight: 1.65, marginBottom: "36px",
          }}>
            {current.body}
          </p>

          {/* Next / CTA button */}
          <button
            className="next-btn"
            onClick={goNext}
            style={{ background: current.accent }}
          >
            {current.cta ?? "Next →"}
          </button>
        </div>

        {/* Progress dots */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "7px", marginTop: "28px",
        }}>
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className="dot"
              style={{
                height: "7px",
                width: i === slide ? "22px" : "7px",
                background: i === slide ? s.accent : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
