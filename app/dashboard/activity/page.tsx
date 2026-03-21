"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ActivityItem {
  id: string;
  project_id: string;
  stage_id: string | null;
  type: string;
  message: string | null;
  created_at: string;
  project_name?: string;
  client_name?: string;
}

interface Project { id: string; name: string; client_name: string; status: string; }

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  approved:           { label: "Client approved",          color: "#0BAB6C", bg: "rgba(11,171,108,0.1)",  border: "rgba(11,171,108,0.25)",  icon: "✓" },
  changes_requested:  { label: "Client requested changes", color: "#F5A623", bg: "rgba(245,166,35,0.1)",  border: "rgba(245,166,35,0.25)",  icon: "!" },
  approval_requested: { label: "Approval requested",       color: "#5B4CF5", bg: "rgba(91,76,245,0.1)",   border: "rgba(91,76,245,0.25)",   icon: "→" },
  file_uploaded:      { label: "File uploaded",            color: "#7B6CF9", bg: "rgba(123,108,249,0.1)", border: "rgba(123,108,249,0.25)", icon: "↑" },
};

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
}

function groupByDate(items: ActivityItem[]) {
  const groups: Record<string, ActivityItem[]> = {};
  items.forEach(item => {
    const d = new Date(item.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const key = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Arrow:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export default function ActivityPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [activity,  setActivity]  = useState<ActivityItem[]>([]);
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<string>("all");
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen,  setMenuOpen]  = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");

    const { data: projs } = await supabase.from("projects").select("id, name, client_name, status").eq("designer_id", session.user.id);
    const projList = (projs as Project[]) ?? [];
    setProjects(projList);

    if (projList.length > 0) {
      const { data: acts } = await supabase.from("activity")
        .select("id, project_id, stage_id, type, message, created_at")
        .in("project_id", projList.map(p => p.id))
        .order("created_at", { ascending: false })
        .limit(100);
      const withNames = ((acts ?? []) as ActivityItem[]).map(a => ({
        ...a,
        project_name: projList.find(p => p.id === a.project_id)?.name ?? "Unknown",
        client_name:  projList.find(p => p.id === a.project_id)?.client_name ?? "",
      }));
      setActivity(withNames);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";
  const reviewCount = projects.filter(p => p.status === "review").length;

  const filtered = filter === "all" ? activity : activity.filter(a => a.type === filter);
  const grouped  = groupByDate(filtered);

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"          },
    { icon: Icons.Projects,  label: "Projects",  path: "/dashboard/projects" },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity" },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: reviewCount },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const filterTypes = [
    { key: "all",               label: "All" },
    { key: "approved",          label: "Approvals" },
    { key: "changes_requested", label: "Revisions" },
    { key: "approval_requested",label: "Sent" },
    { key: "file_uploaded",     label: "Uploads" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#07090f", fontFamily:"'Outfit',sans-serif", color:"#fff", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .fi{animation:fadeUp 0.4s ease forwards;opacity:0}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}

        .sidebar{position:fixed;top:0;left:0;bottom:0;width:240px;background:linear-gradient(180deg,#0c0e1a 0%,#080a15 100%);border-right:1px solid rgba(255,255,255,0.055);display:flex;flex-direction:column;z-index:20;}
        .sidebar-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,0.05);}
        .sidebar-nav{padding:16px 12px;flex:1;display:flex;flex-direction:column;gap:2px;}
        .nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:500;cursor:pointer;transition:all 0.18s ease;border:1px solid transparent;color:rgba(255,255,255,0.38);position:relative;}
        .nav-item:hover{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04);}
        .nav-item.active{color:#fff;font-weight:600;background:rgba(91,76,245,0.14);border-color:rgba(91,76,245,0.28);}
        .nav-item.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:3px;height:20px;background:linear-gradient(180deg,#5B4CF5,#7B6CF9);border-radius:0 4px 4px 0;}
        .nav-badge{margin-left:auto;min-width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#F5A623,#E8971A);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;padding:0 6px;}
        .sidebar-bottom{padding:16px 12px 20px;border-top:1px solid rgba(255,255,255,0.05);}
        .user-card{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);}
        .topbar{display:none;position:fixed;top:0;left:0;right:0;height:60px;background:rgba(7,9,15,0.97);border-bottom:1px solid rgba(255,255,255,0.07);backdrop-filter:blur(20px);z-index:40;align-items:center;justify-content:space-between;padding:0 16px;}
        .main{margin-left:240px;min-height:100vh;padding:32px 36px;flex:1;}
        .filter-pill{padding:5px 14px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.38);font-family:'Outfit',sans-serif;transition:all 0.15s;white-space:nowrap;}
        .filter-pill:hover{color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.18);}
        .filter-pill.active{background:rgba(91,76,245,0.18);border-color:rgba(91,76,245,0.45);color:#fff;}
        .activity-card{display:flex;align-items:flex-start;gap:14px;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all 0.18s;}
        .activity-card:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.12);}
        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(7,9,15,0.98);border-bottom:1px solid rgba(255,255,255,0.08);padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}
        .new-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border:none;border-radius:10px;background:linear-gradient(135deg,#5B4CF5,#0BAB6C);color:#fff;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:opacity 0.2s,transform 0.15s;}
        .new-btn:hover{opacity:0.88;transform:translateY(-1px);}
        @media(max-width:768px){.sidebar{display:none!important;}.topbar{display:flex!important;}.main{margin-left:0!important;padding:76px 16px 40px!important;}}
      `}</style>

      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:`radial-gradient(ellipse 60% 40% at 100% 0%,rgba(91,76,245,0.06) 0%,transparent 60%),radial-gradient(ellipse 40% 30% at 0% 100%,rgba(11,171,108,0.05) 0%,transparent 60%),linear-gradient(rgba(91,76,245,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(91,76,245,0.02) 1px,transparent 1px)`,backgroundSize:"100% 100%,100% 100%,40px 40px,40px 40px"}} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.8px"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
            <span style={{fontSize:"10px",fontWeight:700,color:"#5B4CF5",background:"rgba(91,76,245,0.15)",border:"1px solid rgba(91,76,245,0.3)",borderRadius:"6px",padding:"2px 7px"}}>BETA</span>
          </div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",marginTop:"4px"}}>Designer workspace</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({icon:Icon,label,path,badge}) => (
            <div key={label} className={`nav-item${path==="/dashboard/activity"?" active":""}`} onClick={() => router.push(path)}>
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
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",padding:"4px",display:"flex",alignItems:"center"}}><Icons.Signout /></button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="topbar">
        <span style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.6px"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.7)",fontSize:"18px"}}>☰</button>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"12px"}}>
            {navItems.map(({icon:Icon,label,path}) => (
              <div key={label} className={`nav-item${path==="/dashboard/activity"?" active":""}`} onClick={() => {router.push(path);setMenuOpen(false);}}>
                <Icon />{label}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="main" style={{position:"relative",zIndex:1}}>
        <div className="fi fi1" style={{marginBottom:"28px"}}>
          <h1 style={{fontSize:"clamp(22px,3vw,28px)",fontWeight:800,letterSpacing:"-0.6px",marginBottom:"5px"}}>Activity</h1>
          <p style={{fontSize:"13px",color:"rgba(255,255,255,0.35)"}}>Everything that's happened across your projects</p>
        </div>

        {/* Filters */}
        <div className="fi fi2" style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"24px"}}>
          {filterTypes.map(f => (
            <button key={f.key} className={`filter-pill${filter===f.key?" active":""}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{display:"flex",justifyContent:"center",paddingTop:"60px"}}>
            <div style={{width:"28px",height:"28px",border:"2px solid rgba(255,255,255,0.08)",borderTopColor:"#5B4CF5",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
          </div>
        ) : activity.length === 0 ? (
          <div className="fi fi3" style={{textAlign:"center",paddingTop:"60px",color:"rgba(255,255,255,0.3)"}}>
            <div style={{fontSize:"32px",marginBottom:"12px",opacity:0.4}}>◎</div>
            <div style={{fontSize:"15px",fontWeight:600,color:"rgba(255,255,255,0.45)",marginBottom:"6px"}}>No activity yet</div>
            <div style={{fontSize:"13px",lineHeight:1.6}}>Activity will appear here once clients start interacting with your portals.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="fi fi3" style={{textAlign:"center",paddingTop:"60px",color:"rgba(255,255,255,0.3)"}}>
            <div style={{fontSize:"15px",fontWeight:600,color:"rgba(255,255,255,0.45)"}}>No {filter.replace("_"," ")} activity</div>
          </div>
        ) : (
          <div className="fi fi3" style={{display:"flex",flexDirection:"column",gap:"24px"}}>
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                {/* Date header */}
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"}}>
                  <span style={{fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.08em",whiteSpace:"nowrap"}}>{date}</span>
                  <div style={{flex:1,height:"1px",background:"rgba(255,255,255,0.06)"}} />
                </div>

                {/* Activity items */}
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {items.map(a => {
                    const cfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.file_uploaded;
                    return (
                      <div key={a.id} className="activity-card" onClick={() => router.push(`/dashboard/project/${a.project_id}`)}>
                        {/* Icon */}
                        <div style={{width:"38px",height:"38px",borderRadius:"11px",flexShrink:0,background:cfg.bg,border:`1px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",fontWeight:800,color:cfg.color}}>
                          {cfg.icon}
                        </div>

                        {/* Content */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px",flexWrap:"wrap"}}>
                            <span style={{fontSize:"14px",fontWeight:700,color:"rgba(255,255,255,0.9)"}}>{a.project_name}</span>
                            <span style={{fontSize:"11px",color:cfg.color,fontWeight:600}}>{cfg.label}</span>
                          </div>
                          {a.client_name && (
                            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)",marginBottom:a.message?"4px":0}}>
                              by {a.client_name}
                            </div>
                          )}
                          {a.message && (
                            <div style={{fontSize:"13px",color:"rgba(255,255,255,0.55)",lineHeight:1.5,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",padding:"8px 12px",marginTop:"6px"}}>
                              "{a.message}"
                            </div>
                          )}
                        </div>

                        {/* Time + arrow */}
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"8px",flexShrink:0}}>
                          <span style={{fontSize:"11px",color:"rgba(255,255,255,0.2)"}}>{timeAgo(a.created_at)}</span>
                          <div style={{color:"rgba(255,255,255,0.2)"}}><Icons.Arrow /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}