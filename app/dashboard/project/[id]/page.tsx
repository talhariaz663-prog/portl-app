"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────
type StageStatus = "not_started" | "in_progress" | "complete";

interface Stage {
  id: string;
  project_id: string;
  name: string;
  position: number;
  status: StageStatus;
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
  status: string;
}

const STAGE_STATUS_CONFIG: Record<StageStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" },
  in_progress:  { label: "In Progress", color: "#F5A623",              bg: "rgba(245,166,35,0.12)"  },
  complete:     { label: "Complete",    color: "#0BAB6C",              bg: "rgba(11,171,108,0.12)"  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectId = params?.id as string;

  const [project,       setProject]       = useState<Project | null>(null);
  const [stages,        setStages]        = useState<Stage[]>([]);
  const [files,         setFiles]         = useState<ProjectFile[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // ── Fetch data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    // Project
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, name, client_name, client_email, portal_slug, status")
      .eq("id", projectId)
      .single();

    if (projErr || !proj) { setError("Project not found."); setLoading(false); return; }
    setProject(proj as Project);

    // Stages
    const { data: stageData } = await supabase
      .from("stages")
      .select("*")
      .eq("project_id", projectId)
      .order("position", { ascending: true });

    const stageList = (stageData as Stage[]) ?? [];
    setStages(stageList);
    if (stageList.length > 0) setActiveStageId(stageList[0].id);

    // Files
    const { data: fileData } = await supabase
      .from("files")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setFiles((fileData as ProjectFile[]) ?? []);
    setLoading(false);
  }, [supabase, router, projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Upload files ───────────────────────────────────────────────────────
  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !activeStageId || !project) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const path = `${project.id}/${activeStageId}/${Date.now()}-${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("project-files")
        .upload(path, file);

      if (uploadErr) { setError(uploadErr.message); continue; }

      const { data: urlData } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);

      await supabase.from("files").insert({
        project_id: project.id,
        stage_id:   activeStageId,
        name:       file.name,
        file_url:   urlData.publicUrl,
        file_size:  file.size,
      });
    }

    setUploading(false);
    fetchData();
  };

  // ── Update stage status ────────────────────────────────────────────────
  const updateStageStatus = async (stageId: string, status: StageStatus) => {
    await supabase.from("stages").update({ status }).eq("id", stageId);
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, status } : s));
  };

  // ── Copy portal link ───────────────────────────────────────────────────
  const copyPortalLink = () => {
    if (!project) return;
    const url = `${window.location.origin}/portal/${project.portal_slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeStage     = stages.find((s) => s.id === activeStageId);
  const activeStageFiles = files.filter((f) => f.stage_id === activeStageId);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080a18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "32px", height: "32px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#5B4CF5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080a18", fontFamily: "'Outfit', sans-serif", color: "#fff" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { opacity:0.5; } 50% { opacity:1; } 100% { opacity:0.5; } }

        .fade-in   { animation: fadeUp 0.4s ease forwards; opacity:0; }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.12s; }
        .fade-in-3 { animation-delay: 0.20s; }

        .stage-tab {
          position: relative;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          cursor: pointer; white-space: nowrap;
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.45);
          transition: all 0.18s ease;
        }
        .stage-tab:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.15); }
        .stage-tab.active {
          background: rgba(91,76,245,0.15);
          border-color: rgba(91,76,245,0.4);
          color: #fff; font-weight: 600;
        }
        .stage-tab .connector {
          position: absolute; right: -20px; top: 50%;
          transform: translateY(-50%);
          width: 20px; height: 1px;
          background: rgba(255,255,255,0.1);
          z-index: 1;
        }

        .upload-zone {
          border: 1.5px dashed rgba(91,76,245,0.35);
          border-radius: 14px; padding: 36px 20px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          cursor: pointer; transition: all 0.2s ease;
          background: rgba(91,76,245,0.04);
          text-align: center;
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: rgba(91,76,245,0.7);
          background: rgba(91,76,245,0.08);
        }

        .file-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.15s, background 0.15s;
        }
        .file-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

        .share-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px;
          border: 1px solid rgba(91,76,245,0.4);
          background: rgba(91,76,245,0.12);
          color: #a093ff; font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; white-space: nowrap;
        }
        .share-btn:hover { background: rgba(91,76,245,0.22); border-color: rgba(91,76,245,0.6); color: #fff; }
        .share-btn.copied { border-color: rgba(11,171,108,0.5); background: rgba(11,171,108,0.12); color: #0BAB6C; }

        .status-select {
          padding: 6px 12px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #fff; font-family: 'Outfit', sans-serif;
          font-size: 12px; font-weight: 600; cursor: pointer;
          outline: none; transition: border-color 0.15s;
        }
        .status-select:focus { border-color: rgba(91,76,245,0.5); }

        .back-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; color: rgba(255,255,255,0.35);
          font-family: 'Outfit', sans-serif; font-size: 13px;
          cursor: pointer; transition: color 0.15s; padding: 0;
        }
        .back-btn:hover { color: rgba(255,255,255,0.7); }
      `}</style>

      {/* BG */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(91,76,245,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(91,76,245,0.04) 1px, transparent 1px),
          radial-gradient(ellipse 50% 40% at 95% 0%, rgba(91,76,245,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 5% 100%, rgba(11,171,108,0.06) 0%, transparent 70%)
        `,
        backgroundSize: "40px 40px, 40px 40px, 100% 100%, 100% 100%",
      }} />

      {/* Sidebar */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: "220px",
        background: "rgba(8,10,24,0.95)", borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)", display: "flex", flexDirection: "column",
        padding: "28px 16px", zIndex: 10,
      }}>
        <div style={{ marginBottom: "40px", paddingLeft: "8px" }}>
          <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Portl<span style={{ color: "#5B4CF5", fontSize: "26px" }}>.</span>
          </span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {[
            { icon: "⬡", label: "Studio",   active: false },
            { icon: "◷", label: "Timeline",  active: true  },
            { icon: "⬚", label: "Files",     active: false },
            { icon: "✓", label: "Approvals", active: false },
          ].map(({ icon, label, active }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "10px", fontSize: "14px", cursor: "pointer",
              transition: "all 0.15s", border: "1px solid transparent",
              background: active ? "rgba(91,76,245,0.15)" : "transparent",
              borderColor: active ? "rgba(91,76,245,0.3)" : "transparent",
              color: active ? "#fff" : "rgba(255,255,255,0.4)",
              fontWeight: active ? 600 : 400,
            }}
              onClick={() => label === "Studio" && router.push("/dashboard")}
            >
              <span style={{ fontSize: "16px" }}>{icon}</span> {label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: "220px", padding: "36px 40px", position: "relative", zIndex: 1, minHeight: "100vh" }}>

        {/* Back + header */}
        <div className="fade-in fade-in-1" style={{ marginBottom: "32px" }}>
          <button className="back-btn" style={{ marginBottom: "20px" }} onClick={() => router.push("/dashboard")}>
            ← Back to Studio
          </button>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "6px" }}>
                {project?.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
                  {project?.client_name}
                </span>
                {project?.client_email && (
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>
                    {project.client_email}
                  </span>
                )}
              </div>
            </div>

            {/* Share portal button */}
            <button
              className={`share-btn${copied ? " copied" : ""}`}
              onClick={copyPortalLink}
            >
              <span>{copied ? "✓" : "⬡"}</span>
              {copied ? "Link copied!" : "Share portal link"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(232,93,117,0.1)", border: "1px solid rgba(232,93,117,0.3)",
            borderRadius: "10px", padding: "14px 18px", marginBottom: "24px",
            fontSize: "14px", color: "#E85D75",
          }}>⚠️ {error}</div>
        )}

        {/* Stage tabs */}
        {stages.length > 0 && (
          <div className="fade-in fade-in-2" style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0", overflowX: "auto", paddingBottom: "4px" }}>
              {stages.map((stage, i) => {
                const st = STAGE_STATUS_CONFIG[stage.status] ?? STAGE_STATUS_CONFIG.not_started;
                const isActive = activeStageId === stage.id;
                return (
                  <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
                    <button
                      className={`stage-tab${isActive ? " active" : ""}`}
                      onClick={() => setActiveStageId(stage.id)}
                    >
                      {/* Step number */}
                      <span style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        background: isActive ? "#5B4CF5" : "rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700, flexShrink: 0,
                        color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                      }}>{i + 1}</span>
                      {stage.name}
                      {/* Status dot */}
                      <span style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: st.color, flexShrink: 0,
                      }} />
                    </button>
                    {/* Connector line */}
                    {i < stages.length - 1 && (
                      <div style={{ width: "24px", height: "1px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No stages state */}
        {stages.length === 0 && !loading && (
          <div className="fade-in fade-in-2" style={{
            background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: "16px", padding: "48px", textAlign: "center",
            color: "rgba(255,255,255,0.3)", marginBottom: "32px",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>◷</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px", color: "rgba(255,255,255,0.5)" }}>No stages yet</div>
            <div style={{ fontSize: "13px" }}>Stages are created when you set up a new project.</div>
          </div>
        )}

        {/* Active stage panel */}
        {activeStage && (
          <div className="fade-in fade-in-3" style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px", padding: "32px",
            backdropFilter: "blur(12px)",
          }}>

            {/* Stage header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>
                  {activeStage.name}
                </h2>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  background: STAGE_STATUS_CONFIG[activeStage.status].bg,
                  color: STAGE_STATUS_CONFIG[activeStage.status].color,
                  padding: "3px 10px", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: STAGE_STATUS_CONFIG[activeStage.status].color }} />
                  {STAGE_STATUS_CONFIG[activeStage.status].label}
                </div>
              </div>

              {/* Status changer */}
              <select
                className="status-select"
                value={activeStage.status}
                onChange={(e) => updateStageStatus(activeStage.id, e.target.value as StageStatus)}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "28px" }} />

            {/* Files section */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                  Files
                  {activeStageFiles.length > 0 && (
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>
                      {activeStageFiles.length} file{activeStageFiles.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <button
                  style={{
                    padding: "6px 14px", borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit', sans-serif",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Upload
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleUpload(e.target.files)}
              />

              {/* Drop zone */}
              <div
                className={`upload-zone${dragOver ? " drag-over" : ""}`}
                style={{ marginBottom: activeStageFiles.length > 0 ? "16px" : "0" }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
              >
                {uploading ? (
                  <>
                    <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#5B4CF5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Uploading…</span>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "28px", opacity: 0.4 }}>⬡</div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                      Drop files here or click to upload
                    </span>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
                      Any file type supported
                    </span>
                  </>
                )}
              </div>

              {/* File list */}
              {activeStageFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeStageFiles.map((file) => (
                    <div key={file.id} className="file-row">
                      {/* File icon */}
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "8px",
                        background: "rgba(91,76,245,0.12)",
                        border: "1px solid rgba(91,76,245,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px", flexShrink: 0,
                      }}>
                        {file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? "🖼" :
                         file.name.match(/\.(pdf)$/i) ? "📄" :
                         file.name.match(/\.(zip|rar)$/i) ? "📦" : "⬡"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "2px" }}>
                          {file.file_size ? formatBytes(file.file_size) : ""} · {timeAgo(file.created_at)}
                        </div>
                      </div>

                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "6px 12px", borderRadius: "7px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.5)", fontSize: "11px",
                          fontWeight: 600, textDecoration: "none",
                          transition: "all 0.15s", whiteSpace: "nowrap",
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        View →
                      </a>
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