"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const Icons = {
  Studio:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/></svg>,
  Projects:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 7C3 5.9 3.9 5 5 5h4l2 2h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" fill="currentColor" opacity="0.8"/></svg>,
  Activity:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 12h3l3-8 4 16 3-8h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Approvals: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Payments:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" opacity="0.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" opacity="0.6"/></svg>,
  Help:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
  Signout:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>,
};

export default function NewProjectPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [name,        setName]        = useState("");
  const [clientName,  setClientName]  = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [userEmail,   setUserEmail]   = useState("");
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }
    setUserEmail(session.user.email ?? "");
    const { data: projs } = await supabase
      .from("projects")
      .select("status")
      .eq("designer_id", session.user.id);
    setReviewCount((projs ?? []).filter((p: { status: string }) => p.status === "review").length);
  }, [supabase, router]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in."); setLoading(false); return; }

    console.log("User ID:", user.id);

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        name:         name.trim(),
        client_name:  clientName.trim(),
        client_email: clientEmail.trim(),
        designer_id:  user.id,
      })
      .select()
      .single();

    if (insertError || !data) {
      console.error("Insert error:", JSON.stringify(insertError));
      setError("Failed to create project. Please try again.");
      setLoading(false);
      return;
    }

    router.push(`/dashboard/project/${data.id}`);
  };

  const currentPath = "/dashboard/projects";

  const navItems = [
    { icon: Icons.Studio,    label: "Studio",    path: "/dashboard"           },
    { icon: Icons.Projects,  label: "My Work",   path: "/dashboard/projects"  },
    { icon: Icons.Activity,  label: "Activity",  path: "/dashboard/activity"  },
    { icon: Icons.Approvals, label: "Approvals", path: "/dashboard/approvals", badge: reviewCount },
    { icon: Icons.Payments,  label: "Payments",  path: "/dashboard/payments"  },
    { icon: Icons.Help,      label: "Help",      path: "/dashboard/help"      },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#07090f", fontFamily:"'Outfit',sans-serif", color:"#fff", display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .fi { animation:fadeUp 0.4s ease forwards; opacity:0; }
        .fi1 { animation-delay:0.04s; }

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
        .main{margin-left:240px;min-height:100vh;padding:32px 36px;position:relative;flex:1;display:flex;align-items:flex-start;justify-content:center;}

        .form-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:11px 14px;color:#fff;font-family:'Outfit',sans-serif;font-size:13.5px;outline:none;transition:border-color 0.2s;}
        .form-input::placeholder{color:rgba(255,255,255,0.2);}
        .form-input:focus{border-color:rgba(91,76,245,0.4);background:rgba(91,76,245,0.04);}

        .new-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border:none;border-radius:10px;background:linear-gradient(135deg,#5B4CF5,#0BAB6C);color:#fff;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:opacity 0.2s,transform 0.15s;white-space:nowrap;}
        .new-btn:hover:not(:disabled){opacity:0.88;transform:translateY(-1px);}
        .new-btn:disabled{opacity:0.5;cursor:not-allowed;}

        .mobile-menu{position:fixed;top:60px;left:0;right:0;z-index:50;background:rgba(7,9,15,0.98);border-bottom:1px solid rgba(255,255,255,0.08);padding:16px;backdrop-filter:blur(20px);animation:fadeIn 0.2s ease forwards;}

        @media(max-width:768px){
          .sidebar{display:none!important;}
          .topbar{display:flex!important;}
          .main{margin-left:0!important;padding:76px 16px 40px!important;}
        }
      `}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:`radial-gradient(ellipse 60% 40% at 100% 0%,rgba(91,76,245,0.06) 0%,transparent 60%),radial-gradient(ellipse 40% 30% at 0% 100%,rgba(11,171,108,0.05) 0%,transparent 60%),linear-gradient(rgba(91,76,245,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(91,76,245,0.02) 1px,transparent 1px)`,backgroundSize:"100% 100%,100% 100%,40px 40px,40px 40px"}} />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.8px"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
            <span style={{fontSize:"10px",fontWeight:700,color:"#5B4CF5",background:"rgba(91,76,245,0.15)",border:"1px solid rgba(91,76,245,0.3)",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.05em"}}>BETA</span>
          </div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.25)",marginTop:"4px"}}>Designer workspace</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({icon:Icon,label,path,badge}) => (
            <div key={label} className={`nav-item${currentPath===path?" active":""}`} onClick={() => router.push(path)}>
              <Icon /><span>{label}</span>
              {badge != null && badge > 0 && <span className="nav-badge">{badge}</span>}
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
        <span style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.6px"}}>Portl<span style={{color:"#5B4CF5"}}>.</span></span>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"8px",width:"36px",height:"36px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.7)",fontSize:"18px"}}>☰</button>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <nav style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"12px"}}>
            {navItems.map(({icon:Icon,label,path}) => (
              <div key={label} className={`nav-item${currentPath===path?" active":""}`} onClick={() => { router.push(path); setMenuOpen(false); }}>
                <Icon />{label}
              </div>
            ))}
          </nav>
          <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:"12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"12px",color:"rgba(255,255,255,0.35)"}}>{userEmail}</span>
            <button onClick={handleSignOut} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.35)",fontSize:"12px",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:"5px"}}><Icons.Signout /> Sign out</button>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="main">
        <div className="fi fi1" style={{width:"100%",maxWidth:"480px",paddingTop:"40px"}}>
          {/* Header */}
          <div style={{marginBottom:"28px"}}>
            <h1 style={{fontSize:"clamp(22px,3vw,28px)",fontWeight:800,letterSpacing:"-0.6px",marginBottom:"5px"}}>New Project</h1>
            <p style={{fontSize:"13px",color:"rgba(255,255,255,0.35)"}}>Fill in the details to get started.</p>
          </div>

          {/* Card */}
          <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"18px",padding:"28px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>

              {/* Project name */}
              <div>
                <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"7px"}}>Project Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Brand Refresh — Marble & Co."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>

              {/* Client name */}
              <div>
                <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"7px"}}>Client Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Sarah"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                />
              </div>

              {/* Client email */}
              <div>
                <label style={{display:"block",fontSize:"11px",fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"7px"}}>Client Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="e.g. sarah@marbleandco.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{fontSize:"13px",color:"#E85D75",background:"rgba(232,93,117,0.08)",border:"1px solid rgba(232,93,117,0.2)",borderRadius:"10px",padding:"10px 14px"}}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{display:"flex",gap:"10px",paddingTop:"4px"}}>
                <button
                  onClick={() => router.back()}
                  style={{flex:1,padding:"11px",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"12px",color:"rgba(255,255,255,0.4)",fontFamily:"'Outfit',sans-serif",fontSize:"13px",fontWeight:500,cursor:"pointer",transition:"all 0.18s"}}
                  onMouseOver={e => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onMouseOut={e  => { (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
                >
                  Cancel
                </button>
                <button
                  className="new-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{flex:2,justifyContent:"center",padding:"11px"}}
                >
                  {loading ? (
                    <span style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{width:"13px",height:"13px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"}} />
                      Creating…
                    </span>
                  ) : (
                    <><Icons.Plus /> Create Project</>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    </div>
  );
}
