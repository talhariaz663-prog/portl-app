'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      
      setUserEmail(user.email || '')

      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!projectsData || projectsData.length === 0) {
        setProjects([])
        setLoading(false)
        return
      }

      const projectIds = projectsData.map((p: any) => p.id)
      const { data: stagesData } = await supabase
        .from('stages')
        .select('*')
        .in('project_id', projectIds)
        .order('position', { ascending: true })

      const projectsWithStages = projectsData.map((p: any) => ({
        ...p,
        stages: stagesData ? stagesData.filter((s: any) => s.project_id === p.id) : []
      }))

      setProjects(projectsWithStages)
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-outfit), sans-serif' }}>
      <p style={{ color: '#8A8A9A' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', fontFamily: 'var(--font-outfit), sans-serif' }}>
      <nav style={{ borderBottom: '1px solid #E4E4E8', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '1.4rem', color: '#12111A' }}>Portl<span style={{ color: '#5B4CF5' }}>.</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#8A8A9A', fontSize: '0.875rem' }}>{userEmail}</span>
          <button onClick={async () => { const s = createClient(); await s.auth.signOut(); router.push('/login') }} style={{ fontSize: '0.875rem', color: '#12111A', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>
      <main style={{ padding: '2.5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#12111A', marginBottom: '0.25rem' }}>Your Studio</h1>
            <p style={{ color: '#8A8A9A' }}>All your client projects in one place</p>
          </div>
          <button onClick={() => router.push('/dashboard/new')} style={{ background: '#5B4CF5', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>+ New Project</button>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#12111A', marginBottom: '0.5rem' }}>No projects yet</p>
            <p style={{ color: '#8A8A9A', marginBottom: '1.5rem' }}>Create your first client project to get started</p>
            <button onClick={() => router.push('/dashboard/new')} style={{ background: '#5B4CF5', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}>+ New Project</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {projects.map((project: any) => (
              <div key={project.id} onClick={() => router.push(`/dashboard/project/${project.id}`)} style={{ background: '#fff', border: '1px solid #E4E4E8', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer' }}>
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#12111A', marginBottom: '0.25rem' }}>{project.name}</p>
                <p style={{ color: '#8A8A9A', fontSize: '0.85rem', marginBottom: '1rem' }}>{project.client_name}</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {project.stages.map((stage: any) => (
                    <span key={stage.id} style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '999px',
                      background: stage.status === 'complete' ? '#E6F9F2' : stage.status === 'in_progress' ? '#EEF0FE' : '#F4F4F6',
                      color: stage.status === 'complete' ? '#0BAB6C' : stage.status === 'in_progress' ? '#5B4CF5' : '#8A8A9A',
                      border: stage.status === 'not_started' ? '1px solid #E4E4E8' : 'none'
                    }}>{stage.title}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
