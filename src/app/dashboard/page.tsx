'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getFincaAndRol } from '@/lib/finca'
import type { Finca } from '@/lib/types'

type Metrics = {
  animalesActivos: number
  hembrasActivas: number
  machosActivos: number
  numLotes: number
  produccionHoy: number
  ingresosSemana: number
}

type ProximoEvento = {
  id: string
  tipo: string
  descripcion: string
  proxima_fecha: string
  animal_id: string | null
  animales: { codigo: string; nombre: string | null; lotes: { nombre: string } | null } | null
}

type ActivityItem = {
  key: string
  created_at: string
  label: string
  icon: 'animal' | 'leche' | 'evento'
  tipo?: string
  href: string
}

const typeColors: Record<string, string> = {
  vacuna: '#16a34a', tratamiento: '#2563eb', pesaje: '#ca8a04',
  venta: '#dc2626', parto: '#7c3aed', servicio: '#7c3aed', otro: '#9ca3af',
}
const typeBg: Record<string, string> = {
  vacuna: '#dcfce7', tratamiento: '#dbeafe', pesaje: '#fef9c3',
  venta: '#fee2e2', parto: '#ede9fe', servicio: '#ede9fe', otro: '#f3f4f6',
}
const typeLabels: Record<string, string> = {
  vacuna: 'Vacuna', tratamiento: 'Tratamiento', pesaje: 'Pesaje',
  venta: 'Venta', parto: 'Parto', servicio: 'Servicio', otro: 'Otro',
}

const ArrowIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ position: 'absolute', top: '12px', right: '12px' }}>
    <path d="M2 8L8 2M8 2H4M8 2V6" stroke="rgba(60,45,30,0.2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getWeekBounds(anchor: Date): { start: string; end: string } {
  const d = new Date(anchor)
  const dow = d.getDay()
  const daysToMon = dow === 0 ? 6 : dow - 1
  const mon = new Date(d); mon.setDate(d.getDate() - daysToMon)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { start: toDateStr(mon), end: toDateStr(sun) }
}
function getWeekNBack(n: number): { start: string; end: string } {
  const d = new Date(); d.setDate(d.getDate() - n * 7)
  return getWeekBounds(d)
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m-1]}`
}

const todayDisplay = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

export default function DashboardPage() {
  const router = useRouter()
  const [finca, setFinca] = useState<Finca | null | undefined>(undefined)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [saving, setSaving] = useState(false)

  const [weekLeche, setWeekLeche] = useState<{ start: string; end: string; litros: number }[]>([])
  const [proximosEventos, setProximosEventos] = useState<ProximoEvento[]>([])
  const [actividad, setActividad] = useState<ActivityItem[]>([])

  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [hoveredEvento, setHoveredEvento] = useState<string | null>(null)
  const [hoveredAct, setHoveredAct] = useState<string | null>(null)
  const [hoveredChart, setHoveredChart] = useState(false)

  // Quick register state
  const [qlotesAll, setQLotesAll] = useState(0)
  const [qlotes, setQLotes] = useState<{ id: string; nombre: string }[]>([])
  const [qHembrasMap, setQHembrasMap] = useState<Record<string, string[]>>({})
  const [qLoteId, setQLoteId] = useState('')
  const [qLitros, setQLitros] = useState('')
  const [qPrecio, setQPrecio] = useState('')
  const [qSaving, setQSaving] = useState(false)
  const [qSaved, setQSaved] = useState(false)
  const qSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { finca: currentFinca } = await getFincaAndRol()
    setFinca(currentFinca)

    if (currentFinca) {
      const today = new Date().toISOString().split('T')[0]
      const _dn = new Date(); const _dd = _dn.getDay()
      const _dtm = _dd === 0 ? 6 : _dd - 1
      const _mnd = new Date(_dn); _mnd.setDate(_dn.getDate() - _dtm)
      const weekStart = toDateStr(_mnd)
      const fourWeeksAgo = toDateStr(new Date(_dn.getTime() - 28 * 24 * 3600000))

      const [
        animalesRes, hembrasRes, machosRes, lotesRes, lechHoyRes, lechSemRes,
        lecheChartRes, proximosRes,
        animRecRes, lechRecRes, evRecRes,
        hembrasLoteRes, allLotesRes, lastPrecioRes,
      ] = await Promise.all([
        supabase.from('animales').select('id', { count: 'exact', head: true }).eq('finca_id', currentFinca.id).eq('estado', 'activo'),
        supabase.from('animales').select('id', { count: 'exact', head: true }).eq('finca_id', currentFinca.id).eq('estado', 'activo').eq('sexo', 'hembra'),
        supabase.from('animales').select('id', { count: 'exact', head: true }).eq('finca_id', currentFinca.id).eq('estado', 'activo').eq('sexo', 'macho'),
        supabase.from('lotes').select('id', { count: 'exact', head: true }).eq('finca_id', currentFinca.id),
        supabase.from('registro_leche').select('litros').eq('finca_id', currentFinca.id).eq('fecha', today),
        supabase.from('registro_leche').select('litros, precio_litro').eq('finca_id', currentFinca.id).gte('fecha', weekStart).lte('fecha', today),
        supabase.from('registro_leche').select('fecha, litros').eq('finca_id', currentFinca.id).gte('fecha', fourWeeksAgo).not('generado_por_lote', 'eq', true),
        supabase.from('eventos_animal')
          .select('id, tipo, descripcion, proxima_fecha, animal_id, animales(codigo, nombre, lotes(nombre))')
          .gte('proxima_fecha', today)
          .order('proxima_fecha', { ascending: true })
          .limit(5),
        supabase.from('animales').select('id, codigo, nombre, created_at').eq('finca_id', currentFinca.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('registro_leche').select('id, litros, created_at').eq('finca_id', currentFinca.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('eventos_animal').select('id, tipo, created_at, animales(id, codigo)').order('created_at', { ascending: false }).limit(5),
        // Quick register: hembras activas con lote
        supabase.from('animales').select('id, lote_id').eq('finca_id', currentFinca.id).eq('estado', 'activo').eq('sexo', 'hembra').not('lote_id', 'is', null),
        // Quick register: all lotes
        supabase.from('lotes').select('id, nombre').eq('finca_id', currentFinca.id),
        // Quick register: last precio usado
        supabase.from('registro_leche').select('precio_litro').eq('finca_id', currentFinca.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      const produccionHoy = (lechHoyRes.data ?? []).reduce((s: number, r: { litros: number }) => s + r.litros, 0)
      const ingresosSemana = (lechSemRes.data ?? []).reduce(
        (s: number, r: { litros: number; precio_litro: number | null }) => s + r.litros * (r.precio_litro ?? 0), 0
      )
      setMetrics({
        animalesActivos: animalesRes.count ?? 0,
        hembrasActivas: hembrasRes.count ?? 0,
        machosActivos: machosRes.count ?? 0,
        numLotes: lotesRes.count ?? 0,
        produccionHoy, ingresosSemana,
      })

      const lecheRows = (lecheChartRes.data ?? []) as { fecha: string; litros: number }[]
      const weeks4 = Array.from({ length: 4 }, (_, i) => getWeekNBack(3 - i))
      const wl = weeks4.map(w => ({
        ...w,
        litros: lecheRows.filter(r => r.fecha >= w.start && r.fecha <= w.end).reduce((s, r) => s + r.litros, 0),
      }))
      setWeekLeche(wl)

      setProximosEventos((proximosRes.data ?? []) as unknown as ProximoEvento[])

      type AR = { id: string; codigo: string; nombre: string | null; created_at: string }
      type LR = { id: string; litros: number; created_at: string }
      type ER = { id: string; tipo: string; created_at: string; animales: { id: string; codigo: string } | null }

      const acts: ActivityItem[] = [
        ...(animRecRes.data ?? []).map((a: AR) => ({
          key: `a-${a.id}`, created_at: a.created_at,
          label: `Animal ${a.nombre ?? a.codigo} agregado`,
          icon: 'animal' as const,
          href: `/dashboard/animales/${a.id}`,
        })),
        ...(lechRecRes.data ?? []).map((r: LR) => ({
          key: `l-${r.id}`, created_at: r.created_at,
          label: `${r.litros}L registrados`,
          icon: 'leche' as const,
          href: '/dashboard/leche',
        })),
        ...((evRecRes.data ?? []) as unknown as ER[]).map((e: ER) => ({
          key: `e-${e.id}`, created_at: e.created_at,
          label: `${typeLabels[e.tipo] ?? e.tipo}${e.animales ? ` — ${e.animales.codigo}` : ''}`,
          icon: 'evento' as const,
          tipo: e.tipo,
          href: e.animales?.id ? `/dashboard/animales/${e.animales.id}` : '/dashboard/eventos',
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
      setActividad(acts)

      // Quick register setup
      const hembrasConLote = (hembrasLoteRes.data ?? []) as { id: string; lote_id: string | null }[]
      const hMap: Record<string, string[]> = {}
      hembrasConLote.forEach(h => {
        if (h.lote_id) hMap[h.lote_id] = [...(hMap[h.lote_id] ?? []), h.id]
      })
      setQHembrasMap(hMap)

      const allLotes = (allLotesRes.data ?? []) as { id: string; nombre: string }[]
      setQLotesAll(allLotes.length)
      setQLotes(allLotes.filter(l => (hMap[l.id]?.length ?? 0) > 0))

      const lastPrecio = lastPrecioRes.data?.precio_litro
      if (lastPrecio != null) setQPrecio(String(lastPrecio))
    }
    setLoading(false)
  }

  async function handleCrearFinca(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSaving(false); return }

    const { data } = await supabase
      .from('fincas')
      .insert({ nombre: nombre.trim(), ubicacion: ubicacion.trim() || null, user_id: userData.user.id })
      .select()
      .single()

    if (data) {
      await Promise.all([
        supabase.from('finca_usuarios').insert({
          finca_id: data.id, user_id: userData.user.id, rol: 'admin',
        }),
        supabase.from('user_profiles').upsert(
          { id: userData.user.id, email: userData.user.email ?? '', nombre: null },
          { onConflict: 'id', ignoreDuplicates: true }
        ),
      ])
    }

    setSaving(false)
    if (data) {
      setShowModal(false)
      setNombre('')
      setUbicacion('')
      await loadData()
    }
  }

  async function handleQuickRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!finca || !qLitros) return
    setQSaving(true)
    const supabase = createClient()
    const todayStr = new Date().toISOString().split('T')[0]
    const precioNum = qPrecio ? parseFloat(qPrecio) : null
    const litrosNum = parseFloat(qLitros)

    if (qLoteId) {
      const hembras = qHembrasMap[qLoteId] ?? []
      if (hembras.length > 0) {
        const litrosPorAnimal = Math.round((litrosNum / hembras.length) * 100) / 100
        await Promise.all([
          supabase.from('registro_leche').insert({
            finca_id: finca.id, fecha: todayStr, litros: litrosNum, precio_litro: precioNum,
            animal_id: null, lote_id: qLoteId,
          }),
          ...hembras.map(hId => supabase.from('registro_leche').insert({
            finca_id: finca.id, fecha: todayStr, litros: litrosPorAnimal, precio_litro: precioNum,
            animal_id: hId, lote_id: qLoteId, generado_por_lote: true,
          } as Record<string, unknown>)),
        ])
      } else {
        await supabase.from('registro_leche').insert({
          finca_id: finca.id, fecha: todayStr, litros: litrosNum, precio_litro: precioNum,
          animal_id: null, lote_id: qLoteId,
        })
      }
    } else {
      await supabase.from('registro_leche').insert({
        finca_id: finca.id, fecha: todayStr, litros: litrosNum, precio_litro: precioNum,
        animal_id: null, lote_id: null,
      })
    }

    setQSaving(false)
    setQLitros('')
    setQSaved(true)
    if (qSavedTimer.current) clearTimeout(qSavedTimer.current)
    qSavedTimer.current = setTimeout(() => setQSaved(false), 2000)
    loadData()
  }

  const maxLeche = Math.max(...weekLeche.map(w => w.litros), 1)

  const cardBase: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(60,45,30,0.10)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.12s',
  }

  const qFieldStyle: React.CSSProperties = {
    padding: '9px 12px', border: '1px solid rgba(60,45,30,0.18)',
    borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
    fontFamily: 'var(--font-sans), sans-serif', outline: 'none',
  }

  if (loading || finca === undefined) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8c7f74', fontFamily: 'var(--font-sans), sans-serif' }}>Cargando...</div>
  }

  const metricCards = [
    { label: 'Animales activos', value: metrics?.animalesActivos ?? '—', big: true, href: '/dashboard/animales' },
    { label: 'Hembras activas', value: metrics?.hembrasActivas ?? '—', big: true, href: '/dashboard/animales' },
    { label: 'Machos activos', value: metrics?.machosActivos ?? '—', big: true, href: '/dashboard/animales' },
    { label: 'Número de lotes', value: metrics?.numLotes ?? '—', big: true, href: '/dashboard/animales' },
    { label: 'Producción hoy (L)', value: metrics ? metrics.produccionHoy.toFixed(1) : '—', big: true, href: '/dashboard/leche' },
    { label: 'Ingresos semana (COP)', value: metrics ? `$${Math.round(metrics.ingresosSemana).toLocaleString('es-CO')}` : '—', big: false, href: '/dashboard/leche' },
  ]

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 4px' }}>
        {finca ? finca.nombre : 'Dashboard'}
      </h1>
      <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: '0 0 28px' }}>
        {finca?.ubicacion ?? 'Resumen general de tu finca'}
      </p>

      {!finca && (
        <div style={{ backgroundColor: '#e8f5ee', border: '1px solid rgba(26,107,69,0.2)', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '15px', fontWeight: 500, color: '#1a6b45', margin: '0 0 2px' }}>Primero crea tu finca</p>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540', margin: 0 }}>Para empezar a registrar animales, leche y eventos necesitas crear tu primera finca.</p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Crear finca
          </button>
        </div>
      )}

      {/* 6-card metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {metricCards.map(card => (
          <div key={card.label}
            style={{ ...cardBase, backgroundColor: hoveredCard === card.label ? 'rgba(60,45,30,0.03)' : '#ffffff' }}
            onClick={() => router.push(card.href)}
            onMouseEnter={() => setHoveredCard(card.label)}
            onMouseLeave={() => setHoveredCard(null)}>
            <ArrowIcon />
            <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74' }}>{card.label}</span>
            <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: card.big ? '40px' : '28px', color: '#1a6b45', lineHeight: 1 }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Quick register leche */}
      {finca && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '16px', fontWeight: 500, color: '#1c1a17' }}>Registrar leche hoy</span>
            <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74' }}>{todayDisplay}</span>
          </div>
          {qlotesAll === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>
              <a href="/dashboard/animales" style={{ color: '#1a6b45' }}>Crea un lote en Animales</a> para registrar leche rápidamente.
            </p>
          ) : (
            <form onSubmit={handleQuickRegister}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={qLoteId} onChange={e => setQLoteId(e.target.value)}
                  style={{ ...qFieldStyle, cursor: 'pointer', minWidth: '160px' }}>
                  <option value="">Sin lote</option>
                  {qlotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
                <input
                  type="number" step="0.1" min="0" value={qLitros}
                  onChange={e => setQLitros(e.target.value)}
                  placeholder="Litros" required
                  style={{ ...qFieldStyle, width: '120px' }}
                />
                <input
                  type="number" step="0.01" min="0" value={qPrecio}
                  onChange={e => setQPrecio(e.target.value)}
                  placeholder="Precio/L"
                  style={{ ...qFieldStyle, width: '120px' }}
                />
                <button type="submit" disabled={qSaving}
                  style={{ padding: '9px 20px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: qSaving ? 'not-allowed' : 'pointer', opacity: qSaving ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                  {qSaving ? 'Registrando...' : 'Registrar'}
                </button>
                {qSaved && (
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1a6b45', fontWeight: 500 }}>
                    ✓ Registrado
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* Mini bar chart */}
      {finca && (
        <div
          onClick={() => router.push('/dashboard/leche?tab=historial')}
          onMouseEnter={() => setHoveredChart(true)}
          onMouseLeave={() => setHoveredChart(false)}
          style={{
            backgroundColor: hoveredChart ? 'rgba(60,45,30,0.01)' : '#ffffff',
            border: '1px solid rgba(60,45,30,0.10)',
            borderRadius: '12px', padding: '20px 24px', marginBottom: '20px',
            cursor: 'pointer', transition: 'background-color 0.12s',
          }}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#4a4540', display: 'block', marginBottom: '14px' }}>Producción semanal (últimas 4 semanas)</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
            {weekLeche.map((w, i) => {
              const heightPct = maxLeche > 0 ? (w.litros / maxLeche) * 100 : 0
              const isCurrentWeek = i === 3
              return (
                <div key={w.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{
                    width: '100%',
                    height: `${Math.max(heightPct, w.litros > 0 ? 4 : 0)}%`,
                    backgroundColor: isCurrentWeek ? '#1a6b45' : 'rgba(26,107,69,0.32)',
                    borderRadius: '4px 4px 0 0',
                  }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            {weekLeche.map((w, i) => (
              <div key={w.start} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', color: i === 3 ? '#1a6b45' : '#8c7f74' }}>
                {formatShort(w.start)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-col: proximos eventos + actividad reciente */}
      {finca && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#4a4540' }}>Próximos eventos</span>
            </div>
            {proximosEventos.length === 0 ? (
              <p style={{ padding: '20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>Sin eventos programados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {proximosEventos.map((ev, i) => {
                  const evHref = ev.animal_id ? `/dashboard/animales/${ev.animal_id}` : '/dashboard/eventos'
                  return (
                    <div key={ev.id}
                      onClick={() => router.push(evHref)}
                      onMouseEnter={() => setHoveredEvento(ev.id)}
                      onMouseLeave={() => setHoveredEvento(null)}
                      style={{ padding: '12px 20px', borderBottom: i < proximosEventos.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', backgroundColor: hoveredEvento === ev.id ? 'rgba(60,45,30,0.03)' : 'transparent', transition: 'background-color 0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', color: '#8c7f74' }}>{ev.proxima_fecha}</span>
                        <span style={{ backgroundColor: typeBg[ev.tipo] ?? '#f3f4f6', color: typeColors[ev.tipo] ?? '#9ca3af', padding: '1px 7px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
                          {typeLabels[ev.tipo] ?? ev.tipo}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', fontWeight: 500 }}>{ev.descripcion}</span>
                      {ev.animales && (
                        <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', color: '#8c7f74' }}>
                          {ev.animales.nombre ?? ev.animales.codigo}
                          {ev.animales.lotes?.nombre && ` · ${ev.animales.lotes.nombre}`}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#4a4540' }}>Actividad reciente</span>
            </div>
            {actividad.length === 0 ? (
              <p style={{ padding: '20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>Sin actividad reciente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {actividad.map((act, i) => {
                  const iconEl = act.icon === 'animal'
                    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="10" rx="5" ry="3.5" stroke="#8c7f74" strokeWidth="1.3" fill="none"/><path d="M3.5 10V12.5" stroke="#8c7f74" strokeWidth="1.3" strokeLinecap="round"/><path d="M12.5 10V12.5" stroke="#8c7f74" strokeWidth="1.3" strokeLinecap="round"/><path d="M5.5 6.5L4.5 4" stroke="#8c7f74" strokeWidth="1.3" strokeLinecap="round"/><path d="M10.5 6.5L11.5 4" stroke="#8c7f74" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    : act.icon === 'leche'
                    ? <svg width="12" height="14" viewBox="0 0 6 8" fill="none"><path d="M3 0.5C3 0.5 0.5 3.5 0.5 5.5C0.5 6.88 1.62 8 3 8C4.38 8 5.5 6.88 5.5 5.5C5.5 3.5 3 0.5 3 0.5Z" fill="#2563eb"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke={typeColors[act.tipo ?? ''] ?? '#9ca3af'} strokeWidth="1.3"/><path d="M6 3v3.5L8 8" stroke={typeColors[act.tipo ?? ''] ?? '#9ca3af'} strokeWidth="1.2" strokeLinecap="round"/></svg>
                  return (
                    <div key={act.key}
                      onClick={() => router.push(act.href)}
                      onMouseEnter={() => setHoveredAct(act.key)}
                      onMouseLeave={() => setHoveredAct(null)}
                      style={{ padding: '11px 20px', borderBottom: i < actividad.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', backgroundColor: hoveredAct === act.key ? 'rgba(60,45,30,0.03)' : 'transparent', transition: 'background-color 0.1s' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {iconEl}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.label}</p>
                        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', color: '#8c7f74', margin: 0 }}>{timeAgo(act.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create finca modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
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
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
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
