"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StageStatus = "not_started" | "in_progress" | "complete";

interface Project { id: string; name: string; client_name: string; status: string; }
interface Stage { id: string; title: string; position: number; status: StageStatus; notes: string | null; }
interface ProjectFile { id: string; stage_id: string; name: string; file_url: string; file_size: number | null; created_at: string; }

const STAGE_STATUS = {
  not_started: { label: "Not Started", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  in_progress: { label: "In Progress", color: "#F5A623", bg: "rgba(245,166,35,0.12)"  },
  complete:    { label: "Complete",    color: "#0BAB6C", bg: "rgba(11,171,108,0.12)"  },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function fileIcon(name: string) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return "🖼";
  if (/\.pdf$/i.test(name)) return "📄";
  if (/\.(zip|rar)$/i.test(name)) return "📦";
  if (/\.(fig|sketch|xd)$/i.test(name)) return "🎨";
  return "📎";
}
function isImage(name: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name); }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), dy = Math.floor(diff/86400000);
  if (m<1) return "just now";
  if (m<60) return `${m}m ago`;
  if (h<24) return `${h}h ago`;
  if (dy<7) return `${dy}d ago`;
  return new Date(d).toLocaleDateString();
}

export default function ClientPortalPage() {
  const params   = useParams();
  const supabase = createClient();
  const slug     = params?.slug as string;

  const [project,       setProject]       = useState<Project | null>(null);
  const [stages,        setStages]        = useState<Stage[]>([]);
  const [files,         setFiles]         = useState<ProjectFile[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [approved,      setApproved]      = useState<string | null>(null);
  const [feedback,      setFeedback]      = useState("");
  const [showFeedback,  setShowFeedback]  = useState(false);
  const [submitted,     setSubmitted]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: proj, error: pe } = await supabase
      .from("projects").select("id, name, client_name, status").eq("portal_slug", slug).single();
    if (pe || !proj) { setError("Portal not found."); setLoading(false); return; }
    setProject(proj as Project);

    const { data: sd } = await supabase.from("stages").select("*").eq("project_id", proj.id).order("position", { ascending: true });
    const sl = (sd as unknown as Stage[]) ?? [];
    setStages(sl);
    if (sl.length > 0) setActiveStageId(sl[0].id);

    const { data: fd } = await supabase.from("files").select("*").eq("project_id", proj.id).order("created_at", { ascending: false });
    setFiles((fd as ProjectFile[]) ?? []);
    setLoading(false);
  }, [supabase, slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async () => {
    if (!activeStageId || !project) return;
    await supabase.from("stages").update({ status: "complete" }).eq("id", activeStageId);
    // Log activity
    await supabase.from("activity").insert({ project_id: project.id, stage_id: activeStageId, type: "approved", message: null });
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, status: "complete" } : s));
    setApproved(activeStageId);
    setTimeout(() => setApproved(null), 4000);
    // Notify designer — client approved
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'client_approved',
          to: 'talhariaz663@gmail.com',
          projectName: project?.name ?? 'your project',
          stageName: activeStage?.title ?? 'this stage',
          clientName: project?.client_name ?? 'Your client',
        }),
      })
    } catch (err) {
      console.error('Email send failed:', err)
    }
  };

  const handleRevision = async () => {
    if (!activeStageId || !feedback.trim() || !project) return;
    // Update stage status
    await supabase.from("stages").update({ status: "in_progress" }).eq("id", activeStageId);
    // Log activity with message — this is the new way, no longer stuffed into notes
    await supabase.from("activity").insert({
      project_id: project.id,
      stage_id: activeStageId,
      type: "changes_requested",
      message: feedback.trim(),
    });
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, status: "in_progress" } : s));
    setSubmitted(activeStageId);
    setShowFeedback(false);
    setFeedback("");
    setTimeout(() => setSubmitted(null), 4000);
    // Notify designer — revision requested
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'revision_requested',
          to: 'talhariaz663@gmail.com',
          projectName: project?.name ?? 'your project',
          stageName: activeStage?.title ?? 'this stage',
          clientName: project?.client_name ?? 'Your client',
          revisionNote: feedback ?? '',
        }),
      })
    } catch (err) {
      console.error('Email send failed:', err)
    }
  };

  const activeStage      = stages.find(s => s.id === activeStageId);
  const activeStageFiles = files.filter(f => f.stage_id === activeStageId);
  const completeCount    = stages.filter(s => s.status === "complete").length;
  const progressPct      = stages.length > 0 ? Math.round((completeCount / stages.length) * 100) : 0;
  const allComplete      = stages.length > 0 && completeCount === stages.length;

  // Parse designer notes — show only non-revision content
  const designerNote = activeStage?.notes
  ? activeStage.notes.split("📝 Client revision request:")[0].trim()
    : null;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap');
        @keyframes pulse { 0%,100%{transform:scale(0.8);opacity:0.5} 50%{transform:scale(1.2);opacity:1} }
      `}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"28px", fontWeight:900, letterSpacing:"-0.8px", color:"#12111A", marginBottom:"16px" }}>
          Portl<span style={{ color:"#5B4CF5" }}>.</span>
        </div>
        <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#5B4CF5", animation:"pulse 1.2s ease-in-out infinite", margin:"0 auto 12px" }} />
        <div style={{ fontSize:"13px", color:"#8A8A9A" }}>Loading your portal…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:"#f8f7ff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit',sans-serif", padding:"24px" }}>
      <div style={{ textAlign:"center", maxWidth:"320px" }}>
        <div style={{ fontSize:"40px", marginBottom:"16px" }}>⬡</div>
        <h2 style={{ color:"#0f0e1a", fontSize:"20px", fontWeight:700, marginBottom:"8px" }}>Portal not found</h2>
        <p style={{ color:"rgba(15,14,26,0.45)", fontSize:"14px", lineHeight:1.6 }}>This link may have expired or the project was removed.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f8f7ff", fontFamily:"'Outfit',sans-serif", color:"#0f0e1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pop { 0%{transform:scale(0.8) translateX(-50%);opacity:0} 60%{transform:scale(1.05) translateX(-50%)} 100%{transform:scale(1) translateX(-50%);opacity:1} }
        @keyframes confetti-fall { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(80px) rotate(720deg);opacity:0} }

        .fi{animation:fadeUp 0.5s ease forwards;opacity:0}
        .fi1{animation-delay:0.05s}.fi2{animation-delay:0.12s}.fi3{animation-delay:0.20s}.fi4{animation-delay:0.28s}

        .stage-tab{display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;white-space:nowrap;transition:all 0.18s ease;border:1px solid rgba(15,14,26,0.08);background:rgba(255,255,255,0.7);color:rgba(15,14,26,0.45);}
        .stage-tab:hover{background:#fff;color:rgba(15,14,26,0.8);border-color:rgba(91,76,245,0.2);}
        .stage-tab.active{background:#fff;border-color:rgba(91,76,245,0.4);color:#0f0e1a;font-weight:700;box-shadow:0 2px 12px rgba(91,76,245,0.12);}

        .approve-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border:none;border-radius:12px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;background:linear-gradient(135deg,#0BAB6C,#059652);color:#fff;transition:opacity 0.2s,transform 0.15s;box-shadow:0 4px 20px rgba(11,171,108,0.25);flex:1;}
        .approve-btn:hover{opacity:0.9;transform:translateY(-1px);}

        .revision-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:12px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;background:transparent;border:1.5px solid rgba(15,14,26,0.15);color:rgba(15,14,26,0.55);transition:all 0.15s;flex:1;}
        .revision-btn:hover{border-color:rgba(15,14,26,0.3);color:#0f0e1a;background:rgba(15,14,26,0.04);}

        .file-card{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:#fff;border:1px solid rgba(15,14,26,0.07);transition:all 0.15s;box-shadow:0 1px 4px rgba(15,14,26,0.05);min-height:44px;width:100%;}
        .file-card:hover{border-color:rgba(91,76,245,0.2);box-shadow:0 4px 16px rgba(91,76,245,0.08);}

        .feedback-area{width:100%;min-height:100px;padding:14px 16px;background:#fff;border:1.5px solid rgba(91,76,245,0.25);border-radius:12px;color:#0f0e1a;font-family:'Outfit',sans-serif;font-size:14px;line-height:1.6;resize:vertical;outline:none;transition:border-color 0.2s;}
        .feedback-area::placeholder{color:rgba(15,14,26,0.3);}
        .feedback-area:focus{border-color:rgba(91,76,245,0.55);}

        .submit-btn{padding:12px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#5B4CF5,#7B6CF9);color:#fff;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:opacity 0.2s;flex:1;}
        .submit-btn:disabled{opacity:0.45;cursor:not-allowed;}

        .confetti-piece{position:fixed;width:8px;height:8px;border-radius:2px;animation:confetti-fall 1.2s ease-out forwards;pointer-events:none;z-index:999;}
        .success-toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#0f0e1a;color:#fff;padding:14px 24px;border-radius:14px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.2);animation:pop 0.4s ease forwards;z-index:100;white-space:nowrap;}

        .tabs-scroll{overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap;}
        .tabs-scroll::-webkit-scrollbar{display:none;}
        .tabs-scroll>div{flex-shrink:0;}

        @media(max-width:768px){
          body,html{overflow-x:hidden;}
          .nav-padding{padding:0 16px!important;}
          .main-padding{padding:24px 16px 80px!important;max-width:100%!important;}
          .stage-panel{padding:16px!important;}
          .action-row{flex-direction:column!important;}
          .action-row .approve-btn,.action-row .revision-btn{flex:none!important;width:100%!important;}
          .progress-header{flex-direction:column!important;align-items:flex-start!important;gap:4px!important;}
          .feedback-actions{flex-direction:column!important;}
          .feedback-actions .submit-btn{width:100%!important;text-align:center!important;}
          .success-toast{white-space:normal!important;max-width:calc(100% - 32px)!important;text-align:center!important;bottom:20px!important;}
          .approve-btn,.revision-btn{font-size:14px!important;padding:13px!important;}
          .file-card{padding:10px 12px!important;}
          .stage-tab{font-size:12px!important;padding:8px 11px!important;}
        }
      `}</style>

      {approved && (
        <>
          {Array.from({length:24}).map((_,i)=>(
            <div key={i} className="confetti-piece" style={{ left:`${Math.random()*100}%`, top:`${Math.random()*30}%`, background:["#5B4CF5","#0BAB6C","#F5A623","#E85D75","#7B6CF9"][i%5], animationDelay:`${Math.random()*0.5}s`, animationDuration:`${0.8+Math.random()*0.8}s` }} />
          ))}
          <div className="success-toast"><span style={{ fontSize:"18px" }}>✓</span>Stage approved! Your designer has been notified.</div>
        </>
      )}
      {submitted && <div className="success-toast"><span style={{ fontSize:"18px" }}>📝</span>Feedback sent! Your designer will get back to you.</div>}

      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:`radial-gradient(ellipse 60% 50% at 100% 0%,rgba(91,76,245,0.06) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 0% 100%,rgba(11,171,108,0.05) 0%,transparent 70%)` }} />

      <nav style={{ position:"sticky", top:0, zIndex:20, background:"rgba(248,247,255,0.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(15,14,26,0.07)", height:"60px" }}>
        <div className="nav-padding" style={{ maxWidth:"720px", margin:"0 auto", height:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px" }}>
          <span style={{ fontSize:"20px", fontWeight:800, letterSpacing:"-0.5px", color:"#0f0e1a" }}>Portl<span style={{ color:"#5B4CF5", fontSize:"24px" }}>.</span></span>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#0BAB6C" }} />
            <span style={{ fontSize:"13px", color:"rgba(15,14,26,0.45)", fontWeight:500 }}>Live portal</span>
          </div>
        </div>
      </nav>

      <main className="main-padding" style={{ maxWidth:"720px", margin:"0 auto", padding:"48px 24px 80px", position:"relative", zIndex:1, width:"100%" }}>

        <div className="fi fi1" style={{ marginBottom:"32px" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"rgba(91,76,245,0.08)", border:"1px solid rgba(91,76,245,0.15)", borderRadius:"20px", padding:"4px 12px", marginBottom:"14px" }}>
            <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#5B4CF5" }} />
            <span style={{ fontSize:"12px", fontWeight:700, color:"#5B4CF5", textTransform:"uppercase", letterSpacing:"0.07em" }}>Your Project Portal</span>
          </div>
          <h1 style={{ fontSize:"clamp(24px,5vw,38px)", fontWeight:800, letterSpacing:"-0.8px", marginBottom:"8px", lineHeight:1.1 }}>{project?.name}</h1>
          <p style={{ fontSize:"15px", color:"rgba(15,14,26,0.45)", lineHeight:1.6 }}>Hi {project?.client_name} 👋 — track progress, review deliverables, and approve stages.</p>
        </div>

        {/* Progress */}
        <div className="fi fi2" style={{ background:"#fff", border:"1px solid rgba(15,14,26,0.08)", borderRadius:"18px", padding:"20px 24px", marginBottom:"24px", boxShadow:"0 2px 16px rgba(15,14,26,0.06)" }}>
          {allComplete ? (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:"32px", marginBottom:"8px" }}>🎉</div>
              <div style={{ fontSize:"18px", fontWeight:800, color:"#0BAB6C", marginBottom:"4px" }}>Project Complete!</div>
              <div style={{ fontSize:"14px", color:"rgba(15,14,26,0.45)" }}>All stages approved. Amazing work!</div>
            </div>
          ) : (
            <>
              <div className="progress-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                <span style={{ fontSize:"12px", fontWeight:700, color:"rgba(15,14,26,0.4)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Overall Progress</span>
                <span style={{ fontSize:"13px", fontWeight:700, color:progressPct===100?"#0BAB6C":"#5B4CF5" }}>{completeCount} of {stages.length} stages complete</span>
              </div>
              <div style={{ height:"8px", background:"rgba(15,14,26,0.07)", borderRadius:"99px", overflow:"hidden", marginBottom:"14px" }}>
                <div style={{ height:"100%", borderRadius:"99px", width:`${progressPct}%`, background:"linear-gradient(90deg,#5B4CF5,#0BAB6C)", transition:"width 0.6s ease" }} />
              </div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {stages.map(s => { const st=STAGE_STATUS[s.status]; return (
                  <div key={s.id} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"20px", background:st.bg, fontSize:"12px", fontWeight:600, color:st.color }}>
                    <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:st.color }} />{s.title}
                  </div>
                );})}
              </div>
            </>
          )}
        </div>

        {/* Stage tabs */}
        {stages.length>0&&(
          <div className="fi fi3 tabs-scroll" style={{ display:"flex", marginBottom:"20px", paddingBottom:"4px", gap:"0" }}>
            {stages.map((stage,i)=>{
              const st=STAGE_STATUS[stage.status]; const isActive=activeStageId===stage.id;
              const fc=files.filter(f=>f.stage_id===stage.id).length;
              return (
                <div key={stage.id} style={{ display:"flex", alignItems:"center" }}>
                  <button className={`stage-tab${isActive?" active":""}`} onClick={()=>setActiveStageId(stage.id)}>
                    <span style={{ width:"20px", height:"20px", borderRadius:"50%", flexShrink:0, background:stage.status==="complete"?"#0BAB6C":isActive?"#5B4CF5":"rgba(15,14,26,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:700, color:stage.status==="complete"||isActive?"#fff":"rgba(15,14,26,0.35)" }}>{stage.status==="complete"?"✓":i+1}</span>
                    {stage.title}
                    <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:st.color, flexShrink:0 }} />
                    {fc>0&&<span style={{ background:"rgba(91,76,245,0.1)", color:"#5B4CF5", fontSize:"10px", fontWeight:700, borderRadius:"10px", padding:"1px 6px" }}>{fc}</span>}
                  </button>
                  {i<stages.length-1&&<div style={{ width:"12px", height:"1px", background:"rgba(15,14,26,0.1)", flexShrink:0 }} />}
                </div>
              );
            })}
          </div>
        )}

        {activeStage&&(
          <div className="fi fi4 stage-panel" style={{ background:"#fff", border:"1px solid rgba(15,14,26,0.08)", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(15,14,26,0.06)" }}>

            <div style={{ marginBottom:"20px" }}>
              <h2 style={{ fontSize:"clamp(17px,3vw,20px)", fontWeight:800, marginBottom:"8px" }}>{activeStage.title}</h2>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:STAGE_STATUS[activeStage.status].bg, color:STAGE_STATUS[activeStage.status].color, padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:STAGE_STATUS[activeStage.status].color }} />
                {STAGE_STATUS[activeStage.status].label}
              </div>
            </div>

            {/* Designer note — cleaned of old revision text */}
            {designerNote && (
              <div style={{ background:"rgba(91,76,245,0.04)", border:"1px solid rgba(91,76,245,0.12)", borderRadius:"12px", padding:"16px", marginBottom:"20px" }}>
                <div style={{ fontSize:"11px", fontWeight:700, color:"#5B4CF5", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>📌 Note from your designer</div>
                <p style={{ fontSize:"14px", color:"rgba(15,14,26,0.7)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{designerNote}</p>
              </div>
            )}

            <div style={{ height:"1px", background:"rgba(15,14,26,0.07)", marginBottom:"20px" }} />

            {/* Files — with image previews */}
            <div style={{ marginBottom:"24px" }}>
              <h3 style={{ fontSize:"12px", fontWeight:700, color:"rgba(15,14,26,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"12px" }}>
                Deliverables{activeStageFiles.length>0&&<span style={{ marginLeft:"6px", fontWeight:400, textTransform:"none", color:"rgba(15,14,26,0.3)", letterSpacing:0 }}>{activeStageFiles.length} file{activeStageFiles.length!==1?"s":""}</span>}
              </h3>
              {activeStageFiles.length===0?(
                <div style={{ padding:"28px", textAlign:"center", border:"1.5px dashed rgba(15,14,26,0.1)", borderRadius:"12px", color:"rgba(15,14,26,0.35)", fontSize:"14px" }}>No files uploaded yet — check back soon.</div>
              ):(
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {activeStageFiles.map(file=>(
                    <div key={file.id} className="file-card">
                      {isImage(file.name)?(
                        <img src={file.file_url} alt={file.name} style={{ width:"44px", height:"44px", borderRadius:"8px", objectFit:"cover", flexShrink:0, border:"1px solid rgba(15,14,26,0.08)" }} />
                      ):(
                        <div style={{ width:"38px", height:"38px", borderRadius:"10px", background:"rgba(91,76,245,0.07)", border:"1px solid rgba(91,76,245,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>{fileIcon(file.name)}</div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"14px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"#0f0e1a" }}>{file.name}</div>
                        <div style={{ fontSize:"12px", color:"rgba(15,14,26,0.35)", marginTop:"2px", display:"flex", gap:"8px" }}>
                          {file.file_size&&<span>{formatBytes(file.file_size)}</span>}
                          <span>{timeAgo(file.created_at)}</span>
                        </div>
                      </div>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ padding:"8px 14px", borderRadius:"8px", background:"rgba(91,76,245,0.08)", border:"1px solid rgba(91,76,245,0.15)", color:"#5B4CF5", fontSize:"13px", fontWeight:700, textDecoration:"none", whiteSpace:"nowrap", fontFamily:"'Outfit',sans-serif" }}>View →</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height:"1px", background:"rgba(15,14,26,0.07)", marginBottom:"20px" }} />

            {/* Review */}
            {activeStage.status!=="complete"?(
              <div>
                <h3 style={{ fontSize:"12px", fontWeight:700, color:"rgba(15,14,26,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"14px" }}>Your Review</h3>
                {!showFeedback?(
                  <div className="action-row" style={{ display:"flex", gap:"12px" }}>
                    <button className="approve-btn" onClick={handleApprove}>✓ Approve this stage</button>
                    <button className="revision-btn" onClick={()=>setShowFeedback(true)}>✏️ Request changes</button>
                  </div>
                ):(
                  <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                    <div style={{ fontSize:"14px", color:"rgba(15,14,26,0.55)" }}>What changes would you like? Be as specific as possible.</div>
                    <textarea className="feedback-area" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="e.g. Can we try a darker shade of blue? The logo feels too large on mobile…" />
                    <div className="feedback-actions" style={{ display:"flex", gap:"10px" }}>
                      <button className="submit-btn" disabled={!feedback.trim()} onClick={handleRevision}>Send feedback →</button>
                      <button onClick={()=>{setShowFeedback(false);setFeedback("");}} style={{ padding:"12px 20px", borderRadius:"10px", border:"1px solid rgba(15,14,26,0.12)", background:"transparent", color:"rgba(15,14,26,0.45)", fontFamily:"'Outfit',sans-serif", fontSize:"14px", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ):(
              <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"16px", borderRadius:"12px", background:"rgba(11,171,108,0.07)", border:"1px solid rgba(11,171,108,0.2)" }}>
                <span style={{ fontSize:"22px" }}>✓</span>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:"#0BAB6C" }}>Stage approved</div>
                  <div style={{ fontSize:"13px", color:"rgba(15,14,26,0.45)" }}>Your designer has been notified and will move to the next stage.</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:"48px" }}>
          <span style={{ fontSize:"12px", color:"rgba(15,14,26,0.25)", fontWeight:500 }}>Powered by <span style={{ fontWeight:700, color:"rgba(91,76,245,0.5)" }}>Portl.</span></span>
        </div>
      </main>
    </div>
  );
}