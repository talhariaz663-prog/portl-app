"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
type Status = "active" | "review" | "approved" | "draft";

interface Project {
  id: string;
  name: string;
  client: string;
  status: Status;
  stage: string;
  filesCount: number;
  pendingApprovals: number;
  updatedAt: string;
  color: string; // accent color per card
}

// ── Mock data (replace with Supabase fetch) ────────────────────────────────
const MOCK_PROJECTS: Project[] = [
  {
    id: "1", name: "Brand Identity Refresh", client: "Lumina Studio",
    status: "review", stage: "Final Concepts", filesCount: 12, pendingApprovals: 3,
    updatedAt: "2h ago", color: "#5B4CF5",
  },
  {
    id: "2", name: "Website Redesign", client: "Arkflow SaaS",
    status: "active", stage: "Wireframes", filesCount: 7, pendingApprovals: 0,
    updatedAt: "Yesterday", color: "#0BAB6C",
  },
  {
    id: "3", name: "Packaging Design", client: "Bloom Organics",
    status: "approved", stage: "Delivered", filesCount: 24, pendingApprovals: 0,
    updatedAt: "3 days ago", color: "#F5A623",
  },
  {
    id: "4", name: "Social Media Kit", client: "Nova Coffee",
    status: "draft", stage: "Not started", filesCount: 0, pendingApprovals: 0,
    updatedAt: "1 week ago", color: "#E85D75",
  },
  {
    id: "5", name: "Pitch Deck Design", client: "Vertex Capital",
    status: "active", stage: "Revisions", filesCount: 5, pendingApprovals: 1,
    updatedAt: "4h ago", color: "#5B4CF5",
  },
];

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  active:   { label: "Active",    color: "#0BAB6C", bg: "rgba(11,171,108,0.12)" },
  review:   { label: "In Review", color: "#F5A623", bg: "rgba(245,166,35,0.12)" },
  approved: { label: "Approved",  color: "#5B4CF5", bg: "rgba(91,76,245,0.12)"  },
  draft:    { label: "Draft",     color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" },
};

// ── Component ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = filter === "all"
    ? MOCK_PROJECTS
    : MOCK_PROJECTS.filter((p) => p.status === filter);

  const counts = {
    all:      MOCK_PROJECTS.length,
    active:   MOCK_PROJECTS.filter((p) => p.status === "active").length,
    review:   MOCK_PROJECTS.filter((p) => p.status === "review").length,
    approved: MOCK_PROJECTS.filter((p) => p.status === "approved").length,
    draft:    MOCK_PROJECTS.filter((p) => p.status === "draft").length,
  };

  const totalPending = MOCK_PROJECTS.reduce((s, p) => s + p.pendingApprovals, 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080a18",
      fontFamily: "'Outfit', sans-serif",
      color: "#fff",
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }

        .fade-in { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .fade-in-1 { animation-delay: 0.05s; }
        .fade-in-2 { animation-delay: 0.10s; }
        .fade-in-3 { animation-delay: 0.15s; }
        .fade-in-4 { animation-delay: 0.20s; }
        .fade-in-5 { animation-delay: 0.25s; }
        .fade-in-6 { animation-delay: 0.30s; }

        .project-card {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 24px;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .project-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        }
        .project-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .project-card:hover::before { opacity: 1; }

        .filter-btn {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          color: rgba(255,255,255,0.4);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .filter-btn:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
        .filter-btn.active {
          background: rgba(91,76,245,0.2);
          border-color: rgba(91,76,245,0.5);
          color: #fff;
        }

        .new-project-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          border: none; border-radius: 10px;
          background: linear-gradient(135deg, #5B4CF5, #0BAB6C);
          color: #fff; font-family: 'Outfit', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .new-project-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .stat-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 16px 20px;
          flex: 1;
          min-width: 0;
        }

        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #0BAB6C;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 20px;
          gap: 16px;
          color: rgba(255,255,255,0.3);
          text-align: center;
        }
      `}</style>

      {/* Background grid + glow */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(91,76,245,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(91,76,245,0.04) 1px, transparent 1px),
          radial-gradient(ellipse 50% 40% at 95% 100%, rgba(11,171,108,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 5% 0%, rgba(91,76,245,0.08) 0%, transparent 70%)
        `,
        backgroundSize: "40px 40px, 40px 40px, 100% 100%, 100% 100%",
      }} />

      {/* ── Sidebar ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: "220px",
        background: "rgba(8,10,24,0.95)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column",
        padding: "28px 16px",
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ marginBottom: "40px", paddingLeft: "8px" }}>
          <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Portl<span style={{ color: "#5B4CF5", fontSize: "26px" }}>.</span>
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {[
            { icon: "⬡", label: "Studio",   active: true  },
            { icon: "◷", label: "Timeline",  active: false },
            { icon: "⬚", label: "Files",     active: false },
            { icon: "✓", label: "Approvals", active: false, badge: totalPending },
          ].map(({ icon, label, active, badge }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "10px",
              background: active ? "rgba(91,76,245,0.15)" : "transparent",
              color: active ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: "pointer", fontSize: "14px", fontWeight: active ? 600 : 400,
              border: active ? "1px solid rgba(91,76,245,0.3)" : "1px solid transparent",
              transition: "all 0.15s",
              position: "relative",
            }}>
              <span style={{ fontSize: "16px", opacity: active ? 1 : 0.6 }}>{icon}</span>
              {label}
              {badge ? (
                <span style={{
                  marginLeft: "auto",
                  background: "#F5A623",
                  color: "#000",
                  fontSize: "11px", fontWeight: 700,
                  borderRadius: "10px", padding: "1px 7px",
                }}>{badge}</span>
              ) : null}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          marginTop: "auto", paddingTop: "20px",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: "linear-gradient(135deg, #5B4CF5, #0BAB6C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", fontWeight: 700, flexShrink: 0,
          }}>T</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Taruha</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>Designer</div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{
        marginLeft: "220px",
        padding: "36px 40px",
        position: "relative", zIndex: 1,
        minHeight: "100vh",
      }}>

        {/* Header row */}
        <div className="fade-in fade-in-1" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "32px",
        }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "4px" }}>
              The Studio
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="live-dot" />
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
                {counts.active} active project{counts.active !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            className="new-project-btn"
            onClick={() => router.push("/dashboard/new-project")}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
            New Project
          </button>
        </div>

        {/* Stat cards */}
        <div className="fade-in fade-in-2" style={{
          display: "flex", gap: "12px", marginBottom: "32px",
        }}>
          {[
            { label: "Total Projects", value: counts.all,      color: "#fff"      },
            { label: "In Review",      value: counts.review,   color: "#F5A623"   },
            { label: "Active",         value: counts.active,   color: "#0BAB6C"   },
            { label: "Approved",       value: counts.approved, color: "#5B4CF5"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <div style={{ fontSize: "28px", fontWeight: 800, color, marginBottom: "4px" }}>{value}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="fade-in fade-in-3" style={{
          display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap",
        }}>
          {(["all", "active", "review", "approved", "draft"] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : STATUS_CONFIG[f]?.label ?? f}
              <span style={{ marginLeft: "5px", opacity: 0.6, fontSize: "11px" }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Project grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: "40px" }}>⬡</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                No projects here yet
              </div>
              <div style={{ fontSize: "13px" }}>Create your first project to get started</div>
            </div>
          ) : (
            filtered.map((project, i) => {
              const st = STATUS_CONFIG[project.status];
              const isHov = hovered === project.id;
              return (
                <div
                  key={project.id}
                  className={`project-card fade-in fade-in-${Math.min(i + 3, 6)}`}
                  style={{ borderTopColor: isHov ? project.color : "transparent" }}
                  onMouseEnter={() => setHovered(project.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => router.push(`/dashboard/project/${project.id}`)}
                >
                  {/* Card top accent line on hover */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                    background: `linear-gradient(90deg, ${project.color}, transparent)`,
                    opacity: isHov ? 1 : 0,
                    transition: "opacity 0.2s",
                    borderRadius: "16px 16px 0 0",
                  }} />

                  {/* Status badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: st.bg, color: st.color,
                    padding: "4px 10px", borderRadius: "20px",
                    fontSize: "11px", fontWeight: 700,
                    marginBottom: "16px",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    <span style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      background: st.color, flexShrink: 0,
                    }} />
                    {st.label}
                  </div>

                  {/* Project name + client */}
                  <h3 style={{
                    fontSize: "16px", fontWeight: 700,
                    marginBottom: "4px", lineHeight: 1.3,
                    color: "#fff",
                  }}>
                    {project.name}
                  </h3>
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "20px" }}>
                    {project.client}
                  </div>

                  {/* Stage */}
                  <div style={{
                    fontSize: "12px", color: "rgba(255,255,255,0.3)",
                    marginBottom: "16px",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    <span style={{ color: project.color, fontSize: "10px" }}>◆</span>
                    {project.stage}
                  </div>

                  {/* Divider */}
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "16px" }} />

                  {/* Footer meta */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "14px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                        📄 {project.filesCount} files
                      </span>
                      {project.pendingApprovals > 0 && (
                        <span style={{
                          fontSize: "12px",
                          color: "#F5A623",
                          fontWeight: 600,
                        }}>
                          ⏳ {project.pendingApprovals} pending
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                      {project.updatedAt}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* New project card (always last) */}
          {filter === "all" && (
            <div
              className="project-card fade-in fade-in-6"
              style={{
                border: "1px dashed rgba(91,76,245,0.3)",
                background: "rgba(91,76,245,0.04)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "12px", minHeight: "200px",
                color: "rgba(255,255,255,0.3)",
              }}
              onClick={() => router.push("/dashboard/new-project")}
            >
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: "rgba(91,76,245,0.15)",
                border: "1px solid rgba(91,76,245,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", color: "#5B4CF5",
                transition: "background 0.2s",
              }}>+</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                New Project
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}