"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_STAGES = ["Discovery & Brief", "Moodboard", "Design", "Final Delivery"];

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" + Math.random().toString(36).slice(2, 7);
}

export default function NewProjectPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [name,        setName]        = useState("");
  const [clientName,  setClientName]  = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [stages,      setStages]      = useState<string[]>(DEFAULT_STAGES);
  const [newStage,    setNewStage]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [step,        setStep]        = useState<1|2>(1);

  // Drag state
  const dragIndex    = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const addStage = () => {
    const t = newStage.trim();
    if (!t || stages.includes(t)) return;
    setStages([...stages, t]);
    setNewStage("");
  };

  const removeStage = (i: number) => setStages(stages.filter((_, idx) => idx !== i));

  const moveStage = (i: number, dir: -1 | 1) => {
    const s = [...stages];
    const j = i + dir;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    setStages(s);
  };

  // Drag handlers
  const onDragStart = (i: number) => { dragIndex.current = i; };
  const onDragEnter = (i: number) => { dragOverIndex.current = i; };
  const onDragEnd   = () => {
    const from = dragIndex.current;
    const to   = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    const s = [...stages];
    const [moved] = s.splice(from, 1);
    s.splice(to, 0, moved);
    setStages(s);
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  const handleCreate = async () => {
    if (!name.trim() || !clientName.trim() || stages.length === 0) return;
    setLoading(true); setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login"); return; }

    const { data: proj, error: pe } = await supabase
      .from("projects")
      .insert({
        user_id:      session.user.id,
        designer_id:  session.user.id,
        name:         name.trim(),
        client_name:  clientName.trim(),
        client_email: clientEmail.trim(),
        portal_slug:  slugify(name.trim()),
        status:       "active",
      })
      .select("id").single();

    if (pe || !proj) { setError(pe?.message ?? "Failed to create project."); setLoading(false); return; }

    const stageRows = stages.map((s, i) => ({
      project_id: proj.id, title: s, position: i, status: "not_started",
    }));

    const { error: se } = await supabase.from("stages").insert(stageRows);
    if (se) { setError(se.message); setLoading(false); return; }

    router.push(`/dashboard/project/${proj.id}`);
  };

  const canProceed = name.trim() && clientName.trim();

  return (
    <div style={{ minHeight:"100vh", background:"#080a18", fontFamily:"'Outfit',sans-serif", color:"#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fi{animation:fadeUp 0.4s ease forwards;opacity:0}
        .fi1{animation-delay:0.05s} .fi2{animation-delay:0.12s} .fi3{animation-delay:0.20s}

        .field-input {
          width:100%; padding:13px 16px;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.09);
          border-radius:11px; color:#fff;
          font-family:'Outfit',sans-serif; font-size:15px;
          outline:none; transition:border-color 0.2s, background 0.2s;
        }
        .field-input::placeholder { color:rgba(255,255,255,0.2); }
        .field-input:focus { border-color:rgba(91,76,245,0.6); background:rgba(91,76,245,0.06); }

        .primary-btn {
          display:flex; align-items:center; justify-content:center; gap:8px;
          width:100%; padding:14px; border:none; border-radius:11px;
          background:linear-gradient(135deg,#5B4CF5,#0BAB6C);
          color:#fff; font-family:'Outfit',sans-serif;
          font-size:15px; font-weight:700; cursor:pointer;
          transition:opacity 0.2s, transform 0.15s;
        }
        .primary-btn:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
        .primary-btn:disabled { opacity:0.45; cursor:not-allowed; }

        .stage-pill {
          display:flex; align-items:center; gap:10px;
          padding:12px 16px; border-radius:10px;
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          transition:border-color 0.15s, background 0.15s;
          cursor:grab; user-select:none;
        }
        .stage-pill:hover { border-color:rgba(255,255,255,0.14); background:rgba(255,255,255,0.06); }
        .stage-pill:active { cursor:grabbing; }
        .stage-pill.drag-over { border-color:rgba(91,76,245,0.6); background:rgba(91,76,245,0.08); }

        .icon-btn {
          background:none; border:none; cursor:pointer;
          color:rgba(255,255,255,0.25); font-size:13px;
          padding:3px 6px; border-radius:5px; transition:all 0.15s;
          font-family:'Outfit',sans-serif; line-height:1;
        }
        .icon-btn:hover:not(:disabled) { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.08); }
        .icon-btn:disabled { opacity:0.15; cursor:default; }

        .add-stage-row {
          display:flex; align-items:center;
          border:1px solid rgba(91,76,245,0.25); border-radius:10px;
          background:rgba(91,76,245,0.04); overflow:hidden;
          transition:border-color 0.2s;
        }
        .add-stage-row:focus-within { border-color:rgba(91,76,245,0.55); background:rgba(91,76,245,0.08); }

        .stage-input {
          flex:1; background:none; border:none; outline:none;
          color:#fff; font-family:'Outfit',sans-serif; font-size:14px; padding:11px 14px;
        }
        .stage-input::placeholder { color:rgba(255,255,255,0.2); }

        .nav-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:10px; font-size:14px;
          cursor:pointer; transition:all 0.15s; border:1px solid transparent;
        }
        .nav-item:hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.04); }
      `}</style>

      {/* BG */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`
          linear-gradient(rgba(91,76,245,0.04) 1px,transparent 1px),
          linear-gradient(90deg,rgba(91,76,245,0.04) 1px,transparent 1px),
          radial-gradient(ellipse 50% 50% at 100% 0%,rgba(91,76,245,0.09) 0%,transparent 70%),
          radial-gradient(ellipse 40% 40% at 0% 100%,rgba(11,171,108,0.07) 0%,transparent 70%)
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
            { icon:"⬡", label:"Studio",   path:"/dashboard" },
            { icon:"◷", label:"Timeline",  path:"" },
            { icon:"⬚", label:"Files",     path:"" },
            { icon:"✓", label:"Approvals", path:"" },
          ].map(({ icon, label, path }) => (
            <div key={label} className="nav-item"
              style={{ color:"rgba(255,255,255,0.4)" }}
              onClick={() => path && router.push(path)}>
              <span style={{ fontSize:"16px" }}>{icon}</span>{label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ marginLeft:"220px", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px", position:"relative", zIndex:1 }}>
        <div style={{ width:"100%", maxWidth:"520px" }}>

          {/* Header with back button inline */}
          <div className="fi fi1" style={{ display:"flex", alignItems:"center", gap:"16px", marginBottom:"28px" }}>
            <button
              onClick={() => step === 2 ? setStep(1) : router.push("/dashboard")}
              style={{
                width:"36px", height:"36px", borderRadius:"10px", flexShrink:0,
                border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)",
                color:"rgba(255,255,255,0.5)", fontSize:"16px",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s",
              }}
              title="Go back"
            >←</button>
            <div>
              <h1 style={{ fontSize:"24px", fontWeight:800, letterSpacing:"-0.5px", lineHeight:1.1 }}>
                {step === 1 ? "New Project" : "Set up Timeline"}
              </h1>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>
                {step === 1 ? "Fill in your project and client details" : "Define the stages your client will see"}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="fi fi1" style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"28px" }}>
            {[1,2].map((s) => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <div style={{
                    width:"26px", height:"26px", borderRadius:"50%",
                    background: step===s ? "linear-gradient(135deg,#5B4CF5,#0BAB6C)" : step>s ? "#0BAB6C" : "rgba(255,255,255,0.07)",
                    border: step>=s ? "none" : "1px solid rgba(255,255,255,0.12)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"12px", fontWeight:700,
                    color: step>=s ? "#fff" : "rgba(255,255,255,0.3)",
                    transition:"all 0.3s",
                  }}>
                    {step>s ? "✓" : s}
                  </div>
                  <span style={{ fontSize:"13px", fontWeight:step===s?600:400, color:step===s?"#fff":"rgba(255,255,255,0.35)" }}>
                    {s===1 ? "Project details" : "Timeline stages"}
                  </span>
                </div>
                {s===1 && <div style={{ width:"32px", height:"1px", background:"rgba(255,255,255,0.1)" }} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="fi fi2" style={{
            background:"rgba(255,255,255,0.025)",
            border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:"20px", padding:"32px",
            backdropFilter:"blur(16px)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.4)",
          }}>

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>
                    Project Name *
                  </label>
                  <input className="field-input" placeholder="e.g. Brand Identity for Nova Coffee"
                    value={name} onChange={e=>setName(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&canProceed&&setStep(2)} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>
                    Client Name *
                  </label>
                  <input className="field-input" placeholder="e.g. Riaz Ahmed"
                    value={clientName} onChange={e=>setClientName(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&canProceed&&setStep(2)} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>
                    Client Email
                    <span style={{ marginLeft:"6px", fontWeight:400, textTransform:"none", letterSpacing:0, color:"rgba(255,255,255,0.25)", fontSize:"11px" }}>— for approval emails</span>
                  </label>
                  <input className="field-input" type="email" placeholder="client@company.com"
                    value={clientEmail} onChange={e=>setClientEmail(e.target.value)} />
                </div>
                <button className="primary-btn" style={{ marginTop:"8px" }} disabled={!canProceed} onClick={()=>setStep(2)}>
                  Continue → Set up timeline
                </button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
                <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
                  Drag to reorder stages. Step numbers update automatically.
                </div>

                {/* Draggable stage list */}
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {stages.map((s, i) => (
                    <div
                      key={s+i}
                      className="stage-pill"
                      draggable
                      onDragStart={()=>onDragStart(i)}
                      onDragEnter={()=>onDragEnter(i)}
                      onDragEnd={onDragEnd}
                      onDragOver={e=>e.preventDefault()}
                    >
                      {/* Drag handle */}
                      <span style={{ color:"rgba(255,255,255,0.2)", fontSize:"14px", cursor:"grab", flexShrink:0 }}>⠿</span>

                      {/* Step number — updates live */}
                      <span style={{
                        width:"22px", height:"22px", borderRadius:"50%", flexShrink:0,
                        background:"rgba(91,76,245,0.2)", border:"1px solid rgba(91,76,245,0.3)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"11px", fontWeight:700, color:"#a093ff",
                        transition:"all 0.2s",
                      }}>{i+1}</span>

                      <span style={{ flex:1, fontSize:"14px", fontWeight:500, color:"rgba(255,255,255,0.85)" }}>{s}</span>

                      {/* Move buttons + remove */}
                      <div style={{ display:"flex", gap:"2px" }}>
                        <button className="icon-btn" onClick={()=>moveStage(i,-1)} disabled={i===0}>↑</button>
                        <button className="icon-btn" onClick={()=>moveStage(i,1)} disabled={i===stages.length-1}>↓</button>
                        <button className="icon-btn" onClick={()=>removeStage(i)}
                          style={{ color:"rgba(232,93,117,0.5)" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add stage */}
                <div className="add-stage-row">
                  <input className="stage-input" placeholder="Add a custom stage…"
                    value={newStage} onChange={e=>setNewStage(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addStage()} />
                  <button onClick={addStage} style={{
                    padding:"11px 18px", background:"rgba(91,76,245,0.2)",
                    border:"none", borderLeft:"1px solid rgba(91,76,245,0.25)",
                    color:"#a093ff", fontFamily:"'Outfit',sans-serif",
                    fontSize:"13px", fontWeight:700, cursor:"pointer",
                  }}>+ Add</button>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ background:"rgba(232,93,117,0.1)", border:"1px solid rgba(232,93,117,0.3)", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", color:"#E85D75" }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Summary */}
                <div style={{ background:"rgba(91,76,245,0.06)", border:"1px solid rgba(91,76,245,0.15)", borderRadius:"12px", padding:"16px" }}>
                  <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.3)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"10px" }}>Summary</div>
                  <div style={{ fontSize:"14px", fontWeight:700, color:"rgba(255,255,255,0.85)", marginBottom:"4px" }}>{name}</div>
                  <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)", marginBottom:"2px" }}>
                    {clientName}{clientEmail ? ` · ${clientEmail}` : ""}
                  </div>
                  <div style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)" }}>{stages.length} stages</div>
                </div>

                <button className="primary-btn" disabled={loading||stages.length===0} onClick={handleCreate}>
                  {loading ? (
                    <>
                      <div style={{ width:"16px", height:"16px", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                      Creating project…
                    </>
                  ) : "Create Project →"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}