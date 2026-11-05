import { createClient } from '@/lib/supabase'
import type { Finca } from '@/lib/types'

export type UserRole = 'admin' | 'colaborador' | null

export function getSelectedFincaId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('selectedFincaId')
}

export function setSelectedFincaId(fincaId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('selectedFincaId', fincaId)
}

export async function getFincaAndRol(): Promise<{
  finca: Finca | null
  rol: UserRole
  userId: string | null
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { finca: null, rol: null, userId: null }

  const { data: fuRows } = await supabase
    .from('finca_usuarios')
    .select('finca_id, rol')
    .eq('user_id', user.id)

  if (!fuRows?.length) return { finca: null, rol: null, userId: user.id }

  const fincaIds = fuRows.map(r => r.finca_id as string).filter(Boolean)
  const { data: fincasData } = await supabase
    .from('fincas')
    .select('*')
    .in('id', fincaIds)

  if (!fincasData?.length) return { finca: null, rol: null, userId: user.id }

  const selectedId = getSelectedFincaId()
  const selectedRow = fuRows.find(r => r.finca_id === selectedId) ?? fuRows[0]
  const selectedFinca = fincasData.find(f => f.id === selectedRow.finca_id) ?? fincasData[0]

  return {
    finca: (selectedFinca as Finca) ?? null,
    rol: (selectedRow.rol as UserRole) ?? null,
    userId: user.id,
  }
}
