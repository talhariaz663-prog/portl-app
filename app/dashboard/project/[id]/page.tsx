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

interface ActivityItem {
  id: string;
  project_id: string;
  stage_id: string | null;
  type: string;
  message: string | null;
  created_at: string;
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
function isImage(name: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
}

export default function ProjectDetailPage() {
  const router       = useRouter();
  const params       = useParams();
  const supabase     = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectId    = params?.id as string;

  const [project,          setProject]          = useState<Project | null>(null);
  const [stages,           setStages]           = useState<Stage[]>([]);
  const [files,            setFiles]            = useState<ProjectFile[]>([]);
  const [activity,         setActivity]         = useState<ActivityItem[]>([]);
  const [activeStageId,    setActiveStageId]    = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [uploading,        setUploading]        = useState(false);
  const [dragOver,         setDragOver]         = useState(false);
  const [copied,           setCopied]           = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [savingNote,       setSavingNote]       = useState(false);
  const [noteSaved,        setNoteSaved]        = useState(false);
  const [noteText,         setNoteText]         = useState("");
  const [approvalSent,     setApprovalSent]     = useState(false);
  const [showDeleteConfirm,setShowDeleteConfirm]= useState(false);
  const [deleting,         setDeleting]         = useState(false);
  const [historyExpanded,  setHistoryExpanded]  = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
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
    if (!silent && sl.length > 0) { setActiveStageId(sl[0].id); setNoteText(sl[0].notes ?? ""); }

    const { data: fd } = await supabase
      .from("files").select("id, stage_id, name, file_url, file_size, created_at, project_id")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setFiles((fd as unknown as ProjectFile[]) ?? []);

    const { data: ad } = await supabase
      .from("activity").select("id, project_id, stage_id, type, message, created_at")
      .eq("project_id", projectId).order("created_at", { ascending: false });
    setActivity((ad as ActivityItem[]) ?? []);

    if (!silent) setLoading(false);
  }, [supabase, router, projectId]);

  useEffect(() => { fetchData(false); }, [fetchData]);

  useEffect(() => {
    const s = stages.find(s => s.id === activeStageId);
    if (s) { setNoteText(s.notes ?? ""); setNoteSaved(false); setHistoryExpanded(false); }
  }, [activeStageId, stages]);

  const logActivity = async (type: string, message?: string) => {
    await supabase.from("activity").insert({
      project_id: projectId,
      stage_id: activeStageId,
      type,
      message: message ?? null,
    });
  };

  const updateStageStatus = async (stageId: string, status: StageStatus) => {
    const { error } = await supabase.from("stages").update({ status }).eq("id", stageId);
    if (error) { setError(`Status update failed: ${error.message}`); return; }
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, status } : s));
  };

  const cycleProjectStatus = async () => {
    if (!project) return;
    const next = PROJECT_STATUS[project.status].next;
    const { error } = await supabase.from("projects").update({ status: next }).eq("id", projectId);
    if (error) { setError(`Status update failed: ${error.message}`); return; }
    setProject(prev => prev ? { ...prev, status: next } : prev);
  };

  const saveNote = async () => {
    if (!activeStageId) return;
    setSavingNote(true); setNoteSaved(false);
    const { data, error } = await supabase.from("stages").update({ notes: noteText }).eq("id", activeStageId).select("id, notes").single();
    if (error || !data) { setError(`Note save failed: ${error?.message ?? "Check RLS policies."}`); setSavingNote(false); return; }
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, notes: noteText } : s));
    setSavingNote(false); setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !activeStageId || !project) return;
    setUploading(true); setError(null);
    for (const file of Array.from(fileList)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${project.id}/${activeStageId}/${Date.now()}_${safeName}`;
      const { error: storageErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
      if (storageErr) { setError(`Storage upload failed: ${storageErr.message}`); continue; }
      const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
      const { data: insertedFile, error: dbErr } = await supabase.from("files").insert({
        project_id: project.id, stage_id: activeStageId,
        name: file.name, file_url: urlData.publicUrl, file_size: file.size,
      }).select("id, stage_id, name, file_url, file_size, created_at").single();
      if (dbErr || !insertedFile) { setError(`File record failed: ${dbErr?.message ?? "Check RLS policies."}`); continue; }
      setFiles(prev => [insertedFile as ProjectFile, ...prev]);
      await logActivity("file_uploaded", file.name);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    // Refresh activity
    const { data: ad } = await supabase.from("activity").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    setActivity((ad as ActivityItem[]) ?? []);
  };

  const requestApproval = async () => {
    if (!activeStageId || !project) return;
    await updateStageStatus(activeStageId, "in_progress");
    const { error } = await supabase.from("projects").update({ status: "review" }).eq("id", projectId);
    if (!error) setProject(prev => prev ? { ...prev, status: "review" } : prev);
    await logActivity("approval_requested");
    const { data: ad } = await supabase.from("activity").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
    setActivity((ad as ActivityItem[]) ?? []);
    setApprovalSent(true);
    setTimeout(() => setApprovalSent(false), 3000);
  };

  const deleteProject = async () => {
    setDeleting(true);
    for (const file of files) {
      const path = file.file_url.split("/project-files/")[1];
      if (path) await supabase.storage.from("project-files").remove([path]);
    }
    await supabase.from("activity").delete().eq("project_id", projectId);
    await supabase.from("files").delete().eq("project_id", projectId);
    await supabase.from("stages").delete().eq("project_id", projectId);
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) { setError(`Delete failed: ${error.message}`); setDeleting(false); return; }
    router.replace("/dashboard");
  };

  const copyPortalLink = () => {
    if (!project) return;
    navigator.clipboard.writeText(`${window.location.origin}/portal/${project.portal_slug}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const activeStage      = stages.find(s => s.id === activeStageId);
  const activeStageFiles = files.filter(f => f.stage_id === activeStageId);
  const stageActivity    = activity.filter(a => a.stage_id === activeStageId);
  const feedbackItems    = stageActivity.filter(a => a.type === "changes_requested" || a.type === "approved");
  const latestFeedback   = feedbackItems[0] ?? null;
  const prevFeedback     = feedbackItems.slice(1);
  const completeCount    = stages.filter(s => s.status === "complete").length;
  const progressPct      = stages.length > 0 ? Math.round((completeCount / stages.length) * 100) : 0;
  const ps               = project ? PROJECT_STATUS[project.status] : null;

  // Files uploaded around the time of each feedback (within 30 mins before)
  const filesForFeedback = (item: ActivityItem) => {
    const t = new Date(item.created_at).getTime();
    return activeStageFiles.filter(f => {
      const ft = new Date(f.created_at).getTime();
      return ft <= t && ft >= t - 30 * 60 * 1000;
    });
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"32px", height:"32px", border:"2px solid rgba(0,0,0,0.08)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif", color:"#12111A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .fi{animation:fadeUp 0.35s ease forwards;opacity:0}
        .fi1{animation-delay:0.04s}.fi2{animation-delay:0.10s}.fi3{animation-delay:0.16s}.fi4{animation-delay:0.22s}

        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:14px;cursor:pointer;transition:all 0.15s;border:1px solid transparent;color:rgba(255,255,255,0.6);}
        .nav-item.active{background:rgba(91,76,245,0.2);border-color:rgba(91,76,245,0.35);color:#ffffff;font-weight:600;}
        .nav-item:not(.active):hover{color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.06);}

        .stage-tab{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;cursor:pointer;border:1px solid #E4E4E8;background:#FFFFFF;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;color:#8A8A9A;white-space:nowrap;transition:all 0.18s ease;}
        .stage-tab:hover{color:#4A4A5A;border-color:#D0D0D8;background:#F9F9FB;}
        .stage-tab.active{background:rgba(91,76,245,0.16);border-color:rgba(91,76,245,0.5);color:#fff;font-weight:700;}

        .status-pill{padding:5px 12px;border-radius:20px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;transition:all 0.15s;border:1px solid transparent;white-space:nowrap;}

        .upload-zone{border:1.5px dashed rgba(91,76,245,0.28);border-radius:12px;padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;text-align:center;transition:all 0.2s ease;background:rgba(91,76,245,0.03);}
        .upload-zone:hover,.upload-zone.drag{border-color:rgba(91,76,245,0.6);background:rgba(91,76,245,0.08);}

        .file-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:#F9F9FB;border:1px solid #E4E4E8;transition:all 0.15s;}
        .file-row:hover{background:#F0F0F5;border-color:#D0D0D8;}

        .share-btn{display:flex;align-items:center;gap:6px;padding:9px 16px;border-radius:10px;border:1px solid rgba(91,76,245,0.3);background:rgba(91,76,245,0.1);color:#a093ff;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .share-btn:hover{background:rgba(91,76,245,0.2);color:#fff;}
        .share-btn.copied{border-color:rgba(11,171,108,0.4);background:rgba(11,171,108,0.1);color:#0BAB6C;}

        .note-area{width:100%;min-height:80px;padding:12px 14px;background:#FFFFFF;border:1px solid #E4E4E8;border-radius:10px;color:#12111A;font-family:'Outfit',sans-serif;font-size:14px;line-height:1.6;resize:vertical;outline:none;transition:border-color 0.2s;}
        .note-area::placeholder{color:#B0B0BC;}
        .note-area:focus{border-color:#5B4CF5;background:rgba(91,76,245,0.04);box-shadow:0 0 0 3px rgba(91,76,245,0.1);}

        .approval-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:10px;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;background:linear-gradient(135deg,#5B4CF5,#0BAB6C);color:#fff;transition:opacity 0.2s,transform 0.15s;}
        .approval-btn:hover{opacity:0.88;transform:translateY(-1px);}
        .approval-btn.sent{background:rgba(11,171,108,0.15);border:1px solid rgba(11,171,108,0.35);color:#0BAB6C;transform:none;}

        .delete-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;background:rgba(232,93,117,0.07);border:1px solid rgba(232,93,117,0.2);color:rgba(232,93,117,0.6);transition:all 0.15s;}
        .delete-btn:hover{background:rgba(232,93,117,0.12);border-color:rgba(232,93,117,0.4);color:#E85D75;}

        .history-toggle{background:none;border:none;color:#8A8A9A;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:6px 0;display:flex;align-items:center;gap:6px;transition:color 0.15s;}
        .history-toggle:hover{color:#4A4A5A;}

        .sidebar{display:flex;}.topbar{display:none;}.main-content{margin-left:220px;padding:36px 40px;}
        .stage-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:20px;align-items:start;}

        @media(max-width:900px){.stage-grid{grid-template-columns:1fr!important;}}
        @media(max-width:768px){
          .sidebar{display:none!important;}.topbar{display:flex!important;}
          .main-content{margin-left:0!important;padding:76px 16px 40px!important;}
          .header-row{flex-direction:column!important;gap:14px!important;}
          #desktop-back{display:none!important;}
        }
        .tabs-row{scrollbar-width:none;}.tabs-row::-webkit-scrollbar{display:none;}
        .modal-overlay{position:fixed;inset:0;background:rgba(8,10,24,0.85);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center;padding:24px;}
      `}</style>

      {/* Delete modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#0d0f1e", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"20px", padding:"32px", maxWidth:"380px", width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize:"32px", marginBottom:"16px" }}>🗑️</div>
            <h2 style={{ fontSize:"20px", fontWeight:800, marginBottom:"8px" }}>Delete project?</h2>
            <p style={{ fontSize:"14px", color:"rgba(255,255,255,0.45)", lineHeight:1.6, marginBottom:"24px" }}>
              This will permanently delete <strong style={{ color:"#fff" }}>{project?.name}</strong>, all stages, files and activity. This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex:1, padding:"12px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.6)", fontFamily:"'Outfit',sans-serif", fontSize:"14px", fontWeight:600, cursor:"pointer" }}>Cancel</button>
              <button onClick={deleteProject} disabled={deleting} style={{ flex:1, padding:"12px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#E85D75,#c0392b)", color:"#fff", fontFamily:"'Outfit',sans-serif", fontSize:"14px", fontWeight:700, cursor:deleting?"not-allowed":"pointer", opacity:deleting?0.6:1 }}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", backgroundImage:"radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize:"40px 40px" }} />

      {/* Sidebar */}
      <aside className="sidebar" style={{ position:"fixed", top:0, left:0, bottom:0, width:"220px", background:"#0c0e1a", borderRight:"1px solid rgba(255,255,255,0.06)", flexDirection:"column", padding:"28px 16px", zIndex:10 }}>
        <div style={{ marginBottom:"40px", paddingLeft:"8px" }}>
          <span style={{ fontSize:"22px", fontWeight:800, letterSpacing:"-0.5px", color:"#ffffff" }}>Portl<span style={{ color:"#5B4CF5", fontSize:"26px" }}>.</span></span>
        </div>
        <nav style={{ display:"flex", flexDirection:"column", gap:"4px", flex:1 }}>
          {[{ icon:"⬡", label:"Studio", active:false, path:"/dashboard" },{ icon:"◷", label:"Timeline", active:true, path:"" },{ icon:"⬚", label:"Files", active:false, path:"" },{ icon:"✓", label:"Approvals", active:false, path:"" }].map(({ icon, label, active, path }) => (
            <div key={label} className={`nav-item${active?" active":""}`} onClick={() => path && router.push(path)}>
              <span style={{ fontSize:"16px" }}>{icon}</span>{label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile topbar */}
      <header className="topbar" style={{ position:"fixed", top:0, left:0, right:0, height:"60px", zIndex:40, background:"rgba(255,255,255,0.97)", borderBottom:"1px solid #E4E4E8", backdropFilter:"blur(20px)", alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <button onClick={() => router.push("/dashboard")} style={{ background:"#F5F6FA", border:"1px solid #E4E4E8", borderRadius:"8px", width:"36px", height:"36px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#4A4A5A", fontSize:"16px" }}>←</button>
        <span style={{ fontSize:"18px", fontWeight:800, letterSpacing:"-0.5px" }}>Portl<span style={{ color:"#5B4CF5", fontSize:"22px" }}>.</span></span>
        <button className={`share-btn${copied?" copied":""}`} onClick={copyPortalLink} style={{ padding:"8px 12px", fontSize:"12px" }}>{copied?"✓ Copied":"⬡ Share"}</button>
      </header>

      <main className="main-content" style={{ position:"relative", zIndex:1 }}>
        <button id="desktop-back" className="fi fi1" onClick={() => router.push("/dashboard")} style={{ background:"none", border:"none", color:"#8A8A9A", fontFamily:"'Outfit',sans-serif", fontSize:"13px", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", marginBottom:"20px", padding:0 }}>← Back to Studio</button>

        {/* Header */}
        <div className="fi fi1" style={{ background:"#FFFFFF", border:"1px solid #E4E4E8", borderRadius:"18px", padding:"22px 24px", marginBottom:"20px" }}>
          <div className="header-row" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"16px", marginBottom:"16px" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <h1 style={{ fontSize:"clamp(18px,3.5vw,26px)", fontWeight:800, letterSpacing:"-0.5px", marginBottom:"5px", lineHeight:1.1 }}>{project?.name}</h1>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"14px", color:"#4A4A5A", fontWeight:500 }}>{project?.client_name}</span>
                {project?.client_email && <span style={{ fontSize:"13px", color:"#8A8A9A" }}>{project.client_email}</span>}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
              {ps && (
                <button onClick={cycleProjectStatus} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"20px", background:ps.bg, border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:"12px", fontWeight:700, color:ps.color }}>
                  <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:ps.color }} />{ps.label}
                </button>
              )}
              <button className={`share-btn${copied?" copied":""}`} onClick={copyPortalLink} style={{ display:"none" }} id="desktop-share-btn">{copied?"✓ Copied!":"⬡ Share portal"}</button>
              <style>{`@media(min-width:769px){#desktop-share-btn{display:flex!important}}`}</style>
            </div>
          </div>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
              <span style={{ fontSize:"11px", color:"#8A8A9A", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>Progress</span>
              <span style={{ fontSize:"12px", fontWeight:700, color:progressPct===100?"#0BAB6C":"#4A4A5A" }}>{completeCount} / {stages.length} stages</span>
            </div>
            <div style={{ height:"5px", background:"rgba(0,0,0,0.08)", borderRadius:"99px", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:"99px", width:`${progressPct}%`, background:"linear-gradient(90deg,#5B4CF5,#0BAB6C)", transition:"width 0.6s ease" }} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(232,93,117,0.1)", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", fontSize:"13px", color:"#E85D75", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px" }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={{ background:"none", border:"none", color:"#E85D75", cursor:"pointer", fontSize:"16px", flexShrink:0 }}>✕</button>
          </div>
        )}

        {/* Stage tabs */}
        {stages.length > 0 && (
          <div className="fi fi2 tabs-row" style={{ display:"flex", overflowX:"auto", gap:"6px", marginBottom:"20px", paddingBottom:"2px" }}>
            {stages.map((stage, i) => {
              const st = STAGE_STATUS[stage.status];
              const isActive = activeStageId === stage.id;
              const fc = files.filter(f => f.stage_id === stage.id).length;
              const hasNewFeedback = activity.some(a => a.stage_id === stage.id && a.type === "changes_requested");
              return (
                <button key={stage.id} className={`stage-tab${isActive?" active":""}`} onClick={() => setActiveStageId(stage.id)} style={{ position:"relative" }}>
                  <span style={{ width:"18px", height:"18px", borderRadius:"50%", flexShrink:0, background:stage.status==="complete"?"#0BAB6C":isActive?"#5B4CF5":"#E4E4E8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:700, color:stage.status==="complete"||isActive?"#fff":"#4A4A5A" }}>{stage.status==="complete"?"✓":i+1}</span>
                  {stage.title}
                  <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:st.color, flexShrink:0 }} />
                  {fc>0&&<span style={{ background:"rgba(91,76,245,0.2)", color:"#a093ff", fontSize:"10px", fontWeight:700, borderRadius:"8px", padding:"1px 5px" }}>{fc}</span>}
                  {hasNewFeedback && stage.status==="in_progress" && (
                    <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#F5A623", flexShrink:0 }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Stage panel */}
        {activeStage && (
          <div className="fi fi3 stage-grid">

            {/* LEFT */}
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

              {/* Stage title + status */}
              <div style={{ background:"#FFFFFF", border:"1px solid #E4E4E8", borderRadius:"16px", padding:"20px" }}>
                <h2 style={{ fontSize:"clamp(15px,2.5vw,18px)", fontWeight:800, letterSpacing:"-0.3px", marginBottom:"14px" }}>{activeStage.title}</h2>
                <div style={{ fontSize:"11px", color:"#8A8A9A", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"8px" }}>Stage status</div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {(["not_started","in_progress","complete"] as StageStatus[]).map(s => {
                    const cfg = STAGE_STATUS[s]; const isSel = activeStage.status===s;
                    return (
                      <button key={s} className="status-pill" onClick={() => updateStageStatus(activeStage.id, s)} style={{ background:isSel?cfg.bg:"#F5F6FA", border:`1px solid ${isSel?cfg.border:"#E4E4E8"}`, color:isSel?cfg.color:"#8A8A9A" }}>
                        {isSel&&<span style={{ marginRight:"4px" }}>●</span>}{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client feedback section */}
              {feedbackItems.length > 0 && (
                <div style={{ background:"#FFFFFF", border:"1px solid #E4E4E8", borderRadius:"16px", padding:"20px" }}>
                  <div style={{ fontSize:"12px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"14px" }}>Client feedback</div>

                  {/* Latest */}
                  {latestFeedback && (
                    <div style={{ background:latestFeedback.type==="changes_requested"?"rgba(245,166,35,0.07)":"rgba(11,171,108,0.07)", border:`1px solid ${latestFeedback.type==="changes_requested"?"rgba(245,166,35,0.2)":"rgba(11,171,108,0.2)"}`, borderRadius:"12px", padding:"14px", marginBottom:"10px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                          <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:latestFeedback.type==="changes_requested"?"#F5A623":"#0BAB6C" }} />
                          <span style={{ fontSize:"12px", fontWeight:700, color:latestFeedback.type==="changes_requested"?"#F5A623":"#0BAB6C" }}>
                            {latestFeedback.type==="changes_requested"?"Changes requested":"Approved"}
                          </span>
                        </div>
                        <span style={{ fontSize:"11px", color:"#8A8A9A" }}>{timeAgo(latestFeedback.created_at)}</span>
                      </div>
                      {latestFeedback.message && (
                        <p style={{ fontSize:"13px", color:"#4A4A5A", lineHeight:1.6, margin:"0 0 10px" }}>"{latestFeedback.message}"</p>
                      )}
                      {/* Files uploaded around this feedback */}
                      {filesForFeedback(latestFeedback).length > 0 && (
                        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                          {filesForFeedback(latestFeedback).map(f => (
                            <div key={f.id} style={{ display:"flex", alignItems:"center", gap:"8px", background:"#F5F6FA", borderRadius:"8px", padding:"8px 10px" }}>
                              {isImage(f.name) ? (
                                <img src={f.file_url} alt={f.name} style={{ width:"36px", height:"36px", borderRadius:"6px", objectFit:"cover", flexShrink:0 }} />
                              ) : (
                                <div style={{ width:"36px", height:"36px", borderRadius:"6px", background:"rgba(91,76,245,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>{fileIcon(f.name)}</div>
                              )}
                              <span style={{ fontSize:"12px", color:"#4A4A5A", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                              <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:"11px", color:"#a093ff", textDecoration:"none", whiteSpace:"nowrap" }}>View →</a>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize:"11px", color:"#8A8A9A", marginTop:"8px" }}>— {project?.client_name}</div>
                    </div>
                  )}

                  {/* Previous feedback toggle */}
                  {prevFeedback.length > 0 && (
                    <>
                      <button className="history-toggle" onClick={() => setHistoryExpanded(p => !p)}>
                        <span style={{ fontSize:"10px", transition:"transform 0.2s", display:"inline-block", transform:historyExpanded?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                        {historyExpanded ? "Hide" : `View ${prevFeedback.length} previous`} comment{prevFeedback.length!==1?"s":""}
                      </button>
                      {historyExpanded && (
                        <div style={{ borderLeft:"2px solid #E4E4E8", paddingLeft:"14px", display:"flex", flexDirection:"column", gap:"10px", marginTop:"8px" }}>
                          {prevFeedback.map(item => (
                            <div key={item.id}>
                              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                  <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:item.type==="changes_requested"?"#F5A623":"#0BAB6C" }} />
                                  <span style={{ fontSize:"11px", fontWeight:700, color:item.type==="changes_requested"?"#F5A623":"#0BAB6C" }}>
                                    {item.type==="changes_requested"?"Changes requested":"Approved"}
                                  </span>
                                </div>
                                <span style={{ fontSize:"11px", color:"#8A8A9A" }}>{timeAgo(item.created_at)}</span>
                              </div>
                              {item.message && <p style={{ fontSize:"12px", color:"#4A4A5A", lineHeight:1.5, margin:0 }}>"{item.message}"</p>}
                              {/* Files for this revision */}
                              {filesForFeedback(item).length > 0 && (
                                <div style={{ display:"flex", gap:"6px", marginTop:"6px", flexWrap:"wrap" }}>
                                  {filesForFeedback(item).map(f => isImage(f.name) ? (
                                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer">
                                      <img src={f.file_url} alt={f.name} style={{ width:"40px", height:"40px", borderRadius:"6px", objectFit:"cover", border:"1px solid #E4E4E8" }} />
                                    </a>
                                  ) : (
                                    <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:"11px", color:"#a093ff", background:"rgba(91,76,245,0.1)", padding:"3px 8px", borderRadius:"6px", textDecoration:"none" }}>{f.name}</a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Notes */}
              <div style={{ background:"#FFFFFF", border:"1px solid #E4E4E8", borderRadius:"16px", padding:"20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px" }}>
                  <span style={{ fontSize:"12px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase", letterSpacing:"0.07em" }}>Notes for client</span>
                  <button onClick={saveNote} disabled={savingNote} style={{ padding:"5px 14px", borderRadius:"7px", border:"1px solid rgba(91,76,245,0.3)", background:noteSaved?"rgba(11,171,108,0.12)":"rgba(91,76,245,0.1)", color:noteSaved?"#0BAB6C":savingNote?"rgba(255,255,255,0.3)":"#a093ff", fontFamily:"'Outfit',sans-serif", fontSize:"12px", fontWeight:700, cursor:savingNote?"not-allowed":"pointer", transition:"all 0.25s", minWidth:"60px" }}>
                    {noteSaved?"✓ Saved":savingNote?"Saving…":"Save"}
                  </button>
                </div>
                <textarea className="note-area" value={noteText} onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key==="s"&&(e.metaKey||e.ctrlKey)){ e.preventDefault(); saveNote(); } }}
                  placeholder="Add context for your client — what to review, what feedback you need…" />
                <div style={{ fontSize:"11px", color:"#B0B0BC", marginTop:"6px" }}>⌘S / Ctrl+S to save</div>
              </div>

              <button className={`approval-btn${approvalSent?" sent":""}`} onClick={requestApproval}>
                {approvalSent?<><span>✓</span> Approval requested!</>:<><span style={{ fontSize:"16px" }}>→</span> Request client approval</>}
              </button>

              {/* Activity log */}
              {stageActivity.length > 0 && (
                <div style={{ background:"#FFFFFF", border:"1px solid #E4E4E8", borderRadius:"16px", padding:"20px" }}>
                  <div style={{ fontSize:"12px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"12px" }}>Stage activity</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {stageActivity.slice(0,8).map(a => {
                      const colors: Record<string,string> = { approved:"#0BAB6C", changes_requested:"#F5A623", approval_requested:"#5B4CF5", file_uploaded:"#B0B0BC" };
                      const labels: Record<string,string> = { approved:"Client approved", changes_requested:"Client requested changes", approval_requested:"Approval requested", file_uploaded:"File uploaded" };
                      return (
                        <div key={a.id} style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
                          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:colors[a.type]??"rgba(255,255,255,0.3)", flexShrink:0, marginTop:"5px" }} />
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:"12px", color:"#4A4A5A" }}>{labels[a.type]??a.type}</span>
                            {a.message && a.type==="file_uploaded" && <span style={{ fontSize:"12px", color:"#8A8A9A" }}> — {a.message}</span>}
                          </div>
                          <span style={{ fontSize:"11px", color:"#B0B0BC", flexShrink:0 }}>{timeAgo(a.created_at)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button className="delete-btn" onClick={() => setShowDeleteConfirm(true)}>🗑 Delete project</button>
            </div>

            {/* RIGHT: Files */}
            <div style={{ background:"#FFFFFF", border:"1px solid #E4E4E8", borderRadius:"16px", padding:"20px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                <span style={{ fontSize:"12px", fontWeight:700, color:"#8A8A9A", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                  Files{activeStageFiles.length>0&&<span style={{ marginLeft:"6px", fontWeight:400, color:"#8A8A9A", textTransform:"none", letterSpacing:0 }}>· {activeStageFiles.length}</span>}
                </span>
              </div>

              <input ref={fileInputRef} type="file" multiple style={{ display:"none" }} onChange={e => handleUpload(e.target.files)} />

              <div className={`upload-zone${dragOver?" drag":""}`} style={{ marginBottom:activeStageFiles.length>0?"14px":"0" }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}>
                {uploading?(
                  <><div style={{ width:"22px", height:"22px", border:"2px solid rgba(91,76,245,0.3)", borderTopColor:"#5B4CF5", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} /><span style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)" }}>Uploading…</span></>
                ):(
                  <><div style={{ fontSize:"24px", opacity:0.3 }}>⬆</div><span style={{ fontSize:"14px", fontWeight:600, color:"#4A4A5A" }}>Drop files or click to upload</span><span style={{ fontSize:"12px", color:"#8A8A9A" }}>Images · PDFs · Figma · ZIPs</span></>
                )}
              </div>

              {activeStageFiles.length>0&&(
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {activeStageFiles.map(file=>(
                    <div key={file.id} className="file-row">
                      {isImage(file.name) ? (
                        <img src={file.file_url} alt={file.name} style={{ width:"38px", height:"38px", borderRadius:"8px", objectFit:"cover", flexShrink:0, border:"1px solid #E4E4E8" }} />
                      ) : (
                        <div style={{ width:"38px", height:"38px", borderRadius:"8px", flexShrink:0, background:"rgba(91,76,245,0.1)", border:"1px solid rgba(91,76,245,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>{fileIcon(file.name)}</div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"#12111A" }}>{file.name}</div>
                        <div style={{ fontSize:"11px", color:"#8A8A9A", marginTop:"2px" }}>{file.file_size?formatBytes(file.file_size):""} · {timeAgo(file.created_at)}</div>
                      </div>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ padding:"5px 10px", borderRadius:"7px", border:"1px solid #E4E4E8", background:"#F5F6FA", color:"#8A8A9A", fontSize:"12px", fontWeight:600, textDecoration:"none", whiteSpace:"nowrap", fontFamily:"'Outfit',sans-serif" }}>View →</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {stages.length===0&&!loading&&(
          <div className="fi fi3" style={{ background:"#FFFFFF", border:"1px dashed #E4E4E8", borderRadius:"16px", padding:"48px", textAlign:"center", color:"#8A8A9A" }}>
            <div style={{ fontSize:"28px", marginBottom:"10px", opacity:0.4 }}>◷</div>
            <div style={{ fontSize:"15px", fontWeight:600, color:"#4A4A5A", marginBottom:"4px" }}>No stages yet</div>
          </div>
        )}
      </main>
    </div>
  );
}