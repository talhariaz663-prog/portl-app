"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SLIDES = [
  {
    step:        1,
    icon:        "✦",
    subtitle:    "Welcome aboard",
    title:       "Welcome to Portl",
    description: "Portl is a professional client portal for freelance designers. Manage projects, share deliverables, collect approvals, and send invoices — all from one beautiful workspace.",
    color:       "#5B4CF5",
  },
  {
    step:        2,
    icon:        "⬡",
    subtitle:    "Organize your work",
    title:       "Create a Project",
    description: "Start by creating a project for each client engagement. Add the client's name and email, then set up stages to track your design process from kickoff to final delivery.",
    color:       "#0BAB6C",
  },
  {
    step:        3,
    icon:        "↑",
    subtitle:    "Share your designs",
    title:       "Upload Files",
    description: "Upload mockups, prototypes, and design files directly to each project stage. Clients can view your work in a clean, professional presentation — no account required.",
    color:       "#7B6CF9",
  },
  {
    step:        4,
    icon:        "→",
    subtitle:    "Get client sign-off",
    title:       "Request Approval",
    description: "When a stage is ready for review, send your client a unique portal link. They can approve your work or request revisions with feedback. You get notified instantly.",
    color:       "#F5A623",
  },
  {
    step:        5,
    icon:        "⬥",
    subtitle:    "Get paid",
    title:       "Share & Invoice",
    description: "Each project has a beautiful portal your clients love. When work is done, generate an invoice with line items, due dates, and notes — and track payment status in one place.",
    color:       "#E85D75",
  },
];

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [slide,   setSlide]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [dir,     setDir]     = useState<"left" | "right">("right");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single();
      if (profile?.onboarding_complete) { router.replace("/dashboard"); return; }
      setLoading(false);
    })();
  }, [supabase, router]);

  const complete = useCallback(async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from("profiles")
        .upsert({ id: session.user.id, onboarding_complete: true }, { onConflict: "id" });
    }
    router.replace("/dashboard");
  }, [supabase, router]);

  const next = () => {
    if (slide < SLIDES.length - 1) {
      setDir("right");
      setSlide(s => s + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (slide > 0) {
      setDir("left");
      setSlide(s => s - 1);
    }
  };

  const goTo = (i: number) => {
    setDir(i > slide ? "right" : "left");
    setSlide(i);
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#07090f", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:"28px", height:"28px", border:"2px solid rgba(255,255,255,0.08)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const current = SLIDES[slide];
  const progress = ((slide + 1) / SLIDES.length) * 100;

  return (
    <div style={{ minHeight:"100vh", background:"#07090f", fontFamily:"'Outfit',sans-serif", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }

        .slide-in { animation: scaleIn 0.3s ease forwards; }

        .btn-primary {
          padding:12px 32px; border:none; border-radius:12px;
          background:linear-gradient(135deg,#5B4CF5,#7B6CF9);
          color:#fff; font-family:'Outfit',sans-serif; font-size:15px; font-weight:700;
          cursor:pointer; transition:opacity 0.2s,transform 0.15s; white-space:nowrap;
        }
        .btn-primary:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }

        .btn-ghost {
          padding:12px 24px; border:1px solid rgba(255,255,255,0.1); border-radius:12px;
          background:transparent; color:rgba(255,255,255,0.4);
          font-family:'Outfit',sans-serif; font-size:14px; font-weight:500;
          cursor:pointer; transition:all 0.18s;
        }
        .btn-ghost:hover { color:rgba(255,255,255,0.7); border-color:rgba(255,255,255,0.2); }

        .dot {
          height:6px; border-radius:99px;
          transition:all 0.3s ease; cursor:pointer;
          background:rgba(255,255,255,0.15);
        }
        .dot.active { background:var(--c); }

        @media(max-width:520px){
          .onboard-card { padding:36px 24px !important; margin:16px !important; }
        }
      `}</style>

      {/* Background ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${current.color}14 0%, transparent 70%)`,
        transition: "background 0.6s ease",
      }} />
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(91,76,245,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(91,76,245,0.018) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Card */}
      <div
        className="slide-in onboard-card"
        key={slide}
        style={{
          width: "100%", maxWidth: "520px", padding: "48px 40px",
          borderRadius: "24px",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(24px)",
          position: "relative", zIndex: 1, margin: "20px",
          boxShadow: `0 0 80px ${current.color}18`,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <span style={{ fontSize:"22px", fontWeight:900, letterSpacing:"-0.8px" }}>
            Portl<span style={{ color:"#5B4CF5" }}>.</span>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"99px", marginBottom:"36px", overflow:"hidden" }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg,${current.color},${current.color}cc)`,
            borderRadius: "99px",
            transition: "width 0.4s ease",
          }} />
        </div>

        {/* Icon bubble */}
        <div style={{
          width:"72px", height:"72px", borderRadius:"20px",
          background: `${current.color}18`,
          border: `1px solid ${current.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "28px", margin: "0 auto 28px",
          color: current.color,
          boxShadow: `0 8px 32px ${current.color}20`,
        }}>
          {current.icon}
        </div>

        {/* Text */}
        <div style={{ textAlign:"center", marginBottom:"36px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, color:current.color, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>
            Step {current.step} of {SLIDES.length} — {current.subtitle}
          </div>
          <h1 style={{ fontSize:"26px", fontWeight:800, letterSpacing:"-0.6px", marginBottom:"14px" }}>
            {current.title}
          </h1>
          <p style={{ fontSize:"14.5px", color:"rgba(255,255,255,0.48)", lineHeight:"1.7", maxWidth:"380px", margin:"0 auto" }}>
            {current.description}
          </p>
        </div>

        {/* Dot navigation */}
        <div style={{ display:"flex", justifyContent:"center", gap:"7px", marginBottom:"32px" }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === slide ? 22 : 6,
                height: "6px",
                borderRadius: "99px",
                transition: "all 0.3s ease",
                cursor: "pointer",
                background: i === slide ? current.color : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:"10px", justifyContent:"center" }}>
          {slide > 0 && (
            <button className="btn-ghost" onClick={prev} style={{ minWidth:"80px" }}>
              ← Back
            </button>
          )}
          <button className="btn-ghost" onClick={complete} disabled={saving}>
            Skip
          </button>
          <button
            className="btn-primary"
            onClick={next}
            disabled={saving}
            style={{ minWidth:"150px", background:`linear-gradient(135deg,${current.color},${current.color}cc)` }}
          >
            {saving ? "Starting…" : slide === SLIDES.length - 1 ? "Get Started →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
