"use client";

// NOTE: Run in Supabase SQL editor to add required columns:
//   alter table profiles add column if not exists niche text;
//   alter table profiles add column if not exists timezone text default 'Asia/Karachi';
//   alter table profiles add column if not exists studio_name text;
//   alter table profiles add column if not exists tagline text;
//   alter table profiles add column if not exists website text;
//   alter table profiles add column if not exists accent_color text default '#5B4CF5';
//   alter table profiles add column if not exists notify_approved boolean default true;
//   alter table profiles add column if not exists notify_revision boolean default true;
//   alter table profiles add column if not exists notify_weekly boolean default false;

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ACCENT_COLORS = ["#5B4CF5", "#0BAB6C", "#F59E0B", "#EF4444", "#12111A"];
const TIMEZONES = [
  "Asia/Karachi", "Asia/Dubai", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney",
];
const NICHES = [
  "Brand Identity", "UI/UX Design", "Web Design", "Illustration",
  "Motion Design", "Packaging Design", "Social Media Design", "Other",
];

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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width:"40px", height:"22px", borderRadius:"999px", border:"none", cursor:"pointer",
      background: on ? "#5B4CF5" : "#E4E4E8", position:"relative", flexShrink:0,
      transition:"background 0.2s", padding:0,
    }}>
      <div style={{
        position:"absolute", top:"2px", width:"18px", height:"18px", borderRadius:"50%",
        background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.15)",
        left: on ? "20px" : "2px", transition:"left 0.2s",
      }} />
    </button>
  );
}

function SaveBtn({ saving, saved, label = "Save", onClick }: { saving: boolean; saved: boolean; label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving} style={{
      alignSelf:"flex-start", padding:"10px 20px", border:"none", borderRadius:"10px",
      background: saved ? "#0BAB6C" : "#5B4CF5", color:"#fff",
      fontFamily:"'Outfit',sans-serif", fontSize:"13px", fontWeight:700,
      cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
      transition:"background 0.2s",
    }}>
      {saved ? "✓ Saved" : saving ? "Saving…" : label}
    </button>
  );
}

export default function SettingsPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [fullName,        setFullName]        = useState("");
  const [niche,           setNiche]           = useState("");
  const [timezone,        setTimezone]        = useState("Asia/Karachi");
  const [studioName,      setStudioName]      = useState("");
  const [tagline,         setTagline]         = useState("");
  const [website,         setWebsite]         = useState("");
  const [accentColor,     setAccentColor]     = useState("#5B4CF5");
  const [notifyApproved,  setNotifyApproved]  = useState(true);
  const [notifyRevision,  setNotifyRevision]  = useState(true);
  const [notifyWeekly,    setNotifyWeekly]    = useState(false);
  const [email,           setEmail]           = useState("");
  const [loading,         setLoading]         = useState(true);
  const [savingProfile,   setSavingProfile]   = useState(false);
  const [savedProfile,    setSavedProfile]    = useState(false);
  const [savingBranding,  setSavingBranding]  = useState(false);
  const [savedBranding,   setSavedBranding]   = useState(false);
  const [savingNotif,     setSavingNotif]     = useState(false);
  const [savedNotif,      setSavedNotif]      = useState(false);
  const [projectCount,    setProjectCount]    = useState(0);
  const [stageCount,      setStageCount]      = useState(0);
  const [invoiceCount,    setInvoiceCount]    = useState(0);
  const [approvalCount,   setApprovalCount]   = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [userID,          setUserID]          = useState("");
  const [reviewCount,     setReviewCount]     = useState(0);
  const [menuOpen,        setMenuOpen]        = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const uid = session.user.id;
      setEmail(session.user.email ?? "");
      setUserID(uid);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, niche, timezone, studio_name, tagline, website, accent_color, notify_approved, notify_revision, notify_weekly")
        .eq("id", uid)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setNiche(profile.niche ?? "");
        setTimezone(profile.timezone ?? "Asia/Karachi");
        setStudioName(profile.studio_name ?? "");
        setTagline(profile.tagline ?? "");
        setWebsite(profile.website ?? "");
        setAccentColor(profile.accent_color ?? "#5B4CF5");
        setNotifyApproved(profile.notify_approved ?? true);
        setNotifyRevision(profile.notify_revision ?? true);
        setNotifyWeekly(profile.notify_weekly ?? false);
      }

      const { data: projects, count: pCount } = await supabase
        .from("projects")
        .select("id", { count: "exact" })
        .eq("designer_id", uid);
      setProjectCount(pCount ?? 0);

      const { data: projsForBadge } = await supabase
        .from("projects").select("status").eq("designer_id", uid);
      setReviewCount((projsForBadge ?? []).filter((p: { status: string }) => p.status === "review").length);

      const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
      if (projectIds.length > 0) {
        const { count: sCount } = await supabase
          .from("stages").select("id", { count: "exact" }).in("project_id", projectIds);
        setStageCount(sCount ?? 0);

        const { count: aCount } = await supabase
          .from("activity").select("id", { count: "exact" })
          .in("project_id", projectIds).eq("type", "approved");
        setApprovalCount(aCount ?? 0);
      }

      const { count: iCount } = await supabase
        .from("invoices").select("id", { count: "exact" }).eq("user_id", uid);
      setInvoiceCount(iCount ?? 0);

      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const saveProfile = async () => {
    setSavingProfile(true);
    await supabase.from("profiles").update({ full_name: fullName, niche, timezone }).eq("id", userID).select().single();
    setSavingProfile(false); setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2500);
  };

  const saveBranding = async () => {
    setSavingBranding(true);
    await supabase.from("profiles").update({ studio_name: studioName, tagline, website, accent_color: accentColor }).eq("id", userID).select().single();
    setSavingBranding(false); setSavedBranding(true);
    setTimeout(() => setSavedBranding(false), 2500);
  };

  const saveNotifications = async () => {
    setSavingNotif(true);
    await supabase.from("profiles").update({ notify_approved: notifyApproved, notify_revision: notifyRevision, notify_weekly: notifyWeekly }).eq("id", userID).select().single();
    setSavingNotif(false); setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2500);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { data: projects } = await supabase.from("projects").select("id").eq("designer_id", userID);
    const ids = (projects ?? []).map((p: { id: string }) => p.id);
    if (ids.length > 0) {
      await supabase.from("invoices").delete().eq("user_id", userID);
      await supabase.from("activity").delete().in("project_id", ids);
      const { data: stgs } = await supabase.from("stages").select("id").in("project_id", ids);
      const stgIds = (stgs ?? []).map((s: { id: string }) => s.id);
      if (stgIds.length > 0) {
        await supabase.from("files").delete().in("stage_id", stgIds);
      }
      await supabase.from("stages").delete().in("project_id", ids);
      await supabase.from("projects").delete().eq("designer_id", userID);
    }
    await supabase.from("profiles").delete().eq("id", userID);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleExport = async () => {
    const [{ data: projects }, { data: invoices }] = await Promise.all([
      supabase.from("projects").select("*").eq("designer_id", userID),
      supabase.from("invoices").select("*").eq("user_id", userID),
    ]);
    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
    let stages = [];
    if (projectIds.length > 0) {
      const { data: s } = await supabase.from("stages").select("*").in("project_id", projectIds);
      stages = s ?? [];
    }
    const data = { exported_at: new Date().toISOString(), projects: projects ?? [], stages, invoices: invoices ?? [] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "portl-export.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const initials    = email ? email.slice(0, 2).toUpperCase() : "??";
  const currentPath = "/dashboard/settings";

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

  const inputStyle: React.CSSProperties = {
    width:"100%", background:"#F5F6FA", border:"1px solid #E4E4E8", borderRadius:"10px",
    padding:"10px 14px", fontSize:"14px", color:"#12111A", fontFamily:"'Outfit',sans-serif",
    outline:"none",
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance:"none" as const,
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%238A8A9A' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
    paddingRight:"32px", cursor:"pointer",
  };
  const labelStyle: React.CSSProperties = {
    fontSize:"11px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase",
    letterSpacing:"0.07em", marginBottom:"5px", display:"block",
  };
  const hintStyle: React.CSSProperties = {
    fontSize:"11px", color:"#B0B0BC", marginTop:"4px",
  };
  const cardStyle: React.CSSProperties = {
    background:"#fff", border:"1px solid #E4E4E8", borderRadius:"12px", overflow:"hidden",
  };
  const cardHeaderStyle: React.CSSProperties = {
    padding:"18px 20px", borderBottom:"1px solid #E4E4E8",
    display:"flex", alignItems:"center", gap:"10px",
  };
  const cardBodyStyle: React.CSSProperties = {
    padding:"20px", display:"flex", flexDirection:"column", gap:"14px",
  };
  const ghostBtn: React.CSSProperties = {
    background:"#fff", color:"#6B6B7A", border:"1px solid #E4E4E8", borderRadius:"10px",
    padding:"8px 16px", fontSize:"12px", fontWeight:600, fontFamily:"'Outfit',sans-serif",
    cursor:"pointer", whiteSpace:"nowrap" as const,
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fi{animation:fadeUp 0.35s ease forwards;opacity:0;}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}.fi4{animation-delay:0.16s}.fi5{animation-delay:0.20s}

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
        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(255,255,255,0.98);border-bottom:1px solid #E4E4E8;padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}

        .s-input:focus{border-color:#5B4CF5 !important;box-shadow:0 0 0 3px rgba(91,76,245,0.1) !important;background:#fff !important;outline:none !important;}
        .s-input:disabled{color:#8A8A9A !important;cursor:not-allowed !important;opacity:0.7 !important;}
        .ghost-btn:hover{background:#F5F6FA !important;border-color:#D0D0D8 !important;}
        .danger-ghost-btn:hover{background:rgba(239,68,68,0.08) !important;border-color:rgba(239,68,68,0.35) !important;}

        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .four-stats{display:flex;gap:8px;}
        .four-stats > *{flex:1;}

        @media(max-width:768px){
          .sidebar{display:none!important;}
          .topbar{display:flex!important;}
          .main{margin-left:0!important;padding:76px 16px 40px!important;}
        }
        @media(max-width:600px){
          .two-col{grid-template-columns:1fr!important;}
          .four-stats{flex-wrap:wrap!important;}
          .four-stats > *{flex:1 1 calc(50% - 4px)!important;}
        }
      `}</style>

      {/* ── Sidebar ── */}
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

      {/* ── Mobile Topbar ── */}
      <header className="topbar">
        <span style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.6px",color:"#12111A"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{background:"#F5F6FA",border:"1px solid #E4E4E8",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#4A4A5A",fontSize:"18px"}}>☰</button>
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

      {/* ── Main ── */}
      <main className="main">
        <div style={{maxWidth:"720px"}}>

          {/* Header */}
          <div className="fi fi1" style={{marginBottom:"28px"}}>
            <h1 style={{fontSize:"clamp(20px,3vw,26px)",fontWeight:800,letterSpacing:"-0.5px",color:"#12111A"}}>Account Settings</h1>
            <p style={{fontSize:"13px",color:"#8A8A9A",marginTop:"4px"}}>Manage your profile, branding and preferences</p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

            {/* ── SECTION 1: PROFILE ── */}
            <div className="fi fi2" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"rgba(91,76,245,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>👤</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#12111A"}}>Profile</div>
                  <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>Your public designer information</div>
                </div>
              </div>
              <div style={cardBodyStyle}>
                {/* Avatar row */}
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  <div style={{width:"64px",height:"64px",borderRadius:"16px",background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",fontWeight:800,color:"#fff",flexShrink:0}}>
                    {initials}
                  </div>
                  <div>
                    <div style={{fontSize:"15px",fontWeight:700,color:"#12111A"}}>{fullName || email.split("@")[0] || "—"}</div>
                    <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>{email}</div>
                    <div style={{fontSize:"11px",color:"#B0B0BC",marginTop:"3px"}}>Avatar photo upload coming in V2</div>
                  </div>
                </div>

                <div style={{height:"1px",background:"#E4E4E8"}} />

                {/* Full Name + Niche */}
                <div className="two-col">
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input className="s-input" style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Talha Riaz" />
                  </div>
                  <div>
                    <label style={labelStyle}>Design Niche</label>
                    <select className="s-input" style={selectStyle} value={niche} onChange={e => setNiche(e.target.value)}>
                      <option value="">Select niche…</option>
                      {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Email + Timezone */}
                <div className="two-col">
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input className="s-input" style={{...inputStyle}} disabled value={email} />
                    <div style={hintStyle}>Email is managed by magic link — cannot be changed here</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Timezone</label>
                    <select className="s-input" style={selectStyle} value={timezone} onChange={e => setTimezone(e.target.value)}>
                      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <SaveBtn saving={savingProfile} saved={savedProfile} label="Save Profile" onClick={saveProfile} />
              </div>
            </div>

            {/* ── SECTION 2: PORTAL BRANDING ── */}
            <div className="fi fi2" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"rgba(91,76,245,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>🎨</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#12111A"}}>Portal Branding</div>
                  <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>How your portals appear to clients</div>
                </div>
              </div>
              <div style={cardBodyStyle}>
                <div className="two-col">
                  <div>
                    <label style={labelStyle}>Studio Name</label>
                    <input className="s-input" style={inputStyle} value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="e.g. Taruha Studio" />
                    <div style={hintStyle}>Shown in client portal header</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Tagline</label>
                    <input className="s-input" style={inputStyle} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Design that delivers" />
                    <div style={hintStyle}>One line shown below your name</div>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Website</label>
                  <input className="s-input" style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="e.g. https://taruha.com" />
                </div>

                <div>
                  <label style={labelStyle}>Portal Accent Color</label>
                  <div style={{display:"flex",gap:"8px",marginTop:"2px",marginBottom:"6px"}}>
                    {ACCENT_COLORS.map(c => (
                      <button key={c} onClick={() => setAccentColor(c)} style={{
                        width:"36px", height:"36px", borderRadius:"50%", background:c, border:"none",
                        cursor:"pointer", outline: accentColor === c ? `2px solid #12111A` : "2px solid transparent",
                        outlineOffset:"2px", transition:"outline 0.15s", flexShrink:0,
                      }} />
                    ))}
                  </div>
                  <div style={hintStyle}>Used for buttons and highlights on your client portal</div>
                </div>

                <SaveBtn saving={savingBranding} saved={savedBranding} label="Save Branding" onClick={saveBranding} />
              </div>
            </div>

            {/* ── SECTION 3: NOTIFICATIONS ── */}
            <div className="fi fi3" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"rgba(245,158,11,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>🔔</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#12111A"}}>Notifications</div>
                  <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>Control when Portl emails you</div>
                </div>
              </div>
              <div style={cardBodyStyle}>
                {[
                  { label:"Client approves a stage", sub:"Get emailed when a client clicks Approve", value: notifyApproved, toggle: () => setNotifyApproved(v => !v) },
                  { label:"Client requests revision",  sub:"Get emailed when a client requests changes", value: notifyRevision, toggle: () => setNotifyRevision(v => !v) },
                  { label:"Weekly summary",             sub:"A weekly digest of your project activity", value: notifyWeekly,   toggle: () => setNotifyWeekly(v => !v),   last: true },
                ].map((row, i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",paddingBottom: row.last ? 0 : "12px",borderBottom: row.last ? "none" : "1px solid #F0F0F5"}}>
                    <div>
                      <div style={{fontSize:"13px",fontWeight:600,color:"#12111A"}}>{row.label}</div>
                      <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>{row.sub}</div>
                    </div>
                    <Toggle on={row.value} onToggle={row.toggle} />
                  </div>
                ))}

                <SaveBtn saving={savingNotif} saved={savedNotif} label="Save Preferences" onClick={saveNotifications} />
              </div>
            </div>

            {/* ── SECTION 4: PLAN & USAGE ── */}
            <div className="fi fi3" style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"rgba(91,76,245,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>💳</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#12111A"}}>Plan &amp; Usage</div>
                  <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>Your current plan and activity</div>
                </div>
              </div>
              <div style={cardBodyStyle}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:"11px",fontWeight:700,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:"0.07em"}}>Current Plan</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(91,76,245,0.08)",border:"1px solid rgba(91,76,245,0.2)",borderRadius:"999px",padding:"4px 12px",fontSize:"11px",fontWeight:700,color:"#5B4CF5"}}>
                    <span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#5B4CF5"}} /> Beta — Free
                  </span>
                </div>

                {/* Feature list */}
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {["Unlimited projects","Client portals with unique URLs","File uploads & approvals","Invoice management"].map(f => (
                    <div key={f} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <div style={{width:"18px",height:"18px",borderRadius:"50%",background:"rgba(11,171,108,0.12)",border:"1px solid rgba(11,171,108,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#0BAB6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{fontSize:"13px",color:"#4A4A5A"}}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Upgrade banner */}
                <div style={{background:"linear-gradient(135deg,rgba(91,76,245,0.06),rgba(11,171,108,0.06))",border:"1px solid rgba(91,76,245,0.15)",borderRadius:"10px",padding:"14px 16px"}}>
                  <div style={{fontSize:"13px",fontWeight:600,color:"#12111A",marginBottom:"4px"}}>Founding member pricing locked in 🎉</div>
                  <div style={{fontSize:"11px",color:"#8A8A9A",lineHeight:1.5}}>You&apos;re on the beta — paid plans launch soon. You&apos;ll get 50% off for life.</div>
                </div>

                <div style={{height:"1px",background:"#E4E4E8"}} />

                <div>
                  <div style={{fontSize:"11px",fontWeight:700,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px"}}>Your Activity</div>
                  <div className="four-stats">
                    {[
                      { value: projectCount,  label: "Projects"  },
                      { value: stageCount,    label: "Stages"    },
                      { value: invoiceCount,  label: "Invoices"  },
                      { value: approvalCount, label: "Approvals" },
                    ].map(s => (
                      <div key={s.label} style={{background:"#F5F6FA",border:"1px solid #E4E4E8",borderRadius:"10px",padding:"12px",textAlign:"center"}}>
                        <div style={{fontSize:"20px",fontWeight:800,color:"#12111A",letterSpacing:"-0.5px",lineHeight:1}}>{s.value}</div>
                        <div style={{fontSize:"10px",fontWeight:700,color:"#8A8A9A",textTransform:"uppercase",letterSpacing:"0.05em",marginTop:"4px"}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 5: DANGER ZONE ── */}
            <div className="fi fi4" style={{...cardStyle, border:"1px solid rgba(239,68,68,0.2)"}}>
              <div style={{...cardHeaderStyle, background:"rgba(239,68,68,0.02)", borderBottom:"1px solid rgba(239,68,68,0.15)"}}>
                <div style={{width:"32px",height:"32px",borderRadius:"8px",background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px"}}>⚠️</div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:"#EF4444"}}>Danger Zone</div>
                  <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>Irreversible actions — proceed with caution</div>
                </div>
              </div>
              <div style={cardBodyStyle}>
                {/* Sign out row */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
                  <span style={{fontSize:"13px",color:"#6B6B7A"}}>Signed in as <strong style={{color:"#12111A",fontWeight:600}}>{email}</strong></span>
                  <button className="ghost-btn" style={ghostBtn} onClick={handleSignOut}>Sign out</button>
                </div>

                <div style={{height:"1px",background:"#E4E4E8"}} />

                {/* Export row */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:600,color:"#12111A"}}>Export my data</div>
                    <div style={{fontSize:"12px",color:"#8A8A9A",marginTop:"2px"}}>Download all your projects, files and invoices</div>
                  </div>
                  <button className="ghost-btn" style={ghostBtn} onClick={handleExport}>Export</button>
                </div>

                <div style={{height:"1px",background:"#E4E4E8"}} />

                {/* Delete row */}
                <div>
                  <div style={{fontSize:"13px",fontWeight:600,color:"#12111A",marginBottom:"4px"}}>Delete Account</div>
                  <div style={{fontSize:"12px",color:"#8A8A9A",lineHeight:1.5,marginBottom:"12px"}}>Permanently deletes your account, all projects, files and invoices. This cannot be undone.</div>
                  <button className="danger-ghost-btn" onClick={() => setShowDeleteConfirm(true)} style={{width:"100%",padding:"10px 20px",background:"rgba(239,68,68,0.06)",color:"#EF4444",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",fontSize:"13px",fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer"}}>
                    Delete my account
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(18,17,26,0.7)",backdropFilter:"blur(8px)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",animation:"fadeIn 0.2s ease"}}>
          <div style={{background:"#fff",border:"1px solid rgba(239,68,68,0.3)",borderRadius:"20px",padding:"32px",maxWidth:"380px",width:"100%",textAlign:"center",animation:"fadeUp 0.2s ease"}}>
            <div style={{fontSize:"32px",marginBottom:"16px"}}>⚠️</div>
            <div style={{fontSize:"20px",fontWeight:800,color:"#12111A",marginBottom:"12px"}}>Delete your account?</div>
            <p style={{fontSize:"14px",color:"#6B6B7A",lineHeight:1.6,marginBottom:"24px"}}>
              This will permanently delete all your projects, stages, files, invoices and your Portl account. This cannot be undone.
            </p>
            <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
              <button style={ghostBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} style={{padding:"12px 20px",background:"#EF4444",color:"#fff",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:700,fontFamily:"'Outfit',sans-serif",cursor:deleting?"not-allowed":"pointer",opacity:deleting?0.6:1}}>
                {deleting ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
