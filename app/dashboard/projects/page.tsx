"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "active" | "review" | "approved" | "draft";

interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
  status: Status;
  current_stage: string | null;
  updated_at: string;
  portal_slug: string;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  active:   { label: "Active",    color: "#0BAB6C", bg: "rgba(11,171,108,0.12)",  border: "rgba(11,171,108,0.25)"  },
  review:   { label: "In Review", color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)"  },
  approved: { label: "Approved",  color: "#5B4CF5", bg: "rgba(91,76,245,0.12)",   border: "rgba(91,76,245,0.25)"   },
  draft:    { label: "Draft",     color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)"  },
};

const CARD_COLORS = ["#5B4CF5", "#0BAB6C", "#F59E0B", "#EF4444", "#7B6CF9"];

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

const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Bell:      ({ active }: { active?: boolean }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3C9.24 3 7 5.24 7 8v5l-2 2v1h14v-1l-2-2V8c0-2.76-2.24-5-5-5z" fill={active?"#5B4CF5":"currentColor"} opacity={active?1:0.7}/><path d="M12 21c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" fill={active?"#5B4CF5":"currentColor"} opacity={active?1:0.7}/></svg>,
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Search:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" opacity="0.6"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/></svg>,
  Copy:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
  Arrow:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Payments:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/></svg>,
  Help:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Settings:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export default function ProjectsPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<Status | "all">("all");
  const [sort,      setSort]      = useState<"updated" | "name" | "client">("updated");
  const [userEmail, setUserEmail] = useState("");
  const [copied,    setCopied]    = useState<string | null>(null);
  const [menuOpen,  setMenuOpen]  = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");
    const { data } = await supabase
      .from("projects")
      .select("id, name, client_name, client_email, status, current_stage, updated_at, portal_slug")
      .eq("designer_id", session.user.id)
      .order("updated_at", { ascending: false });
    setProjects((data as Project[]) ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyLink = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${slug}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  const filtered = projects
    .filter(p => filter === "all" || p.status === filter)
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "name")    return a.name.localeCompare(b.name);
      if (sort === "client")  return a.client_name.localeCompare(b.client_name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const counts = {
    all:      projects.length,
    active:   projects.filter(p => p.status === "active").length,
    review:   projects.filter(p => p.status === "review").length,
    approved: projects.filter(p => p.status === "approved").length,
    draft:    projects.filter(p => p.status === "draft").length,
  };

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"           },
    { icon: Icons.Projects,  label: "My Work",   path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: counts.review },
    { icon: Icons.Payments,  label: "Payments",  path: "/dashboard/payments"  },
    { icon: Icons.Help,      label: "Help",      path: "/dashboard/help"      },
    { icon: Icons.Settings,  label: "Settings",  path: "/dashboard/settings"  },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .fi{animation:fadeUp 0.4s ease forwards;opacity:0}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}

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
        .main{margin-left:240px;min-height:100vh;padding:32px 36px;position:relative;flex:1;}

        .new-btn{display:flex;align-items:center;gap:8px;padding:8px 18px;border:none;border-radius:10px;background:#5B4CF5;color:#fff;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:background 0.15s,transform 0.15s;white-space:nowrap;}
        .new-btn:hover{background:#4A3DE0;transform:translateY(-1px);}
        .new-btn:active{background:#3D32C4;transform:translateY(0);}
        .new-btn:disabled{opacity:0.45;cursor:not-allowed;}
        .new-btn:focus-visible{box-shadow:0 0 0 3px rgba(91,76,245,0.25);outline:none;}

        .search-input{width:100%;background:#FFFFFF;border:1px solid #E4E4E8;border-radius:12px;padding:10px 14px 10px 40px;color:#12111A;font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s;}
        .search-input::placeholder{color:#9A9AAA;}
        .search-input:focus{border-color:#5B4CF5;box-shadow:0 0 0 3px rgba(91,76,245,0.15);outline:none;}
        button:focus-visible{box-shadow:0 0 0 3px rgba(91,76,245,0.25);outline:none;}

        .filter-pill{padding:4px 10px;border-radius:999px;cursor:pointer;font-size:11px;font-weight:700;border:1px solid #E4E4E8;background:#FFFFFF;color:#6B6B7A;font-family:'Outfit',sans-serif;transition:all 0.15s;white-space:nowrap;}
        .filter-pill:hover{color:#4A4A5A;border-color:#D0D0D8;background:#F0F0F5;}
        .filter-pill.active{background:rgba(91,76,245,0.1);border-color:rgba(91,76,245,0.3);color:#5B4CF5;}

        .sort-select{background:#FFFFFF;border:1px solid #E4E4E8;border-radius:10px;padding:6px 12px;color:#4A4A5A;font-family:'Outfit',sans-serif;font-size:12px;outline:none;cursor:pointer;}
        .sort-select option{background:#FFFFFF;}

        .proj-row{display:flex;align-items:center;gap:16px;padding:14px 18px;border-radius:12px;background:#FFFFFF;border:1px solid #E4E4E8;box-shadow:0 1px 3px rgba(0,0,0,0.06);cursor:pointer;transition:all 0.18s ease;position:relative;overflow:hidden;}
        .proj-row:hover{background:#F8F8FC;border-color:#D8D8E4;transform:translateX(2px);}

        .icon-btn{background:transparent;border:1px solid #E4E4E8;border-radius:8px;padding:6px 10px;cursor:pointer;color:#6B6B7A;font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px;transition:all 0.15s;white-space:nowrap;}
        .icon-btn:hover{background:#F0F0F5;color:#12111A;border-color:#D0D0D8;}
        .icon-btn.copied{background:rgba(11,171,108,0.12);border-color:rgba(11,171,108,0.3);color:#0BAB6C;}

        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(255,255,255,0.98);border-bottom:1px solid #E4E4E8;padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}

        @media(max-width:768px){
          .sidebar{display:none!important;}
          .topbar{display:flex!important;}
          .main{margin-left:0!important;padding:76px 16px 40px!important;}
          .proj-row{flex-wrap:wrap;}
          .proj-actions{display:none!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)",backgroundSize:"40px 40px"}} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.8px",color:"#ffffff"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
            <span style={{fontSize:"10px",fontWeight:700,color:"#5B4CF5",background:"rgba(91,76,245,0.15)",border:"1px solid rgba(91,76,245,0.3)",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.05em"}}>BETA</span>
          </div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",marginTop:"4px"}}>Designer workspace</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({icon:Icon,label,path,badge}) => (
            <div key={label} className={`nav-item${path==="/dashboard/projects"?" active":""}`} onClick={() => router.push(path)}>
              <Icon /><span>{label}</span>
              {badge && badge > 0 && <span className="nav-badge">{badge}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div style={{width:"34px",height:"34px",borderRadius:"10px",background:"linear-gradient(135deg,#5B4CF5,#0BAB6C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,flexShrink:0}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"12px",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"rgba(255,255,255,0.85)"}}>{userEmail}</div>
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
          <button className="new-btn" style={{padding:"8px 14px"}} onClick={() => router.push("/dashboard/new")}><Icons.Plus /> New</button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{background:"#F5F6FA",border:"1px solid #E4E4E8",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#4A4A5A",fontSize:"18px"}}>☰</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"12px"}}>
            {navItems.map(({icon:Icon,label,path}) => (
              <div key={label} className={`nav-item${path==="/dashboard/projects"?" active":""}`} onClick={() => {router.push(path);setMenuOpen(false);}}>
                <Icon />{label}
              </div>
            ))}
          </nav>
          <div style={{borderTop:"1px solid #E4E4E8",paddingTop:"12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"12px",color:"#6B6B7A"}}>{userEmail}</span>
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B7A",fontSize:"12px",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:"5px"}}><Icons.Signout /> Sign out</button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="main">
        {/* Header */}
        <div className="fi fi1" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"32px",gap:"16px"}}>
          <div>
            <h1 style={{fontSize:"clamp(22px,3vw,28px)",fontWeight:800,letterSpacing:"-0.6px",marginBottom:"5px",color:"#12111A"}}>Projects</h1>
            <p style={{fontSize:"13px",color:"#6B6B7A"}}>
              {loading ? "Loading…" : `${projects.length} project${projects.length!==1?"s":""} total`}
            </p>
          </div>
          <button className="new-btn" onClick={() => router.push("/dashboard/new")} id="desk-new" style={{display:"none"}}>
            <Icons.Plus /> New Project
          </button>
          <style>{`@media(min-width:769px){#desk-new{display:flex!important}}`}</style>
        </div>

        {/* Search + filters */}
        <div className="fi fi2" style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"20px"}}>
          {/* Search */}
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"#6B6B7A",pointerEvents:"none"}}>
              <Icons.Search />
            </div>
            <input className="search-input" placeholder="Search projects or clients…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Filter + sort row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
              {(["all","active","review","approved","draft"] as const).map(f => (
                <button key={f} className={`filter-pill${filter===f?" active":""}`} onClick={() => setFilter(f)}>
                  {f==="all"?"All":STATUS_CONFIG[f]?.label??f}
                  <span style={{marginLeft:"5px",opacity:0.45,fontSize:"11px"}}>{counts[f]}</span>
                </button>
              ))}
            </div>
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
              <option value="updated">Sort: Recent</option>
              <option value="name">Sort: Name</option>
              <option value="client">Sort: Client</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{display:"flex",justifyContent:"center",paddingTop:"60px"}}>
            <div style={{width:"28px",height:"28px",border:"2px solid rgba(0,0,0,0.08)",borderTopColor:"#5B4CF5",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="fi fi3" style={{textAlign:"center",paddingTop:"60px",color:"#6B6B7A"}}>
            <div style={{fontSize:"32px",marginBottom:"12px",opacity:0.4}}>⬡</div>
            <div style={{fontSize:"14px",fontWeight:600,marginBottom:"6px",color:"#4A4A5A"}}>
              {search ? "No projects match your search" : "No projects yet"}
            </div>
            {!search && <button className="new-btn" style={{margin:"16px auto 0"}} onClick={() => router.push("/dashboard/new")}><Icons.Plus /> Create First Project</button>}
          </div>
        ) : (
          <div className="fi fi3" style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {filtered.map((project, i) => {
              const st = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
              const color = CARD_COLORS[i % CARD_COLORS.length];
              return (
                <div key={project.id} className="proj-row" onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                  {/* Color strip */}
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:color,borderRadius:"14px 0 0 14px"}} />

                  {/* Avatar */}
                  <div style={{width:"42px",height:"42px",borderRadius:"12px",background:`${color}18`,border:`1px solid ${color}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color,flexShrink:0,marginLeft:"8px"}}>
                    {project.name.slice(0,2).toUpperCase()}
                  </div>

                  {/* Name + client */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"14px",fontWeight:700,marginBottom:"3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#12111A"}}>{project.name}</div>
                    <div style={{fontSize:"12px",color:"#6B6B7A"}}>{project.client_name}{project.client_email&&<span style={{color:"#6B6B7A",marginLeft:"8px"}}>{project.client_email}</span>}</div>
                  </div>

                  {/* Stage */}
                  {project.current_stage && (
                    <div style={{fontSize:"12px",color:"#6B6B7A",display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
                      <span style={{color,fontSize:"8px"}}>◆</span>{project.current_stage}
                    </div>
                  )}

                  {/* Status */}
                  <div style={{display:"inline-flex",alignItems:"center",gap:"5px",background:st.bg,color:st.color,padding:"4px 10px",borderRadius:"999px",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",border:`1px solid ${st.border}`,flexShrink:0}}>
                    <span style={{width:"4px",height:"4px",borderRadius:"50%",background:st.color}} />{st.label}
                  </div>

                  {/* Time */}
                  <div style={{fontSize:"11px",color:"#6B6B7A",flexShrink:0,minWidth:"60px",textAlign:"right"}}>{timeAgo(project.updated_at)}</div>

                  {/* Actions */}
                  <div className="proj-actions" style={{display:"flex",gap:"6px",flexShrink:0}} onClick={e => e.stopPropagation()}>
                    <button className={`icon-btn${copied===project.id?" copied":""}`} onClick={() => copyLink(project.portal_slug, project.id)}>
                      <Icons.Copy />{copied===project.id?"Copied":"Share"}
                    </button>
                    <button className="icon-btn" onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                      Open <Icons.Arrow />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}