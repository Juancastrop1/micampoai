'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Finca } from '@/lib/types'
import { setSelectedFincaId as saveSelectedFincaId } from '@/lib/finca'
import type { UserRole } from '@/lib/finca'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2L14 6.5V14H10V10H6V14H2V6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/animales',
    label: 'Animales',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="10" rx="5" ry="3.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M3.5 10V12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M12.5 10V12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 6.5L4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M10.5 6.5L11.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/dashboard/leche',
    label: 'Leche',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2C8 2 4 7 4 10.5C4 12.4 5.8 14 8 14C10.2 14 12 12.4 12 10.5C12 7 8 2 8 2Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/calendario',
    label: 'Calendario',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M5 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M2 7H14" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/eventos',
    label: 'Eventos',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M5 6H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5 9H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5 12H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
]

const equipoIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path d="M1 13C1 10.8 3.2 9 6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="11" cy="6" r="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path d="M8.5 13C8.5 11.3 9.6 10 11 10C12.4 10 13.5 11.3 13.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M6 13H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [busquedaGlobal, setBusquedaGlobal] = useState('')

  const [fincas, setFincas] = useState<{ finca: Finca; rol: UserRole }[]>([])
  const [selectedFincaId, setSelectedFincaId] = useState<string | null>(null)
  const [currentRol, setCurrentRol] = useState<UserRole>(null)

  const [showNuevaFinca, setShowNuevaFinca] = useState(false)
  const [nuevaNombre, setNuevaNombre] = useState('')
  const [nuevaUbicacion, setNuevaUbicacion] = useState('')
  const [savingFinca, setSavingFinca] = useState(false)
  const [errorFinca, setErrorFinca] = useState<string | null>(null)

  useEffect(() => { loadFincas() }, [])

  async function loadFincas() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: fuRows } = await supabase
      .from('finca_usuarios')
      .select('finca_id, rol')
      .eq('user_id', user.id)

    if (!fuRows?.length) return

    const fincaIds = fuRows.map(r => r.finca_id as string).filter(Boolean)
    const { data: fincasData } = await supabase
      .from('fincas')
      .select('*')
      .in('id', fincaIds)

    if (!fincasData?.length) return

    const result = fuRows
      .map(r => ({
        finca: fincasData.find(f => f.id === r.finca_id) as Finca | undefined,
        rol: r.rol as UserRole,
      }))
      .filter((r): r is { finca: Finca; rol: UserRole } => r.finca != null)

    setFincas(result)

    const savedId = localStorage.getItem('selectedFincaId')
    const selected = result.find(r => r.finca.id === savedId) ?? result[0]
    if (selected) {
      setSelectedFincaId(selected.finca.id)
      setCurrentRol(selected.rol)
    }
  }

  function handleChangeFinca(fincaId: string) {
    localStorage.setItem('selectedFincaId', fincaId)
    window.location.reload()
  }

  async function handleCrearFinca(e: React.FormEvent) {
    e.preventDefault()
    if (!nuevaNombre.trim()) return
    setSavingFinca(true)
    setErrorFinca(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('crear_finca', {
        p_nombre: nuevaNombre.trim(),
        p_ubicacion: nuevaUbicacion.trim() || null,
      })

      if (error || !data) {
        console.error('Error en crear_finca RPC:', error)
        setErrorFinca(error?.message ?? 'Error al crear la finca. Intenta de nuevo.')
        setSavingFinca(false)
        return
      }

      saveSelectedFincaId(data as string)
      setShowNuevaFinca(false)
      setNuevaNombre('')
      setNuevaUbicacion('')
      setSavingFinca(false)
      window.location.reload()
    } catch (err) {
      console.error('Error inesperado creando finca:', err)
      setErrorFinca('Error inesperado. Revisa la consola y vuelve a intentarlo.')
      setSavingFinca(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isAdmin = currentRol === 'admin'

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 10px',
    fontFamily: 'var(--font-sans), sans-serif',
    fontSize: '13px',
    color: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  }

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#1c1a17',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 12px' }}>
        <Image
          src="/micampo_logo_cream.png"
          alt="Mi Campo.AI"
          width={140}
          height={42}
          priority
          style={{ objectFit: 'contain', mixBlendMode: 'multiply', width: '140px' }}
        />

        {/* Finca selector */}
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {fincas.length > 1 ? (
            <select
              value={selectedFincaId ?? ''}
              onChange={e => handleChangeFinca(e.target.value)}
              style={selectStyle}
            >
              {fincas.map(r => (
                <option key={r.finca.id} value={r.finca.id} style={{ backgroundColor: '#2a2824', color: '#ffffff' }}>
                  {r.finca.nombre}
                </option>
              ))}
            </select>
          ) : fincas.length === 1 ? (
            <span style={{
              flex: 1, minWidth: 0,
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '13px', fontWeight: 500,
              color: 'rgba(255,255,255,0.75)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fincas[0].finca.nombre}
            </span>
          ) : (
            <span style={{ flex: 1 }} />
          )}
          <button
            onClick={() => setShowNuevaFinca(true)}
            title="Nueva finca"
            style={{
              flexShrink: 0,
              width: '26px', height: '26px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '6px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '16px', lineHeight: '24px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-sans), sans-serif',
            }}
          >
            +
          </button>
        </div>

        <input
          type="text"
          value={busquedaGlobal}
          onChange={e => setBusquedaGlobal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && busquedaGlobal.trim()) {
              router.push(`/dashboard/animales?buscar=${encodeURIComponent(busquedaGlobal.trim())}`)
              setBusquedaGlobal('')
            }
          }}
          placeholder="Buscar..."
          style={{
            marginTop: '10px', width: '100%', boxSizing: 'border-box',
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: '6px',
            fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px',
            color: '#ffffff', outline: 'none',
          }}
        />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const isHovered = hovered === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: '14px',
                transition: 'background-color 0.15s, color 0.15s',
                backgroundColor: isActive
                  ? 'rgba(26,107,69,0.4)'
                  : isHovered
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
                color: isActive ? '#6ee7b7' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.6)',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        {/* Equipo — solo admins */}
        {isAdmin && (() => {
          const href = '/dashboard/equipo'
          const isActive = pathname.startsWith(href)
          const isHovered = hovered === href
          return (
            <Link
              href={href}
              onMouseEnter={() => setHovered(href)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: '14px',
                transition: 'background-color 0.15s, color 0.15s',
                backgroundColor: isActive
                  ? 'rgba(26,107,69,0.4)'
                  : isHovered
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
                color: isActive ? '#6ee7b7' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.6)',
              }}
            >
              {equipoIcon}
              Equipo
            </Link>
          )
        })()}
      </nav>

      {/* User + sign out */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {email}
          </span>
          {currentRol && (
            <span style={{
              flexShrink: 0,
              fontSize: '10px',
              fontFamily: 'var(--font-sans), sans-serif',
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: currentRol === 'admin' ? 'rgba(26,107,69,0.4)' : 'rgba(37,99,235,0.35)',
              color: currentRol === 'admin' ? '#6ee7b7' : '#93c5fd',
            }}>
              {currentRol === 'admin' ? 'Admin' : 'Colabor.'}
            </span>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '7px 12px',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          }}
        >
          {signingOut ? 'Cerrando...' : 'Cerrar sesión'}
        </button>
      </div>

      {/* Nueva finca modal */}
      {showNuevaFinca && (
        <div
          onClick={() => { setShowNuevaFinca(false); setErrorFinca(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 20px' }}>Nueva finca</h2>
            <form onSubmit={handleCrearFinca} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, color: '#4a4540', display: 'block', marginBottom: '6px' }}>Nombre *</label>
                <input
                  value={nuevaNombre}
                  onChange={e => setNuevaNombre(e.target.value)}
                  placeholder="Finca La Esperanza"
                  required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px', fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, color: '#4a4540', display: 'block', marginBottom: '6px' }}>Ubicación</label>
                <input
                  value={nuevaUbicacion}
                  onChange={e => setNuevaUbicacion(e.target.value)}
                  placeholder="Municipio, Departamento"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px', fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {errorFinca && (
                <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', margin: 0, padding: '8px 12px', backgroundColor: '#fff0f0', borderRadius: '6px', border: '1px solid rgba(139,26,26,0.2)' }}>
                  {errorFinca}
                </p>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setShowNuevaFinca(false); setErrorFinca(null) }}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFinca}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingFinca ? 'not-allowed' : 'pointer', opacity: savingFinca ? 0.7 : 1 }}
                >
                  {savingFinca ? 'Guardando...' : 'Crear finca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}
