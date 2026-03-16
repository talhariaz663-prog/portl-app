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

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  active:   { label: "Active",    color: "#0BAB6C", bg: "rgba(11,171,108,0.12)"  },
  review:   { label: "In Review", color: "#F5A623", bg: "rgba(245,166,35,0.12)"  },
  approved: { label: "Approved",  color: "#5B4CF5", bg: "rgba(91,76,245,0.12)"   },
  draft:    { label: "Draft",     color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" },
};

const ACTIVITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  approved:            { label: "Client approved",          color: "#0BAB6C", icon: "✓" },
  changes_requested:   { label: "Client requested changes", color: "#F5A623", icon: "✏" },
  approval_requested:  { label: "Approval requested",       color: "#5B4CF5", icon: "→" },
  file_uploaded:       { label: "File uploaded",            color: "rgba(255,255,255,0.4)", icon: "⬆" },
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

export default function DashboardPage() {
  const router   = useRouter();
  const supabase = createClient();
  const bellRef  = useRef<HTMLDivElement>(null);

  const [projects,      setProjects]      = useState<Project[]>([]);
  const [activity,      setActivity]      = useState<ActivityItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [filter,        setFilter]        = useState<Status | "all">("all");
  const [hovered,       setHovered]       = useState<string | null>(null);
  const [userEmail,     setUserEmail]     = useState("");
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [lastSeen,      setLastSeen]      = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(NOTIF_KEY);
      return stored ? new Date(stored) : new Date(0);
    }
    return new Date(0);
  });

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");

    const { data: projData, error: dbError } = await supabase
      .from("projects")
      .select("id, name, client_name, status, current_stage, updated_at")
      .eq("designer_id", session.user.id)
      .order("updated_at", { ascending: false });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    const projs = (projData as Project[]) ?? [];
    setProjects(projs);

    // Fetch recent activity for all projects
    if (projs.length > 0) {
      const projectIds = projs.map(p => p.id);
      const { data: actData } = await supabase
        .from("activity")
        .select("id, project_id, stage_id, type, message, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(30);

      const acts = (actData ?? []) as ActivityItem[];
      // Attach project names
      const actsWithNames = acts.map(a => ({
        ...a,
        project_name: projs.find(p => p.id === a.project_id)?.name ?? "Unknown",
      }));
      setActivity(actsWithNames);

      // Count unread (activity after lastSeen)
      const unread = actsWithNames.filter(a =>
        new Date(a.created_at) > lastSeen &&
        (a.type === "approved" || a.type === "changes_requested")
      ).length;
      setUnreadCount(unread);
    }

    setLoading(false);
  }, [supabase, router, lastSeen]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
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

  const counts = {
    all:      projects.length,
    active:   projects.filter(p => p.status === "active").length,
    review:   projects.filter(p => p.status === "review").length,
    approved: projects.filter(p => p.status === "approved").length,
    draft:    projects.filter(p => p.status === "draft").length,
  };

  const filtered = filter === "all" ? projects : projects.filter(p => p.status === filter);
  const initials = userEmail ? userEmail[0].toUpperCase() : "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Notification bell component
  const NotifBell = ({ size = 20 }: { size?: number }) => (
    <div ref={bellRef} style={{ position:"relative" }}>
      <button onClick={openNotifications} style={{
        width:"36px", height:"36px", borderRadius:"10px",
        background: notifOpen ? "rgba(91,76,245,0.2)" : "rgba(255,255,255,0.06)",
        border:`1px solid ${notifOpen ? "rgba(91,76,245,0.4)" : "rgba(255,255,255,0.1)"}`,
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        color:"rgba(255,255,255,0.6)", fontSize:`${size}px`, transition:"all 0.15s",
        position:"relative",
      }}>
        🔔
        {unreadCount > 0 && (
          <div style={{
            position:"absolute", top:"-4px", right:"-4px",
            width:"18px", height:"18px", borderRadius:"50%",
            background:"#E85D75", border:"2px solid #080a18",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"10px", fontWeight:800, color:"#fff",
          }}>{unreadCount > 9 ? "9+" : unreadCount}</div>
        )}
      </button>

      {/* Notification dropdown */}
      {notifOpen && (
        <div style={{
          position:"absolute", top:"44px", right:0, width:"320px", zIndex:200,
          background:"#0d0f1e", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:"16px", overflow:"hidden",
          boxShadow:"0 16px 48px rgba(0,0,0,0.5)",
        }}>
          <div style={{ padding:"16px 18px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:"14px", fontWeight:700, color:"#fff" }}>Notifications</span>
            {activity.filter(a => a.type==="approved"||a.type==="changes_requested").length > 0 && (
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>
                {activity.filter(a => a.type==="approved"||a.type==="changes_requested").length} total
              </span>
            )}
          </div>
          <div style={{ maxHeight:"360px", overflowY:"auto" }}>
            {activity.filter(a => a.type==="approved"||a.type==="changes_requested").length === 0 ? (
              <div style={{ padding:"32px 18px", textAlign:"center", color:"rgba(255,255,255,0.3)", fontSize:"13px" }}>
                No notifications yet
              </div>
            ) : (
              activity
                .filter(a => a.type==="approved"||a.type==="changes_requested")
                .slice(0, 15)
                .map(a => {
                  const cfg = ACTIVITY_CONFIG[a.type];
                  const isNew = new Date(a.created_at) > lastSeen;
                  return (
                    <div key={a.id}
                      onClick={() => { router.push(`/dashboard/project/${a.project_id}`); setNotifOpen(false); }}
                      style={{
                        padding:"12px 18px", cursor:"pointer", transition:"background 0.15s",
                        background: isNew ? "rgba(91,76,245,0.06)" : "transparent",
                        borderBottom:"1px solid rgba(255,255,255,0.05)",
                        display:"flex", gap:"12px", alignItems:"flex-start",
                      }}>
                      <div style={{
                        width:"32px", height:"32px", borderRadius:"50%", flexShrink:0,
                        background:`${cfg.color}20`, border:`1px solid ${cfg.color}40`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"13px", color:cfg.color,
                      }}>{cfg.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"rgba(255,255,255,0.9)", marginBottom:"2px" }}>
                          {a.project_name}
                        </div>
                        <div style={{ fontSize:"12px", color:cfg.color, marginBottom:"4px" }}>{cfg.label}</div>
                        {a.message && (
                          <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", lineHeight:1.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            "{a.message}"
                          </div>
                        )}
                        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"4px" }}>{timeAgo(a.created_at)}</div>
                      </div>
                      {isNew && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#5B4CF5", flexShrink:0, marginTop:"4px" }} />}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#080a18", fontFamily:"'Outfit',sans-serif", color:"#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

        .fade-in   { animation:fadeUp 0.5s ease forwards; opacity:0; }
        .fade-in-1 { animation-delay:0.05s }
        .fade-in-2 { animation-delay:0.10s }
        .fade-in-3 { animation-delay:0.15s }
        .fade-in-4 { animation-delay:0.20s }
        .fade-in-5 { animation-delay:0.25s }

        .project-card {
          background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.07);
          border-radius:16px; padding:24px; cursor:pointer;
          position:relative; overflow:hidden;
          transition:transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .project-card:hover { transform:translateY(-3px); border-color:rgba(255,255,255,0.15); box-shadow:0 16px 40px rgba(0,0,0,0.4); }

        .filter-btn {
          padding:6px 14px; border-radius:20px;
          border:1px solid rgba(255,255,255,0.08); background:transparent;
          color:rgba(255,255,255,0.4); font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:500; cursor:pointer; transition:all 0.15s ease; white-space:nowrap;
        }
        .filter-btn:hover { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.2); }
        .filter-btn.active { background:rgba(91,76,245,0.2); border-color:rgba(91,76,245,0.5); color:#fff; }

        .new-btn {
          display:flex; align-items:center; gap:8px; padding:10px 20px;
          border:none; border-radius:10px; background:linear-gradient(135deg,#5B4CF5,#0BAB6C);
          color:#fff; font-family:'Outfit',sans-serif; font-size:14px; font-weight:700;
          cursor:pointer; transition:opacity 0.2s, transform 0.15s; white-space:nowrap;
        }
        .new-btn:hover { opacity:0.9; transform:translateY(-1px); }

        .stat-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:16px 20px; flex:1; min-width:0; }
        .live-dot { width:7px; height:7px; border-radius:50%; background:#0BAB6C; animation:pulse-dot 2s ease-in-out infinite; flex-shrink:0; }

        .nav-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; font-size:14px; cursor:pointer; transition:all 0.15s; border:1px solid transparent; }
        .nav-item.active { background:rgba(91,76,245,0.15); border-color:rgba(91,76,245,0.3); color:#fff; font-weight:600; }
        .nav-item:not(.active) { color:rgba(255,255,255,0.4); }
        .nav-item:not(.active):hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.04); }

        .signout-btn { background:none; border:none; color:rgba(255,255,255,0.25); font-family:'Outfit',sans-serif; font-size:11px; cursor:pointer; padding:4px 0; transition:color 0.15s; }
        .signout-btn:hover { color:rgba(255,255,255,0.5); }

        .mobile-menu { position:fixed; top:60px; left:0; right:0; z-index:50; background:rgba(8,10,24,0.98); border-bottom:1px solid rgba(255,255,255,0.08); padding:16px; backdrop-filter:blur(20px); animation:slideDown 0.2s ease forwards; }

        .sidebar { display:flex; }
        .topbar  { display:none; }
        .main-content { margin-left:220px; padding:36px 40px; }

        @media (max-width:768px) {
          .sidebar { display:none !important; }
          .topbar  { display:flex !important; }
          .main-content { margin-left:0 !important; padding:20px 16px 80px !important; }
          .stats-row { flex-wrap:wrap !important; }
          .stats-row .stat-card { min-width:calc(50% - 6px) !important; flex:none !important; }
          .header-row { flex-wrap:wrap; gap:12px !important; }
          .grid-projects { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:`linear-gradient(rgba(91,76,245,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(91,76,245,0.04) 1px,transparent 1px),radial-gradient(ellipse 50% 40% at 95% 100%,rgba(11,171,108,0.07) 0%,transparent 70%),radial-gradient(ellipse 40% 30% at 5% 0%,rgba(91,76,245,0.07) 0%,transparent 70%)`, backgroundSize:"40px 40px,40px 40px,100% 100%,100% 100%" }} />

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" style={{ position:"fixed", top:0, left:0, bottom:0, width:"220px", background:"rgba(8,10,24,0.95)", borderRight:"1px solid rgba(255,255,255,0.06)", backdropFilter:"blur(20px)", flexDirection:"column", padding:"28px 16px", zIndex:10 }}>
        <div style={{ marginBottom:"40px", paddingLeft:"8px" }}>
          <span style={{ fontSize:"22px", fontWeight:800, letterSpacing:"-0.5px" }}>
            Portl<span style={{ color:"#5B4CF5", fontSize:"26px" }}>.</span>
          </span>
        </div>
        <nav style={{ display:"flex", flexDirection:"column", gap:"4px", flex:1 }}>
          {[
            { icon:"⬡", label:"Studio",   active:true  },
            { icon:"◷", label:"Timeline",  active:false },
            { icon:"⬚", label:"Files",     active:false },
            { icon:"✓", label:"Approvals", active:false },
          ].map(({ icon, label, active }) => (
            <div key={label} className={`nav-item${active?" active":""}`}>
              <span style={{ fontSize:"16px" }}>{icon}</span>{label}
            </div>
          ))}
        </nav>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:"16px" }}>
          {/* Notification bell in sidebar */}
          <div style={{ marginBottom:"12px" }}>
            <NotifBell />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, flexShrink:0 }}>{initials}</div>
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:"12px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{userEmail}</div>
              <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)" }}>Designer</div>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>Sign out →</button>
        </div>
      </aside>

      {/* ── Mobile Topbar ── */}
      <header className="topbar" style={{ position:"fixed", top:0, left:0, right:0, height:"60px", zIndex:40, background:"rgba(8,10,24,0.97)", borderBottom:"1px solid rgba(255,255,255,0.07)", backdropFilter:"blur(20px)", alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <span style={{ fontSize:"20px", fontWeight:800, letterSpacing:"-0.5px" }}>
          Portl<span style={{ color:"#5B4CF5", fontSize:"24px" }}>.</span>
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <NotifBell size={16} />
          <button className="new-btn" style={{ padding:"8px 14px", fontSize:"13px" }} onClick={() => router.push("/dashboard/new")}>+ New</button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", width:"36px", height:"36px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.7)", fontSize:"18px" }}>☰</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{ display:"flex", flexDirection:"column", gap:"4px", marginBottom:"16px" }}>
            {[{ icon:"⬡", label:"Studio", active:true },{ icon:"◷", label:"Timeline", active:false },{ icon:"⬚", label:"Files", active:false },{ icon:"✓", label:"Approvals", active:false }].map(({ icon, label, active }) => (
              <div key={label} className={`nav-item${active?" active":""}`} onClick={() => setMenuOpen(false)}>
                <span style={{ fontSize:"16px" }}>{icon}</span>{label}
              </div>
            ))}
          </nav>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:"12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)" }}>{userEmail}</div>
            <button className="signout-btn" style={{ fontSize:"13px" }} onClick={handleSignOut}>Sign out →</button>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main className="main-content" style={{ position:"relative", zIndex:1, minHeight:"100vh", paddingTop:"80px" }}>

        <div className="fade-in fade-in-1 header-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"28px", gap:"16px" }}>
          <div>
            <h1 style={{ fontSize:"clamp(20px,4vw,26px)", fontWeight:800, letterSpacing:"-0.5px", marginBottom:"4px" }}>The Studio</h1>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <div className="live-dot" />
              <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)" }}>
                {loading ? "Loading…" : `${counts.active} active project${counts.active!==1?"s":""}`}
              </span>
            </div>
          </div>
          <button className="new-btn" style={{ display:"none" }} onClick={() => router.push("/dashboard/new")} id="desktop-new-btn">
            <span style={{ fontSize:"18px", lineHeight:"1" }}>+</span> New Project
          </button>
          <style>{`@media(min-width:769px){#desktop-new-btn{display:flex!important}}`}</style>
        </div>

        {error && (
          <div style={{ background:"rgba(232,93,117,0.1)", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"10px", padding:"14px 18px", marginBottom:"24px", fontSize:"14px", color:"#E85D75" }}>
            ⚠️ {error} — <span style={{ cursor:"pointer", textDecoration:"underline" }} onClick={fetchData}>retry</span>
          </div>
        )}

        {!loading && (
          <div className="fade-in fade-in-2 stats-row" style={{ display:"flex", gap:"12px", marginBottom:"28px", flexWrap:"wrap" }}>
            {[
              { label:"Total Projects", value:counts.all,      color:"#fff"    },
              { label:"In Review",      value:counts.review,   color:"#F5A623" },
              { label:"Active",         value:counts.active,   color:"#0BAB6C" },
              { label:"Approved",       value:counts.approved, color:"#5B4CF5" },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <div style={{ fontSize:"28px", fontWeight:800, color, marginBottom:"4px" }}>{value}</div>
                <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", fontWeight:500 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="fade-in fade-in-3" style={{ display:"flex", gap:"8px", marginBottom:"24px", flexWrap:"wrap" }}>
            {(["all","active","review","approved","draft"] as const).map(f => (
              <button key={f} className={`filter-btn${filter===f?" active":""}`} onClick={() => setFilter(f)}>
                {f==="all" ? "All" : STATUS_CONFIG[f]?.label ?? f}
                <span style={{ marginLeft:"5px", opacity:0.5, fontSize:"11px" }}>{counts[f]}</span>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"80px" }}>
            <div style={{ width:"32px", height:"32px", border:"2px solid rgba(255,255,255,0.1)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          </div>
        )}

        {!loading && projects.length===0 && !error && (
          <div className="fade-in fade-in-3" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", paddingTop:"80px", gap:"16px", textAlign:"center" }}>
            <div style={{ width:"72px", height:"72px", borderRadius:"50%", background:"rgba(91,76,245,0.1)", border:"1px solid rgba(91,76,245,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px" }}>⬡</div>
            <div style={{ fontSize:"20px", fontWeight:700 }}>Your studio is empty</div>
            <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.4)", maxWidth:"320px", lineHeight:1.6 }}>Create your first project and start delivering work to clients like a pro.</div>
            <button className="new-btn" style={{ marginTop:"8px" }} onClick={() => router.push("/dashboard/new")}>
              <span style={{ fontSize:"18px", lineHeight:"1" }}>+</span> Create First Project
            </button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid-projects" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"16px" }}>
            {filtered.map((project, i) => {
              const st    = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
              const color = CARD_COLORS[i % CARD_COLORS.length];
              const isHov = hovered === project.id;
              // Show unread dot on card if there's new activity for this project
              const hasUnread = activity.some(a =>
                a.project_id === project.id &&
                new Date(a.created_at) > lastSeen &&
                (a.type === "approved" || a.type === "changes_requested")
              );
              return (
                <div key={project.id} className={`project-card fade-in fade-in-${Math.min(i+3,5)}`}
                  onMouseEnter={() => setHovered(project.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,${color},transparent)`, opacity:isHov?1:0, transition:"opacity 0.2s", borderRadius:"16px 16px 0 0" }} />
                  {/* Unread dot */}
                  {hasUnread && (
                    <div style={{ position:"absolute", top:"12px", right:"12px", width:"8px", height:"8px", borderRadius:"50%", background:"#E85D75", boxShadow:"0 0 0 2px #080a18" }} />
                  )}
                  <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:st.bg, color:st.color, padding:"4px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:700, marginBottom:"16px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:st.color }} />{st.label}
                  </div>
                  <h3 style={{ fontSize:"16px", fontWeight:700, marginBottom:"4px", lineHeight:1.3 }}>{project.name}</h3>
                  <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)", marginBottom:"20px" }}>{project.client_name}</div>
                  {project.current_stage && (
                    <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.3)", marginBottom:"16px", display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ color, fontSize:"10px" }}>◆</span>{project.current_stage}
                    </div>
                  )}
                  <div style={{ height:"1px", background:"rgba(255,255,255,0.06)", marginBottom:"14px" }} />
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.2)", textAlign:"right" }}>{timeAgo(project.updated_at)}</div>
                </div>
              );
            })}
            {filter==="all" && (
              <div className="project-card" style={{ border:"1px dashed rgba(91,76,245,0.3)", background:"rgba(91,76,245,0.04)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px", minHeight:"200px" }}
                onClick={() => router.push("/dashboard/new")}>
                <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:"rgba(91,76,245,0.15)", border:"1px solid rgba(91,76,245,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", color:"#5B4CF5" }}>+</div>
                <div style={{ fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.4)" }}>New Project</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}