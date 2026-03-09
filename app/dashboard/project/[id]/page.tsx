'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type StageStatus = 'completed' | 'active' | 'upcoming'

type Project = {
  id: string
  name: string
  client_name: string | null
  portal_slug: string | null
}

type Stage = {
  id: string
  project_id: string
  title: string
  status: StageStatus
  position: number | null
}

type ProjectFile = {
  id: string
  stage_id: string
  name: string | null
  url: string
  size: number | null
}

type Approval = {
  id: string
  stage_id: string
  status: 'pending' | 'approved' | 'revision_requested'
  note: string | null
  created_at: string | null
  updated_at?: string | null
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [approval, setApproval] = useState<Approval | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState<'Share portal link' | 'Link copied!'>(
    'Share portal link'
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    async function load() {
      if (!params?.id) return

      setLoading(true)
      setError(null)

      const projectId = params.id

      const [
        { data: projectData, error: projectError },
        { data: stagesData, error: stagesError },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, client_name, portal_slug')
          .eq('id', projectId)
          .single(),
        supabase
          .from('stages')
          .select('id, project_id, title, status, position')
          .eq('project_id', projectId)
          .order('position', { ascending: true }),
      ])

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          setError('Project not found.')
        } else {
          setError('Unable to load project.')
        }
        setLoading(false)
        return
      }

      if (stagesError) {
        setError('Unable to load stages.')
        setLoading(false)
        return
      }

      setProject(projectData)
      setStages(stagesData ?? [])
      setActiveStageId((stagesData && stagesData[0]?.id) ?? null)
      setLoading(false)
    }

    void load()

    return () => {
      subscription.unsubscribe()
    }
  }, [params, router])

  const activeStage = useMemo(
    () => stages.find((s) => s.id === activeStageId) ?? stages[0] ?? null,
    [stages, activeStageId]
  )

  const activeStatusLabel = useMemo(() => {
    if (!activeStage) return ''
    if (activeStage.status === 'completed') return 'Complete'
    if (activeStage.status === 'active') return 'In Progress'
    return 'Not Started'
  }, [activeStage])

  useEffect(() => {
    async function loadFiles() {
      if (!activeStageId) {
        setFiles([])
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('files')
        .select('*')
        .eq('stage_id', activeStageId)
        .order('created_at', { ascending: false })

      setFiles((data as ProjectFile[]) ?? [])
    }

    void loadFiles()
  }, [activeStageId])

  useEffect(() => {
    async function loadApproval() {
      if (!activeStageId) {
        setApproval(null)
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('approvals')
        .select('*')
        .eq('stage_id', activeStageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setApproval((data as Approval | null) ?? null)
    }

    void loadApproval()
  }, [activeStageId])

  async function updateStageStatus(stageId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('stages')
      .update({ status: newStatus })
      .eq('id', stageId)

    if (error) {
      console.error('Stage update error:', JSON.stringify(error))
      alert('Failed to update: ' + error.message)
      return
    }

    // Update local state instead of reloading page
    setStages(prev => prev.map(s =>
      s.id === stageId ? { ...s, status: newStatus as StageStatus } : s
    ))
  }

  function formatFileSize(size: number | null): string {
    if (!size || size <= 0) return '0 KB'
    const kb = size / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  function isImageFile(url: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(url)
  }

  async function handleFileUpload(file: File) {
    if (!project || !activeStageId) return

    setUploading(true)
    const supabase = createClient()

    const path = `${project.id}/${activeStageId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(path, file)

    if (uploadError) {
      console.error('File upload error:', JSON.stringify(uploadError))
      alert('Failed to upload file: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicData } = supabase.storage
      .from('project-files')
      .getPublicUrl(path)

    const publicUrl = publicData.publicUrl

    const { data: inserted, error: insertError } = await supabase
      .from('files')
      .insert({
        stage_id: activeStageId,
        name: file.name,
        url: publicUrl,
        size: file.size,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('File record insert error:', JSON.stringify(insertError))
      alert('File uploaded but saving metadata failed: ' + insertError.message)
      setUploading(false)
      return
    }

    setFiles(prev => [inserted as ProjectFile, ...prev])
    setUploading(false)
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    void handleFileUpload(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    void handleFileUpload(file)
  }

  async function handleRequestApproval() {
    if (!activeStageId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('approvals')
      .insert({ stage_id: activeStageId, status: 'pending' })
      .select('*')
      .single()

    if (error) {
      console.error('Approval insert error:', JSON.stringify(error))
      alert('Failed to request approval: ' + error.message)
      return
    }

    setApproval(data as Approval)
  }

  function formatApprovalDate(dateString: string | null): string {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  async function handleCopyPortalLink() {
    if (!project?.portal_slug) return

    const url = `${window.location.origin}/portal/${project.portal_slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyLabel('Link copied!')
      setTimeout(() => setCopyLabel('Share portal link'), 1500)
    } catch {
      // ignore
    }
  }

  function statusStyles(status: StageStatus): { pill: CSSProperties; badge: CSSProperties } {
    if (status === 'completed') {
      return {
        pill: {
          background: '#E6F9F2',
          color: '#0BAB6C',
        },
        badge: {
          background: '#E6F9F2',
          color: '#0BAB6C',
        },
      }
    }

    if (status === 'active') {
      return {
        pill: {
          background: '#EEF0FE',
          color: '#5B4CF5',
        },
        badge: {
          background: '#EEF0FE',
          color: '#5B4CF5',
        },
      }
    }

    return {
      pill: {
        background: '#FFFFFF',
        color: '#71717A',
        borderColor: '#E4E4E8',
        borderWidth: 1,
        borderStyle: 'solid',
      },
      badge: {
        background: '#FFFFFF',
        color: '#71717A',
        borderColor: '#E4E4E8',
        borderWidth: 1,
        borderStyle: 'solid',
      },
    }
  }

  function statusOptionToStatus(value: string): StageStatus {
    if (value === 'completed') return 'completed'
    if (value === 'active') return 'active'
    return 'upcoming'
  }

  return (
    <div
      className="min-h-screen px-6 py-6"
      style={{
        background: '#FAFAFA',
        fontFamily: 'var(--font-outfit), sans-serif',
      }}
    >
      {/* Top nav */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex-1">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: '#71717A' }}
          >
            <span className="text-base">{'\u2190'}</span>
            <span>Back</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold" style={{ color: '#12111A' }}>
              Portl
            </span>
            <span className="text-xl font-bold" style={{ color: '#5B4CF5' }}>
              .
            </span>
          </div>
        </div>
        <div className="flex-1" />
      </header>

      <main className="mx-auto max-w-4xl">
        {loading ? (
          <p className="text-sm" style={{ color: '#71717A' }}>
            Loading project...
          </p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !project ? (
          <p className="text-sm" style={{ color: '#71717A' }}>
            Project not found.
          </p>
        ) : (
          <>
            <section className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: '#12111A' }}>
                  {project.name}
                </h1>
                {project.client_name && (
                  <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
                    {project.client_name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopyPortalLink}
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
                style={{
                  borderColor: '#5B4CF5',
                  color: '#5B4CF5',
                  background: '#FFFFFF',
                }}
              >
                {copyLabel}
              </button>
            </section>

            {/* Stage timeline */}
            {stages.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                  {stages.map((stage, index) => {
                    const isActive = (activeStage?.id ?? activeStageId) === stage.id
                    const { pill } = statusStyles(stage.status)

                    const nodeStyles: CSSProperties = {
                      ...pill,
                      padding: '0.5rem 0.9rem',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      transition: 'transform 120ms ease',
                    }

                    return (
                      <div key={stage.id} className="flex items-center">
                        <button
                          type="button"
                          style={nodeStyles}
                          onClick={() => setActiveStageId(stage.id)}
                        >
                          {stage.status === 'completed' && (
                            <span aria-hidden="true">✓</span>
                          )}
                          <span>{stage.title}</span>
                        </button>
                        {index < stages.length - 1 && (
                          <div
                            className="mx-2 h-px w-8 md:w-12"
                            style={{ background: '#E4E4E8' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Active stage detail panel */}
            {activeStage && (
              <section className="rounded-2xl bg-white p-5 shadow-sm border" style={{ borderColor: '#E4E4E8' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: '#12111A' }}>
                      {activeStage.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                      style={statusStyles(activeStage.status).badge}
                    >
                      {activeStatusLabel}
                    </span>

                    <select 
                      value={activeStage.status} 
                      onChange={(e) => updateStageStatus(activeStage.id, e.target.value)}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #E4E4E8', fontSize: '0.85rem', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-medium" style={{ color: '#12111A' }}>
                      Files
                    </h3>
                    <div className="space-y-3">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault()
                        }}
                        onDrop={onDrop}
                        className="cursor-pointer"
                        style={{
                          border: '1px dashed #E4E4E8',
                          borderRadius: '12px',
                          padding: '1rem',
                          background: '#FAFAFA',
                          textAlign: 'center',
                          color: '#71717A',
                          fontSize: '0.85rem',
                        }}
                      >
                        {uploading ? 'Uploading…' : 'Click to upload or drag and drop'}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={onFileInputChange}
                        style={{ display: 'none' }}
                      />

                      {files.length === 0 ? (
                        <div
                          className="rounded-xl border bg-[#FAFAFA] px-4 py-6 text-sm"
                          style={{ borderColor: '#E4E4E8', color: '#71717A' }}
                        >
                          No files yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2 text-sm"
                              style={{ borderColor: '#E4E4E8', color: '#12111A' }}
                            >
                              {isImageFile(file.url) && (
                                <img
                                  src={file.url}
                                  alt={file.name ?? 'File preview'}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{file.name}</p>
                                <p className="text-xs" style={{ color: '#71717A' }}>
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium"
                                style={{ color: '#5B4CF5' }}
                              >
                                Open
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-medium" style={{ color: '#12111A' }}>
                      Approvals
                    </h3>
                    {!approval ? (
                      <div className="space-y-3">
                        <div
                          className="rounded-xl border bg-[#FAFAFA] px-4 py-6 text-sm"
                          style={{ borderColor: '#E4E4E8', color: '#71717A' }}
                        >
                          No approval requested yet
                        </div>
                        <button
                          type="button"
                          onClick={handleRequestApproval}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                          style={{ background: '#5B4CF5' }}
                        >
                          Request Approval
                        </button>
                      </div>
                    ) : (
                      <div
                        className="rounded-xl border bg-white px-4 py-4 text-sm"
                        style={{ borderColor: '#E4E4E8' }}
                      >
                        {approval.status === 'pending' && (
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                            style={{ background: '#FEF3C7', color: '#B45309' }}
                          >
                            Awaiting client approval
                          </span>
                        )}
                        {approval.status === 'approved' && (
                          <div className="space-y-1">
                            <span
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                              style={{ background: '#E6F9F2', color: '#0BAB6C' }}
                            >
                              Approved ✓
                            </span>
                            {(approval.updated_at || approval.created_at) && (
                              <p className="mt-2 text-xs" style={{ color: '#71717A' }}>
                                {formatApprovalDate(approval.updated_at || approval.created_at)}
                              </p>
                            )}
                          </div>
                        )}
                        {approval.status === 'revision_requested' && (
                          <div className="space-y-2">
                            <span
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                              style={{ background: '#FEE2E2', color: '#DC2626' }}
                            >
                              Revision requested
                            </span>
                            {approval.note && (
                              <p className="mt-2 text-sm" style={{ color: '#12111A' }}>
                                {approval.note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
