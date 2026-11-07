'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getFincaAndRol } from '@/lib/finca'
import type { Finca, Lote, VentaAnimal, Animal } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)',
  borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
  fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500,
  color: '#4a4540', display: 'block', marginBottom: '6px',
}
const filterStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid rgba(60,45,30,0.15)', borderRadius: '8px',
  backgroundColor: '#ffffff', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px',
  cursor: 'pointer', outline: 'none',
}

const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function VentasPage() {
  const today = new Date().toISOString().split('T')[0]
  const [finca, setFinca] = useState<Finca | null>(null)
  const [rol, setRol] = useState<'admin' | 'colaborador' | null>(null)
  const [ventas, setVentas] = useState<VentaAnimal[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filterComprador, setFilterComprador] = useState('')
  const [filterLote, setFilterLote] = useState('')

  // Global success
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Edit
  const [editingVenta, setEditingVenta] = useState<VentaAnimal | null>(null)
  const [editFecha, setEditFecha] = useState('')
  const [editPeso, setEditPeso] = useState('')
  const [editPrecioKg, setEditPrecioKg] = useState('')
  const [editComprador, setEditComprador] = useState('')
  const [editCedula, setEditCedula] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete
  const [ventaToDelete, setVentaToDelete] = useState<VentaAnimal | null>(null)
  const [deletingVenta, setDeletingVenta] = useState(false)

  // Resumen por mes
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // ---- Nueva venta modal ----
  const [showNuevaVenta, setShowNuevaVenta] = useState(false)
  const [nvLoading, setNvLoading] = useState(false)
  const [nvAnimales, setNvAnimales] = useState<Animal[]>([])
  const [nvMode, setNvMode] = useState<'lote' | 'manual'>('lote')
  const [nvLoteId, setNvLoteId] = useState('')
  const [nvSelectedIds, setNvSelectedIds] = useState<Set<string>>(new Set())
  const [nvPesos, setNvPesos] = useState<Record<string, string>>({})
  const [nvPrecioKg, setNvPrecioKg] = useState('')
  const [nvFecha, setNvFecha] = useState(today)
  const [nvComprador, setNvComprador] = useState('')
  const [nvCedula, setNvCedula] = useState('')
  const [nvNotas, setNvNotas] = useState('')
  const [nvConfirm, setNvConfirm] = useState(false)
  const [nvSaving, setNvSaving] = useState(false)
  const [nvError, setNvError] = useState<string | null>(null)
  const [nvSearch, setNvSearch] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { finca: f, rol: r } = await getFincaAndRol()
    setFinca(f); setRol(r)
    if (!f) { setLoading(false); return }
    const [ventasRes, lotesRes] = await Promise.all([
      supabase.from('ventas_animales')
        .select('*, animales(id, codigo, nombre), lotes(nombre)')
        .eq('finca_id', f.id)
        .order('fecha', { ascending: false }),
      supabase.from('lotes').select('*').eq('finca_id', f.id),
    ])
    setVentas((ventasRes.data ?? []) as VentaAnimal[])
    setLotes(lotesRes.data ?? [])
    setLoading(false)
  }

  async function openNuevaVenta() {
    if (!finca) return
    setNvLoading(true)
    setNvError(null)
    const supabase = createClient()
    const { data } = await supabase.from('animales')
      .select('*, lotes(nombre)')
      .eq('finca_id', finca.id)
      .eq('estado', 'activo')
      .order('codigo', { ascending: true })
    const animals = (data ?? []) as Animal[]
    const pesos: Record<string, string> = {}
    animals.forEach(a => { pesos[a.id] = a.peso_actual != null ? String(a.peso_actual) : '' })
    setNvAnimales(animals)
    setNvPesos(pesos)
    setNvMode('lote')
    setNvLoteId('')
    setNvSelectedIds(new Set())
    setNvPrecioKg('')
    setNvFecha(today)
    setNvComprador('')
    setNvCedula('')
    setNvNotas('')
    setNvSearch('')
    setNvLoading(false)
    setShowNuevaVenta(true)
  }

  async function handleNuevaVenta() {
    if (!finca) return
    const toSell = nvAnimales.filter(a => nvSelectedIds.has(a.id))
    if (toSell.length === 0) return
    setNvSaving(true)
    setNvError(null)
    const supabase = createClient()
    const precioKgNum = parseFloat(nvPrecioKg) || 0
    try {
      for (const a of toSell) {
        const peso = parseFloat(nvPesos[a.id] ?? '0') || 0
        const total = peso * precioKgNum
        await Promise.all([
          supabase.from('animales').update({
            estado: 'vendido',
            peso_actual: peso > 0 ? peso : a.peso_actual,
          }).eq('id', a.id),
          supabase.from('ventas_animales').insert({
            animal_id: a.id,
            finca_id: finca.id,
            lote_id: a.lote_id || null,
            fecha: nvFecha,
            precio: total,
            precio_por_kg: precioKgNum > 0 ? precioKgNum : null,
            peso_venta: peso > 0 ? peso : null,
            comprador: nvComprador.trim() || null,
            cedula_nit_comprador: nvCedula.trim() || null,
            notas: nvNotas.trim() || null,
          }),
          supabase.from('eventos_animal').insert({
            animal_id: a.id,
            tipo: 'venta',
            descripcion: `Vendido${nvComprador ? ` a ${nvComprador.trim()}` : ''}${peso > 0 ? ` — ${peso} kg` : ''}${precioKgNum > 0 ? ` a $${Math.round(precioKgNum).toLocaleString('es-CO')}/kg` : ''}. Total: $${Math.round(total).toLocaleString('es-CO')}`,
            fecha: nvFecha,
            costo: null,
            proxima_fecha: null,
          }),
        ])
      }
      const grandTotal = toSell.reduce((sum, a) => {
        const peso = parseFloat(nvPesos[a.id] ?? '0') || 0
        return sum + (peso * precioKgNum)
      }, 0)
      setNvSaving(false)
      setNvConfirm(false)
      setShowNuevaVenta(false)
      loadData()
      setSuccessMsg(`Venta registrada. ${toSell.length} animal${toSell.length !== 1 ? 'es' : ''} vendido${toSell.length !== 1 ? 's' : ''} por $${Math.round(grandTotal).toLocaleString('es-CO')}.`)
      setTimeout(() => setSuccessMsg(null), 6000)
    } catch (err) {
      console.error('[Ventas] Error al registrar venta:', err)
      setNvError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`)
      setNvSaving(false)
    }
  }

  const isAdmin = rol === 'admin'
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const lastMonthD = new Date(now.getFullYear(), now.getMonth()-1, 1)
  const lastMonth = `${lastMonthD.getFullYear()}-${String(lastMonthD.getMonth()+1).padStart(2,'0')}`

  const thisMonthVentas = ventas.filter(v => v.fecha.startsWith(thisMonth))
  const lastMonthVentas = ventas.filter(v => v.fecha.startsWith(lastMonth))
  const ingresosEsteMes = thisMonthVentas.reduce((s, v) => s + v.precio, 0)
  const ingresosMesAnterior = lastMonthVentas.reduce((s, v) => s + v.precio, 0)
  const variacion = ingresosMesAnterior > 0 ? ((ingresosEsteMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : null

  const filtered = ventas.filter(v => {
    if (fechaDesde && v.fecha < fechaDesde) return false
    if (fechaHasta && v.fecha > fechaHasta) return false
    if (filterComprador && !(v.comprador?.toLowerCase().includes(filterComprador.toLowerCase()))) return false
    if (filterLote && v.lote_id !== filterLote) return false
    return true
  })

  function openEdit(v: VentaAnimal) {
    setEditingVenta(v)
    setEditFecha(v.fecha)
    setEditPeso(v.peso_venta != null ? String(v.peso_venta) : '')
    setEditPrecioKg(v.precio_por_kg != null ? String(v.precio_por_kg) : '')
    setEditComprador(v.comprador ?? '')
    setEditCedula(v.cedula_nit_comprador ?? '')
    setEditNotas(v.notas ?? '')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVenta) return
    setSavingEdit(true)
    const supabase = createClient()
    const peso = editPeso ? parseFloat(editPeso) : null
    const precioKg = editPrecioKg ? parseFloat(editPrecioKg) : null
    const total = peso && precioKg ? peso * precioKg : editingVenta.precio
    await supabase.from('ventas_animales').update({
      fecha: editFecha,
      peso_venta: peso,
      precio_por_kg: precioKg,
      precio: total,
      comprador: editComprador || null,
      cedula_nit_comprador: editCedula || null,
      notas: editNotas || null,
    }).eq('id', editingVenta.id)
    setSavingEdit(false)
    setEditingVenta(null)
    loadData()
  }

  async function handleDelete() {
    if (!ventaToDelete) return
    setDeletingVenta(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('ventas_animales').delete().eq('id', ventaToDelete.id),
      supabase.from('animales').update({ estado: 'activo' }).eq('id', ventaToDelete.animal_id),
    ])
    setDeletingVenta(false)
    setVentaToDelete(null)
    loadData()
  }

  // Resumen por mes: last 6 months
  const monthsToShow: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthsToShow.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  const resumenMes = monthsToShow.map(m => {
    const mvs = ventas.filter(v => v.fecha.startsWith(m))
    const [yr, mo] = m.split('-').map(Number)
    return {
      key: m, label: `${monthNames[mo-1]} ${yr}`,
      count: mvs.length,
      totalKg: mvs.reduce((s, v) => s + (v.peso_venta ?? 0), 0),
      ingreso: mvs.reduce((s, v) => s + v.precio, 0),
    }
  })

  // Computed for nueva venta
  const nvLotesWithActive = lotes.filter(l => nvAnimales.some(a => a.lote_id === l.id))
  const nvDisplayAnimals = nvMode === 'lote'
    ? (nvLoteId ? nvAnimales.filter(a => a.lote_id === nvLoteId) : [])
    : nvAnimales
  const nvFilteredAnimals = nvSearch.trim()
    ? nvDisplayAnimals.filter(a =>
        a.codigo.toLowerCase().includes(nvSearch.toLowerCase()) ||
        (a.nombre ?? '').toLowerCase().includes(nvSearch.toLowerCase())
      )
    : nvDisplayAnimals
  const nvPrecioKgNum = parseFloat(nvPrecioKg) || 0
  const nvGrandTotal = nvAnimales
    .filter(a => nvSelectedIds.has(a.id))
    .reduce((sum, a) => sum + ((parseFloat(nvPesos[a.id] ?? '0') || 0) * nvPrecioKgNum), 0)

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.</div>

  const cardStyle: React.CSSProperties = { backgroundColor: '#faf8f4', borderRadius: '12px', padding: '18px 20px', border: '1px solid rgba(60,45,30,0.08)' }
  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '32px', color: '#1c1a17', margin: '0 0 4px' }}>Ventas</h1>
          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: 0 }}>{ventas.length} venta{ventas.length !== 1 ? 's' : ''} registrada{ventas.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={openNuevaVenta} disabled={nvLoading}
            style={{ backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: nvLoading ? 'not-allowed' : 'pointer', opacity: nvLoading ? 0.7 : 1 }}>
            {nvLoading ? 'Cargando...' : '+ Registrar venta'}
          </button>
        )}
      </div>

      {/* Success msg */}
      {successMsg && (
        <div style={{ backgroundColor: '#e8f5ee', border: '1px solid rgba(26,107,69,0.2)', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#1a6b45', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ✓ {successMsg}
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b45', fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Ventas este mes</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '32px', color: '#1c1a17', lineHeight: 1 }}>{thisMonthVentas.length}</span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Ingresos este mes</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '28px', color: '#1a6b45', lineHeight: 1 }}>
            {ingresosEsteMes > 0 ? `$${Math.round(ingresosEsteMes).toLocaleString('es-CO')}` : '—'}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Ventas mes anterior</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '32px', color: '#1c1a17', lineHeight: 1 }}>{lastMonthVentas.length}</span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Variación ingresos</span>
          {variacion !== null ? (
            <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '28px', color: variacion >= 0 ? '#1a6b45' : '#8B1A1A', lineHeight: 1 }}>
              {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', display: 'block', marginTop: '4px' }}>Sin datos previos</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74' }}>Desde:</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} max={today} style={{ ...filterStyle, padding: '7px 10px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74' }}>Hasta:</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} max={today} style={{ ...filterStyle, padding: '7px 10px' }} />
        </div>
        <input type="text" value={filterComprador} onChange={e => setFilterComprador(e.target.value)}
          placeholder="Buscar comprador..." style={{ ...filterStyle, minWidth: '180px' }} />
        <select value={filterLote} onChange={e => setFilterLote(e.target.value)} style={filterStyle}>
          <option value="">Todos los lotes</option>
          {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
        {(fechaDesde || fechaHasta || filterComprador || filterLote) && (
          <button onClick={() => { setFechaDesde(''); setFechaHasta(''); setFilterComprador(''); setFilterLote('') }}
            style={{ padding: '7px 14px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', cursor: 'pointer', color: '#8c7f74' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                {['Fecha','Animal','Lote','Peso (kg)','Precio/kg','Total','Comprador','Cédula/NIT','Notas',''].map((col, i) => (
                  <th key={i} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '32px 16px', textAlign: 'center', color: '#8c7f74', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px' }}>Sin ventas registradas{(fechaDesde || fechaHasta || filterComprador || filterLote) ? ' con los filtros aplicados' : ''}</td></tr>
              ) : filtered.map((v, i) => (
                <tr key={v.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                  <td style={{ padding: '11px 14px', color: '#1c1a17', whiteSpace: 'nowrap' }}>{v.fecha}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {v.animales ? (
                      <Link href={`/dashboard/animales/${v.animales.id}`}
                        style={{ color: '#1a6b45', textDecoration: 'none', fontWeight: 500 }}>
                        {v.animales.codigo}{v.animales.nombre ? ` — ${v.animales.nombre}` : ''}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#4a4540' }}>{v.lotes?.nombre ?? '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540' }}>{v.peso_venta != null ? `${v.peso_venta} kg` : '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540' }}>{v.precio_por_kg != null ? `$${v.precio_por_kg.toLocaleString('es-CO')}` : '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#1a6b45', fontWeight: 600 }}>${Math.round(v.precio).toLocaleString('es-CO')}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540' }}>{v.comprador ?? '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', whiteSpace: 'nowrap' }}>{v.cedula_nit_comprador ?? '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.notas ?? '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(v)}
                        style={{ padding: '4px 10px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#4a4540' }}>
                        Editar
                      </button>
                      {isAdmin && (
                        <button onClick={() => setVentaToDelete(v)}
                          style={{ padding: '4px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#8B1A1A' }}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen por mes */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: 0 }}>Resumen por mes</h2>
        </div>
        {resumenMes.map(m => {
          const isExp = expandedMonths.has(m.key)
          const monthVentas = ventas.filter(v => v.fecha.startsWith(m.key))
          return (
            <div key={m.key} style={{ borderBottom: '1px solid rgba(60,45,30,0.07)' }}>
              <button
                onClick={() => setExpandedMonths(prev => {
                  const s = new Set(prev)
                  if (isExp) { s.delete(m.key) } else { s.add(m.key) }
                  return s
                })}
                style={{ width: '100%', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, color: '#1c1a17', minWidth: '140px' }}>{m.label}</span>
                <div style={{ display: 'flex', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540' }}>{m.count} animal{m.count !== 1 ? 'es' : ''}</span>
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540' }}>{m.totalKg > 0 ? `${m.totalKg.toFixed(1)} kg` : '— kg'}</span>
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: m.ingreso > 0 ? '#1a6b45' : '#8c7f74', fontWeight: m.ingreso > 0 ? 600 : 400 }}>
                    {m.ingreso > 0 ? `$${Math.round(m.ingreso).toLocaleString('es-CO')}` : '—'}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', flexShrink: 0 }}>{isExp ? '▲' : '▼'}</span>
              </button>
              {isExp && (
                <div style={{ padding: '0 24px 16px', overflowX: 'auto' }}>
                  {monthVentas.length === 0 ? (
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: '8px 0 0' }}>Sin ventas este mes.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
                          {['Fecha','Animal','Peso','Precio/kg','Total','Comprador'].map((h, i) => (
                            <th key={i} style={{ padding: '7px 10px', textAlign: 'left', color: '#8c7f74', fontWeight: 500, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.06em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthVentas.map((v, i) => (
                          <tr key={v.id} style={{ borderBottom: i < monthVentas.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none' }}>
                            <td style={{ padding: '7px 10px', color: '#1c1a17' }}>{v.fecha}</td>
                            <td style={{ padding: '7px 10px' }}>
                              {v.animales ? (
                                <Link href={`/dashboard/animales/${v.animales.id}`} style={{ color: '#1a6b45', textDecoration: 'none' }}>
                                  {v.animales.codigo}
                                </Link>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '7px 10px', color: '#4a4540' }}>{v.peso_venta != null ? `${v.peso_venta} kg` : '—'}</td>
                            <td style={{ padding: '7px 10px', color: '#4a4540' }}>{v.precio_por_kg != null ? `$${v.precio_por_kg.toLocaleString('es-CO')}` : '—'}</td>
                            <td style={{ padding: '7px 10px', color: '#1a6b45', fontWeight: 600 }}>${Math.round(v.precio).toLocaleString('es-CO')}</td>
                            <td style={{ padding: '7px 10px', color: '#4a4540' }}>{v.comprador ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ---- NUEVA VENTA MODAL ---- */}
      {showNuevaVenta && (
        <div onClick={() => setShowNuevaVenta(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '680px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '94vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '24px', color: '#1c1a17', margin: 0 }}>Registrar venta</h2>

            {nvError && (
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A' }}>
                ⚠ {nvError}
              </div>
            )}

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(60,45,30,0.15)', borderRadius: '8px', overflow: 'hidden' }}>
              {(['lote', 'manual'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => { setNvMode(m); setNvSelectedIds(new Set()); setNvLoteId(''); setNvSearch('') }}
                  style={{ flex: 1, padding: '10px', border: 'none', backgroundColor: nvMode === m ? '#1a6b45' : 'transparent', color: nvMode === m ? 'white' : '#4a4540', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: nvMode === m ? 500 : 400, cursor: 'pointer', transition: 'background 0.15s' }}>
                  {m === 'lote' ? 'Por lote' : 'Selección manual'}
                </button>
              ))}
            </div>

            {/* Animal selection */}
            <div style={{ border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', overflow: 'hidden' }}>
              {nvMode === 'lote' && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(60,45,30,0.08)', backgroundColor: '#faf8f4' }}>
                  <label style={labelStyle}>Seleccionar lote</label>
                  <select
                    value={nvLoteId}
                    onChange={e => {
                      const lid = e.target.value
                      setNvLoteId(lid)
                      setNvSearch('')
                      const animals = nvAnimales.filter(a => a.lote_id === lid)
                      setNvSelectedIds(new Set(animals.map(a => a.id)))
                    }}
                    style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                    <option value="">— Elegir lote —</option>
                    {nvLotesWithActive.map(l => <option key={l.id} value={l.id}>{l.nombre} ({nvAnimales.filter(a => a.lote_id === l.id).length} animales)</option>)}
                  </select>
                </div>
              )}

              {nvMode === 'manual' && (
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(60,45,30,0.08)', backgroundColor: '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540' }}>{nvSelectedIds.size} seleccionado{nvSelectedIds.size !== 1 ? 's' : ''}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button"
                      onClick={() => setNvSelectedIds(new Set(nvAnimales.map(a => a.id)))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#1a6b45', textDecoration: 'underline' }}>
                      Seleccionar todos
                    </button>
                    <button type="button"
                      onClick={() => setNvSelectedIds(new Set())}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', textDecoration: 'underline' }}>
                      Ninguno
                    </button>
                  </div>
                </div>
              )}

              {nvDisplayAnimals.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74' }}>
                  {nvMode === 'lote' ? 'Selecciona un lote para ver sus animales' : 'No hay animales activos en la finca'}
                </div>
              ) : (
                <>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(60,45,30,0.08)', backgroundColor: '#faf8f4', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      value={nvSearch}
                      onChange={e => setNvSearch(e.target.value)}
                      placeholder="Buscar por código o nombre..."
                      style={{ flex: 1, padding: '7px 12px', border: '1px solid rgba(60,45,30,0.15)', borderRadius: '7px', backgroundColor: '#ffffff', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', outline: 'none' }}
                    />
                    <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Mostrando {nvFilteredAnimals.length} de {nvDisplayAnimals.length}
                    </span>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {nvFilteredAnimals.length === 0 ? (
                      <div style={{ padding: '20px 16px', textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74' }}>
                        Sin animales que coincidan con &ldquo;{nvSearch}&rdquo;
                      </div>
                    ) : nvMode === 'manual' ? (
                      (() => {
                        const noLote = nvFilteredAnimals.filter(a => !a.lote_id)
                        const byLote = nvLotesWithActive.map(l => ({
                          lote: l,
                          animals: nvFilteredAnimals.filter(a => a.lote_id === l.id),
                        })).filter(g => g.animals.length > 0)
                        return [...byLote.map(g => ({ label: g.lote.nombre, animals: g.animals })), ...(noLote.length > 0 ? [{ label: 'Sin lote', animals: noLote }] : [])]
                      })().map(group => (
                        <div key={group.label}>
                          <div style={{ padding: '7px 16px', backgroundColor: '#f5f2ed', fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', fontWeight: 600, color: '#8c7f74', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{group.label}</div>
                          {group.animals.map((a, ai) => (
                            <AnimalSelectionRow key={a.id} a={a} checked={nvSelectedIds.has(a.id)}
                              peso={nvPesos[a.id] ?? ''}
                              onCheck={v => setNvSelectedIds(prev => { const s = new Set(prev); if (v) s.add(a.id); else s.delete(a.id); return s })}
                              onPeso={v => setNvPesos(prev => ({ ...prev, [a.id]: v }))}
                              last={ai === group.animals.length - 1}
                            />
                          ))}
                        </div>
                      ))
                    ) : (
                      nvFilteredAnimals.map((a, ai) => (
                        <AnimalSelectionRow key={a.id} a={a} checked={nvSelectedIds.has(a.id)}
                          peso={nvPesos[a.id] ?? ''}
                          onCheck={v => setNvSelectedIds(prev => { const s = new Set(prev); if (v) s.add(a.id); else s.delete(a.id); return s })}
                          onPeso={v => setNvPesos(prev => ({ ...prev, [a.id]: v }))}
                          last={ai === nvFilteredAnimals.length - 1}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Price + details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Precio por kg (COP)</label>
                <input type="number" step="1" min="0" value={nvPrecioKg} onChange={e => setNvPrecioKg(e.target.value)} placeholder="Ej: 8000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha de venta</label>
                <input type="date" value={nvFecha} onChange={e => setNvFecha(e.target.value)} max={today} style={inputStyle} />
              </div>
            </div>

            {nvGrandTotal > 0 && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', marginRight: '8px' }}>Total {nvSelectedIds.size} animal{nvSelectedIds.size !== 1 ? 'es' : ''}:</span>
                <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '24px', color: '#1a6b45', fontWeight: 'normal' }}>
                  ${Math.round(nvGrandTotal).toLocaleString('es-CO')}
                </span>
              </div>
            )}

            <div>
              <label style={labelStyle}>Comprador (opcional)</label>
              <input value={nvComprador} onChange={e => setNvComprador(e.target.value)} placeholder="Nombre del comprador" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cédula o NIT del comprador (opcional)</label>
              <input value={nvCedula} onChange={e => setNvCedula(e.target.value)} placeholder="Ej: 900.123.456-7" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Notas (opcional)</label>
              <textarea value={nvNotas} onChange={e => setNvNotas(e.target.value)} rows={2} placeholder="Observaciones sobre la venta" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowNuevaVenta(false)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button type="button"
                disabled={nvSelectedIds.size === 0}
                onClick={() => setNvConfirm(true)}
                style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: nvSelectedIds.size === 0 ? 'not-allowed' : 'pointer', opacity: nvSelectedIds.size === 0 ? 0.5 : 1 }}>
                Registrar venta ({nvSelectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- CONFIRM VENTA ---- */}
      {nvConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 14px' }}>¿Confirmar venta?</h3>
            <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', lineHeight: 1.7, marginBottom: '20px' }}>
              <div>Animales: <strong>{nvSelectedIds.size}</strong></div>
              {nvPrecioKgNum > 0 && <div>Precio/kg: <strong>${Math.round(nvPrecioKgNum).toLocaleString('es-CO')}</strong></div>}
              {nvGrandTotal > 0 && (
                <div style={{ marginTop: '8px' }}>
                  Total: <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '20px', color: '#1a6b45' }}>${Math.round(nvGrandTotal).toLocaleString('es-CO')}</span>
                </div>
              )}
              {nvComprador && <div>Comprador: <strong>{nvComprador}</strong></div>}
              <div style={{ marginTop: '8px', color: '#8c7f74', fontSize: '13px' }}>
                Los animales pasarán a estado <strong>vendido</strong>. Esta acción no se puede deshacer.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setNvConfirm(false)} disabled={nvSaving}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={handleNuevaVenta} disabled={nvSaving}
                style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: nvSaving ? 'not-allowed' : 'pointer', opacity: nvSaving ? 0.7 : 1 }}>
                {nvSaving ? 'Registrando...' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- EDIT MODAL ---- */}
      {editingVenta && (
        <div onClick={() => setEditingVenta(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 20px' }}>Editar venta</h2>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} required max={today} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Peso al vender (kg)</label>
                  <input type="number" step="0.1" min="0" value={editPeso} onChange={e => setEditPeso(e.target.value)} placeholder="kg" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Precio por kg (COP)</label>
                <input type="number" step="1" min="0" value={editPrecioKg} onChange={e => setEditPrecioKg(e.target.value)} placeholder="$/kg" style={inputStyle} />
              </div>
              {editPeso && editPrecioKg && parseFloat(editPeso) > 0 && parseFloat(editPrecioKg) > 0 && (
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-serif), serif', fontSize: '20px', color: '#1a6b45' }}>
                  Total: ${Math.round(parseFloat(editPeso) * parseFloat(editPrecioKg)).toLocaleString('es-CO')}
                </div>
              )}
              <div>
                <label style={labelStyle}>Comprador</label>
                <input value={editComprador} onChange={e => setEditComprador(e.target.value)} placeholder="Nombre del comprador" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cédula o NIT del comprador</label>
                <input value={editCedula} onChange={e => setEditCedula(e.target.value)} placeholder="Ej: 900.123.456-7" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <input value={editNotas} onChange={e => setEditNotas(e.target.value)} placeholder="Observaciones" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setEditingVenta(null)}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingEdit}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- DELETE CONFIRM ---- */}
      {ventaToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#8B1A1A', margin: '0 0 12px' }}>¿Eliminar venta?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 8px', lineHeight: 1.6 }}>
              Se eliminará la venta del animal <strong>{ventaToDelete.animales?.codigo ?? '—'}</strong> del {ventaToDelete.fecha}.
            </p>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 20px', lineHeight: 1.6 }}>
              El animal volverá al estado <strong>activo</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setVentaToDelete(null)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deletingVenta}
                style={{ padding: '10px 20px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: deletingVenta ? 'not-allowed' : 'pointer', opacity: deletingVenta ? 0.7 : 1 }}>
                {deletingVenta ? 'Eliminando...' : 'Eliminar venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnimalSelectionRow({ a, checked, peso, onCheck, onPeso, last }: {
  a: Animal; checked: boolean; peso: string
  onCheck: (v: boolean) => void; onPeso: (v: string) => void; last: boolean
}) {
  const precioKgEl = null // only used as parent slot ref
  void precioKgEl
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: last ? 'none' : '1px solid rgba(60,45,30,0.06)', backgroundColor: checked ? '#f0faf4' : 'transparent', transition: 'background 0.1s' }}>
      <input type="checkbox" checked={checked} onChange={e => onCheck(e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: '#1a6b45', cursor: 'pointer', flexShrink: 0 }} />
      <div>
        <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#1c1a17' }}>{a.codigo}</span>
        {a.nombre && <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', marginLeft: '6px' }}>{a.nombre}</span>}
        {a.peso_actual != null && <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#4a4540', marginLeft: '6px' }}>· {a.peso_actual} kg</span>}
      </div>
      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', color: '#8c7f74', whiteSpace: 'nowrap' }}>Peso venta:</span>
      <input type="number" step="0.1" min="0" value={peso} onChange={e => onPeso(e.target.value)}
        placeholder="kg"
        style={{ width: '80px', padding: '5px 8px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: '#f0ece4', fontSize: '13px', fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )
}
