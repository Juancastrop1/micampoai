'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Finca } from '@/lib/types'

type Metrics = {
  animalesActivos: number
  produccionHoy: number
  ingresosSemana: number
  proximasVacunas: number
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid rgba(60,45,30,0.10)',
  borderRadius: '12px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

export default function DashboardPage() {
  const [finca, setFinca] = useState<Finca | null | undefined>(undefined)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data } = await supabase.from('fincas').select('*').limit(1)
    const currentFinca: Finca | null = data?.[0] ?? null
    setFinca(currentFinca)

    if (currentFinca) {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const [animalesRes, lechHoyRes, lechSemRes, animalIdsRes] = await Promise.all([
        supabase.from('animales').select('id', { count: 'exact', head: true }).eq('finca_id', currentFinca.id).eq('estado', 'activo'),
        supabase.from('registro_leche').select('litros').eq('finca_id', currentFinca.id).eq('fecha', today),
        supabase.from('registro_leche').select('litros, precio_litro').eq('finca_id', currentFinca.id).gte('fecha', weekAgo),
        supabase.from('animales').select('id').eq('finca_id', currentFinca.id),
      ])

      const ids = animalIdsRes.data?.map((a: { id: string }) => a.id) ?? []
      let vacunasCount = 0
      if (ids.length > 0) {
        const vacRes = await supabase
          .from('eventos_animal')
          .select('id', { count: 'exact', head: true })
          .in('animal_id', ids)
          .eq('tipo', 'vacuna')
          .gte('proxima_fecha', today)
          .lte('proxima_fecha', weekAhead)
        vacunasCount = vacRes.count ?? 0
      }

      const produccionHoy = (lechHoyRes.data ?? []).reduce((s: number, r: { litros: number }) => s + r.litros, 0)
      const ingresosSemana = (lechSemRes.data ?? []).reduce(
        (s: number, r: { litros: number; precio_litro: number | null }) => s + r.litros * (r.precio_litro ?? 0),
        0
      )

      setMetrics({
        animalesActivos: animalesRes.count ?? 0,
        produccionHoy,
        ingresosSemana,
        proximasVacunas: vacunasCount,
      })
    }
    setLoading(false)
  }

  async function handleCrearFinca(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('fincas')
      .insert({ nombre: nombre.trim(), ubicacion: ubicacion.trim() || null, user_id: userData.user?.id })
      .select()
      .single()
    setSaving(false)
    if (data) {
      setShowModal(false)
      setNombre('')
      setUbicacion('')
      loadData()
    }
  }

  if (loading || finca === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8c7f74', fontFamily: 'var(--font-sans), sans-serif' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 4px' }}>
        {finca ? finca.nombre : 'Dashboard'}
      </h1>
      <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: '0 0 28px' }}>
        {finca?.ubicacion ?? 'Resumen general de tu finca'}
      </p>

      {/* No finca banner */}
      {!finca && (
        <div style={{ backgroundColor: '#e8f5ee', border: '1px solid rgba(26,107,69,0.2)', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '15px', fontWeight: 500, color: '#1a6b45', margin: '0 0 2px' }}>
              Primero crea tu finca
            </p>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540', margin: 0 }}>
              Para empezar a registrar animales, leche y eventos necesitas crear tu primera finca.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Crear finca
          </button>
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74' }}>Animales activos</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '40px', color: '#1a6b45', lineHeight: 1 }}>{metrics?.animalesActivos ?? '—'}</span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74' }}>Producción hoy (L)</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '40px', color: '#1a6b45', lineHeight: 1 }}>{metrics ? metrics.produccionHoy.toFixed(1) : '—'}</span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74' }}>Ingresos semana (COP)</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '36px', color: '#1a6b45', lineHeight: 1 }}>
            {metrics ? `$${Math.round(metrics.ingresosSemana).toLocaleString('es-CO')}` : '—'}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74' }}>Próximas vacunas (7d)</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '40px', color: metrics && metrics.proximasVacunas > 0 ? '#8B1A1A' : '#1a6b45', lineHeight: 1 }}>
            {metrics?.proximasVacunas ?? '—'}
          </span>
        </div>
      </div>

      {/* Create finca modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '24px', color: '#1c1a17', margin: '0 0 20px' }}>Nueva finca</h2>
            <form onSubmit={handleCrearFinca} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, color: '#4a4540', display: 'block', marginBottom: '6px' }}>Nombre *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Finca La Esperanza" required
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px', fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, color: '#4a4540', display: 'block', marginBottom: '6px' }}>Ubicación</label>
                <input value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Municipio, Departamento"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px', fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Crear finca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
