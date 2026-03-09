'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PortalPage() {
  const params = useParams()
  const slug = params.slug as string
  const [project, setProject] = useState<any>(null)
  const [stages, setStages] = useState<any[]>([])
  const [stageFiles, setStageFiles] = useState<Record<string, any[]>>({})
  const [stageApprovals, setStageApprovals] = useState<Record<string, any>>({})
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({})
  const [showRevisionInput, setShowRevisionInput] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('portal_slug', slug)
        .maybeSingle()

      if (!proj) { setNotFound(true); setLoading(false); return }
      setProject(proj)

      const { data: stagesData } = await supabase
        .from('stages')
        .select('*')
        .eq('project_id', proj.id)
        .order('position', { ascending: true })

      if (!stagesData) { setLoading(false); return }
      setStages(stagesData)

      const filesMap: Record<string, any[]> = {}
      const approvalsMap: Record<string, any> = {}

      for (const stage of stagesData) {
        const { data: files } = await supabase
          .from('files')
          .select('*')
          .eq('stage_id', stage.id)
        filesMap[stage.id] = files || []

        const { data: approval } = await supabase
          .from('approvals')
          .select('*')
          .eq('stage_id', stage.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        approvalsMap[stage.id] = approval || null
      }

      setStageFiles(filesMap)
      setStageApprovals(approvalsMap)
      setLoading(false)
    }
    load()
  }, [slug])

  async function handleApprove(stageId: string) {
    const supabase = createClient()
    const approval = stageApprovals[stageId]
    if (!approval) return
    await supabase
      .from('approvals')
      .update({ status: 'complete', approved_at: new Date().toISOString() })
      .eq('id', approval.id)
    setStageApprovals(prev => ({ ...prev, [stageId]: { ...approval, status: 'complete' } }))
  }

  async function handleRevision(stageId: string) {
    const supabase = createClient()
    const approval = stageApprovals[stageId]
    if (!approval) return
    const note = revisionNotes[stageId] || ''
    await supabase
      .from('approvals')
      .update({ status: 'revision', client_note: note })
      .eq('id', approval.id)
    setStageApprovals(prev => ({ ...prev, [stageId]: { ...approval, status: 'revision', client_note: note } }))
    setShowRevisionInput(prev => ({ ...prev, [stageId]: false }))
  }

  function formatSize(bytes: number) {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'var(--font-outfit), sans-serif', background: '#FAFAFA' }}>
      <p style={{ color: '#8A8A9A' }}>Loading...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'var(--font-outfit), sans-serif', background: '#FAFAFA' }}>
      <p style={{ color: '#EF4444' }}>Project not found.</p>
    </div>
  )

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', fontFamily: 'var(--font-outfit), sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '1.5rem', borderBottom: '1px solid #E4E4E8', background: '#fff' }}>
        <span style={{ fontWeight: 700, fontSize: '1.4rem', color: '#12111A' }}>Portl<span style={{ color: '#5B4CF5' }}>.</span></span>
        <p style={{ color: '#8A8A9A', fontSize: '0.75rem', marginTop: '0.25rem' }}>Powered by Portl</p>
      </div>

      <main style={{ maxWidth: '780px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#12111A', marginBottom: '0.25rem' }}>{project.name}</h1>
        <p style={{ color: '#8A8A9A', marginBottom: '2.5rem' }}>Client: {project.client_name}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {stages.map((stage, i) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.85rem', whiteSpace: 'nowrap',
                background: stage.status === 'complete' ? '#E6F9F2' : stage.status === 'in_progress' ? '#EEF0FE' : '#fff',
                color: stage.status === 'complete' ? '#0BAB6C' : stage.status === 'in_progress' ? '#5B4CF5' : '#8A8A9A',
                border: '1px solid ' + (stage.status === 'complete' ? '#0BAB6C' : stage.status === 'in_progress' ? '#5B4CF5' : '#E4E4E8'),
                fontWeight: stage.status === 'in_progress' ? 600 : 400
              }}>{stage.title}</span>
              {i < stages.length - 1 && <span style={{ color: '#E4E4E8' }}>→</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {stages.map((stage) => {
            const files = stageFiles[stage.id] || []
            const approval = stageApprovals[stage.id]
            return (
              <div key={stage.id} style={{ background: '#fff', border: '1px solid #E4E4E8', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontWeight: 600, fontSize: '1.05rem', color: '#12111A' }}>{stage.title}</h2>
                  <span style={{
                    fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '999px',
                    background: stage.status === 'complete' ? '#E6F9F2' : stage.status === 'in_progress' ? '#EEF0FE' : '#F4F4F6',
                    color: stage.status === 'complete' ? '#0BAB6C' : stage.status === 'in_progress' ? '#5B4CF5' : '#8A8A9A',
                  }}>
                    {stage.status === 'complete' ? 'Complete' : stage.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                  </span>
                </div>

                {files.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#8A8A9A', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {files.map((file: any) => (
                        <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: '#F4F4F6', borderRadius: '8px' }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', color: '#12111A', fontWeight: 500 }}>{file.name}</p>
                            <p style={{ fontSize: '0.75rem', color: '#8A8A9A' }}>{formatSize(file.size)}</p>
                          </div>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#5B4CF5', fontWeight: 600, textDecoration: 'none' }}>Open</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {approval && (
                  <div>
                    <p style={{ fontSize: '0.8rem', color: '#8A8A9A', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval</p>
                    {approval.status === 'pending' && (
                      <div>
                        <p style={{ fontSize: '0.9rem', color: '#12111A', marginBottom: '1rem' }}>Your approval is needed for this stage.</p>
                        {!showRevisionInput[stage.id] ? (
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => handleApprove(stage.id)} style={{ background: '#0BAB6C', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                              Approve ✓
                            </button>
                            <button onClick={() => setShowRevisionInput(prev => ({ ...prev, [stage.id]: true }))} style={{ background: '#F4F4F6', color: '#12111A', border: '1px solid #E4E4E8', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                              Request Revision
                            </button>
                          </div>
                        ) : (
                          <div>
                            <textarea
                              placeholder="Describe what needs to be changed..."
                              value={revisionNotes[stage.id] || ''}
                              onChange={(e) => setRevisionNotes(prev => ({ ...prev, [stage.id]: e.target.value }))}
                              style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E4E4E8', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '0.75rem', boxSizing: 'border-box', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button onClick={() => handleRevision(stage.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                                Submit Revision Request
                              </button>
                              <button onClick={() => setShowRevisionInput(prev => ({ ...prev, [stage.id]: false }))} style={{ background: 'none', color: '#8A8A9A', border: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {approval.status === 'complete' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#E6F9F2', borderRadius: '8px' }}>
                        <span style={{ color: '#0BAB6C', fontWeight: 600 }}>✓ Approved</span>
                      </div>
                    )}
                    {approval.status === 'revision' && (
                      <div style={{ padding: '0.75rem 1rem', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                        <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: approval.client_note ? '0.4rem' : 0 }}>Revision Requested</p>
                        {approval.client_note && <p style={{ color: '#12111A', fontSize: '0.875rem' }}>{approval.client_note}</p>}
                      </div>
                    )}
                  </div>
                )}

                {files.length === 0 && !approval && (
                  <p style={{ color: '#8A8A9A', fontSize: '0.875rem' }}>Nothing to review yet for this stage.</p>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}