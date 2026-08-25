'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Animal, ConfigFinca, Finca, Lote, RegistroLeche } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)',
  borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
  fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500,
  color: '#4a4540', display: 'block', marginBottom: '6px',
}

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[m-1]}`
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

export default function LechePage() {
  const [finca, setFinca] = useState<Finca | null>(null)
  const [registros, setRegistros] = useState<RegistroLeche[]>([])
  const [animales, setAnimales] = useState<Animal[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [config, setConfig] = useState<ConfigFinca | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterAnimal, setFilterAnimal] = useState('')
  const [filterLote, setFilterLote] = useState('')
  const [fechaError, setFechaError] = useState<string | null>(null)
  const [animalesMap, setAnimalesMap] = useState<Record<string, string>>({})
  const [lotesMap, setLotesMap] = useState<Record<string, string>>({})

  const [tab, setTab] = useState<'registro' | 'historial'>('registro')

  const today = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(today)
  const [litros, setLitros] = useState('')
  const [precio, setPrecio] = useState('')
  const [animalId, setAnimalId] = useState('')
  const [loteId, setLoteId] = useState('')

  const [showEditModal, setShowEditModal] = useState(false)
  const [registroToEdit, setRegistroToEdit] = useState<RegistroLeche | null>(null)
  const [editFecha, setEditFecha] = useState('')
  const [editLitros, setEditLitros] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editAnimalId, setEditAnimalId] = useState('')
  const [editLoteId, setEditLoteId] = useState('')
  const [editFechaError, setEditFechaError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [registroToDelete, setRegistroToDelete] = useState<RegistroLeche | null>(null)
  const [deletingRegistro, setDeletingRegistro] = useState(false)

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: fincas } = await supabase.from('fincas').select('*').limit(1)
    const currentFinca: Finca | null = fincas?.[0] ?? null
    setFinca(currentFinca)
    if (!currentFinca) { setLoading(false); return }

    const [regRes, animRes, todosAnimRes, lotRes, confRes] = await Promise.all([
      supabase.from('registro_leche').select('*').eq('finca_id', currentFinca.id).order('fecha', { ascending: false }).limit(500),
      supabase.from('animales').select('id, codigo, nombre, lote_id').eq('finca_id', currentFinca.id).eq('estado', 'activo').eq('sexo', 'hembra'),
      supabase.from('animales').select('id, codigo, nombre').eq('finca_id', currentFinca.id),
      supabase.from('lotes').select('*').eq('finca_id', currentFinca.id),
      supabase.from('config_finca').select('*').eq('finca_id', currentFinca.id).maybeSingle(),
    ])

    const hembrasData = (animRes.data ?? []) as Animal[]
    const todosLotes = (lotRes.data ?? []) as Lote[]
    setRegistros(regRes.data ?? [])
    setAnimales(hembrasData)

    const hembrasLoteIds = new Set(hembrasData.map(a => a.lote_id).filter((id): id is string => id != null))
    setLotes(todosLotes.filter(l => hembrasLoteIds.has(l.id)))

    const aMap: Record<string, string> = {}
    ;(todosAnimRes.data ?? []).forEach((a: { id: string; codigo: string; nombre: string | null }) => {
      aMap[a.id] = a.nombre ? `${a.codigo} — ${a.nombre}` : a.codigo
    })
    setAnimalesMap(aMap)

    const lMap: Record<string, string> = {}
    todosLotes.forEach(l => { lMap[l.id] = l.nombre })
    setLotesMap(lMap)

    setConfig(confRes.data ?? null)
    setLoading(false)
  }

  // Lote-split info (computed from current form state)
  const loteHembras = loteId && !animalId ? animales.filter(a => a.lote_id === loteId) : []
  const infoMessage = loteId && !animalId && litros && loteHembras.length > 0
    ? `Registro por lote: ${litros} litros divididos entre ${loteHembras.length} hembras activas = ${(parseFloat(litros) / loteHembras.length).toFixed(1)} litros promedio por animal`
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finca || !litros) return
    if (fecha > today) { setFechaError('La fecha no puede ser futura.'); return }
    setFechaError(null)
    setSaving(true)
    const precioFinal = precio ? parseFloat(precio) : (config?.precio_litro_leche ?? null)
    const supabase = createClient()

    if (loteId && !animalId && loteHembras.length > 0) {
      const litrosTotal = parseFloat(litros)
      const litrosPorAnimal = Math.round((litrosTotal / loteHembras.length) * 100) / 100
      await Promise.all([
        supabase.from('registro_leche').insert({
          finca_id: finca.id, fecha, litros: litrosTotal, precio_litro: precioFinal,
          animal_id: null, lote_id: loteId,
        }),
        ...loteHembras.map(h => supabase.from('registro_leche').insert({
          finca_id: finca.id, fecha, litros: litrosPorAnimal, precio_litro: precioFinal,
          animal_id: h.id, lote_id: loteId, generado_por_lote: true,
        } as Record<string, unknown>)),
      ])
    } else {
      await supabase.from('registro_leche').insert({
        finca_id: finca.id, fecha, litros: parseFloat(litros), precio_litro: precioFinal,
        animal_id: animalId || null, lote_id: loteId || null,
      })
    }

    setSaving(false)
    setLitros('')
    setPrecio('')
    setAnimalId('')
    setLoteId('')
    loadData()
  }

  function openEditRegistro(r: RegistroLeche) {
    setRegistroToEdit(r)
    setEditFecha(r.fecha)
    setEditLitros(String(r.litros))
    setEditPrecio(r.precio_litro != null ? String(r.precio_litro) : '')
    setEditAnimalId(r.animal_id ?? '')
    setEditLoteId(r.lote_id ?? '')
    setEditFechaError(null)
    setShowEditModal(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!registroToEdit || !editLitros) return
    if (editFecha > today) { setEditFechaError('La fecha no puede ser futura.'); return }
    setEditFechaError(null)
    setSavingEdit(true)
    const supabase = createClient()
    await supabase.from('registro_leche').update({
      fecha: editFecha, litros: parseFloat(editLitros),
      precio_litro: editPrecio ? parseFloat(editPrecio) : null,
      animal_id: editAnimalId || null, lote_id: editLoteId || null,
    }).eq('id', registroToEdit.id)
    setSavingEdit(false)
    setShowEditModal(false)
    setRegistroToEdit(null)
    loadData()
  }

  async function handleDeleteConfirm() {
    if (!registroToDelete) return
    setDeletingRegistro(true)
    const supabase = createClient()
    await supabase.from('registro_leche').delete().eq('id', registroToDelete.id)
    setDeletingRegistro(false)
    setRegistroToDelete(null)
    loadData()
  }

  // ── COMPUTATIONS ──────────────────────────────────────────────────────────

  // Exclude split records (generado_por_lote) from aggregate totals to avoid double-counting
  const registrosPrimarios = registros.filter(r => !r.generado_por_lote)

  const _now = new Date()
  const _dow = _now.getDay()
  const _daysToMon = _dow === 0 ? 6 : _dow - 1
  const _mon = new Date(_now); _mon.setDate(_now.getDate() - _daysToMon)
  const semanaInicio = toDateStr(_mon)
  const semanaFin = today

  const produccionHoy = registrosPrimarios.filter(r => r.fecha === today).reduce((s, r) => s + r.litros, 0)
  const registrosSemana = registrosPrimarios.filter(r => r.fecha >= semanaInicio && r.fecha <= semanaFin)
  const produccionSemana = registrosSemana.reduce((s, r) => s + r.litros, 0)
  const ingresosSemana = registrosSemana.reduce((s, r) => s + r.litros * (r.precio_litro ?? config?.precio_litro_leche ?? 0), 0)

  // Historial metrics
  const thisMonthStart = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-01`
  const lastMonthD = new Date(_now.getFullYear(), _now.getMonth()-1, 1)
  const lastMonthStart = `${lastMonthD.getFullYear()}-${String(lastMonthD.getMonth()+1).padStart(2,'0')}-01`
  const prodEsteMes = registrosPrimarios.filter(r => r.fecha >= thisMonthStart).reduce((s,r) => s+r.litros, 0)
  const prodMesAnterior = registrosPrimarios.filter(r => r.fecha >= lastMonthStart && r.fecha < thisMonthStart).reduce((s,r) => s+r.litros, 0)
  const variacion = prodMesAnterior > 0 ? ((prodEsteMes - prodMesAnterior) / prodMesAnterior) * 100 : null

  function weekTotals(w: { start: string; end: string }) {
    const regs = registrosPrimarios.filter(r => r.fecha >= w.start && r.fecha <= w.end)
    return {
      litros: regs.reduce((s, r) => s + r.litros, 0),
      ingresos: regs.reduce((s, r) => s + r.litros * (r.precio_litro ?? config?.precio_litro_leche ?? 0), 0),
    }
  }

  // Oldest to newest for chart
  const weeks8 = Array.from({ length: 8 }, (_, i) => getWeekNBack(7 - i))
  // Newest to oldest for collapsible list
  const weeks12 = Array.from({ length: 12 }, (_, i) => getWeekNBack(i))
  const chartTotals = weeks8.map(w => ({ ...w, ...weekTotals(w) }))
  const maxLitros = Math.max(...chartTotals.map(w => w.litros), 1)

  const filtered = registros.filter(r =>
    (!filterAnimal || r.animal_id === filterAnimal) &&
    (!filterLote || r.lote_id === filterLote)
  )

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>
      Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: '980px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 20px' }}>Producción de leche</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(60,45,30,0.12)', marginBottom: '28px', gap: 0 }}>
        {(['registro', 'historial'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 22px', border: 'none',
            borderBottom: tab === t ? '2px solid #1a6b45' : '2px solid transparent',
            backgroundColor: 'transparent',
            fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px',
            color: tab === t ? '#1a6b45' : '#8c7f74',
            fontWeight: tab === t ? 600 : 400,
            cursor: 'pointer', marginBottom: '-1px',
          }}>
            {t === 'registro' ? 'Registro' : 'Historial'}
          </button>
        ))}
      </div>

      {/* ── REGISTRO TAB ── */}
      {tab === 'registro' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {[
              { label: 'Producción hoy (L)', value: produccionHoy.toFixed(1) },
              { label: 'Producción semana (L)', value: produccionSemana.toFixed(1) },
              { label: 'Ingresos semana (COP)', value: `$${Math.round(ingresosSemana).toLocaleString('es-CO')}` },
            ].map(m => (
              <div key={m.label} style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '20px 24px' }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>{m.label}</span>
                <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '36px', color: '#1a6b45', lineHeight: 1 }}>{m.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>
            {/* Form */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 20px' }}>Registrar producción</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setFechaError(null) }} required max={today} style={inputStyle} />
                  {fechaError && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8B1A1A', margin: '4px 0 0' }}>{fechaError}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Litros *</label>
                  <input type="number" step="0.1" min="0" value={litros} onChange={e => setLitros(e.target.value)} placeholder="0.0" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio por litro (COP){config ? ` — default: $${config.precio_litro_leche}` : ''}</label>
                  <input type="number" step="0.01" min="0" value={precio} onChange={e => setPrecio(e.target.value)} placeholder={config ? String(config.precio_litro_leche) : '0'} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Animal (hembras activas)</label>
                  <select value={animalId} onChange={e => setAnimalId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Sin especificar</option>
                    {animales.map(a => <option key={a.id} value={a.id}>{a.codigo}{a.nombre ? ` — ${a.nombre}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Lote (opcional)</label>
                  <select value={loteId} onChange={e => setLoteId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Sin especificar</option>
                    {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={saving}
                  style={{ marginTop: '4px', padding: '11px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
                {infoMessage && (
                  <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#1a6b45', margin: 0, padding: '10px 14px', backgroundColor: '#e8f5ee', borderRadius: '8px', lineHeight: 1.5 }}>
                    {infoMessage}
                  </p>
                )}
              </form>
            </div>

            {/* Recent records table */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px 14px', display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '15px', fontWeight: 500, color: '#1c1a17', marginRight: 'auto' }}>Registros recientes</span>
                <select value={filterAnimal} onChange={e => setFilterAnimal(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid rgba(60,45,30,0.15)', borderRadius: '6px', backgroundColor: '#faf8f4', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="">Todos los animales</option>
                  {animales.map(a => <option key={a.id} value={a.id}>{a.codigo}</option>)}
                </select>
                <select value={filterLote} onChange={e => setFilterLote(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid rgba(60,45,30,0.15)', borderRadius: '6px', backgroundColor: '#faf8f4', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="">Todos los lotes</option>
                  {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                      {['Fecha', 'Litros', 'Precio/L', 'Ingreso', 'Acciones'].map(col => (
                        <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '28px 16px', textAlign: 'center', color: '#8c7f74' }}>Sin registros</td></tr>
                    ) : filtered.slice(0, 20).map((r, i) => {
                      const ingreso = r.litros * (r.precio_litro ?? config?.precio_litro_leche ?? 0)
                      return (
                        <tr key={r.id} style={{ borderBottom: i < Math.min(filtered.length, 20) - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                          <td style={{ padding: '10px 16px', color: '#1c1a17' }}>{r.fecha}</td>
                          <td style={{ padding: '10px 16px', color: '#1c1a17', fontWeight: 500 }}>{r.litros} L</td>
                          <td style={{ padding: '10px 16px', color: '#4a4540' }}>{r.precio_litro ? `$${r.precio_litro}` : '—'}</td>
                          <td style={{ padding: '10px 16px', color: '#1a6b45', fontWeight: 500 }}>{ingreso > 0 ? `$${Math.round(ingreso).toLocaleString('es-CO')}` : '—'}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditRegistro(r)}
                                style={{ padding: '4px 10px', border: '1px solid rgba(60,45,30,0.2)', borderRadius: '5px', backgroundColor: 'transparent', color: '#4a4540', fontSize: '12px', fontFamily: 'var(--font-sans), sans-serif', cursor: 'pointer' }}>
                                Editar
                              </button>
                              <button onClick={() => setRegistroToDelete(r)}
                                style={{ padding: '4px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '5px', backgroundColor: 'transparent', color: '#8B1A1A', fontSize: '12px', fontFamily: 'var(--font-sans), sans-serif', cursor: 'pointer' }}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── HISTORIAL TAB ── */}
      {tab === 'historial' && (
        <>
          {/* Top 3 metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '20px 24px' }}>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Producción este mes (L)</span>
              <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '36px', color: '#1a6b45', lineHeight: 1 }}>{prodEsteMes.toFixed(1)}</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '20px 24px' }}>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Producción mes anterior (L)</span>
              <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '36px', color: '#1a6b45', lineHeight: 1 }}>{prodMesAnterior.toFixed(1)}</span>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '20px 24px' }}>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Variación mensual</span>
              {variacion !== null ? (
                <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '36px', color: variacion >= 0 ? '#1a6b45' : '#8B1A1A', lineHeight: 1 }}>
                  {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '36px', color: '#8c7f74', lineHeight: 1 }}>—</span>
              )}
            </div>
          </div>

          {/* Bar chart - last 8 weeks */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '18px', color: '#1c1a17', margin: '0 0 20px' }}>Últimas 8 semanas</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '150px', position: 'relative' }}>
              {chartTotals.map((w, i) => {
                const heightPct = maxLitros > 0 ? (w.litros / maxLitros) * 100 : 0
                const isCurrentWeek = i === 7
                return (
                  <div key={w.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end', height: '100%', position: 'relative' }}
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}>
                    {hoveredBar === i && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1c1a17', color: 'white', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-sans), sans-serif', whiteSpace: 'nowrap', zIndex: 10, lineHeight: 1.4 }}>
                        {formatShort(w.start)} — {formatShort(w.end)}<br />
                        {w.litros.toFixed(1)} L · ${Math.round(w.ingresos).toLocaleString('es-CO')} COP
                      </div>
                    )}
                    <div style={{
                      width: '100%',
                      height: `${Math.max(heightPct, w.litros > 0 ? 3 : 0)}%`,
                      backgroundColor: isCurrentWeek ? '#1a6b45' : 'rgba(26,107,69,0.35)',
                      borderRadius: '4px 4px 0 0',
                    }} />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {chartTotals.map((w, i) => (
                <div key={w.start} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', color: i === 7 ? '#1a6b45' : '#8c7f74' }}>
                  {formatShort(w.start)}
                </div>
              ))}
            </div>
          </div>

          {/* Collapsible week list - last 12 weeks */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
            {weeks12.map((w, i) => {
              const { litros: wLitros, ingresos: wIngresos } = weekTotals(w)
              const isExpanded = expandedWeeks.has(w.start)
              const weekRegs = registros.filter(r => r.fecha >= w.start && r.fecha <= w.end)
              const isCurrentWeek = i === 0

              return (
                <div key={w.start} style={{ borderBottom: i < weeks12.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                  <button onClick={() => {
                    setExpandedWeeks(prev => {
                      const next = new Set(prev)
                      if (next.has(w.start)) next.delete(w.start); else next.add(w.start)
                      return next
                    })
                  }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540', flex: 1 }}>
                      {isCurrentWeek ? 'Esta semana' : `${formatShort(w.start)} — ${formatShort(w.end)}`}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', fontWeight: 500, whiteSpace: 'nowrap' }}>{wLitros.toFixed(1)} L</span>
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1a6b45', whiteSpace: 'nowrap' }}>${Math.round(wIngresos).toLocaleString('es-CO')}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
                      <path d="M2 4L6 8L10 4" stroke="#8c7f74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div style={{ backgroundColor: '#faf8f4', borderTop: '1px solid rgba(60,45,30,0.06)' }}>
                      {weekRegs.length === 0 ? (
                        <p style={{ padding: '16px 20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>Sin registros esta semana.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
                                {['Fecha','Litros','Precio/L','Ingreso','Animal','Lote',''].map((col, ci) => (
                                  <th key={ci} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {weekRegs.map((r, ri) => {
                                const ingreso = r.litros * (r.precio_litro ?? config?.precio_litro_leche ?? 0)
                                return (
                                  <tr key={r.id} style={{ borderBottom: ri < weekRegs.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none' }}>
                                    <td style={{ padding: '8px 12px', color: '#1c1a17', whiteSpace: 'nowrap' }}>{r.fecha}</td>
                                    <td style={{ padding: '8px 12px', color: '#1c1a17', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.litros} L</td>
                                    <td style={{ padding: '8px 12px', color: '#4a4540', whiteSpace: 'nowrap' }}>{r.precio_litro ? `$${r.precio_litro}` : '—'}</td>
                                    <td style={{ padding: '8px 12px', color: '#1a6b45', whiteSpace: 'nowrap' }}>{ingreso > 0 ? `$${Math.round(ingreso).toLocaleString('es-CO')}` : '—'}</td>
                                    <td style={{ padding: '8px 12px', color: '#4a4540', whiteSpace: 'nowrap' }}>{r.animal_id ? (animalesMap[r.animal_id] ?? '—') : '—'}</td>
                                    <td style={{ padding: '8px 12px', color: '#4a4540', whiteSpace: 'nowrap' }}>{r.lote_id ? (lotesMap[r.lote_id] ?? '—') : '—'}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <div style={{ display: 'flex', gap: '5px' }}>
                                        <button onClick={() => openEditRegistro(r)}
                                          style={{ padding: '3px 8px', border: '1px solid rgba(60,45,30,0.2)', borderRadius: '4px', backgroundColor: 'transparent', color: '#4a4540', fontSize: '11px', fontFamily: 'var(--font-sans), sans-serif', cursor: 'pointer' }}>Editar</button>
                                        <button onClick={() => setRegistroToDelete(r)}
                                          style={{ padding: '3px 8px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '4px', backgroundColor: 'transparent', color: '#8B1A1A', fontSize: '11px', fontFamily: 'var(--font-sans), sans-serif', cursor: 'pointer' }}>Eliminar</button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── EDIT MODAL (shared) ── */}
      {showEditModal && registroToEdit && (
        <div onClick={() => { setShowEditModal(false); setRegistroToEdit(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 20px' }}>Editar registro</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={editFecha} onChange={e => { setEditFecha(e.target.value); setEditFechaError(null) }} required max={today} style={inputStyle} />
                {editFechaError && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8B1A1A', margin: '4px 0 0' }}>{editFechaError}</p>}
              </div>
              <div>
                <label style={labelStyle}>Litros *</label>
                <input type="number" step="0.1" min="0" value={editLitros} onChange={e => setEditLitros(e.target.value)} placeholder="0.0" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Precio por litro (COP)</label>
                <input type="number" step="0.01" min="0" value={editPrecio} onChange={e => setEditPrecio(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Animal</label>
                <select value={editAnimalId} onChange={e => setEditAnimalId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Sin especificar</option>
                  {animales.map(a => <option key={a.id} value={a.id}>{a.codigo}{a.nombre ? ` — ${a.nombre}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lote</label>
                <select value={editLoteId} onChange={e => setEditLoteId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Sin especificar</option>
                  {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowEditModal(false); setRegistroToEdit(null) }}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
                <button type="submit" disabled={savingEdit}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM (shared) ── */}
      {registroToDelete && (
        <div onClick={() => setRegistroToDelete(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 10px' }}>Eliminar registro</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 24px', lineHeight: 1.6 }}>
              ¿Eliminar el registro del <strong>{registroToDelete.fecha}</strong> ({registroToDelete.litros} L)? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRegistroToDelete(null)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
              <button onClick={handleDeleteConfirm} disabled={deletingRegistro}
                style={{ padding: '10px 20px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: deletingRegistro ? 'not-allowed' : 'pointer', opacity: deletingRegistro ? 0.7 : 1 }}>
                {deletingRegistro ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
