"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Stage {
  id: string;
  project_id: string;
  title: string;
  status: string;
  notes: string | null;
  position: number;
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
  status: string;
  portal_slug: string;
  updated_at: string;
}

interface ApprovalItem {
  project: Project;
  stage: Stage;
  lastActivity?: { type: string; message: string | null; created_at: string };
}

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
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Arrow:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Check:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Warning:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Clock:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Copy:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
};

export default function ApprovalsPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [needsAction,   setNeedsAction]   = useState<ApprovalItem[]>([]);
  const [recentlyDone,  setRecentlyDone]  = useState<ApprovalItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [userEmail,     setUserEmail]     = useState("");
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [copied,        setCopied]        = useState<string | null>(null);
  const [reviewCount,   setReviewCount]   = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");

    const { data: projs } = await supabase
      .from("projects")
      .select("id, name, client_name, client_email, status, portal_slug, updated_at")
      .eq("designer_id", session.user.id);
    const projList = (projs as Project[]) ?? [];
    setReviewCount(projList.filter(p => p.status === "review").length);

    if (projList.length === 0) { setLoading(false); return; }

    const { data: stages } = await supabase
      .from("stages")
      .select("id, project_id, title, status, notes, position")
      .in("project_id", projList.map(p => p.id));
    const stageList = (stages as Stage[]) ?? [];

    const { data: acts } = await supabase
      .from("activity")
      .select("id, project_id, stage_id, type, message, created_at")
      .in("project_id", projList.map(p => p.id))
      .order("created_at", { ascending: false });
    const actList = (acts as { id:string; project_id:string; stage_id:string|null; type:string; message:string|null; created_at:string }[]) ?? [];

    const needs: ApprovalItem[] = [];
    const done: ApprovalItem[] = [];

    // Stages in_progress = awaiting designer action after client revision
    // Stages with project status "review" = sent to client, awaiting their response
    stageList.forEach(stage => {
      const project = projList.find(p => p.id === stage.project_id);
      if (!project) return;

      const stageActs = actList.filter(a => a.stage_id === stage.id);
      const lastAct = stageActs[0];

      if (stage.status === "in_progress" && lastAct?.type === "changes_requested") {
        // Client requested changes — designer needs to act
        needs.push({ project, stage, lastActivity: lastAct });
      } else if (stage.status === "complete") {
        // Recently approved
        const approvedAct = stageActs.find(a => a.type === "approved");
        if (approvedAct) {
          const daysSince = (Date.now() - new Date(approvedAct.created_at).getTime()) / 86400000;
          if (daysSince < 14) done.push({ project, stage, lastActivity: approvedAct });
        }
      }
    });

    // Sort needs by most recent activity
    needs.sort((a, b) => {
      const at = a.lastActivity ? new Date(a.lastActivity.created_at).getTime() : 0;
      const bt = b.lastActivity ? new Date(b.lastActivity.created_at).getTime() : 0;
      return bt - at;
    });

    setNeedsAction(needs);
    setRecentlyDone(done.slice(0, 10));
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyLink = (slug: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${slug}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"           },
    { icon: Icons.Projects,  label: "My Work",  path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: reviewCount },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#07090f", fontFamily:"'Outfit',sans-serif", color:"#fff", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .fi{animation:fadeUp 0.4s ease forwards;opacity:0}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.08s}.fi3{animation-delay:0.12s}.fi4{animation-delay:0.16s}

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

        .action-card{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border-radius:16px;background:rgba(245,166,35,0.04);border:1px solid rgba(245,166,35,0.18);cursor:pointer;transition:all 0.18s;position:relative;overflow:hidden;}
        .action-card:hover{background:rgba(245,166,35,0.07);border-color:rgba(245,166,35,0.3);transform:translateY(-1px);}
        .action-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#F5A623,#E8971A);}

        .done-card{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:rgba(11,171,108,0.04);border:1px solid rgba(11,171,108,0.15);cursor:pointer;transition:all 0.18s;}
        .done-card:hover{background:rgba(11,171,108,0.07);border-color:rgba(11,171,108,0.25);}

        .icon-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:6px 10px;cursor:pointer;color:rgba(255,255,255,0.4);font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px;transition:all 0.15s;}
        .icon-btn:hover{background:rgba(255,255,255,0.09);color:rgba(255,255,255,0.8);}
        .icon-btn.copied{background:rgba(11,171,108,0.12);border-color:rgba(11,171,108,0.3);color:#0BAB6C;}

        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(7,9,15,0.98);border-bottom:1px solid rgba(255,255,255,0.08);padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}
        @media(max-width:768px){.sidebar{display:none!important;}.topbar{display:flex!important;}.main{margin-left:0!important;padding:76px 16px 40px!important;}.action-card-actions{display:none!important;}}
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
            <div key={label} className={`nav-item${path==="/dashboard/approvals"?" active":""}`} onClick={() => router.push(path)}>
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
          <nav style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            {navItems.map(({icon:Icon,label,path}) => (
              <div key={label} className={`nav-item${path==="/dashboard/approvals"?" active":""}`} onClick={() => {router.push(path);setMenuOpen(false);}}>
                <Icon />{label}
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="main" style={{position:"relative",zIndex:1}}>

        {/* Header */}
        <div className="fi fi1" style={{marginBottom:"28px"}}>
          <h1 style={{fontSize:"clamp(22px,3vw,28px)",fontWeight:800,letterSpacing:"-0.6px",marginBottom:"5px"}}>Approvals</h1>
          <p style={{fontSize:"13px",color:"rgba(255,255,255,0.35)"}}>Track client feedback and approvals across all your projects</p>
        </div>

        {loading ? (
          <div style={{display:"flex",justifyContent:"center",paddingTop:"60px"}}>
            <div style={{width:"28px",height:"28px",border:"2px solid rgba(255,255,255,0.08)",borderTopColor:"#5B4CF5",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
          </div>
        ) : (
          <>
            {/* ── Needs Action ── */}
            <div className="fi fi2" style={{marginBottom:"32px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
                <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#F5A623",animation:"pulse 2s ease-in-out infinite"}} />
                <h2 style={{fontSize:"13px",fontWeight:700,color:"#F5A623",textTransform:"uppercase",letterSpacing:"0.08em"}}>Needs your attention</h2>
                {needsAction.length > 0 && (
                  <span style={{background:"rgba(245,166,35,0.15)",color:"#F5A623",fontSize:"11px",fontWeight:700,borderRadius:"8px",padding:"2px 8px"}}>{needsAction.length}</span>
                )}
              </div>

              {needsAction.length === 0 ? (
                <div style={{padding:"28px",textAlign:"center",border:"1px dashed rgba(255,255,255,0.07)",borderRadius:"16px",color:"rgba(255,255,255,0.25)"}}>
                  <div style={{fontSize:"22px",marginBottom:"8px",opacity:0.4}}>✓</div>
                  <div style={{fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.35)"}}>All clear — no pending revisions</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  {needsAction.map(({project,stage,lastActivity}) => (
                    <div key={`${project.id}-${stage.id}`} className="action-card" onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                      {/* Project avatar */}
                      <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"rgba(245,166,35,0.12)",border:"1px solid rgba(245,166,35,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",fontWeight:800,color:"#F5A623",flexShrink:0,marginLeft:"6px"}}>
                        {project.name.slice(0,2).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px",flexWrap:"wrap"}}>
                          <span style={{fontSize:"15px",fontWeight:700}}>{project.name}</span>
                          <span style={{fontSize:"11px",color:"rgba(255,255,255,0.35)"}}>→</span>
                          <span style={{fontSize:"13px",color:"rgba(255,255,255,0.55)",fontWeight:500}}>{stage.title}</span>
                        </div>
                        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.38)",marginBottom:lastActivity?.message?"8px":0}}>
                          {project.client_name} · {lastActivity ? timeAgo(lastActivity.created_at) : ""}
                        </div>
                        {lastActivity?.message && (
                          <div style={{fontSize:"13px",color:"rgba(255,255,255,0.65)",background:"rgba(245,166,35,0.07)",border:"1px solid rgba(245,166,35,0.15)",borderRadius:"8px",padding:"8px 12px",lineHeight:1.5}}>
                            <span style={{color:"#F5A623",marginRight:"6px"}}><Icons.Warning /></span>
                            "{lastActivity.message}"
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="action-card-actions" style={{display:"flex",flexDirection:"column",gap:"6px",flexShrink:0}} onClick={e => e.stopPropagation()}>
                        <button className={`icon-btn${copied===project.id?" copied":""}`} onClick={() => copyLink(project.portal_slug, project.id)}>
                          <Icons.Copy />{copied===project.id?"Copied":"Share"}
                        </button>
                        <button className="icon-btn" onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                          Open <Icons.Arrow />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Recently Approved ── */}
            <div className="fi fi3">
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
                <div style={{width:"8px",height:"8px",borderRadius:"50%",background:"#0BAB6C"}} />
                <h2 style={{fontSize:"13px",fontWeight:700,color:"#0BAB6C",textTransform:"uppercase",letterSpacing:"0.08em"}}>Recently approved</h2>
                {recentlyDone.length > 0 && (
                  <span style={{background:"rgba(11,171,108,0.12)",color:"#0BAB6C",fontSize:"11px",fontWeight:700,borderRadius:"8px",padding:"2px 8px"}}>{recentlyDone.length}</span>
                )}
              </div>

              {recentlyDone.length === 0 ? (
                <div style={{padding:"28px",textAlign:"center",border:"1px dashed rgba(255,255,255,0.07)",borderRadius:"16px",color:"rgba(255,255,255,0.25)"}}>
                  <div style={{fontSize:"13px",fontWeight:600,color:"rgba(255,255,255,0.3)"}}>No approvals in the last 2 weeks</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {recentlyDone.map(({project,stage,lastActivity}) => (
                    <div key={`done-${project.id}-${stage.id}`} className="done-card" onClick={() => router.push(`/dashboard/project/${project.id}`)}>
                      <div style={{width:"36px",height:"36px",borderRadius:"10px",background:"rgba(11,171,108,0.12)",border:"1px solid rgba(11,171,108,0.25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0BAB6C",flexShrink:0}}>
                        <Icons.Check />
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"2px",flexWrap:"wrap"}}>
                          <span style={{fontSize:"14px",fontWeight:700}}>{project.name}</span>
                          <span style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>→</span>
                          <span style={{fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>{stage.title}</span>
                        </div>
                        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.35)"}}>
                          Approved by {project.client_name} · {lastActivity ? timeAgo(lastActivity.created_at) : ""}
                        </div>
                      </div>
                      <div style={{color:"rgba(255,255,255,0.2)",flexShrink:0}}><Icons.Arrow /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}