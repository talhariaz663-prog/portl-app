"use client";

// NOTE: The profiles table must have studio_name (text) and website (text) columns.
// Run in Supabase SQL editor if missing:
//   alter table profiles add column if not exists studio_name text;
//   alter table profiles add column if not exists website text;

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Payments:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/></svg>,
  Help:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Settings:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export default function SettingsPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [fullName,      setFullName]      = useState("");
  const [email,         setEmail]         = useState("");
  const [studioName,    setStudioName]    = useState("");
  const [website,       setWebsite]       = useState("");
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [savingBrand,   setSavingBrand]   = useState(false);
  const [savedBrand,    setSavedBrand]    = useState(false);
  const [projectCount,  setProjectCount]  = useState(0);
  const [stageCount,    setStageCount]    = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [userId,        setUserId]        = useState("");
  const [reviewCount,   setReviewCount]   = useState(0);
  const [menuOpen,      setMenuOpen]      = useState(false);

  const currentPath = "/dashboard/settings";

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const uid = session.user.id;
      setUserId(uid);
      setEmail(session.user.email ?? "");

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, studio_name, website")
        .eq("id", uid)
        .single();
      if (profile) {
        setFullName(profile.full_name ?? "");
        setStudioName(profile.studio_name ?? "");
        setWebsite(profile.website ?? "");
      }

      // Fetch projects
      const { data: projects, count: pCount } = await supabase
        .from("projects")
        .select("id", { count: "exact" })
        .eq("designer_id", uid);
      setProjectCount(pCount ?? 0);

      // Fetch review count for sidebar badge
      const { data: projs } = await supabase
        .from("projects")
        .select("status")
        .eq("designer_id", uid);
      setReviewCount((projs ?? []).filter((p: { status: string }) => p.status === "review").length);

      // Fetch stages
      const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
      if (projectIds.length > 0) {
        const { count: sCount } = await supabase
          .from("stages")
          .select("id", { count: "exact" })
          .in("project_id", projectIds);
        setStageCount(sCount ?? 0);

        // Fetch approval count (approved activity events)
        const { count: aCount } = await supabase
          .from("activity")
          .select("id", { count: "exact" })
          .in("project_id", projectIds)
          .eq("type", "approved");
        setApprovalCount(aCount ?? 0);
      }

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveBranding = async () => {
    if (!userId) return;
    setSavingBrand(true);
    await supabase
      .from("profiles")
      .update({ studio_name: studioName, website: website })
      .eq("id", userId);
    setSavingBrand(false);
    setSavedBrand(true);
    setTimeout(() => setSavedBrand(false), 2500);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const initials  = email ? email.slice(0, 2).toUpperCase() : "??";
  const firstName = email ? email.split("@")[0].split(".")[0] : "";

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"           },
    { icon: Icons.Projects,  label: "My Work",   path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: reviewCount },
    { icon: Icons.Payments,  label: "Payments",  path: "/dashboard/payments"  },
    { icon: Icons.Help,      label: "Help",      path: "/dashboard/help"      },
    { icon: Icons.Settings,  label: "Settings",  path: "/dashboard/settings"  },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit',sans-serif" }}>
      <div style={{ width:"28px", height:"28px", border:"2px solid rgba(0,0,0,0.08)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .fi{animation:fadeUp 0.35s ease forwards;opacity:0;}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}.fi4{animation-delay:0.16s}

        .sidebar{position:fixed;top:0;left:0;bottom:0;width:240px;background:linear-gradient(180deg,#0c0e1a 0%,#080a15 100%);border-right:1px solid rgba(255,255,255,0.055);display:flex;flex-direction:column;z-index:20;}
        .sidebar-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,0.05);}
        .sidebar-nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:2px;}

        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:500;cursor:pointer;transition:all 0.18s ease;border:1px solid transparent;color:rgba(255,255,255,0.58);position:relative;}
        .nav-item:hover{color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.05);}
        .nav-item.active{color:#fff;font-weight:600;background:rgba(91,76,245,0.18);border-left:3px solid #5B4CF5;}
        .nav-item.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:linear-gradient(180deg,#5B4CF5,#7B6CF9);border-radius:0 4px 4px 0;}
        .nav-badge{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#F59E0B,#E8971A);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;padding:0 6px;}

        .sidebar-bottom{padding:16px 12px 20px;border-top:1px solid rgba(255,255,255,0.05);}
        .user-card{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);}

        .topbar{display:none;position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.97);border-bottom:1px solid #E4E4E8;backdrop-filter:blur(20px);z-index:40;align-items:center;justify-content:space-between;padding:0 16px;}
        .main{margin-left:240px;min-height:100vh;padding:32px 36px;flex:1;}

        .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;}

        .s-card{background:#fff;border:1px solid #E4E4E8;border-radius:12px;overflow:hidden;}
        .s-card-header{padding:18px 20px;border-bottom:1px solid #E4E4E8;}
        .s-card-title{font-size:14px;font-weight:700;color:#12111A;}
        .s-card-sub{font-size:12px;color:#8A8A9A;margin-top:3px;}
        .s-card-body{padding:20px;display:flex;flex-direction:column;gap:14px;}

        .s-label{font-size:11px;font-weight:700;color:#8A8A9A;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px;display:block;}
        .s-input{width:100%;background:#F5F6FA;border:1px solid #E4E4E8;border-radius:10px;padding:10px 14px;font-size:14px;color:#12111A;font-family:'Outfit',sans-serif;outline:none;transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;}
        .s-input::placeholder{color:#B0B0BC;}
        .s-input:focus{border-color:#5B4CF5;box-shadow:0 0 0 3px rgba(91,76,245,0.1);background:#fff;outline:none;}
        .s-input:disabled{color:#8A8A9A;cursor:not-allowed;background:#F5F6FA;}

        .s-divider{height:1px;background:#E4E4E8;margin:2px 0;}

        .btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;background:#5B4CF5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;font-family:'Outfit',sans-serif;cursor:pointer;transition:background 0.15s,transform 0.15s;}
        .btn-primary:hover{background:#4A3DE0;transform:translateY(-1px);}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
        .btn-primary.saved{background:#0BAB6C;}

        .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#fff;color:#6B6B7A;border:1px solid #E4E4E8;border-radius:10px;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .btn-ghost:hover{background:#F5F6FA;border-color:#D0D0D8;}

        .btn-danger-ghost{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:10px;background:#fff;color:#EF4444;border:1px solid rgba(239,68,68,0.25);border-radius:10px;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.15s;}
        .btn-danger-ghost:hover{background:rgba(239,68,68,0.04);border-color:rgba(239,68,68,0.4);}

        .stat-mini{flex:1;background:#F5F6FA;border:1px solid #E4E4E8;border-radius:10px;padding:12px;text-align:center;}

        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(255,255,255,0.98);border-bottom:1px solid #E4E4E8;padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}

        @media(max-width:768px){
          .sidebar{display:none!important;}
          .topbar{display:flex!important;}
          .main{margin-left:0!important;padding:76px 16px 40px!important;}
          .settings-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.8px",color:"#fff"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
            <span style={{fontSize:"10px",fontWeight:700,color:"#5B4CF5",background:"rgba(91,76,245,0.15)",border:"1px solid rgba(91,76,245,0.3)",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.05em"}}>BETA</span>
          </div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",marginTop:"4px"}}>Designer workspace</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ icon: Icon, label, path, badge }) => (
            <div key={label} className={`nav-item${currentPath === path ? " active" : ""}`} onClick={() => router.push(path)}>
              <Icon /><span>{label}</span>
              {badge != null && badge > 0 && <span className="nav-badge">{badge}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,flexShrink:0,color:"#fff"}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"12px",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"rgba(255,255,255,0.85)"}}>{email}</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.28)",marginTop:"1px"}}>Designer</div>
            </div>
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",padding:"4px",borderRadius:"6px",display:"flex",alignItems:"center"}} title="Sign out"><Icons.Signout /></button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="topbar">
        <span style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.6px",color:"#12111A"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{background:"#F5F6FA",border:"1px solid #E4E4E8",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#4A4A5A",fontSize:"18px"}}>☰</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"12px"}}>
            {navItems.map(({ icon: Icon, label, path }) => (
              <div key={label} className={`nav-item${currentPath === path ? " active" : ""}`} onClick={() => { router.push(path); setMenuOpen(false); }}>
                <Icon />{label}
              </div>
            ))}
          </nav>
          <div style={{borderTop:"1px solid #E4E4E8",paddingTop:"12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"12px",color:"#6B6B7A"}}>{email}</span>
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B7A",fontSize:"12px",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:"5px"}}><Icons.Signout /> Sign out</button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="main">

        {/* Header */}
        <div className="fi fi1" style={{marginBottom:"28px"}}>
          <h1 style={{fontSize:"clamp(20px,3vw,26px)",fontWeight:800,letterSpacing:"-0.5px",color:"#12111A"}}>Account Settings</h1>
          <p style={{fontSize:"13px",color:"#8A8A9A",marginTop:"4px"}}>Manage your profile and preferences</p>
        </div>

        {/* Grid */}
        <div className="settings-grid">

          {/* ── LEFT COLUMN ── */}
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

            {/* Card 1 — Profile */}
            <div className="fi fi2 s-card">
              <div className="s-card-header">
                <div className="s-card-title">Profile</div>
                <div className="s-card-sub">Your public designer information</div>
              </div>
              <div className="s-card-body">
                {/* Avatar row */}
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  <div style={{width:"64px",height:"64px",borderRadius:"16px",background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",fontWeight:800,color:"#fff",flexShrink:0}}>
                    {initials}
                  </div>
                  <div>
                    <div style={{fontSize:"15px",fontWeight:700,color:"#12111A"}}>{fullName || firstName || "—"}</div>
                    <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>{email}</div>
                  </div>
                </div>

                <div className="s-divider" />

                {/* Full Name */}
                <div>
                  <label className="s-label">Full Name</label>
                  <input className="s-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Talha Riaz" />
                </div>

                {/* Email */}
                <div>
                  <label className="s-label">Email</label>
                  <input className="s-input" value={email} disabled />
                  <div style={{fontSize:"11px",color:"#B0B0BC",marginTop:"5px"}}>Email is managed by magic link — cannot be changed here</div>
                </div>

                <button className={`btn-primary${saved ? " saved" : ""}`} onClick={saveProfile} disabled={saving}>
                  {saved ? "✓ Saved" : saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Card 2 — Danger Zone */}
            <div className="fi fi3 s-card" style={{border:"1px solid rgba(239,68,68,0.2)"}}>
              <div className="s-card-header" style={{background:"rgba(239,68,68,0.02)",borderBottom:"1px solid rgba(239,68,68,0.15)"}}>
                <div className="s-card-title" style={{color:"#EF4444"}}>Danger Zone</div>
                <div className="s-card-sub">Irreversible actions — proceed with caution</div>
              </div>
              <div className="s-card-body">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
                  <span style={{fontSize:"13px",color:"#6B6B7A"}}>
                    Signed in as <strong style={{color:"#12111A",fontWeight:600}}>{email}</strong>
                  </span>
                  <button className="btn-ghost" onClick={handleSignOut}>Sign out</button>
                </div>
                <div className="s-divider" />
                <button className="btn-danger-ghost">Delete Account</button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

            {/* Card 1 — Plan & Usage */}
            <div className="fi fi2 s-card">
              <div className="s-card-header">
                <div className="s-card-title">Plan &amp; Usage</div>
                <div className="s-card-sub">Your current plan and activity</div>
              </div>
              <div className="s-card-body">
                {/* Current Plan */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:"13px",color:"#6B6B7A",fontWeight:500}}>Current Plan</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(91,76,245,0.08)",border:"1px solid rgba(91,76,245,0.2)",borderRadius:"999px",padding:"3px 10px",fontSize:"11px",fontWeight:700,color:"#5B4CF5"}}>
                    <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#5B4CF5"}} />
                    Beta — Free
                  </span>
                </div>

                <div className="s-divider" />

                <div>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px"}}>Your Activity</div>
                  <div style={{display:"flex",gap:"8px"}}>
                    {[
                      { value: projectCount,  label: "Projects"  },
                      { value: stageCount,    label: "Stages"    },
                      { value: approvalCount, label: "Approvals" },
                    ].map(s => (
                      <div key={s.label} className="stat-mini">
                        <div style={{fontSize:"20px",fontWeight:800,color:"#12111A",letterSpacing:"-0.5px",lineHeight:1}}>{s.value}</div>
                        <div style={{fontSize:"10px",fontWeight:700,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"4px"}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 — Portal Branding */}
            <div className="fi fi3 s-card">
              <div className="s-card-header">
                <div className="s-card-title">Portal Branding</div>
                <div className="s-card-sub">How your portals appear to clients</div>
              </div>
              <div className="s-card-body">
                <div>
                  <label className="s-label">Studio Name</label>
                  <input className="s-input" value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="e.g. Taruha Studio" />
                  <div style={{fontSize:"11px",color:"#B0B0BC",marginTop:"5px"}}>Shown to clients on your portal header</div>
                </div>
                <div>
                  <label className="s-label">Website</label>
                  <input className="s-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="e.g. https://taruha.com" />
                </div>
                <button className={`btn-primary${savedBrand ? " saved" : ""}`} onClick={saveBranding} disabled={savingBrand}>
                  {savedBrand ? "✓ Saved" : savingBrand ? "Saving…" : "Save Branding"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
