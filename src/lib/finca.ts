import { createClient } from '@/lib/supabase'
import type { Finca } from '@/lib/types'

export type UserRole = 'admin' | 'colaborador' | null

export async function getFincaAndRol(): Promise<{
  finca: Finca | null
  rol: UserRole
  userId: string | null
}> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { finca: null, rol: null, userId: null }

  const { data: fuData } = await supabase
    .from('finca_usuarios')
    .select('finca_id, rol')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!fuData?.finca_id) return { finca: null, rol: (fuData?.rol as UserRole) ?? null, userId: user.id }

  const { data: fincaData } = await supabase
    .from('fincas')
    .select('*')
    .eq('id', fuData.finca_id)
    .single()

  return {
    finca: (fincaData as Finca | null) ?? null,
    rol: (fuData.rol as UserRole) ?? null,
    userId: user.id,
  }
}
