// app/dashboard/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Project name is required.')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        designer_id: user.id,
      })
      .select()
      .single()

    if (insertError || !data) {
      setError('Failed to create project. Please try again.')
      setLoading(false)
      return
    }

    router.push(`/dashboard/projects/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl p-8 border border-white/10">
        <h1 className="text-2xl font-semibold mb-1">New Project</h1>
        <p className="text-sm text-white/40 mb-8">Fill in the details to get started.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Brand Refresh — Marble & Co."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Client Name</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Client Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={e => setClientEmail(e.target.value)}
              placeholder="e.g. sarah@marbleandco.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-white/30 placeholder:text-white/20"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/30 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}