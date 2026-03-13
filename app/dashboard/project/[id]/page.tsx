"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StageStatus = "not_started" | "in_progress" | "complete";
type ProjectStatus = "draft" | "active" | "review" | "approved";

interface Stage {
  id: string;
  project_id: string;
  title: string;
  position: number;
  status: StageStatus;
  notes: string | null;
}

interface ProjectFile {
  id: string;
  stage_id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string;
  portal_slug: string;
  status: ProjectStatus;
}

const STAGE_STATUS: Record<StageStatus, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: "Not Started", color: "#6b7280", bg: "rgba(107,114,128,0.15)", border: "rgba(107,114,128,0.3)" },
  in_progress: { label: "In Progress", color: "#F5A623", bg: "rgba(245,166,35,0.15)",  border: "rgba(245,166,35,0.4)"  },
  complete:    { label: "Complete",    color: "#0BAB6C", bg: "rgba(11,171,108,0.15)",  border: "rgba(11,171,108,0.4)"  },
};

const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string; bg: string; next: ProjectStatus }> = {
  draft:    { label: "Draft",     color: "#6b7280", bg: "rgba(107,114,128,0.12)", next: "active"   },
  active:   { label: "Active",    color: "#0BAB6C", bg: "rgba(11,171,108,0.12)",  next: "review"   },
  review:   { label: "In Review", color: "#F5A623", bg: "rgba(245,166,35,0.12)",  next: "approved" },
  approved: { label: "Approved",  color: "#5B4CF5", bg: "rgba(91,76,245,0.12)",   next: "draft"    },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dy < 7) return `${dy}d ago`;
  return new Date(d).toLocaleDateString();
}
function fileIcon(name: string) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return "🖼";
  if (/\.pdf$/i.test(name)) return "📄";
  if (/\.(zip|rar)$/i.test(name)) return "📦";
  if (/\.(fig|sketch|xd)$/i.test(name)) return "🎨";
  return "📎";
}

export default function ProjectDetailPage() {
  const router       = useRouter();
  const params       = useParams();
  const supabase     = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectId    = params?.id as string;

  const [project,       setProject]       = useState<Project | null>(null);
  const [stages,        setStages]        = useState<Stage[]>([]);
  const [files,         setFiles]         = useState<ProjectFile[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [savingNote,    setSavingNote]    = useState(false);
  const [noteSaved,     setNoteSaved]     = useState(false);
  const [noteText,      setNoteText]      = useState("");
  const [approvalSent,  setApprovalSent]  = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data: proj, error: pe } = await supabase
      .from("projects").select("id, name, client_name, client_email, portal_slug, status")
      .eq("id", projectId).single();
    if (pe || !proj) { setError("Project not found."); setLoading(false); return; }
    setProject(proj as Project);

    const { data: sd } = await supabase
      .from("stages").select("id, title, position, status, notes, project_id")
      .eq("project_id", projectId).order("position", { ascending: true });
    const sl = (sd as Stage[]) ?? [];
    setStages(sl);
    if (sl.length > 0) { setActiveStageId(sl[0].id); setNoteText(sl[0].notes ?? ""); }

    const { data: fd } = await supabase
      .from("files").select("id, stage_id, name, file_url, file_size, created_at, project_id")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setFiles((fd as unknown as ProjectFile[]) ?? []);
    setLoading(false);
  }, [supabase, router, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const s = stages.find(s => s.id === activeStageId);
    setNoteText(s?.notes ?? "");
    setNoteSaved(false);
  }, [activeStageId, stages]);

  const updateStageStatus = async (stageId: string, status: StageStatus) => {
    await supabase.from("stages").update({ status }).eq("id", stageId);
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, status } : s));
  };

  const cycleProjectStatus = async () => {
    if (!project) return;
    const next = PROJECT_STATUS[project.status].next;
    await supabase.from("projects").update({ status: next }).eq("id", projectId);
    setProject(prev => prev ? { ...prev, status: next } : prev);
  };

  const saveNote = async () => {
    if (!activeStageId) return;
    setSavingNote(true);
    await supabase.from("stages").update({ notes: noteText }).eq("id", activeStageId);
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, notes: noteText } : s));
    setSavingNote(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  // ── File upload (FIXED) ──
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !activeStageId || !project) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(fileList)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${project.id}/${activeStageId}/${Date.now()}-${safeName}`;

      const { error: ue } = await supabase.storage
        .from("project-files")
        .upload(path, file, { upsert: false });

      if (ue) { setError(`Upload failed: ${ue.message}`); continue; }

      const { data: urlData } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);

      const { error: ie } = await supabase.from("files").insert({
        project_id: project.id,
        stage_id:   activeStageId,
        name:       file.name,
        file_url:   urlData.publicUrl,
        file_size:  file.size,
      });

      if (ie) { setError(`DB insert failed: ${ie.message}`); }
    }

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(false);
    fetchData();
  };

  const requestApproval = async () => {
    if (!activeStageId || !project) return;
    await updateStageStatus(activeStageId, "in_progress");
    await supabase.from("projects").update({ status: "review" }).eq("id", projectId);
    setProject(prev => prev ? { ...prev, status: "review" } : prev);
    setApprovalSent(true);
    setTimeout(() => setApprovalSent(false), 3000);
  };

  const copyPortalLink = () => {
    if (!project) return;
    navigator.clipboard.writeText(`${window.location.origin}/portal/${project.portal_slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeStage      = stages.find(s => s.id === activeStageId);
  const activeStageFiles = files.filter(f => f.stage_id === activeStageId);
  const completeCount    = stages.filter(s => s.status === "complete").length;
  const progressPct      = stages.length > 0 ? Math.round((completeCount / stages.length) * 100) : 0;
  const ps               = project ? PROJECT_STATUS[project.status] : null;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080a18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "32px", height: "32px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#5B4CF5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080a18", fontFamily: "'Outfit',sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pop     { 0%{transform:scale(0.9);opacity:0} 100%{transform:scale(1);opacity:1} }

        .fi  { animation: fadeUp 0.35s ease forwards; opacity: 0; }
        .fi1 { animation-delay: 0.04s; }
        .fi2 { animation-delay: 0.10s; }
        .fi3 { animation-delay: 0.16s; }
        .fi4 { animation-delay: 0.22s; }

        /* Nav */
        .nav-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:10px; font-size:14px;
          cursor:pointer; transition:all 0.15s; border:1px solid transparent;
        }
        .nav-item.active { background:rgba(91,76,245,0.15); border-color:rgba(91,76,245,0.3); color:#fff; font-weight:600; }
        .nav-item:not(.active) { color:rgba(255,255,255,0.4); }
        .nav-item:not(.active):hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.04); }

        /* Stage tabs */
        .stage-tab {
          display:flex; align-items:center; gap:6px;
          padding:8px 14px; border-radius:10px; cursor:pointer;
          border:1px solid rgba(255,255,255,0.07);
          background:rgba(255,255,255,0.03);
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:500;
          color:rgba(255,255,255,0.4); white-space:nowrap;
          transition:all 0.18s ease;
        }
        .stage-tab:hover  { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.14); background:rgba(255,255,255,0.05); }
        .stage-tab.active { background:rgba(91,76,245,0.16); border-color:rgba(91,76,245,0.5); color:#fff; font-weight:700; }

        /* Status pills */
        .status-pill {
          padding:5px 12px; border-radius:20px; cursor:pointer;
          font-family:'Outfit',sans-serif; font-size:12px; font-weight:600;
          transition:all 0.15s; border:1px solid transparent; white-space:nowrap;
        }

        /* Upload zone */
        .upload-zone {
          border:1.5px dashed rgba(91,76,245,0.28); border-radius:12px;
          padding:24px 16px; display:flex; flex-direction:column;
          align-items:center; gap:8px; cursor:pointer; text-align:center;
          transition:all 0.2s ease; background:rgba(91,76,245,0.03);
        }
        .upload-zone:hover, .upload-zone.drag {
          border-color:rgba(91,76,245,0.6); background:rgba(91,76,245,0.08);
        }

        /* File rows */
        .file-row {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:10px;
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
          transition:all 0.15s;
        }
        .file-row:hover { background:rgba(255,255,255,0.055); border-color:rgba(255,255,255,0.11); }

        /* Share btn */
        .share-btn {
          display:flex; align-items:center; gap:6px;
          padding:9px 16px; border-radius:10px;
          border:1px solid rgba(91,76,245,0.3); background:rgba(91,76,245,0.1);
          color:#a093ff; font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; white-space:nowrap;
        }
        .share-btn:hover  { background:rgba(91,76,245,0.2); color:#fff; }
        .share-btn.copied { border-color:rgba(11,171,108,0.4); background:rgba(11,171,108,0.1); color:#0BAB6C; }

        /* Note textarea */
        .note-area {
          width:100%; min-height:90px; padding:12px 14px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:10px; color:#fff; font-family:'Outfit',sans-serif;
          font-size:14px; line-height:1.6; resize:vertical; outline:none;
          transition:border-color 0.2s;
        }
        .note-area::placeholder { color:rgba(255,255,255,0.2); }
        .note-area:focus { border-color:rgba(91,76,245,0.45); background:rgba(91,76,245,0.04); }

        /* Approval btn */
        .approval-btn {
          width:100%; display:flex; align-items:center; justify-content:center; gap:8px;
          padding:12px; border-radius:10px; border:none; cursor:pointer;
          font-family:'Outfit',sans-serif; font-size:14px; font-weight:700;
          background:linear-gradient(135deg,#5B4CF5,#0BAB6C);
          color:#fff; transition:opacity 0.2s, transform 0.15s;
        }
        .approval-btn:hover { opacity:0.88; transform:translateY(-1px); }
        .approval-btn.sent  { background:rgba(11,171,108,0.15); border:1px solid rgba(11,171,108,0.35); color:#0BAB6C; transform:none; }

        /* Layout */
        .sidebar       { display:flex; }
        .topbar        { display:none; }
        .main-content  { margin-left:220px; padding:36px 40px; }
        .stage-grid    { display:grid; grid-template-columns:1fr 1.4fr; gap:20px; align-items:start; }

        @media (max-width:900px) {
          .stage-grid { grid-template-columns:1fr !important; }
        }
        @media (max-width:768px) {
          .sidebar      { display:none !important; }
          .topbar       { display:flex !important; }
          .main-content { margin-left:0 !important; padding:76px 16px 40px !important; }
          .header-row   { flex-direction:column !important; gap:14px !important; }
          .header-meta  { flex-direction:row !important; flex-wrap:wrap !important; }
          #desktop-back { display:none !important; }
        }

        /* Scrollbar hide */
        .tabs-row { scrollbar-width:none; }
        .tabs-row::-webkit-scrollbar { display:none; }
      `}</style>

      {/* BG grid */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`
          linear-gradient(rgba(91,76,245,0.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(91,76,245,0.04) 1px,transparent 1px),
          radial-gradient(ellipse 50% 40% at 95% 0%,rgba(91,76,245,0.07) 0%,transparent 70%),
          radial-gradient(ellipse 40% 30% at 5% 100%,rgba(11,171,108,0.05) 0%,transparent 70%)
        `,
        backgroundSize:"40px 40px,40px 40px,100% 100%,100% 100%",
      }} />

      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar" style={{
        position:"fixed", top:0, left:0, bottom:0, width:"220px",
        background:"rgba(8,10,24,0.97)", borderRight:"1px solid rgba(255,255,255,0.06)",
        backdropFilter:"blur(20px)", flexDirection:"column", padding:"28px 16px", zIndex:10,
      }}>
        <div style={{ marginBottom:"40px", paddingLeft:"8px" }}>
          <span style={{ fontSize:"22px", fontWeight:800, letterSpacing:"-0.5px" }}>
            Portl<span style={{ color:"#5B4CF5", fontSize:"26px" }}>.</span>
          </span>
        </div>
        <nav style={{ display:"flex", flexDirection:"column", gap:"4px", flex:1 }}>
          {[
            { icon:"⬡", label:"Studio",   active:false, path:"/dashboard" },
            { icon:"◷", label:"Timeline",  active:true,  path:"" },
            { icon:"⬚", label:"Files",     active:false, path:"" },
            { icon:"✓", label:"Approvals", active:false, path:"" },
          ].map(({ icon, label, active, path }) => (
            <div key={label} className={`nav-item${active?" active":""}`} onClick={() => path && router.push(path)}>
              <span style={{ fontSize:"16px" }}>{icon}</span>{label}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Mobile Topbar ── */}
      <header className="topbar" style={{
        position:"fixed", top:0, left:0, right:0, height:"60px", zIndex:40,
        background:"rgba(8,10,24,0.97)", borderBottom:"1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(20px)", alignItems:"center",
        justifyContent:"space-between", padding:"0 16px",
      }}>
        <button onClick={() => router.push("/dashboard")} style={{
          background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:"8px", width:"36px", height:"36px", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"rgba(255,255,255,0.6)", fontSize:"16px",
        }}>←</button>
        <span style={{ fontSize:"18px", fontWeight:800, letterSpacing:"-0.5px" }}>
          Portl<span style={{ color:"#5B4CF5", fontSize:"22px" }}>.</span>
        </span>
        <button className={`share-btn${copied?" copied":""}`} onClick={copyPortalLink}
          style={{ padding:"8px 12px", fontSize:"12px" }}>
          {copied ? "✓ Copied" : "⬡ Share"}
        </button>
      </header>

      {/* ── Main ── */}
      <main className="main-content" style={{ position:"relative", zIndex:1 }}>

        {/* Back — desktop */}
        <button id="desktop-back" className="fi fi1" onClick={() => router.push("/dashboard")} style={{
          background:"none", border:"none", color:"rgba(255,255,255,0.3)",
          fontFamily:"'Outfit',sans-serif", fontSize:"13px", cursor:"pointer",
          display:"flex", alignItems:"center", gap:"6px", marginBottom:"20px", padding:0,
        }}>← Back to Studio</button>

        {/* ── Project header ── */}
        <div className="fi fi1" style={{
          background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:"18px", padding:"22px 24px", marginBottom:"20px",
        }}>
          <div className="header-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"16px", marginBottom:"16px" }}>
            {/* Left: name + client */}
            <div style={{ flex:1, minWidth:0 }}>
              <h1 style={{ fontSize:"clamp(18px,3.5vw,26px)", fontWeight:800, letterSpacing:"-0.5px", marginBottom:"5px", lineHeight:1.1 }}>
                {project?.name}
              </h1>
              <div className="header-meta" style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)", fontWeight:500 }}>
                  {project?.client_name}
                </span>
                {project?.client_email && (
                  <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.22)" }}>
                    {project.client_email}
                  </span>
                )}
              </div>
            </div>

            {/* Right: status badge + share */}
            <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
              {ps && (
                <button onClick={cycleProjectStatus} style={{
                  display:"flex", alignItems:"center", gap:"6px",
                  padding:"7px 14px", borderRadius:"20px",
                  background:ps.bg, border:"none", cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif", fontSize:"12px", fontWeight:700, color:ps.color,
                }}>
                  <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:ps.color }} />
                  {ps.label}
                </button>
              )}
              {/* Desktop share — hidden on mobile via topbar */}
              <button className={`share-btn${copied?" copied":""}`} onClick={copyPortalLink}
                style={{ display:"none" }} id="desktop-share-btn">
                {copied ? "✓ Copied!" : "⬡ Share portal"}
              </button>
              <style>{`@media(min-width:769px){#desktop-share-btn{display:flex!important}}`}</style>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Progress</span>
              <span style={{ fontSize:"12px", fontWeight:700, color:progressPct===100?"#0BAB6C":"rgba(255,255,255,0.5)" }}>
                {completeCount} / {stages.length} stages
              </span>
            </div>
            <div style={{ height:"5px", background:"rgba(255,255,255,0.07)", borderRadius:"99px", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:"99px", width:`${progressPct}%`,
                background:"linear-gradient(90deg,#5B4CF5,#0BAB6C)", transition:"width 0.6s ease",
              }} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"rgba(232,93,117,0.1)", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", fontSize:"13px", color:"#E85D75", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={{ background:"none", border:"none", color:"#E85D75", cursor:"pointer", fontSize:"16px" }}>✕</button>
          </div>
        )}

        {/* ── Stage tabs ── */}
        {stages.length > 0 && (
          <div className="fi fi2 tabs-row" style={{ display:"flex", overflowX:"auto", gap:"6px", marginBottom:"20px", paddingBottom:"2px" }}>
            {stages.map((stage, i) => {
              const st = STAGE_STATUS[stage.status];
              const isActive = activeStageId === stage.id;
              const fc = files.filter(f => f.stage_id === stage.id).length;
              return (
                <button key={stage.id} className={`stage-tab${isActive?" active":""}`}
                  onClick={() => setActiveStageId(stage.id)}>
                  <span style={{
                    width:"18px", height:"18px", borderRadius:"50%", flexShrink:0,
                    background:stage.status==="complete"?"#0BAB6C":isActive?"#5B4CF5":"rgba(255,255,255,0.07)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"9px", fontWeight:700,
                    color:stage.status==="complete"||isActive?"#fff":"rgba(255,255,255,0.35)",
                  }}>{stage.status==="complete"?"✓":i+1}</span>
                  {stage.title}
                  <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:st.color, flexShrink:0 }} />
                  {fc>0 && (
                    <span style={{ background:"rgba(91,76,245,0.2)", color:"#a093ff", fontSize:"10px", fontWeight:700, borderRadius:"8px", padding:"1px 5px" }}>{fc}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Stage panel (two-column grid) ── */}
        {activeStage && (
          <div className="fi fi3 stage-grid">

            {/* ── LEFT: Notes + Approval ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

              {/* Stage title + status */}
              <div style={{ background:"rgba(255,255,255,0.022)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"20px" }}>
                <h2 style={{ fontSize:"clamp(15px,2.5vw,18px)", fontWeight:800, letterSpacing:"-0.3px", marginBottom:"14px" }}>
                  {activeStage.title}
                </h2>
                <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.35)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Stage status</div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {(["not_started","in_progress","complete"] as StageStatus[]).map(s => {
                    const cfg = STAGE_STATUS[s];
                    const isSel = activeStage.status === s;
                    return (
                      <button key={s} className="status-pill" onClick={() => updateStageStatus(activeStage.id, s)} style={{
                        background:isSel?cfg.bg:"rgba(255,255,255,0.04)",
                        border:`1px solid ${isSel?cfg.border:"rgba(255,255,255,0.07)"}`,
                        color:isSel?cfg.color:"rgba(255,255,255,0.3)",
                      }}>
                        {isSel && <span style={{ marginRight:"4px" }}>●</span>}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div style={{ background:"rgba(255,255,255,0.022)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                  <span style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                    Client notes
                  </span>
                  <button onClick={saveNote} disabled={savingNote} style={{
                    padding:"4px 12px", borderRadius:"7px",
                    border:"1px solid rgba(91,76,245,0.3)",
                    background:noteSaved?"rgba(11,171,108,0.12)":savingNote?"transparent":"rgba(91,76,245,0.1)",
                    color:noteSaved?"#0BAB6C":savingNote?"rgba(255,255,255,0.25)":"#a093ff",
                    fontFamily:"'Outfit',sans-serif", fontSize:"11px", fontWeight:700,
                    cursor:savingNote?"not-allowed":"pointer", transition:"all 0.2s",
                  }}>
                    {noteSaved ? "✓ Saved" : savingNote ? "Saving…" : "Save"}
                  </button>
                </div>
                <textarea className="note-area" value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Add context for your client — what to review, what feedback you need…" />
              </div>

              {/* Request approval */}
              <button className={`approval-btn${approvalSent?" sent":""}`} onClick={requestApproval}>
                {approvalSent
                  ? <><span>✓</span> Approval requested!</>
                  : <><span style={{ fontSize:"16px" }}>→</span> Request client approval</>
                }
              </button>

            </div>

            {/* ── RIGHT: Files ── */}
            <div style={{ background:"rgba(255,255,255,0.022)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px", padding:"20px" }}>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                <span style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                  Files
                  {activeStageFiles.length>0 && (
                    <span style={{ marginLeft:"6px", fontWeight:400, color:"rgba(255,255,255,0.25)", textTransform:"none", letterSpacing:0, fontSize:"12px" }}>
                      · {activeStageFiles.length}
                    </span>
                  )}
                </span>
              </div>

              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" multiple style={{ display:"none" }}
                onChange={e => handleUpload(e.target.files)} />

              {/* Upload zone */}
              <div className={`upload-zone${dragOver?" drag":""}`}
                style={{ marginBottom: activeStageFiles.length>0?"14px":"0" }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}>
                {uploading ? (
                  <>
                    <div style={{ width:"22px", height:"22px", border:"2px solid rgba(91,76,245,0.3)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                    <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)" }}>Uploading…</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:"24px", opacity:0.3 }}>⬆</div>
                    <span style={{ fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.45)" }}>Drop files or click to upload</span>
                    <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.2)" }}>Images · PDFs · Figma · ZIPs</span>
                  </>
                )}
              </div>

              {/* File list */}
              {activeStageFiles.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {activeStageFiles.map(file => (
                    <div key={file.id} className="file-row">
                      <div style={{
                        width:"34px", height:"34px", borderRadius:"8px", flexShrink:0,
                        background:"rgba(91,76,245,0.1)", border:"1px solid rgba(91,76,245,0.18)",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px",
                      }}>{fileIcon(file.name)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"rgba(255,255,255,0.88)" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.25)", marginTop:"2px" }}>
                          {file.file_size ? formatBytes(file.file_size) : ""} · {timeAgo(file.created_at)}
                        </div>
                      </div>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{
                        padding:"5px 10px", borderRadius:"7px",
                        border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.04)",
                        color:"rgba(255,255,255,0.5)", fontSize:"12px", fontWeight:600,
                        textDecoration:"none", whiteSpace:"nowrap", fontFamily:"'Outfit',sans-serif",
                      }}>View →</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* No stages */}
        {stages.length === 0 && !loading && (
          <div className="fi fi3" style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.09)", borderRadius:"16px", padding:"48px", textAlign:"center", color:"rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize:"28px", marginBottom:"10px", opacity:0.4 }}>◷</div>
            <div style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.45)", marginBottom:"4px" }}>No stages yet</div>
            <div style={{ fontSize:"13px" }}>Create a new project to add stages.</div>
          </div>
        )}

      </main>
    </div>
  );
}