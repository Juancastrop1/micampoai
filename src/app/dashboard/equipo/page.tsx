'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getFincaAndRol } from '@/lib/finca'
import type { Finca } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)',
  borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
  fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500,
  color: '#4a4540', display: 'block', marginBottom: '6px',
}

type Member = {
  id: string
  user_id: string
  rol: 'admin' | 'colaborador'
  created_at: string
  user_profiles: { email: string; nombre: string | null } | null
}

export default function EquipoPage() {
  const router = useRouter()
  const [finca, setFinca] = useState<Finca | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  // Invite
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRol, setInviteRol] = useState<'admin' | 'colaborador'>('colaborador')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  // Change rol
  const [changingRol, setChangingRol] = useState<string | null>(null)

  // Remove member
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { finca: currentFinca, rol, userId } = await getFincaAndRol()
    if (rol !== 'admin') { setAccessDenied(true); setLoading(false); return }
    setFinca(currentFinca)
    setMyUserId(userId)
    if (!currentFinca) { setLoading(false); return }

    const supabase = createClient()
    const { data: fuRows } = await supabase
      .from('finca_usuarios')
      .select('id, user_id, rol, created_at')
      .eq('finca_id', currentFinca.id)
      .order('created_at', { ascending: true })

    const userIds = (fuRows ?? []).map(r => r.user_id as string).filter(Boolean)
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('user_profiles').select('id, email, nombre').in('id', userIds)
      : { data: [] as { id: string; email: string; nombre: string | null }[] }

    const profileMap: Record<string, { email: string; nombre: string | null }> = {}
    ;(profiles ?? []).forEach((p: { id: string; email: string; nombre: string | null }) => {
      profileMap[p.id] = { email: p.email, nombre: p.nombre }
    })

    setMembers((fuRows ?? []).map(r => ({
      id: r.id as string,
      user_id: r.user_id as string,
      rol: r.rol as 'admin' | 'colaborador',
      created_at: r.created_at as string,
      user_profiles: profileMap[r.user_id as string] ?? null,
    })))
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!finca || !inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    const supabase = createClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle()

    if (!profile) {
      setInviteError('No se encontró un usuario registrado con ese correo.')
      setInviting(false)
      return
    }

    const alreadyMember = members.some(m => m.user_id === profile.id)
    if (alreadyMember) {
      setInviteError('Este usuario ya es miembro de la finca.')
      setInviting(false)
      return
    }

    const { error } = await supabase.from('finca_usuarios').insert({
      finca_id: finca.id, user_id: profile.id, rol: inviteRol,
    })
    setInviting(false)
    if (error) {
      setInviteError('Error al agregar miembro. Intenta de nuevo.')
    } else {
      setInviteSuccess(`${inviteEmail} agregado como ${inviteRol}.`)
      setInviteEmail('')
      loadData()
    }
  }

  async function handleChangeRol(member: Member, newRol: 'admin' | 'colaborador') {
    if (member.rol === newRol) return
    if (!window.confirm(`¿Cambiar el rol de este miembro a "${newRol}"?`)) return
    setChangingRol(member.id)
    const supabase = createClient()
    await supabase.from('finca_usuarios').update({ rol: newRol }).eq('id', member.id)
    setChangingRol(null)
    loadData()
  }

  async function handleRemove() {
    if (!memberToRemove || !finca) return
    const adminCount = members.filter(m => m.rol === 'admin').length
    if (memberToRemove.rol === 'admin' && adminCount <= 1) {
      alert('No puedes eliminar al último administrador.')
      setMemberToRemove(null)
      return
    }
    setRemoving(true)
    const supabase = createClient()
    await supabase.from('finca_usuarios').delete().eq('id', memberToRemove.id)
    setRemoving(false)
    setMemberToRemove(null)
    loadData()
  }

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>

  if (accessDenied) {
    return (
      <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>
        <p>No tienes permiso para ver esta página.</p>
        <button onClick={() => router.push('/dashboard')}
          style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px' }}>
          Volver al Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '800px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 4px' }}>
        Equipo de {finca?.nombre ?? 'la finca'}
      </h1>
      <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: '0 0 28px' }}>
        Miembros con acceso a esta finca
      </p>

      {/* Members table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden', marginBottom: '28px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 600, color: '#1c1a17' }}>Miembros ({members.length})</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#faf8f4' }}>
              {['Correo', 'Nombre', 'Rol', 'Desde', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', textAlign: 'left', borderBottom: '1px solid rgba(60,45,30,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const isMe = m.user_id === myUserId
              return (
                <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17' }}>
                    {m.user_profiles?.email ?? '—'}
                    {isMe && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#8c7f74' }}>(tú)</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540' }}>
                    {m.user_profiles?.nombre ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '11px', fontFamily: 'var(--font-sans), sans-serif', fontWeight: 600,
                      padding: '2px 8px', borderRadius: '4px',
                      backgroundColor: m.rol === 'admin' ? 'rgba(26,107,69,0.12)' : 'rgba(37,99,235,0.12)',
                      color: m.rol === 'admin' ? '#1a6b45' : '#2563eb',
                    }}>
                      {m.rol === 'admin' ? 'Admin' : 'Colaborador'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', whiteSpace: 'nowrap' }}>
                    {m.created_at.split('T')[0]}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {!isMe && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          value={m.rol}
                          disabled={changingRol === m.id}
                          onChange={e => handleChangeRol(m, e.target.value as 'admin' | 'colaborador')}
                          style={{ padding: '4px 8px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: '#faf8f4', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer' }}>
                          <option value="admin">Admin</option>
                          <option value="colaborador">Colaborador</option>
                        </select>
                        <button onClick={() => setMemberToRemove(m)}
                          style={{ padding: '4px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#8B1A1A', whiteSpace: 'nowrap' }}>
                          Quitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Invite section */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 16px' }}>Invitar miembro</h2>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="usuario@correo.com"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Rol</label>
              <select value={inviteRol} onChange={e => setInviteRol(e.target.value as 'admin' | 'colaborador')}
                style={{ ...inputStyle, cursor: 'pointer', width: 'auto' }}>
                <option value="colaborador">Colaborador</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={inviting}
              style={{ padding: '10px 20px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {inviting ? 'Buscando...' : 'Agregar'}
            </button>
          </div>
          {inviteError && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', marginTop: '10px' }}>{inviteError}</p>}
          {inviteSuccess && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1a6b45', marginTop: '10px' }}>{inviteSuccess}</p>}
        </form>
        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', marginTop: '12px' }}>
          El usuario debe tener una cuenta en Mi Campo.AI para poder agregarlo.
        </p>
      </div>

      {/* Remove confirm modal */}
      {memberToRemove && (
        <div onClick={() => setMemberToRemove(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 10px' }}>¿Quitar miembro?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 20px' }}>
              Se quitará el acceso de <strong>{memberToRemove.user_profiles?.email ?? 'este usuario'}</strong> a la finca. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setMemberToRemove(null)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={handleRemove} disabled={removing}
                style={{ padding: '10px 20px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: removing ? 'not-allowed' : 'pointer', opacity: removing ? 0.7 : 1 }}>
                {removing ? 'Quitando...' : 'Quitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
