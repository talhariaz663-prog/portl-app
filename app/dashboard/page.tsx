"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "active" | "review" | "approved" | "draft";

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: Status;
  current_stage: string | null;
  updated_at: string;
}

interface ActivityItem {
  id: string;
  project_id: string;
  stage_id: string | null;
  type: string;
  message: string | null;
  created_at: string;
  project_name?: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  active:   { label: "Active",    color: "#0BAB6C", bg: "rgba(11,171,108,0.12)",  border: "rgba(11,171,108,0.25)"  },
  review:   { label: "In Review", color: "#F5A623", bg: "rgba(245,166,35,0.12)",  border: "rgba(245,166,35,0.25)"  },
  approved: { label: "Approved",  color: "#5B4CF5", bg: "rgba(91,76,245,0.12)",   border: "rgba(91,76,245,0.25)"   },
  draft:    { label: "Draft",     color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)"  },
};

const CARD_COLORS = ["#5B4CF5", "#0BAB6C", "#F5A623", "#E85D75", "#7B6CF9"];

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const NOTIF_KEY = "portl_notif_last_seen";

// ── SVG Icons ──
const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  MyWork: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Bell:      ({ active }: { active: boolean }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3C9.24 3 7 5.24 7 8v5l-2 2v1h14v-1l-2-2V8c0-2.76-2.24-5-5-5z" fill={active ? "#5B4CF5" : "currentColor"} opacity={active ? 1 : 0.7}/><path d="M12 21c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" fill={active ? "#5B4CF5" : "currentColor"} opacity={active ? 1 : 0.7}/></svg>,
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Arrow:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Check:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Warning:   () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Payments:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/></svg>,
  Help:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export default function DashboardPage() {
  const router   = useRouter();
  const supabase = createClient();
  const bellRef  = useRef<HTMLDivElement>(null);

  const [projects,    setProjects]    = useState<Project[]>([]);
  const [activity,    setActivity]    = useState<ActivityItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [filter,      setFilter]      = useState<Status | "all">("all");
  const [userEmail,   setUserEmail]   = useState("");
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile,    setIsMobile]    = useState(false);
  const [activeNav,   setActiveNav]   = useState("Studio");
  const [lastSeen,    setLastSeen]    = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(NOTIF_KEY);
      return stored ? new Date(stored) : new Date(0);
    }
    return new Date(0);
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", session.user.id)
      .single();

    if (!profile?.onboarding_complete) {
      router.push("/onboarding");
      return;
    }

    const { data: projData, error: dbError } = await supabase
      .from("projects")
      .select("id, name, client_name, status, current_stage, updated_at")
      .eq("designer_id", session.user.id)
      .order("updated_at", { ascending: false });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    const projs = (projData as Project[]) ?? [];
    setProjects(projs);

    if (projs.length > 0) {
      const projectIds = projs.map(p => p.id);
      const { data: actData } = await supabase
        .from("activity")
        .select("id, project_id, stage_id, type, message, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(30);
      const acts = (actData ?? []) as ActivityItem[];
      const actsWithNames = acts.map(a => ({
        ...a,
        project_name: projs.find(p => p.id === a.project_id)?.name ?? "Unknown",
      }));
      setActivity(actsWithNames);
      const unread = actsWithNames.filter(a =>
        new Date(a.created_at) > lastSeen &&
        (a.type === "approved" || a.type === "changes_requested")
      ).length;
      setUnreadCount(unread);
    }
    setLoading(false);
  }, [supabase, router, lastSeen]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifications = () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen) {
      const now = new Date();
      setLastSeen(now);
      setUnreadCount(0);
      localStorage.setItem(NOTIF_KEY, now.toISOString());
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const counts = {
    all:      projects.length,
    active:   projects.filter(p => p.status === "active").length,
    review:   projects.filter(p => p.status === "review").length,
    approved: projects.filter(p => p.status === "approved").length,
    draft:    projects.filter(p => p.status === "draft").length,
  };

  const filtered      = filter === "all" ? projects : projects.filter(p => p.status === filter);
  const initials      = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";
  const reviewProjs   = projects.filter(p => p.status === "review");
  const recentActivity = activity.filter(a => a.type === "approved" || a.type === "changes_requested").slice(0, 5);
  const hasUnread     = unreadCount > 0;

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    key: "Studio",    path: "/dashboard"           },
    { icon: Icons.MyWork,    label: "My Work",   key: "MyWork",    path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  key: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", key: "Approvals", path: "/dashboard/approvals", badge: counts.review },
    { icon: Icons.Payments,  label: "Payments",  key: "Payments",  path: "/dashboard/payments"  },
    { icon: Icons.Help,      label: "Help",      key: "Help",      path: "/dashboard/help"      },
  ];

  const notifItems = activity.filter(a => a.type === "approved" || a.type === "changes_requested");

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes popIn    { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

        .fi  { animation:fadeUp 0.4s ease forwards; opacity:0; }
        .fi1 { animation-delay:0.05s } .fi2 { animation-delay:0.10s }
        .fi3 { animation-delay:0.15s } .fi4 { animation-delay:0.20s }
        .fi5 { animation-delay:0.25s }

        /* Sidebar */
        .sidebar {
          position:fixed; top:0; left:0; bottom:0; width:240px;
          background:linear-gradient(180deg,#0c0e1a 0%,#080a15 100%);
          border-right:1px solid rgba(255,255,255,0.055);
          display:flex; flex-direction:column;
          padding:0; z-index:20; backdrop-filter:blur(20px);
        }

        .sidebar-logo {
          padding:28px 24px 20px;
          border-bottom:1px solid rgba(255,255,255,0.05);
        }

        .sidebar-nav { padding:16px 12px; flex:1; display:flex; flex-direction:column; gap:2px; }

        .nav-item {
          display:flex; align-items:center; gap:12px;
          padding:10px 14px; border-radius:12px;
          font-size:13.5px; font-weight:500; cursor:pointer;
          transition:all 0.18s ease; border:1px solid transparent;
          color:rgba(255,255,255,0.38); position:relative;
          text-decoration:none;
        }
        .nav-item:hover { color:rgba(255,255,255,0.75); background:rgba(255,255,255,0.04); }
        .nav-item.active {
          color:#fff; font-weight:600;
          background:rgba(91,76,245,0.14);
          border-color:rgba(91,76,245,0.28);
        }
        .nav-item.active::before {
          content:''; position:absolute; left:-12px; top:50%; transform:translateY(-50%);
          width:3px; height:20px; background:linear-gradient(180deg,#5B4CF5,#7B6CF9);
          border-radius:0 4px 4px 0;
        }

        .nav-badge {
          margin-left:auto; min-width:20px; height:20px; border-radius:10px;
          background:linear-gradient(135deg,#F5A623,#E8971A);
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:800; color:#fff; padding:0 6px;
        }

        .sidebar-bottom {
          padding:16px 12px 20px;
          border-top:1px solid rgba(255,255,255,0.05);
        }

        /* Bell */
        .bell-btn {
          width:100%; display:flex; align-items:center; gap:12px;
          padding:10px 14px; border-radius:12px; border:1px solid transparent;
          background:none; cursor:pointer; transition:all 0.18s;
          color:rgba(255,255,255,0.38); font-family:'Outfit',sans-serif;
          font-size:13.5px; font-weight:500; position:relative;
        }
        .bell-btn:hover { color:rgba(255,255,255,0.75); background:rgba(255,255,255,0.04); }
        .bell-btn.active { color:#a093ff; background:rgba(91,76,245,0.12); border-color:rgba(91,76,245,0.25); }

        /* User card */
        .user-card {
          display:flex; align-items:center; gap:10px;
          padding:12px 14px; border-radius:12px; margin-top:4px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
        }

        /* Topbar mobile */
        .topbar {
          display:none; position:fixed; top:0; left:0; right:0; height:60px;
          background:rgba(255,255,255,0.97); border-bottom:1px solid #E4E4E8;
          backdrop-filter:blur(20px); z-index:40;
          align-items:center; justify-content:space-between; padding:0 16px;
        }

        /* Main */
        .main { margin-left:240px; min-height:100vh; padding:32px 36px; position:relative; zIndex:1; }

        /* Bento grid */
        .bento { display:grid; gap:16px; }
        .bento-top { grid-template-columns:repeat(4,1fr); }
        .bento-mid { grid-template-columns:2fr 1fr; }
        .bento-projects { grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); }

        /* Cards */
        .card {
          background:#FFFFFF;
          border:1px solid #E4E4E8;
          box-shadow:0 1px 4px rgba(0,0,0,0.06);
          border-radius:18px; padding:22px 24px;
          transition:border-color 0.2s, transform 0.2s;
          position:relative; overflow:hidden;
        }
        .card:hover { border-color:#D0D0D8; }
        .card-clickable { cursor:pointer; }
        .card-clickable:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.1); }

        /* Stat cards */
        .stat-card { padding:20px 22px; }

        /* Project card */
        .proj-card {
          background:#FFFFFF;
          border:1px solid #E4E4E8;
          box-shadow:0 1px 4px rgba(0,0,0,0.06);
          border-radius:16px; padding:20px 22px; cursor:pointer;
          position:relative; overflow:hidden;
          transition:all 0.2s ease;
        }
        .proj-card:hover { border-color:#D0D0D8; transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.1); }

        /* Filter pills */
        .filter-pill {
          padding:5px 14px; border-radius:20px; cursor:pointer;
          font-size:12px; font-weight:600; border:1px solid #E4E4E8;
          background:#FFFFFF; color:#8A8A9A;
          font-family:'Outfit',sans-serif; transition:all 0.15s; white-space:nowrap;
        }
        .filter-pill:hover { color:#4A4A5A; border-color:#C8C8D4; }
        .filter-pill.active { background:rgba(91,76,245,0.1); border-color:rgba(91,76,245,0.35); color:#5B4CF5; }

        /* New project btn */
        .new-btn {
          display:flex; align-items:center; gap:7px;
          padding:9px 18px; border:none; border-radius:10px;
          background:linear-gradient(135deg,#5B4CF5,#0BAB6C);
          color:#fff; font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:700; cursor:pointer;
          transition:opacity 0.2s, transform 0.15s; white-space:nowrap;
        }
        .new-btn:hover { opacity:0.88; transform:translateY(-1px); }

        /* Activity item */
        .activity-row {
          display:flex; align-items:flex-start; gap:12px;
          padding:10px 0; border-bottom:1px solid #E4E4E8;
          cursor:pointer; transition:opacity 0.15s;
        }
        .activity-row:hover { opacity:0.8; }
        .activity-row:last-child { border-bottom:none; padding-bottom:0; }

        /* Notification panel */
        .notif-panel {
          position:absolute; width:320px; z-index:300;
          background:#0d0f1e; border:1px solid rgba(255,255,255,0.1);
          border-radius:16px; overflow:hidden;
          box-shadow:0 24px 64px rgba(0,0,0,0.6);
          animation:popIn 0.15s ease forwards;
        }

        /* Mobile menu */
        .mobile-menu {
          position:fixed; top:60px; left:0; right:0; z-index:50;
          background:rgba(255,255,255,0.98); border-bottom:1px solid #E4E4E8;
          padding:16px; backdrop-filter:blur(20px);
          animation:fadeIn 0.2s ease forwards;
        }

        /* Pulse dot */
        .pulse-dot { width:7px; height:7px; border-radius:50%; background:#0BAB6C; animation:pulse 2s ease-in-out infinite; flex-shrink:0; }

        /* Progress bar */
        .progress-track { height:4px; background:rgba(0,0,0,0.08); border-radius:99px; overflow:hidden; }
        .progress-fill  { height:100%; border-radius:99px; transition:width 0.6s ease; }

        /* Scrollbar */
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.1); border-radius:4px; }

        @media (max-width:768px) {
          .sidebar { display:none !important; }
          .topbar  { display:flex !important; }
          .main    { margin-left:0 !important; padding:76px 16px 40px !important; }
          .bento-top     { grid-template-columns:1fr 1fr !important; }
          .bento-mid     { grid-template-columns:1fr !important; }
          .bento-projects { grid-template-columns:1fr !important; }
        }
        @media (max-width:480px) {
          .bento-top { grid-template-columns:1fr 1fr !important; }
        }
      `}</style>

      {/* ── BG ── */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:"radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",
        backgroundSize:"40px 40px",
      }} />

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:"22px", fontWeight:900, letterSpacing:"-0.8px" }}>
              Portl<span style={{ color:"#5B4CF5" }}>.</span>
            </span>
            <span style={{
              fontSize:"10px", fontWeight:700, color:"#5B4CF5",
              background:"rgba(91,76,245,0.15)", border:"1px solid rgba(91,76,245,0.3)",
              borderRadius:"6px", padding:"2px 7px", letterSpacing:"0.05em",
            }}>BETA</span>
          </div>
          <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"4px", fontWeight:400 }}>
            Designer workspace
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
        {navItems.map(({ icon: Icon, label, key, path, badge }) => (
  <div key={key} className={`nav-item${activeNav===key?" active":""}`}
    onClick={() => { setActiveNav(key); router.push(path); }}>
              <Icon />
              <span>{label}</span>
              {badge && badge > 0 && <span className="nav-badge">{badge}</span>}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {/* Notification bell */}
          <div ref={bellRef} style={{ position:"relative", marginBottom:"8px" }}>
            <button className={`bell-btn${notifOpen?" active":""}`} onClick={openNotifications}>
              <Icons.Bell active={hasUnread} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft:"auto", minWidth:"20px", height:"20px", borderRadius:"10px",
                  background:"#E85D75", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:"10px", fontWeight:800, color:"#fff", padding:"0 5px",
                }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>

            {/* Notif dropdown — desktop */}
            {notifOpen && !isMobile && (
              <div className="notif-panel" style={{ bottom:"44px", left:0 }}>
                <div style={{ padding:"14px 18px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"13px", fontWeight:700 }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={() => { const now=new Date(); setLastSeen(now); setUnreadCount(0); localStorage.setItem(NOTIF_KEY,now.toISOString()); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"11px", color:"rgba(91,76,245,0.8)", fontFamily:"'Outfit',sans-serif", fontWeight:600 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight:"360px", overflowY:"auto" }}>
                  {notifItems.length === 0 ? (
                    <div style={{ padding:"32px 18px", textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:"13px" }}>
                      <div style={{ fontSize:"24px", marginBottom:"8px", opacity:0.4 }}>◎</div>
                      All caught up
                    </div>
                  ) : notifItems.slice(0,15).map(a => {
                    const isNew = new Date(a.created_at) > lastSeen;
                    const isApproved = a.type === "approved";
                    return (
                      <div key={a.id} onClick={() => { router.push(`/dashboard/project/${a.project_id}`); setNotifOpen(false); }}
                        style={{ padding:"11px 18px", cursor:"pointer", background:isNew?"rgba(91,76,245,0.05)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", gap:"11px", alignItems:"flex-start", transition:"background 0.15s" }}>
                        <div style={{ width:"32px", height:"32px", borderRadius:"9px", flexShrink:0, background:isApproved?"rgba(11,171,108,0.15)":"rgba(245,166,35,0.15)", border:`1px solid ${isApproved?"rgba(11,171,108,0.3)":"rgba(245,166,35,0.3)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:isApproved?"#0BAB6C":"#F5A623" }}>
                          {isApproved ? <Icons.Check /> : <Icons.Warning />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"12px", fontWeight:600, color:"rgba(255,255,255,0.85)", marginBottom:"2px" }}>{a.project_name}</div>
                          <div style={{ fontSize:"11px", color:isApproved?"#0BAB6C":"#F5A623", marginBottom:a.message?"3px":0 }}>{isApproved?"Client approved":"Changes requested"}</div>
                          {a.message && <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>"{a.message}"</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                          <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)", flexShrink:0 }}>{timeAgo(a.created_at)}</span>
                          {isNew && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#5B4CF5" }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User card */}
          <div className="user-card">
            <div style={{ width:"34px", height:"34px", borderRadius:"10px", background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:800, flexShrink:0, letterSpacing:"0.5px" }}>{initials}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:"12px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"rgba(255,255,255,0.85)" }}>{userEmail}</div>
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.28)", marginTop:"1px" }}>Designer</div>
            </div>
            <button onClick={handleSignOut} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.25)", padding:"4px", borderRadius:"6px", transition:"all 0.15s", display:"flex", alignItems:"center" }} title="Sign out">
              <Icons.Signout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Topbar ── */}
      <header className="topbar">
        <span style={{ fontSize:"20px", fontWeight:900, letterSpacing:"-0.6px", color:"#12111A" }}>
          Portl<span style={{ color:"#5B4CF5" }}>.</span>
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* Mobile notif bell */}
          <div ref={bellRef} style={{ position:"relative" }}>
            <button onClick={openNotifications} style={{ width:"36px", height:"36px", borderRadius:"10px", background:hasUnread?"rgba(91,76,245,0.15)":"rgba(255,255,255,0.06)", border:`1px solid ${hasUnread?"rgba(91,76,245,0.35)":"rgba(255,255,255,0.1)"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", transition:"all 0.15s" }}>
              <Icons.Bell active={hasUnread} />
              {unreadCount > 0 && <div style={{ position:"absolute", top:"-4px", right:"-4px", width:"16px", height:"16px", borderRadius:"50%", background:"#E85D75", border:"2px solid #F5F6FA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:800, color:"#fff" }}>{unreadCount}</div>}
            </button>
            {notifOpen && isMobile && (
              <div className="notif-panel" style={{ position:"fixed", top:"68px", left:"8px", right:"8px", width:"auto" }}>
                <div style={{ padding:"14px 18px 10px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:"13px", fontWeight:700 }}>Notifications</span>
                  {unreadCount > 0 && <button onClick={() => { const now=new Date(); setLastSeen(now); setUnreadCount(0); localStorage.setItem(NOTIF_KEY,now.toISOString()); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"11px", color:"rgba(91,76,245,0.8)", fontFamily:"'Outfit',sans-serif", fontWeight:600 }}>Mark all read</button>}
                </div>
                <div style={{ maxHeight:"320px", overflowY:"auto" }}>
                  {notifItems.length === 0 ? (
                    <div style={{ padding:"32px 18px", textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:"13px" }}>All caught up</div>
                  ) : notifItems.slice(0,10).map(a => {
                    const isNew = new Date(a.created_at) > lastSeen;
                    const isApproved = a.type === "approved";
                    return (
                      <div key={a.id} onClick={() => { router.push(`/dashboard/project/${a.project_id}`); setNotifOpen(false); }}
                        style={{ padding:"11px 18px", cursor:"pointer", background:isNew?"rgba(91,76,245,0.05)":"transparent", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", gap:"11px", alignItems:"center" }}>
                        <div style={{ width:"28px", height:"28px", borderRadius:"8px", flexShrink:0, background:isApproved?"rgba(11,171,108,0.15)":"rgba(245,166,35,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:isApproved?"#0BAB6C":"#F5A623" }}>
                          {isApproved ? <Icons.Check /> : <Icons.Warning />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:"12px", fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{a.project_name}</div>
                          <div style={{ fontSize:"11px", color:isApproved?"#0BAB6C":"#F5A623" }}>{isApproved?"Approved":"Changes requested"}</div>
                        </div>
                        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)", flexShrink:0 }}>{timeAgo(a.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button className="new-btn" style={{ padding:"8px 14px" }} onClick={() => router.push("/dashboard/new")}>
            <Icons.Plus /> New
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:"#F5F6FA", border:"1px solid #E4E4E8", borderRadius:"8px", width:"36px", height:"36px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#4A4A5A", fontSize:"18px" }}>☰</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{ display:"flex", flexDirection:"column", gap:"4px", marginBottom:"12px" }}>
          {navItems.map(({ icon: Icon, label, key, path }) => (
  <div key={key} className={`nav-item${activeNav===key?" active":""}`} onClick={() => { setActiveNav(key); setMenuOpen(false); router.push(path); }}>
                <Icon />{label}
              </div>
            ))}
          </nav>
          <div style={{ borderTop:"1px solid #E4E4E8", paddingTop:"12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:"12px", color:"#8A8A9A" }}>{userEmail}</span>
            <button onClick={handleSignOut} style={{ background:"none", border:"none", cursor:"pointer", color:"#8A8A9A", fontSize:"12px", fontFamily:"'Outfit',sans-serif", display:"flex", alignItems:"center", gap:"5px" }}>
              <Icons.Signout /> Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="main" style={{ flex:1, position:"relative", zIndex:1 }}>

        {/* Page header */}
        <div className="fi fi1" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"28px", gap:"16px" }}>
          <div>
            <h1 style={{ fontSize:"clamp(22px,3vw,28px)", fontWeight:800, letterSpacing:"-0.6px", marginBottom:"5px" }}>
              The Studio
            </h1>
            <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
              <div className="pulse-dot" />
              <span style={{ fontSize:"13px", color:"#8A8A9A" }}>
                {loading ? "Loading…" : `${counts.active} active · ${counts.review} in review`}
              </span>
            </div>
          </div>
          <button className="new-btn" onClick={() => router.push("/dashboard/new")} id="desktop-new-btn" style={{ display:"none" }}>
            <Icons.Plus /> New Project
          </button>
          <style>{`@media(min-width:769px){#desktop-new-btn{display:flex!important}}`}</style>
        </div>

        {error && (
          <div style={{ background:"rgba(232,93,117,0.1)", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"10px", padding:"12px 16px", marginBottom:"20px", fontSize:"13px", color:"#E85D75", display:"flex", justifyContent:"space-between" }}>
            ⚠️ {error}
            <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={fetchData}>retry</span>
          </div>
        )}

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"80px" }}>
            <div style={{ width:"28px", height:"28px", border:"2px solid rgba(0,0,0,0.08)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <>
            {/* ── TOP STAT CARDS ── */}
            <div className="fi fi2 bento bento-top" style={{ marginBottom:"16px" }}>

              {/* Total */}
              <div className="card stat-card">
                <div style={{ fontSize:"11px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px" }}>Total</div>
                <div style={{ fontSize:"36px", fontWeight:900, letterSpacing:"-1px", color:"#12111A", lineHeight:1 }}>{counts.all}</div>
                <div style={{ fontSize:"12px", color:"#8A8A9A", marginTop:"6px" }}>projects</div>
              </div>

              {/* In Review */}
              <div className="card stat-card" style={{ background:"rgba(245,166,35,0.06)", borderColor:"rgba(245,166,35,0.18)", cursor: counts.review > 0 ? "pointer" : "default" }}
                onClick={() => counts.review > 0 && setFilter("review")}>
                <div style={{ fontSize:"11px", fontWeight:700, color:"#F5A623", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px", opacity:0.8 }}>In Review</div>
                <div style={{ fontSize:"36px", fontWeight:900, letterSpacing:"-1px", color:"#F5A623", lineHeight:1 }}>{counts.review}</div>
                <div style={{ fontSize:"12px", color:"rgba(245,166,35,0.5)", marginTop:"6px" }}>awaiting client</div>
              </div>

              {/* Active */}
              <div className="card stat-card" style={{ background:"rgba(11,171,108,0.06)", borderColor:"rgba(11,171,108,0.18)", cursor:"pointer" }}
                onClick={() => setFilter("active")}>
                <div style={{ fontSize:"11px", fontWeight:700, color:"#0BAB6C", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px", opacity:0.8 }}>Active</div>
                <div style={{ fontSize:"36px", fontWeight:900, letterSpacing:"-1px", color:"#0BAB6C", lineHeight:1 }}>{counts.active}</div>
                <div style={{ fontSize:"12px", color:"rgba(11,171,108,0.5)", marginTop:"6px" }}>in progress</div>
              </div>

              {/* Approved */}
              <div className="card stat-card" style={{ background:"rgba(91,76,245,0.06)", borderColor:"rgba(91,76,245,0.18)", cursor:"pointer" }}
                onClick={() => setFilter("approved")}>
                <div style={{ fontSize:"11px", fontWeight:700, color:"#7B6CF9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px", opacity:0.8 }}>Approved</div>
                <div style={{ fontSize:"36px", fontWeight:900, letterSpacing:"-1px", color:"#7B6CF9", lineHeight:1 }}>{counts.approved}</div>
                <div style={{ fontSize:"12px", color:"rgba(91,76,245,0.5)", marginTop:"6px" }}>completed</div>
              </div>
            </div>

            {/* ── MID ROW: In Review Spotlight + Recent Activity ── */}
            {(reviewProjs.length > 0 || recentActivity.length > 0) && (
              <div className="fi fi3 bento bento-mid" style={{ marginBottom:"16px" }}>

                {/* In Review Spotlight */}
                {reviewProjs.length > 0 && (
                  <div className="card" style={{ background:"rgba(245,166,35,0.04)", borderColor:"rgba(245,166,35,0.15)" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"18px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#F5A623", animation:"pulse 2s ease-in-out infinite" }} />
                        <span style={{ fontSize:"12px", fontWeight:700, color:"#F5A623", textTransform:"uppercase", letterSpacing:"0.08em" }}>Awaiting Client</span>
                      </div>
                      <span style={{ fontSize:"11px", color:"#8A8A9A" }}>{reviewProjs.length} project{reviewProjs.length!==1?"s":""}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                      {reviewProjs.slice(0,3).map((p, i) => (
                        <div key={p.id} onClick={() => router.push(`/dashboard/project/${p.id}`)}
                          style={{ display:"flex", alignItems:"center", gap:"14px", padding:"12px 16px", borderRadius:"12px", background:"#F9F9FB", border:"1px solid #E4E4E8", cursor:"pointer", transition:"all 0.15s" }}>
                          <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:`${CARD_COLORS[i%CARD_COLORS.length]}22`, border:`1px solid ${CARD_COLORS[i%CARD_COLORS.length]}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:800, color:CARD_COLORS[i%CARD_COLORS.length], flexShrink:0 }}>
                            {p.name.slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:"14px", fontWeight:700, marginBottom:"2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                            <div style={{ fontSize:"12px", color:"#8A8A9A" }}>{p.client_name}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px", flexShrink:0 }}>
                            <span style={{ fontSize:"11px", color:"#8A8A9A" }}>{timeAgo(p.updated_at)}</span>
                            <Icons.Arrow />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {recentActivity.length > 0 && (
                  <div className="card">
                    <div style={{ fontSize:"12px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"16px" }}>Recent Activity</div>
                    <div>
                      {recentActivity.map(a => {
                        const isApproved = a.type === "approved";
                        return (
                          <div key={a.id} className="activity-row" onClick={() => router.push(`/dashboard/project/${a.project_id}`)}>
                            <div style={{ width:"30px", height:"30px", borderRadius:"8px", flexShrink:0, background:isApproved?"rgba(11,171,108,0.12)":"rgba(245,166,35,0.12)", border:`1px solid ${isApproved?"rgba(11,171,108,0.25)":"rgba(245,166,35,0.25)"}`, display:"flex", alignItems:"center", justifyContent:"center", color:isApproved?"#0BAB6C":"#F5A623" }}>
                              {isApproved ? <Icons.Check /> : <Icons.Warning />}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:"13px", fontWeight:600, color:"#12111A", marginBottom:"1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.project_name}</div>
                              <div style={{ fontSize:"11px", color:isApproved?"#0BAB6C":"#F5A623" }}>{isApproved?"Approved":"Changes requested"}</div>
                              {a.message && <div style={{ fontSize:"11px", color:"#8A8A9A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:"2px" }}>"{a.message}"</div>}
                            </div>
                            <span style={{ fontSize:"11px", color:"#B0B0BC", flexShrink:0 }}>{timeAgo(a.created_at)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PROJECT GRID ── */}
            <div className="fi fi4">
              {/* Filter row */}
              {projects.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", gap:"12px", flexWrap:"wrap" }}>
                  <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                    {(["all","active","review","approved","draft"] as const).map(f => (
                      <button key={f} className={`filter-pill${filter===f?" active":""}`} onClick={() => setFilter(f)}>
                        {f==="all"?"All":STATUS_CONFIG[f]?.label??f}
                        <span style={{ marginLeft:"5px", opacity:0.45, fontSize:"11px" }}>{counts[f]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {projects.length === 0 && !error && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingTop:"60px", gap:"16px", textAlign:"center" }}>
                  <div style={{ width:"64px", height:"64px", borderRadius:"18px", background:"rgba(91,76,245,0.1)", border:"1px solid rgba(91,76,245,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icons.Projects />
                  </div>
                  <div style={{ fontSize:"18px", fontWeight:700, color:"#12111A" }}>Your studio is empty</div>
                  <div style={{ fontSize:"13px", color:"#8A8A9A", maxWidth:"280px", lineHeight:1.6 }}>Create your first project and start delivering work to clients.</div>
                  <button className="new-btn" style={{ marginTop:"8px" }} onClick={() => router.push("/dashboard/new")}>
                    <Icons.Plus /> Create First Project
                  </button>
                </div>
              )}

              {/* Grid */}
              {filtered.length > 0 && (
                <div className="bento bento-projects">
                  {filtered.map((project, i) => {
                    const st    = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                    const color = CARD_COLORS[i % CARD_COLORS.length];
                    const hasUnreadCard = activity.some(a =>
                      a.project_id === project.id &&
                      new Date(a.created_at) > lastSeen &&
                      (a.type === "approved" || a.type === "changes_requested")
                    );
                    return (
                      <div key={project.id} className="proj-card" onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                        {/* Top color accent */}
                        <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,${color},transparent)`, borderRadius:"16px 16px 0 0" }} />

                        {/* Unread dot */}
                        {hasUnreadCard && (
                          <div style={{ position:"absolute", top:"14px", right:"14px", width:"7px", height:"7px", borderRadius:"50%", background:"#E85D75", boxShadow:`0 0 0 2px #F5F6FA` }} />
                        )}

                        {/* Header */}
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"14px" }}>
                          <div style={{ width:"40px", height:"40px", borderRadius:"11px", background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:800, color, flexShrink:0 }}>
                            {project.name.slice(0,2).toUpperCase()}
                          </div>
                          <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:st.bg, color:st.color, padding:"3px 9px", borderRadius:"20px", fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", border:`1px solid ${st.border}` }}>
                            <span style={{ width:"4px", height:"4px", borderRadius:"50%", background:st.color }} />
                            {st.label}
                          </div>
                        </div>

                        {/* Name + client */}
                        <div style={{ marginBottom:"14px" }}>
                          <h3 style={{ fontSize:"15px", fontWeight:700, marginBottom:"3px", lineHeight:1.3 }}>{project.name}</h3>
                          <div style={{ fontSize:"12px", color:"#8A8A9A" }}>{project.client_name}</div>
                        </div>

                        {/* Current stage */}
                        {project.current_stage && (
                          <div style={{ fontSize:"11px", color:"#8A8A9A", marginBottom:"14px", display:"flex", alignItems:"center", gap:"5px" }}>
                            <span style={{ color, fontSize:"8px" }}>◆</span>{project.current_stage}
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{ borderTop:"1px solid #E4E4E8", paddingTop:"12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <span style={{ fontSize:"11px", color:"#B0B0BC" }}>{timeAgo(project.updated_at)}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:"4px", color:"#B0B0BC", fontSize:"11px" }}>
                            Open <Icons.Arrow />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* New project card */}
                  {filter === "all" && (
                    <div className="proj-card" style={{ border:"1px dashed rgba(91,76,245,0.25)", background:"rgba(91,76,245,0.03)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"10px", minHeight:"160px" }}
                      onClick={() => router.push("/dashboard/new")}>
                      <div style={{ width:"40px", height:"40px", borderRadius:"11px", background:"rgba(91,76,245,0.12)", border:"1px solid rgba(91,76,245,0.25)", display:"flex", alignItems:"center", justifyContent:"center", color:"#5B4CF5" }}>
                        <Icons.Plus />
                      </div>
                      <span style={{ fontSize:"13px", fontWeight:600, color:"#8A8A9A" }}>New Project</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}