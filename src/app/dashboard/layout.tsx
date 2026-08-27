import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Sidebar } from './Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: fuData } = await supabase
    .from('finca_usuarios')
    .select('rol')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const rol = (fuData?.rol as 'admin' | 'colaborador' | null) ?? null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar email={user.email ?? ''} rol={rol} />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#faf8f4' }}>
        {children}
      </main>
    </div>
  )
}
