'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Animal, EventoAnimal, Finca, Lote } from '@/lib/types'

const todayStr = new Date().toISOString().split('T')[0]

const badgeColors: Record<string, React.CSSProperties> = {
  activo: { backgroundColor: '#e8f5ee', color: '#1a6b45' },
  vendido: { backgroundColor: '#fef3c7', color: '#92400e' },
  muerto: { backgroundColor: '#fee2e2', color: '#8B1A1A' },
}

const propLabels: Record<string, string> = {
  leche: 'Leche', carne: 'Carne', doble_proposito: 'Doble propósito',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)',
  borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
  fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500,
  color: '#4a4540', display: 'block', marginBottom: '6px',
}

type FormState = {
  codigo: string; nombre: string; raza: string; sexo: string
  fecha_nacimiento: string; proposito: string; lote_id: string
  peso_actual: string; notas: string
}
const emptyForm: FormState = {
  codigo: '', nombre: '', raza: '', sexo: '', fecha_nacimiento: '',
  proposito: '', lote_id: '', peso_actual: '', notas: '',
}
type SortCol = 'codigo' | 'nombre' | 'raza' | 'lote'
type MasivoForm = { tipo: string; descripcion: string; fecha: string; costo: string; proxima_fecha: string; precioVentaTotal: string; comprador: string }

export default function AnimalesPage() {
  const [finca, setFinca] = useState<Finca | null>(null)
  const [animales, setAnimales] = useState<Animal[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)

  // Add animal modal
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  // Filters
  const [filterLote, setFilterLote] = useState('')
  const [filterProposito, setFilterProposito] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [showInactivos, setShowInactivos] = useState(false)

  // Sorting
  const [sortCol, setSortCol] = useState<SortCol | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Lotes management
  const [showLotesModal, setShowLotesModal] = useState(false)
  const [showCreateLote, setShowCreateLote] = useState(false)
  const [loteToEdit, setLoteToEdit] = useState<Lote | null>(null)
  const [loteNombre, setLoteNombre] = useState('')
  const [loteDesc, setLoteDesc] = useState('')
  const [savingLote, setSavingLote] = useState(false)
  const [loteError, setLoteError] = useState<string | null>(null)

  // Evento masivo
  const [showMasivoModal, setShowMasivoModal] = useState(false)
  const [showVentaConfirm, setShowVentaConfirm] = useState(false)
  const [masivoMode, setMasivoMode] = useState<'lote' | 'manual'>('lote')
  const [masivoForm, setMasivoForm] = useState<MasivoForm>({ tipo: '', descripcion: '', fecha: todayStr, costo: '', proxima_fecha: '', precioVentaTotal: '', comprador: '' })
  const [masivoLoteId, setMasivoLoteId] = useState('')
  const [masivoSelected, setMasivoSelected] = useState<string[]>([])
  const [savingMasivo, setSavingMasivo] = useState(false)
  const [masivoError, setMasivoError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: fincas } = await supabase.from('fincas').select('*').limit(1)
    const currentFinca: Finca | null = fincas?.[0] ?? null
    setFinca(currentFinca)
    if (!currentFinca) { setLoading(false); return }
    const [animalesRes, lotesRes] = await Promise.all([
      supabase.from('animales').select('*, lotes(nombre)').eq('finca_id', currentFinca.id).order('created_at', { ascending: false }),
      supabase.from('lotes').select('*').eq('finca_id', currentFinca.id),
    ])
    setAnimales((animalesRes.data ?? []) as Animal[])
    setLotes(lotesRes.data ?? [])
    setLoading(false)
  }

  async function handleAddAnimal(e: React.FormEvent) {
    e.preventDefault()
    if (!finca) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('animales').insert({
      finca_id: finca.id,
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim() || null,
      raza: form.raza.trim() || null,
      sexo: (form.sexo || null) as Animal['sexo'],
      fecha_nacimiento: form.fecha_nacimiento || null,
      proposito: (form.proposito || null) as Animal['proposito'],
      lote_id: form.lote_id || null,
      peso_actual: form.peso_actual ? parseFloat(form.peso_actual) : null,
      notas: form.notas.trim() || null,
    })
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    loadData()
  }

  // Lote management
  const loteCount = animales.reduce((acc, a) => {
    if (a.lote_id) acc[a.lote_id] = (acc[a.lote_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  async function handleCreateLote(e: React.FormEvent) {
    e.preventDefault()
    if (!finca || !loteNombre.trim()) return
    setSavingLote(true)
    const supabase = createClient()
    await supabase.from('lotes').insert({ finca_id: finca.id, nombre: loteNombre.trim(), descripcion: loteDesc.trim() || null })
    setSavingLote(false); setLoteNombre(''); setLoteDesc(''); setShowCreateLote(false); loadData()
  }

  async function handleUpdateLote(e: React.FormEvent) {
    e.preventDefault()
    if (!loteToEdit || !loteNombre.trim()) return
    setSavingLote(true)
    const supabase = createClient()
    await supabase.from('lotes').update({ nombre: loteNombre.trim(), descripcion: loteDesc.trim() || null }).eq('id', loteToEdit.id)
    setSavingLote(false); setLoteToEdit(null); setLoteNombre(''); setLoteDesc(''); loadData()
  }

  async function handleDeleteLote(loteId: string) {
    setLoteError(null)
    const count = loteCount[loteId] ?? 0
    if (count > 0) {
      setLoteError(`Este lote tiene ${count} animal${count !== 1 ? 'es' : ''} asignado${count !== 1 ? 's' : ''}. Reasígnalos antes de eliminar.`)
      return
    }
    const supabase = createClient()
    await supabase.from('lotes').delete().eq('id', loteId)
    loadData()
  }

  function openEditLote(lote: Lote) {
    setLoteToEdit(lote); setLoteNombre(lote.nombre); setLoteDesc(lote.descripcion ?? ''); setShowCreateLote(false); setLoteError(null)
  }

  // Evento masivo
  const activeAnimales = animales.filter(a => a.estado === 'activo')
  const masivoLoteAnimals = masivoLoteId ? activeAnimales.filter(a => a.lote_id === masivoLoteId) : []
  const ventaAnimalsCount = masivoMode === 'lote' ? masivoLoteAnimals.length : masivoSelected.length

  function toggleMasivoAnimal(id: string) {
    setMasivoSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function executeMasivo() {
    setMasivoError(null)
    const targetIds = masivoMode === 'lote' ? masivoLoteAnimals.map(a => a.id) : masivoSelected
    if (targetIds.length === 0) { setMasivoError('Selecciona al menos un animal.'); return }
    setSavingMasivo(true)
    const supabase = createClient()

    if (masivoForm.tipo === 'venta') {
      const precioPorCabeza = masivoForm.precioVentaTotal ? parseFloat(masivoForm.precioVentaTotal) / targetIds.length : 0
      await Promise.all([
        supabase.from('eventos_animal').insert(
          targetIds.map(animal_id => ({
            animal_id,
            tipo: 'venta' as EventoAnimal['tipo'],
            descripcion: masivoForm.descripcion || `Venta${masivoForm.comprador ? ` a ${masivoForm.comprador}` : ''}`,
            fecha: masivoForm.fecha,
            costo: precioPorCabeza > 0 ? precioPorCabeza : null,
            proxima_fecha: null,
          }))
        ),
        supabase.from('animales').update({ estado: 'vendido' }).in('id', targetIds),
        supabase.from('ventas_animales').insert(
          targetIds.map(animal_id => ({
            animal_id,
            finca_id: finca!.id,
            fecha: masivoForm.fecha,
            precio: precioPorCabeza,
            comprador: masivoForm.comprador || null,
          }))
        ),
      ])
    } else {
      await supabase.from('eventos_animal').insert(
        targetIds.map(animal_id => ({
          animal_id,
          tipo: masivoForm.tipo as EventoAnimal['tipo'],
          descripcion: masivoForm.descripcion,
          fecha: masivoForm.fecha,
          costo: masivoForm.costo ? parseFloat(masivoForm.costo) : null,
          proxima_fecha: masivoForm.proxima_fecha || null,
        }))
      )
    }

    setSavingMasivo(false)
    setShowVentaConfirm(false)
    setShowMasivoModal(false)
    setMasivoForm({ tipo: '', descripcion: '', fecha: todayStr, costo: '', proxima_fecha: '', precioVentaTotal: '', comprador: '' })
    setMasivoLoteId(''); setMasivoSelected([]); setMasivoError(null)
    loadData()
  }

  async function handleMasivoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMasivoError(null)
    if (!masivoForm.tipo || !masivoForm.fecha) return
    if (masivoForm.tipo !== 'venta' && !masivoForm.descripcion) return
    const targetIds = masivoMode === 'lote' ? masivoLoteAnimals.map(a => a.id) : masivoSelected
    if (targetIds.length === 0) { setMasivoError('Selecciona al menos un animal.'); return }
    if (masivoForm.tipo === 'venta') { setShowVentaConfirm(true); return }
    await executeMasivo()
  }

  // Sorting
  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Filter + sort
  const filtered = animales.filter(a => {
    if (!showInactivos && a.estado !== 'activo') return false
    if (showInactivos && filterEstado && a.estado !== filterEstado) return false
    if (filterLote && a.lote_id !== filterLote) return false
    if (filterProposito && a.proposito !== filterProposito) return false
    return true
  })

  const display = sortCol ? [...filtered].sort((a, b) => {
    let av = '', bv = ''
    if (sortCol === 'codigo') { av = a.codigo; bv = b.codigo }
    else if (sortCol === 'nombre') { av = a.nombre ?? ''; bv = b.nombre ?? '' }
    else if (sortCol === 'raza') { av = a.raza ?? ''; bv = b.raza ?? '' }
    else if (sortCol === 'lote') { av = a.lotes?.nombre ?? ''; bv = b.lotes?.nombre ?? '' }
    return sortDir === 'asc' ? av.localeCompare(bv, 'es') : bv.localeCompare(av, 'es')
  }) : filtered

  const arrow = (col: SortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const filterSelectStyle: React.CSSProperties = { padding: '8px 12px', border: '1px solid rgba(60,45,30,0.15)', borderRadius: '8px', backgroundColor: '#ffffff', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', cursor: 'pointer', outline: 'none' }

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.</div>

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 2px' }}>Animales</h1>
          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: 0 }}>{display.length} animal{display.length !== 1 ? 'es' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { setShowMasivoModal(true); setMasivoError(null) }}
            style={{ backgroundColor: 'transparent', color: '#4a4540', border: '1px solid rgba(60,45,30,0.25)', borderRadius: '8px', padding: '10px 16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            Evento masivo
          </button>
          <button onClick={() => { setShowLotesModal(true); setLoteError(null); setShowCreateLote(false); setLoteToEdit(null) }}
            style={{ backgroundColor: 'transparent', color: '#1a6b45', border: '1px solid rgba(26,107,69,0.4)', borderRadius: '8px', padding: '10px 16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            Gestionar lotes
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            + Agregar animal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterLote} onChange={e => setFilterLote(e.target.value)} style={filterSelectStyle}>
          <option value="">Todos los lotes</option>
          {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
        <select value={filterProposito} onChange={e => setFilterProposito(e.target.value)} style={filterSelectStyle}>
          <option value="">Todos los propósitos</option>
          <option value="leche">Leche</option>
          <option value="carne">Carne</option>
          <option value="doble_proposito">Doble propósito</option>
        </select>
        {showInactivos && (
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={filterSelectStyle}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="vendido">Vendido</option>
            <option value="muerto">Muerto</option>
          </select>
        )}
      </div>

      {/* Toggle inactivos */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540', userSelect: 'none' }}>
          <input type="checkbox" checked={showInactivos}
            onChange={e => { setShowInactivos(e.target.checked); if (!e.target.checked) setFilterEstado('') }}
            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#1a6b45' }} />
          Mostrar inactivos (vendidos y muertos)
        </label>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                {([
                  { k: 'codigo', l: 'Código', s: true },
                  { k: 'nombre', l: 'Nombre', s: true },
                  { k: 'raza', l: 'Raza', s: true },
                  { k: 'lote', l: 'Lote', s: true },
                  { k: 'proposito', l: 'Propósito', s: false },
                  { k: 'estado', l: 'Estado', s: false },
                  { k: 'peso', l: 'Peso (kg)', s: false },
                  { k: 'acciones', l: 'Acciones', s: false },
                ] as const).map(col => (
                  <th key={col.k}
                    onClick={col.s ? () => handleSort(col.k as SortCol) : undefined}
                    style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: col.s && sortCol === col.k ? '#1a6b45' : '#8c7f74', whiteSpace: 'nowrap', cursor: col.s ? 'pointer' : 'default', userSelect: 'none' }}>
                    {col.l}{col.s ? arrow(col.k as SortCol) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {display.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: '#8c7f74' }}>Sin animales registrados</td></tr>
              ) : display.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < display.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1c1a17' }}>{a.codigo}</td>
                  <td style={{ padding: '12px 16px', color: '#4a4540' }}>{a.nombre ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#4a4540' }}>{a.raza ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#4a4540' }}>{a.lotes?.nombre ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#4a4540' }}>{a.proposito ? propLabels[a.proposito] : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ ...badgeColors[a.estado], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{a.estado}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#4a4540' }}>{a.peso_actual != null ? `${a.peso_actual}` : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/dashboard/animales/${a.id}`}
                      style={{ padding: '5px 12px', border: '1px solid rgba(26,107,69,0.3)', borderRadius: '6px', backgroundColor: 'transparent', color: '#1a6b45', fontSize: '13px', fontFamily: 'var(--font-sans), sans-serif', textDecoration: 'none', display: 'inline-block' }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- EVENTO MASIVO MODAL ---- */}
      {showMasivoModal && (
        <div onClick={() => setShowMasivoModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '540px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 20px' }}>Registrar evento masivo</h2>
            {masivoError && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', backgroundColor: '#fee2e2', padding: '10px 14px', borderRadius: '8px', margin: '0 0 16px' }}>{masivoError}</p>}
            <form onSubmit={handleMasivoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={masivoForm.tipo} onChange={e => setMasivoForm(f => ({ ...f, tipo: e.target.value }))} required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Seleccionar</option>
                    <option value="vacuna">Vacuna</option>
                    <option value="tratamiento">Tratamiento</option>
                    <option value="pesaje">Pesaje</option>
                    <option value="venta">Venta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={masivoForm.fecha} onChange={e => setMasivoForm(f => ({ ...f, fecha: e.target.value }))} required max={todayStr} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descripción{masivoForm.tipo !== 'venta' ? ' *' : ''}</label>
                <input value={masivoForm.descripcion} onChange={e => setMasivoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Describe el evento" required={masivoForm.tipo !== 'venta'} style={inputStyle} />
              </div>
              {masivoForm.tipo === 'venta' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Precio total venta (COP)</label>
                    <input type="number" step="0.01" min="0" value={masivoForm.precioVentaTotal} onChange={e => setMasivoForm(f => ({ ...f, precioVentaTotal: e.target.value }))} placeholder="0" style={inputStyle} />
                    {masivoForm.precioVentaTotal && ventaAnimalsCount > 0 && (
                      <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#1a6b45', margin: '4px 0 0' }}>
                        ${Math.round(parseFloat(masivoForm.precioVentaTotal) / ventaAnimalsCount).toLocaleString('es-CO')} por cabeza
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Comprador (opcional)</label>
                    <input value={masivoForm.comprador} onChange={e => setMasivoForm(f => ({ ...f, comprador: e.target.value }))} placeholder="Nombre del comprador" style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Costo (COP)</label>
                    <input type="number" step="0.01" value={masivoForm.costo} onChange={e => setMasivoForm(f => ({ ...f, costo: e.target.value }))} placeholder="0" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Próxima fecha</label>
                    <input type="date" value={masivoForm.proxima_fecha} onChange={e => setMasivoForm(f => ({ ...f, proxima_fecha: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              )}

              {/* Mode toggle */}
              <div>
                <label style={labelStyle}>Aplicar a</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['lote', 'manual'] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => { setMasivoMode(m); setMasivoLoteId(''); setMasivoSelected([]) }}
                      style={{ padding: '8px 16px', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: masivoMode === m ? '#1a6b45' : 'transparent', color: masivoMode === m ? 'white' : '#4a4540', border: masivoMode === m ? 'none' : '1px solid rgba(60,45,30,0.18)' }}>
                      {m === 'lote' ? 'Por lote' : 'Selección manual'}
                    </button>
                  ))}
                </div>
              </div>

              {/* By lote */}
              {masivoMode === 'lote' && (
                <div>
                  <label style={labelStyle}>Lote *</label>
                  <select value={masivoLoteId} onChange={e => setMasivoLoteId(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Seleccionar lote</option>
                    {lotes.map(l => {
                      const cnt = activeAnimales.filter(a => a.lote_id === l.id).length
                      return <option key={l.id} value={l.id}>{l.nombre} ({cnt} activo{cnt !== 1 ? 's' : ''})</option>
                    })}
                  </select>
                  {masivoLoteId && (
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#1a6b45', margin: '6px 0 0' }}>
                      Se aplicará a {masivoLoteAnimals.length} animal{masivoLoteAnimals.length !== 1 ? 'es' : ''} activo{masivoLoteAnimals.length !== 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
              )}

              {/* Manual selection */}
              {masivoMode === 'manual' && (
                <div>
                  <label style={labelStyle}>Seleccionar animales activos ({masivoSelected.length} seleccionados)</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: '#f0ece4' }}>
                    {activeAnimales.length === 0 ? (
                      <p style={{ padding: '12px 14px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>Sin animales activos</p>
                    ) : activeAnimales.map(a => (
                      <label key={a.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: 'pointer', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
                        <input type="checkbox" checked={masivoSelected.includes(a.id)} onChange={() => toggleMasivoAnimal(a.id)} style={{ accentColor: '#1a6b45', cursor: 'pointer' }} />
                        <span>{a.codigo}{a.nombre ? ` — ${a.nombre}` : ''}</span>
                        {a.lotes?.nombre && <span style={{ color: '#8c7f74', fontSize: '11px' }}>({a.lotes.nombre})</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowMasivoModal(false)}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingMasivo}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingMasivo ? 'not-allowed' : 'pointer', opacity: savingMasivo ? 0.7 : 1 }}>
                  {savingMasivo ? 'Guardando...' : 'Registrar evento masivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- VENTA CONFIRM ---- */}
      {showVentaConfirm && (
        <div onClick={() => setShowVentaConfirm(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 12px' }}>Confirmar venta</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 24px', lineHeight: 1.6 }}>
              Vas a registrar la venta de <strong>{ventaAnimalsCount} animal{ventaAnimalsCount !== 1 ? 'es' : ''}</strong>. Su estado cambiará a <strong>vendido</strong>. ¿Confirmar?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVentaConfirm(false)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={executeMasivo} disabled={savingMasivo}
                style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingMasivo ? 'not-allowed' : 'pointer', opacity: savingMasivo ? 0.7 : 1 }}>
                {savingMasivo ? 'Procesando...' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- LOTES MODAL ---- */}
      {showLotesModal && (
        <div onClick={() => { setShowLotesModal(false); setLoteToEdit(null); setShowCreateLote(false) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: 0 }}>Gestionar lotes</h2>
              <button onClick={() => { setShowCreateLote(true); setLoteToEdit(null); setLoteNombre(''); setLoteDesc(''); setLoteError(null) }}
                style={{ padding: '7px 14px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '7px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                + Nuevo lote
              </button>
            </div>
            {loteError && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', backgroundColor: '#fee2e2', padding: '10px 14px', borderRadius: '8px', margin: '0 0 16px' }}>{loteError}</p>}
            {showCreateLote && (
              <form onSubmit={handleCreateLote}
                style={{ backgroundColor: '#faf8f4', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#1c1a17', margin: 0 }}>Nuevo lote</p>
                <div><label style={labelStyle}>Nombre *</label><input value={loteNombre} onChange={e => setLoteNombre(e.target.value)} placeholder="Potrero Norte" required style={inputStyle} /></div>
                <div><label style={labelStyle}>Descripción</label><input value={loteDesc} onChange={e => setLoteDesc(e.target.value)} placeholder="Descripción opcional" style={inputStyle} /></div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowCreateLote(false); setLoteNombre(''); setLoteDesc('') }}
                    style={{ padding: '8px 16px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '7px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
                  <button type="submit" disabled={savingLote}
                    style={{ padding: '8px 18px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '7px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, cursor: savingLote ? 'not-allowed' : 'pointer', opacity: savingLote ? 0.7 : 1 }}>
                    {savingLote ? 'Guardando...' : 'Crear lote'}
                  </button>
                </div>
              </form>
            )}
            {loteToEdit && (
              <form onSubmit={handleUpdateLote}
                style={{ backgroundColor: '#faf8f4', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#1c1a17', margin: 0 }}>Editar lote</p>
                <div><label style={labelStyle}>Nombre *</label><input value={loteNombre} onChange={e => setLoteNombre(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Descripción</label><input value={loteDesc} onChange={e => setLoteDesc(e.target.value)} style={inputStyle} /></div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setLoteToEdit(null); setLoteNombre(''); setLoteDesc('') }}
                    style={{ padding: '8px 16px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '7px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
                  <button type="submit" disabled={savingLote}
                    style={{ padding: '8px 18px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '7px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, cursor: savingLote ? 'not-allowed' : 'pointer', opacity: savingLote ? 0.7 : 1 }}>
                    {savingLote ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}
            {lotes.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', textAlign: 'center', padding: '20px 0' }}>Sin lotes creados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lotes.map(l => {
                  const count = loteCount[l.id] ?? 0
                  return (
                    <div key={l.id}
                      style={{ padding: '14px 16px', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', backgroundColor: loteToEdit?.id === l.id ? '#e8f5ee' : '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, color: '#1c1a17', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nombre}</p>
                        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', margin: 0 }}>{count} animal{count !== 1 ? 'es' : ''}{l.descripcion ? ` · ${l.descripcion}` : ''}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => openEditLote(l)} style={{ padding: '5px 10px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#4a4540' }}>Editar</button>
                        <button onClick={() => handleDeleteLote(l.id)} style={{ padding: '5px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#8B1A1A' }}>Eliminar</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowLotesModal(false); setLoteToEdit(null); setShowCreateLote(false) }}
                style={{ padding: '9px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- ADD ANIMAL MODAL ---- */}
      {showModal && (
        <div onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '560px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '24px', color: '#1c1a17', margin: '0 0 24px' }}>Agregar animal</h2>
            <form onSubmit={handleAddAnimal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Código *</label><input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="A-001" required style={inputStyle} /></div>
                <div><label style={labelStyle}>Nombre</label><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Lucero" style={inputStyle} /></div>
                <div><label style={labelStyle}>Raza</label><input value={form.raza} onChange={e => setForm(f => ({ ...f, raza: e.target.value }))} placeholder="Holstein" style={inputStyle} /></div>
                <div><label style={labelStyle}>Sexo</label><select value={form.sexo} onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))} style={selectStyle}><option value="">Seleccionar</option><option value="hembra">Hembra</option><option value="macho">Macho</option></select></div>
                <div><label style={labelStyle}>Fecha de nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm(f => ({ ...f, fecha_nacimiento: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Propósito</label><select value={form.proposito} onChange={e => setForm(f => ({ ...f, proposito: e.target.value }))} style={selectStyle}><option value="">Seleccionar</option><option value="leche">Leche</option><option value="carne">Carne</option><option value="doble_proposito">Doble propósito</option></select></div>
                <div><label style={labelStyle}>Lote</label><select value={form.lote_id} onChange={e => setForm(f => ({ ...f, lote_id: e.target.value }))} style={selectStyle}><option value="">Sin lote</option>{lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select></div>
                <div><label style={labelStyle}>Peso actual (kg)</label><input type="number" step="0.1" value={form.peso_actual} onChange={e => setForm(f => ({ ...f, peso_actual: e.target.value }))} placeholder="350" style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Notas</label><textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Observaciones adicionales..." style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm) }}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Guardar animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
