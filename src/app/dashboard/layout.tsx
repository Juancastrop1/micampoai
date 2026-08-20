import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Sidebar } from './Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar email={user.email ?? ''} />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#faf8f4' }}>
        {children}
      </main>
    </div>
  )
}
