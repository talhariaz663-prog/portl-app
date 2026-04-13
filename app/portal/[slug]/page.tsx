'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type StageStatus = 'not_started' | 'in_progress' | 'complete'

interface Project {
  id: string
  name: string
  client_name: string
  status: string
  user_id: string
  created_at: string
}
interface Stage {
  id: string
  title: string
  position: number
  status: StageStatus
  notes: string | null
}
interface ProjectFile {
  id: string
  stage_id: string
  name: string
  file_url: string
  file_size: number | null
  created_at: string
}
interface Activity {
  id: string
  stage_id: string
  type: 'approved' | 'changes_requested'
  message: string | null
  created_at: string
}

// ── helpers ───────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function fileIcon(name: string) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return '🖼'
  if (/\.pdf$/i.test(name)) return '📄'
  if (/\.(zip|rar)$/i.test(name)) return '📦'
  if (/\.(fig|sketch|xd)$/i.test(name)) return '🎨'
  return '📎'
}
function isImage(name: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name) }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dy = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (dy < 7) return `${dy}d ago`
  return new Date(d).toLocaleDateString()
}

export default function ClientPortalPage() {
  const params   = useParams()
  const supabase = createClient()
  const slug     = params?.slug as string

  const [project,           setProject]           = useState<Project | null>(null)
  const [stages,            setStages]            = useState<Stage[]>([])
  const [files,             setFiles]             = useState<ProjectFile[]>([])
  const [activity,          setActivity]          = useState<Activity[]>([])
  const [activeStageId,     setActiveStageId]     = useState<string | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState<string | null>(null)
  const [approved,          setApproved]          = useState<string | null>(null)
  const [revisionNote,      setRevisionNote]      = useState('')
  const [showRevisionInput, setShowRevisionInput] = useState(false)
  const [submitted,         setSubmitted]         = useState<string | null>(null)
  const [studioName,        setStudioName]        = useState('Your Designer')
  const [accentColor,       setAccentColor]       = useState('#5B4CF5')
  const [historyExpanded,   setHistoryExpanded]   = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)

    const { data: proj, error: pe } = await supabase
      .from('projects')
      .select('id, name, client_name, status, user_id, created_at')
      .eq('portal_slug', slug)
      .single()
    if (pe || !proj) { setError('Portal not found.'); setLoading(false); return }
    setProject(proj as Project)

    // Designer profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('studio_name, accent_color')
      .eq('id', (proj as Project).user_id)
      .single()
    if (profile) {
      const p = profile as { studio_name: string | null; accent_color: string | null }
      setStudioName(p.studio_name ?? 'Your Designer')
      setAccentColor(p.accent_color ?? '#5B4CF5')
    }

    const { data: sd } = await supabase
      .from('stages')
      .select('*')
      .eq('project_id', proj.id)
      .order('position', { ascending: true })
    const sl = (sd as unknown as Stage[]) ?? []
    setStages(sl)
    if (sl.length > 0) setActiveStageId(sl[0].id)

    const { data: fd } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', proj.id)
      .order('created_at', { ascending: false })
    setFiles((fd as ProjectFile[]) ?? [])

    const { data: activityData } = await supabase
      .from('activity')
      .select('*')
      .eq('project_id', proj.id)
      .in('type', ['approved', 'changes_requested'])
      .order('created_at', { ascending: false })
    setActivity((activityData as Activity[]) ?? [])

    setLoading(false)
  }, [supabase, slug])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async () => {
    if (!activeStageId || !project) return
    await supabase.from('stages').update({ status: 'complete' }).eq('id', activeStageId)
    await supabase.from('activity').insert({ project_id: project.id, stage_id: activeStageId, type: 'approved', message: null })
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, status: 'complete' } : s))
    setApproved(activeStageId)
    setTimeout(() => setApproved(null), 4000)
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
  }

  const handleRevision = async () => {
    if (!activeStageId || !revisionNote.trim() || !project) return
    await supabase.from('stages').update({ status: 'in_progress' }).eq('id', activeStageId)
    await supabase.from('activity').insert({
      project_id: project.id,
      stage_id: activeStageId,
      type: 'changes_requested',
      message: revisionNote.trim(),
    })
    setStages(prev => prev.map(s => s.id === activeStageId ? { ...s, status: 'in_progress' } : s))
    setSubmitted(activeStageId)
    setShowRevisionInput(false)
    setRevisionNote('')
    setTimeout(() => setSubmitted(null), 4000)
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
          revisionNote: revisionNote ?? '',
        }),
      })
    } catch (err) {
      console.error('Email send failed:', err)
    }
  }

  const activeStage      = stages.find(s => s.id === activeStageId)
  const activeStageFiles = files.filter(f => f.stage_id === activeStageId)
  const activeActivity   = activity.filter(a => a.stage_id === activeStageId)
  const completeCount    = stages.filter(s => s.status === 'complete').length
  const needsApproval    = activeStage?.status === 'in_progress' && activeStageFiles.length > 0

  const designerNote = activeStage?.notes
    ? activeStage.notes.split('📝 Client revision request:')[0].trim()
    : null

  const ac = accentColor

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0B1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        @keyframes pulseOpacity { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', animation: 'pulseOpacity 1.2s ease infinite', marginBottom: '16px' }}>
          Portl<span style={{ color: ac }}>.</span>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Loading your portal…</div>
      </div>
    </div>
  )

  // ── Not found ──────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif", padding: '24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', fontWeight: 900, color: '#E8E4DC' }}>404</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#12111A', marginTop: '16px' }}>This portal doesn&apos;t exist.</div>
        <div style={{ fontSize: '13px', color: '#8A8A9A', marginTop: '8px' }}>Check the link your designer sent you.</div>
      </div>
    </div>
  )

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F1', fontFamily: "'Outfit',sans-serif", color: '#12111A' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pulseOpacity { 0%,100%{opacity:0.4} 50%{opacity:1} }

        @media (max-width: 480px) {
          .portal-header  { padding: 24px 16px !important; }
          .portal-body    { padding: 20px 16px !important; }
          .approval-btns  { flex-direction: column !important; }
          .portal-footer  { flex-direction: column !important; align-items: center !important; gap: 8px !important; }
          .portal-img-max { max-height: 160px !important; }
        }
      `}</style>

      {/* Toast — approved */}
      {approved && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: '#12111A', color: '#fff', padding: '13px 22px', borderRadius: '12px',
          fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100, whiteSpace: 'nowrap',
          animation: 'fadeUp 0.3s ease',
        }}>
          <span style={{ color: '#0BAB6C', fontWeight: 800 }}>✓</span> Stage approved! Your designer has been notified.
        </div>
      )}
      {/* Toast — revision */}
      {submitted && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: '#12111A', color: '#fff', padding: '13px 22px', borderRadius: '12px',
          fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100, whiteSpace: 'nowrap',
          animation: 'fadeUp 0.3s ease',
        }}>
          <span style={{ color: '#F59E0B', fontWeight: 800 }}>✏</span> Feedback sent! Your designer will get back to you.
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — DARK HERO HEADER
      ════════════════════════════════════════════════════════ */}
      <header className="portal-header" style={{ background: '#0D0B1A', padding: '36px 32px 32px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.45)',
            }}>
              {studioName}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>
              Portl<span style={{ color: ac }}>.</span>
            </div>
          </div>

          {/* Hero text */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>
              Hi {project?.client_name}, here&apos;s your project
            </div>
            <h1 style={{
              fontSize: 'clamp(32px,7vw,48px)',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '-2px',
              lineHeight: 1,
              marginBottom: '4px',
            }}>
              {project?.name}
            </h1>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '28px' }}>
              {project?.created_at
                ? `Started ${new Date(project.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : ''}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Progress
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
                {completeCount} of {stages.length} stages
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {stages.map(s => (
                <div key={s.id} style={{
                  flex: 1,
                  height: '3px',
                  borderRadius: '2px',
                  background: s.status === 'complete'
                    ? ac
                    : s.status === 'in_progress'
                      ? 'rgba(255,255,255,0.3)'
                      : 'rgba(255,255,255,0.08)',
                }} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — BODY (warm paper)
      ════════════════════════════════════════════════════════ */}
      <main className="portal-body" style={{ background: '#F8F6F1', padding: '28px 32px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Stage list label */}
        <div style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#B0ADA8', marginBottom: '12px',
        }}>
          Project stages
        </div>

        {/* Stage rows */}
        <div>
          {stages.map((stage, i) => {
            const isComplete   = stage.status === 'complete'
            const isInProgress = stage.status === 'in_progress'
            const isPending    = stage.status === 'not_started'
            const isSelected   = stage.id === activeStageId

            let numBg    = 'rgba(0,0,0,0.05)'
            let numColor = '#C8C5C0'
            if (isComplete)                      { numBg = 'rgba(11,171,108,0.12)'; numColor = '#0BAB6C' }
            else if (isSelected || isInProgress) { numBg = ac + '18';              numColor = ac }

            return (
              <div
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 0',
                  borderBottom: i < stages.length - 1 ? '1px solid #E8E4DC' : 'none',
                  cursor: 'pointer',
                  animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                }}
              >
                {/* Number box */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: numBg, color: numColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 800, flexShrink: 0,
                }}>
                  {isComplete ? '✓' : i + 1}
                </div>

                {/* Middle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: isPending ? 500 : 700,
                    color: isPending ? '#C8C5C0' : '#12111A',
                  }}>
                    {stage.title}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isComplete ? '#0BAB6C' : isInProgress ? ac : '#C8C5C0',
                  }}>
                    {isComplete ? 'Complete' : isInProgress ? 'Awaiting your review' : 'Not started'}
                  </div>
                </div>

                {/* Right indicator */}
                <div style={{ flexShrink: 0, width: '16px', display: 'flex', justifyContent: 'center' }}>
                  {isComplete && (
                    <span style={{ color: '#0BAB6C', fontSize: '13px', fontWeight: 700 }}>✓</span>
                  )}
                  {isInProgress && isSelected && !isComplete && (
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: ac, animation: 'pulse 2s infinite',
                    }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 3 — ACTIVE STAGE PANEL
        ════════════════════════════════════════════════════════ */}
        {activeStage && (
          <div style={{
            marginTop: '24px',
            background: '#fff',
            border: '1px solid #E8E4DC',
            borderRadius: '16px',
            overflow: 'hidden',
            animation: 'fadeUp 0.2s ease',
          }}>

            {/* ── Approval banner ── */}
            {needsApproval && (
              <div style={{
                background: ac + '12',
                borderBottom: `1px solid ${ac}25`,
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#12111A', marginBottom: '4px' }}>
                  Your approval is needed
                </div>
                <div style={{ fontSize: '13px', color: '#6B6B7A', marginBottom: '16px' }}>
                  {studioName} has submitted {activeStage.title} for your review.
                </div>

                <div className="approval-btns" style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleApprove}
                    style={{
                      background: ac, color: '#fff', border: 'none',
                      borderRadius: '8px', padding: '11px 20px',
                      fontSize: '13px', fontWeight: 700, flex: 1,
                      cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRevisionInput(v => !v)}
                    style={{
                      background: 'transparent', border: '1px solid #E8E4DC',
                      color: '#8A8A9A', borderRadius: '8px', padding: '11px 20px',
                      fontSize: '13px', flex: 1, cursor: 'pointer',
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  >
                    Request changes
                  </button>
                </div>

                {showRevisionInput && (
                  <div style={{ marginTop: '12px' }}>
                    <textarea
                      value={revisionNote}
                      onChange={e => setRevisionNote(e.target.value)}
                      placeholder="Describe what you'd like changed…"
                      style={{
                        width: '100%', minHeight: '80px',
                        background: '#F8F6F1', border: '1px solid #E8E4DC',
                        borderRadius: '8px', padding: '12px',
                        fontSize: '13px', color: '#12111A',
                        fontFamily: "'Outfit',sans-serif",
                        resize: 'vertical', outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleRevision}
                      disabled={!revisionNote.trim()}
                      style={{
                        width: '100%', background: '#12111A', color: '#fff',
                        border: 'none', borderRadius: '8px', padding: '11px',
                        fontSize: '13px', fontWeight: 700, marginTop: '8px',
                        cursor: revisionNote.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: "'Outfit',sans-serif",
                        opacity: revisionNote.trim() ? 1 : 0.45,
                      }}
                    >
                      Submit feedback
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Files section ── */}
            <div style={{ padding: '20px' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#B0ADA8', marginBottom: '12px',
              }}>
                Files{activeStageFiles.length > 0 ? ` · ${activeStageFiles.length}` : ''}
              </div>

              {activeStageFiles.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#C8C5C0', padding: '12px 0' }}>
                  No files uploaded yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeStageFiles.map(file => (
                    isImage(file.name) ? (
                      <div key={file.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #E8E4DC' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.file_url}
                          alt={file.name}
                          className="portal-img-max"
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '12px', fontWeight: 600, color: '#12111A',
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {file.name}
                          </span>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: ac, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                          >
                            View →
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div key={file.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px',
                        background: '#F8F6F1', border: '1px solid #E8E4DC', borderRadius: '10px',
                      }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', flexShrink: 0,
                        }}>
                          {fileIcon(file.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px', fontWeight: 600, color: '#12111A',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {file.name}
                          </div>
                          {file.file_size && (
                            <div style={{ fontSize: '11px', color: '#B0ADA8' }}>{formatBytes(file.file_size)}</div>
                          )}
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: ac, fontWeight: 600, textDecoration: 'none', marginLeft: 'auto', flexShrink: 0 }}
                        >
                          View →
                        </a>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* ── Designer note ── */}
            {designerNote && (
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{ height: '1px', background: '#E8E4DC', marginBottom: '20px' }} />
                <div style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#B0ADA8', marginBottom: '8px',
                }}>
                  Note from {studioName}
                </div>
                <p style={{ fontSize: '13px', color: '#6B6B7A', lineHeight: 1.7, fontStyle: 'italic' }}>
                  {designerNote}
                </p>
                <div style={{ fontSize: '11px', color: '#C8C5C0', marginTop: '8px' }}>
                  {studioName}
                </div>
              </div>
            )}

            {/* ── Feedback history ── */}
            {activeActivity.length > 0 && (
              <div style={{ padding: '0 20px 20px' }}>
                <div style={{ height: '1px', background: '#E8E4DC', marginBottom: '20px' }} />
                <div style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#B0ADA8', marginBottom: '12px',
                }}>
                  Feedback history
                </div>

                {/* Latest item */}
                {(() => {
                  const latest    = activeActivity[0]
                  const isApprove = latest.type === 'approved'
                  const color     = isApprove ? '#0BAB6C' : '#F59E0B'
                  const rgbStr    = isApprove ? '11,171,108' : '245,158,11'
                  return (
                    <div style={{
                      background: `rgba(${rgbStr},0.06)`,
                      border: `1px solid rgba(${rgbStr},0.15)`,
                      borderRadius: '10px', padding: '14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color }}>
                            {isApprove ? 'Approved' : 'Changes requested'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#B0ADA8' }}>{timeAgo(latest.created_at)}</span>
                      </div>
                      {latest.message && (
                        <p style={{ fontSize: '13px', color: '#4A4A5A', lineHeight: 1.6, marginTop: '8px' }}>
                          {latest.message}
                        </p>
                      )}
                      <div style={{ fontSize: '11px', color: '#B0ADA8', marginTop: '6px' }}>
                        {project?.client_name}
                      </div>
                    </div>
                  )
                })()}

                {/* Older items toggle */}
                {activeActivity.length > 1 && (
                  <>
                    <button
                      onClick={() => setHistoryExpanded(v => !v)}
                      style={{
                        fontSize: '12px', color: '#B0ADA8', background: 'none',
                        border: 'none', cursor: 'pointer', marginTop: '8px',
                        fontFamily: "'Outfit',sans-serif", padding: 0,
                      }}
                    >
                      {historyExpanded
                        ? 'Hide previous'
                        : `View ${activeActivity.length - 1} previous`}
                    </button>

                    {historyExpanded && activeActivity.slice(1).map(item => {
                      const isApprove = item.type === 'approved'
                      const color     = isApprove ? '#0BAB6C' : '#F59E0B'
                      return (
                        <div key={item.id} style={{
                          background: 'rgba(0,0,0,0.02)', border: '1px solid #E8E4DC',
                          borderRadius: '10px', padding: '12px', marginTop: '8px', opacity: 0.7,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', fontWeight: 700, color }}>
                                {isApprove ? 'Approved' : 'Changes requested'}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#B0ADA8' }}>{timeAgo(item.created_at)}</span>
                          </div>
                          {item.message && (
                            <p style={{ fontSize: '13px', color: '#4A4A5A', lineHeight: 1.6, marginTop: '8px' }}>
                              {item.message}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════
          SECTION 4 — FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0D0B1A', padding: '20px 32px' }}>
        <div
          className="portal-footer"
          style={{
            maxWidth: '640px', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
            Delivered by{' '}
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Portl</span>
            <span style={{ color: ac }}>.</span>
          </span>
          <button
            onClick={() => window.open('https://portl-app.vercel.app', '_blank')}
            style={{
              fontSize: '12px', color: ac, fontWeight: 600,
              cursor: 'pointer', background: 'none', border: 'none',
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            Create your own portal →
          </button>
        </div>
      </footer>
    </div>
  )
}
