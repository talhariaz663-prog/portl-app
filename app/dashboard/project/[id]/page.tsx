"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StageStatus = "not_started" | "in_progress" | "complete";
type ProjectStatus = "draft" | "active" | "review" | "approved";

interface Stage {
  id: string;
  project_id: string;
  name: string;
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
  not_started: { label: "Not Started", color: "#6b7280",  bg: "rgba(107,114,128,0.15)", border: "rgba(107,114,128,0.3)"  },
  in_progress: { label: "In Progress", color: "#F5A623",  bg: "rgba(245,166,35,0.15)",  border: "rgba(245,166,35,0.4)"   },
  complete:    { label: "Complete",    color: "#0BAB6C",  bg: "rgba(11,171,108,0.15)",  border: "rgba(11,171,108,0.4)"   },
};

const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:    { label: "Draft",     color: "#6b7280",  bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.25)" },
  active:   { label: "Active",    color: "#0BAB6C",  bg: "rgba(11,171,108,0.12)",  border: "rgba(11,171,108,0.3)"   },
  review:   { label: "In Review", color: "#F5A623",  bg: "rgba(245,166,35,0.12)",  border: "rgba(245,166,35,0.3)"   },
  approved: { label: "Approved",  color: "#5B4CF5",  bg: "rgba(91,76,245,0.12)",   border: "rgba(91,76,245,0.3)"    },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), dy = Math.floor(diff/86400000);
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
  const router   = useRouter();
  const params   = useParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectId = params?.id as string;

  const [project,        setProject]        = useState<Project | null>(null);
  const [stages,         setStages]         = useState<Stage[]>([]);
  const [files,          setFiles]          = useState<ProjectFile[]>([]);
  const [activeStageId,  setActiveStageId]  = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [dragOver,       setDragOver]       = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [savingNote,     setSavingNote]     = useState(false);
  const [noteText,       setNoteText]       = useState("");
  const [approvalSent,   setApprovalSent]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data: proj, error: pe } = await supabase
      .from("projects")
      .select("id, name, client_name, client_email, portal_slug, status")
      .eq("id", projectId).single();
    if (pe || !proj) { setError("Project not found."); setLoading(false); return; }
    setProject(proj as Project);

    const { data: sd } = await supabase
      .from("stages").select("*")
      .eq("project_id", projectId).order("position", { ascending: true });
    const sl = (sd as Stage[]) ?? [];
    setStages(sl);
    if (sl.length > 0) { setActiveStageId(sl[0].id); setNoteText(sl[0].notes ?? ""); }

    const { data: fd } = await supabase
      .from("files").select("*")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setFiles((fd as ProjectFile[]) ?? []);
    setLoading(false);
  }, [supabase, router, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // sync note text when switching tabs
  useEffect(() => {
    const s = stages.find(s => s.id === activeStageId);
    setNoteText(s?.notes ?? "");
  }, [activeStageId, stages]);

  const updateStageStatus = async (stageId: string, status: StageStatus) => {
    await supabase.from("stages").update({ status }).eq("id", stageId);
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, status } : s));
  };

  const updateProjectStatus = async (status: ProjectStatus) => {
    await supabase.from("projects").update({ status }).eq("id", projectId);
    setProject(prev => prev ? { ...prev, status } : prev);
  };

  const saveNote = async () => {
    if (!activeStageId) return;
    setSavingNote(true);
    await supabase.from("stages").update({ notes: noteText }).eq("id", activeStageId);
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, notes: noteText } : s));
    setSavingNote(false);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !activeStageId || !project) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const path = `${project.id}/${activeStageId}/${Date.now()}-${file.name}`;
      const { error: ue } = await supabase.storage.from("project-files").upload(path, file);
      if (ue) { setError(ue.message); continue; }
      const { data: ud } = supabase.storage.from("project-files").getPublicUrl(path);
      await supabase.from("files").insert({
        project_id: project.id, stage_id: activeStageId,
        name: file.name, file_url: ud.publicUrl, file_size: file.size,
      });
    }
    setUploading(false); fetchData();
  };

  const requestApproval = async () => {
    if (!activeStageId || !project) return;
    // Mark stage as in review + update project status
    await updateStageStatus(activeStageId, "in_progress");
    await updateProjectStatus("review");
    setApprovalSent(activeStageId);
    setTimeout(() => setApprovalSent(null), 3000);
    // TODO: wire up Resend email to client here
  };

  const copyPortalLink = () => {
    if (!project) return;
    navigator.clipboard.writeText(`${window.location.origin}/portal/${project.portal_slug}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const activeStage      = stages.find(s => s.id === activeStageId);
  const activeStageFiles = files.filter(f => f.stage_id === activeStageId);
  const completeCount    = stages.filter(s => s.status === "complete").length;
  const progressPct      = stages.length > 0 ? Math.round((completeCount / stages.length) * 100) : 0;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#080a18", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"32px", height:"32px", border:"2px solid rgba(255,255,255,0.1)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  const ps = project ? PROJECT_STATUS[project.status] : null;

  return (
    <div style={{ minHeight:"100vh", background:"#080a18", fontFamily:"'Outfit', sans-serif", color:"#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fi { animation:fadeUp 0.4s ease forwards; opacity:0; }
        .fi1{animation-delay:0.05s} .fi2{animation-delay:0.12s} .fi3{animation-delay:0.20s} .fi4{animation-delay:0.28s}

        .stage-tab {
          display:flex; align-items:center; gap:8px;
          padding:10px 16px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.07);
          background:rgba(255,255,255,0.03);
          cursor:pointer; white-space:nowrap;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:500;
          color:rgba(255,255,255,0.45); transition:all 0.18s ease;
          position:relative;
        }
        .stage-tab:hover { color:rgba(255,255,255,0.85); border-color:rgba(255,255,255,0.15); background:rgba(255,255,255,0.05); }
        .stage-tab.active { background:rgba(91,76,245,0.18); border-color:rgba(91,76,245,0.5); color:#fff; font-weight:700; }

        .pill-btn {
          padding:7px 14px; border-radius:20px; cursor:pointer;
          font-family:'Outfit',sans-serif; font-size:12px; font-weight:600;
          transition:all 0.15s ease; white-space:nowrap;
        }

        .upload-zone {
          border:1.5px dashed rgba(91,76,245,0.3); border-radius:14px;
          padding:32px 20px; display:flex; flex-direction:column;
          align-items:center; gap:10px; cursor:pointer;
          transition:all 0.2s ease; background:rgba(91,76,245,0.03); text-align:center;
        }
        .upload-zone:hover,.upload-zone.drag { border-color:rgba(91,76,245,0.65); background:rgba(91,76,245,0.08); }

        .file-row {
          display:flex; align-items:center; gap:12px;
          padding:12px 16px; border-radius:10px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          transition:all 0.15s;
        }
        .file-row:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.12); }

        .share-btn {
          display:flex; align-items:center; gap:8px;
          padding:10px 18px; border-radius:10px;
          border:1px solid rgba(91,76,245,0.35);
          background:rgba(91,76,245,0.1);
          color:#a093ff; font-family:'Outfit',sans-serif;
          font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; white-space:nowrap;
        }
        .share-btn:hover { background:rgba(91,76,245,0.2); color:#fff; border-color:rgba(91,76,245,0.6); }
        .share-btn.copied { border-color:rgba(11,171,108,0.5); background:rgba(11,171,108,0.12); color:#0BAB6C; }

        .note-area {
          width:100%; min-height:100px; padding:14px 16px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09);
          border-radius:12px; color:#fff; font-family:'Outfit',sans-serif;
          font-size:14px; line-height:1.6; resize:vertical; outline:none;
          transition:border-color 0.2s;
        }
        .note-area::placeholder { color:rgba(255,255,255,0.2); }
        .note-area:focus { border-color:rgba(91,76,245,0.5); background:rgba(91,76,245,0.05); }

        .approval-btn {
          display:flex; align-items:center; gap:8px;
          padding:11px 20px; border-radius:10px; border:none; cursor:pointer;
          font-family:'Outfit',sans-serif; font-size:13px; font-weight:700;
          background:linear-gradient(135deg,#5B4CF5,#0BAB6C);
          color:#fff; transition:opacity 0.2s, transform 0.15s;
        }
        .approval-btn:hover { opacity:0.88; transform:translateY(-1px); }
        .approval-btn.sent { background:rgba(11,171,108,0.2); border:1px solid rgba(11,171,108,0.4); color:#0BAB6C; }

        .nav-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:10px; font-size:14px;
          cursor:pointer; transition:all 0.15s; border:1px solid transparent;
        }
        .nav-item.active { background:rgba(91,76,245,0.15); border-color:rgba(91,76,245,0.3); color:#fff; font-weight:600; }
        .nav-item:not(.active) { color:rgba(255,255,255,0.4); }
        .nav-item:not(.active):hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.04); }

        .proj-status-pill {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 12px; border-radius:20px;
          font-size:12px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.06em;
          cursor:pointer; transition:all 0.15s;
        }
        .proj-status-pill:hover { opacity:0.8; }
      `}</style>

      {/* BG grid */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`
          linear-gradient(rgba(91,76,245,0.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(91,76,245,0.04) 1px,transparent 1px),
          radial-gradient(ellipse 50% 40% at 95% 0%,rgba(91,76,245,0.07) 0%,transparent 70%),
          radial-gradient(ellipse 40% 30% at 5% 100%,rgba(11,171,108,0.06) 0%,transparent 70%)
        `,
        backgroundSize:"40px 40px,40px 40px,100% 100%,100% 100%",
      }} />

      {/* Sidebar */}
      <aside style={{
        position:"fixed", top:0, left:0, bottom:0, width:"220px",
        background:"rgba(8,10,24,0.96)", borderRight:"1px solid rgba(255,255,255,0.06)",
        backdropFilter:"blur(20px)", display:"flex", flexDirection:"column",
        padding:"28px 16px", zIndex:10,
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
            <div key={label} className={`nav-item${active?" active":""}`}
              onClick={() => path && router.push(path)}>
              <span style={{ fontSize:"16px" }}>{icon}</span> {label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ marginLeft:"220px", padding:"36px 40px", position:"relative", zIndex:1, minHeight:"100vh" }}>

        {/* Back */}
        <button className="fi fi1" onClick={() => router.push("/dashboard")} style={{
          background:"none", border:"none", color:"rgba(255,255,255,0.35)",
          fontFamily:"'Outfit',sans-serif", fontSize:"13px", cursor:"pointer",
          display:"flex", alignItems:"center", gap:"6px", marginBottom:"24px", padding:0,
          transition:"color 0.15s",
        }}>← Back to Studio</button>

        {/* ── Header card ── */}
        <div className="fi fi1" style={{
          background:"rgba(255,255,255,0.025)",
          border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:"20px", padding:"28px 32px",
          marginBottom:"28px",
          backdropFilter:"blur(12px)",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"20px", marginBottom:"24px" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <h1 style={{ fontSize:"28px", fontWeight:800, letterSpacing:"-0.5px", marginBottom:"8px" }}>
                {project?.name}
              </h1>
              <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.55)", fontWeight:500 }}>
                  {project?.client_name}
                </span>
                {project?.client_email && (
                  <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.25)" }}>
                    {project.client_email}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:"12px", flexShrink:0 }}>
              {/* Project status card */}
              {ps && project && (
                <div style={{
                  background: ps.bg,
                  border:`1px solid ${ps.border}`,
                  borderRadius:"12px", padding:"12px 18px",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:"4px",
                  minWidth:"110px",
                }}>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Project
                  </div>
                  {/* Cycle through statuses on click */}
                  <div
                    className="proj-status-pill"
                    style={{ background:"transparent", color: ps.color }}
                    onClick={() => {
                      const order: ProjectStatus[] = ["draft","active","review","approved"];
                      const next = order[(order.indexOf(project.status)+1)%order.length];
                      updateProjectStatus(next);
                    }}
                    title="Click to change status"
                  >
                    <span style={{ width:"7px", height:"7px", borderRadius:"50%", background: ps.color, flexShrink:0 }} />
                    {ps.label}
                  </div>
                  <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>click to change</div>
                </div>
              )}
              <button className={`share-btn${copied?" copied":""}`} onClick={copyPortalLink}>
                <span>{copied?"✓":"⬡"}</span>
                {copied?"Copied!":"Share portal"}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
              <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", fontWeight:600 }}>
                PROJECT PROGRESS
              </span>
              <span style={{ fontSize:"13px", fontWeight:700, color: progressPct===100?"#0BAB6C":"rgba(255,255,255,0.6)" }}>
                {completeCount} / {stages.length} stages complete · {progressPct}%
              </span>
            </div>
            <div style={{ height:"6px", background:"rgba(255,255,255,0.07)", borderRadius:"99px", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:"99px",
                width:`${progressPct}%`,
                background: progressPct===100
                  ? "linear-gradient(90deg,#0BAB6C,#5B4CF5)"
                  : "linear-gradient(90deg,#5B4CF5,#7B6CF9)",
                transition:"width 0.6s ease",
              }} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:"rgba(232,93,117,0.1)", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"10px", padding:"14px 18px", marginBottom:"24px", fontSize:"14px", color:"#E85D75" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Stage tabs ── */}
        {stages.length > 0 && (
          <div className="fi fi2" style={{ display:"flex", alignItems:"center", gap:"0", overflowX:"auto", paddingBottom:"4px", marginBottom:"24px" }}>
            {stages.map((stage, i) => {
              const st = STAGE_STATUS[stage.status];
              const isActive = activeStageId === stage.id;
              const stageFileCount = files.filter(f => f.stage_id === stage.id).length;
              return (
                <div key={stage.id} style={{ display:"flex", alignItems:"center" }}>
                  <button className={`stage-tab${isActive?" active":""}`} onClick={() => setActiveStageId(stage.id)}>
                    {/* Step circle */}
                    <span style={{
                      width:"22px", height:"22px", borderRadius:"50%", flexShrink:0,
                      background: stage.status==="complete" ? "#0BAB6C" : isActive ? "#5B4CF5" : "rgba(255,255,255,0.08)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"11px", fontWeight:700,
                      color: stage.status==="complete"||isActive ? "#fff" : "rgba(255,255,255,0.4)",
                    }}>
                      {stage.status==="complete" ? "✓" : i+1}
                    </span>

                    {/* Stage name */}
                    <span>{stage.name}</span>

                    {/* Status dot */}
                    <span style={{ width:"6px", height:"6px", borderRadius:"50%", background: st.color, flexShrink:0 }} />

                    {/* File count badge */}
                    {stageFileCount > 0 && (
                      <span style={{
                        background:"rgba(91,76,245,0.25)", color:"#a093ff",
                        fontSize:"10px", fontWeight:700, borderRadius:"10px",
                        padding:"1px 7px", marginLeft:"2px",
                      }}>
                        {stageFileCount}
                      </span>
                    )}
                  </button>

                  {i < stages.length-1 && (
                    <div style={{ width:"20px", height:"1px", background:"rgba(255,255,255,0.08)", flexShrink:0 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No stages */}
        {stages.length === 0 && !loading && (
          <div className="fi fi2" style={{
            background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)",
            borderRadius:"16px", padding:"48px", textAlign:"center", color:"rgba(255,255,255,0.3)", marginBottom:"24px",
          }}>
            <div style={{ fontSize:"32px", marginBottom:"12px" }}>◷</div>
            <div style={{ fontSize:"16px", fontWeight:600, color:"rgba(255,255,255,0.5)", marginBottom:"6px" }}>No stages yet</div>
            <div style={{ fontSize:"13px" }}>Stages are created when you set up a new project.</div>
          </div>
        )}

        {/* ── Active stage panel ── */}
        {activeStage && (
          <div className="fi fi3" style={{
            background:"rgba(255,255,255,0.022)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"20px", padding:"32px",
            backdropFilter:"blur(12px)",
          }}>

            {/* Stage header + inline status pills */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"20px", marginBottom:"24px", flexWrap:"wrap" }}>
              <div>
                <h2 style={{ fontSize:"20px", fontWeight:800, marginBottom:"10px", letterSpacing:"-0.3px" }}>
                  {activeStage.name}
                </h2>

                {/* Segmented pill status buttons */}
                <div style={{ display:"flex", gap:"6px" }}>
                  {(["not_started","in_progress","complete"] as StageStatus[]).map((s) => {
                    const cfg = STAGE_STATUS[s];
                    const isSelected = activeStage.status === s;
                    return (
                      <button
                        key={s}
                        className="pill-btn"
                        onClick={() => updateStageStatus(activeStage.id, s)}
                        style={{
                          background: isSelected ? cfg.bg : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isSelected ? cfg.border : "rgba(255,255,255,0.08)"}`,
                          color: isSelected ? cfg.color : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {isSelected && <span style={{ marginRight:"4px" }}>●</span>}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Approval button */}
              <button
                className={`approval-btn${approvalSent===activeStage.id?" sent":""}`}
                onClick={requestApproval}
              >
                {approvalSent===activeStage.id ? (
                  <><span>✓</span> Approval requested!</>
                ) : (
                  <><span>⬡</span> Request client approval</>
                )}
              </button>
            </div>

            {/* Divider */}
            <div style={{ height:"1px", background:"rgba(255,255,255,0.06)", marginBottom:"28px" }} />

            {/* Notes section */}
            <div style={{ marginBottom:"32px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                <h3 style={{ fontSize:"14px", fontWeight:700, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  Stage Notes
                </h3>
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  style={{
                    padding:"5px 14px", borderRadius:"7px",
                    border:"1px solid rgba(91,76,245,0.3)",
                    background: savingNote ? "rgba(91,76,245,0.05)" : "rgba(91,76,245,0.12)",
                    color: savingNote ? "rgba(255,255,255,0.3)" : "#a093ff",
                    fontFamily:"'Outfit',sans-serif", fontSize:"12px", fontWeight:600,
                    cursor: savingNote ? "not-allowed" : "pointer", transition:"all 0.15s",
                  }}
                >
                  {savingNote ? "Saving…" : "Save note"}
                </button>
              </div>
              <textarea
                className="note-area"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add context for your client — what's included, what to look for, what feedback you need…"
              />
            </div>

            {/* Divider */}
            <div style={{ height:"1px", background:"rgba(255,255,255,0.06)", marginBottom:"28px" }} />

            {/* Files section */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                <h3 style={{ fontSize:"14px", fontWeight:700, color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  Files
                  {activeStageFiles.length > 0 && (
                    <span style={{ marginLeft:"8px", fontSize:"12px", color:"rgba(255,255,255,0.3)", fontWeight:400, textTransform:"none", letterSpacing:0 }}>
                      {activeStageFiles.length} file{activeStageFiles.length!==1?"s":""}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding:"6px 14px", borderRadius:"8px",
                    border:"1px solid rgba(255,255,255,0.1)",
                    background:"rgba(255,255,255,0.04)",
                    color:"rgba(255,255,255,0.6)", fontFamily:"'Outfit',sans-serif",
                    fontSize:"12px", fontWeight:600, cursor:"pointer", transition:"all 0.15s",
                  }}
                >+ Upload</button>
              </div>

              <input ref={fileInputRef} type="file" multiple style={{ display:"none" }}
                onChange={(e) => handleUpload(e.target.files)} />

              {/* Drop zone */}
              <div
                className={`upload-zone${dragOver?" drag":""}`}
                style={{ marginBottom: activeStageFiles.length>0 ? "14px" : "0" }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
              >
                {uploading ? (
                  <>
                    <div style={{ width:"24px", height:"24px", border:"2px solid rgba(255,255,255,0.1)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                    <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)" }}>Uploading…</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:"26px", opacity:0.35 }}>⬡</div>
                    <span style={{ fontSize:"14px", fontWeight:600, color:"rgba(255,255,255,0.5)" }}>Drop files here or click to upload</span>
                    <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.25)" }}>Any file type · Images, PDFs, Figma exports, ZIPs</span>
                  </>
                )}
              </div>

              {/* File list */}
              {activeStageFiles.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {activeStageFiles.map((file) => (
                    <div key={file.id} className="file-row">
                      <div style={{
                        width:"38px", height:"38px", borderRadius:"9px",
                        background:"rgba(91,76,245,0.1)", border:"1px solid rgba(91,76,245,0.18)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"16px", flexShrink:0,
                      }}>{fileIcon(file.name)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"rgba(255,255,255,0.9)" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.28)", marginTop:"2px" }}>
                          {file.file_size ? formatBytes(file.file_size) : ""} · {timeAgo(file.created_at)}
                        </div>
                      </div>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{
                        padding:"6px 14px", borderRadius:"7px",
                        border:"1px solid rgba(255,255,255,0.09)",
                        background:"rgba(255,255,255,0.04)",
                        color:"rgba(255,255,255,0.55)", fontSize:"12px", fontWeight:600,
                        textDecoration:"none", transition:"all 0.15s", whiteSpace:"nowrap",
                        fontFamily:"'Outfit',sans-serif",
                      }}>View →</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}