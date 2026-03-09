'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_STAGES = [
  'Discovery & Brief',
  'Moodboard',
  'Design',
  'Final Delivery',
]

function generatePortalSlug(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

export default function NewProjectPage() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleStageChange(index: number, value: string) {
    setStages((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleRemoveStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddStage() {
    setStages((prev) => [...prev, ''])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const slug = Math.random().toString(36).substring(2, 10)

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: projectName.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        portal_slug: slug,
        user_id: user.id,
      })
      .select()
      .single()

    if (projectError) {
      console.error('Project insert error:', JSON.stringify(projectError))
      setError('Unable to create project: ' + projectError.message)
      setLoading(false)
      return
    }

    const stageInserts = stages
      .filter(s => s.trim())
      .map((title, index) => ({
        project_id: project.id,
        title,
        position: index,
        status: 'not_started',
      }))

    const { error: stagesError } = await supabase
      .from('stages')
      .insert(stageInserts)

    if (stagesError) {
      console.error('Stages insert error:', JSON.stringify(stagesError))
      setError('Project created but stages failed: ' + stagesError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div
      className="min-h-screen px-6 py-6"
      style={{
        background: '#FAFAFA',
        fontFamily: 'var(--font-outfit), sans-serif',
      }}
    >
      {/* Top bar with back link and centered logo */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: '#71717A' }}
          >
            <span className="text-base">{'\u2190'}</span>
            <span>Back</span>
          </Link>
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

      <main className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#12111A' }}>
            New Project
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
            Set up your client project
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: '#12111A' }}>
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Marble & Co. Brand Refresh"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CF5]/30 focus:border-[#5B4CF5]"
                style={{ borderColor: '#E4E4E8', color: '#12111A' }}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: '#12111A' }}>
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CF5]/30 focus:border-[#5B4CF5]"
                style={{ borderColor: '#E4E4E8', color: '#12111A' }}
                disabled={loading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: '#12111A' }}>
                Client Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CF5]/30 focus:border-[#5B4CF5]"
                style={{ borderColor: '#E4E4E8', color: '#12111A' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium" style={{ color: '#12111A' }}>
                Stages
              </h2>
              <button
                type="button"
                onClick={handleAddStage}
                className="text-xs font-medium"
                style={{ color: '#5B4CF5' }}
                disabled={loading}
              >
                + Add stage
              </button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={stage}
                    onChange={(e) => handleStageChange(index, e.target.value)}
                    placeholder={`Stage ${index + 1}`}
                    className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CF5]/30 focus:border-[#5B4CF5]"
                    style={{ borderColor: '#E4E4E8', color: '#12111A' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStage(index)}
                    className="text-xs px-2 py-1 rounded-md border"
                    style={{ borderColor: '#E4E4E8', color: '#71717A' }}
                    disabled={loading || stages.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#5B4CF5' }}
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </main>
    </div>
  )
}
