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
  const { data } = await supabase
    .from('finca_usuarios')
    .select('rol, fincas(*)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const finca = data ? (data.fincas as unknown as Finca | null) : null
  const rol = (data?.rol as UserRole) ?? null
  return { finca, rol, userId: user.id }
}
