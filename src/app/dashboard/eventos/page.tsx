'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Animal, Finca, Lote } from '@/lib/types'

const todayStr = new Date().toISOString().split('T')[0]

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

type EventoRow = {
  id: string
  tipo: string
  descripcion: string
  fecha: string
  proxima_fecha: string | null
  costo: number | null
  animal_id: string
  animales: {
    id: string
    codigo: string
    nombre: string | null
    lote_id: string | null
    lotes: { nombre: string } | null
  } | null
}
type EditForm = { tipo: string; descripcion: string; fecha: string; costo: string; proxima_fecha: string }

export default function EventosPage() {
  const [finca, setFinca] = useState<Finca | null>(null)
  const [allEventos, setAllEventos] = useState<EventoRow[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [animales, setAnimales] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterTipo, setFilterTipo] = useState('')
  const [filterLote, setFilterLote] = useState('')
  const [filterAnimal, setFilterAnimal] = useState('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')

  // Edit modal
  const [eventoToEdit, setEventoToEdit] = useState<EventoRow | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ tipo: '', descripcion: '', fecha: '', costo: '', proxima_fecha: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editFechaError, setEditFechaError] = useState<string | null>(null)

  // Delete confirm
  const [eventoToDelete, setEventoToDelete] = useState<EventoRow | null>(null)
  const [deletingEvento, setDeletingEvento] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: fincas } = await supabase.from('fincas').select('*').limit(1)
    const currentFinca: Finca | null = fincas?.[0] ?? null
    setFinca(currentFinca)
    if (!currentFinca) { setLoading(false); return }

    const [eventosRes, lotesRes, animalesRes] = await Promise.all([
      supabase.from('eventos_animal')
        .select('id, tipo, descripcion, fecha, proxima_fecha, costo, animal_id, animales(id, codigo, nombre, lote_id, lotes(nombre))')
        .order('fecha', { ascending: false }),
      supabase.from('lotes').select('*').eq('finca_id', currentFinca.id),
      supabase.from('animales').select('id, codigo, nombre').eq('finca_id', currentFinca.id).order('codigo'),
    ])

    setAllEventos((eventosRes.data ?? []) as unknown as EventoRow[])
    setLotes(lotesRes.data ?? [])
    setAnimales((animalesRes.data ?? []) as Animal[])
    setLoading(false)
  }

  // Masivo detection: same tipo + descripcion + fecha = masivo
  const eventoCounts: Record<string, number> = {}
  allEventos.forEach(e => {
    const k = `${e.tipo}|${e.descripcion}|${e.fecha}`
    eventoCounts[k] = (eventoCounts[k] ?? 0) + 1
  })
  function isMasivo(e: EventoRow) {
    return (eventoCounts[`${e.tipo}|${e.descripcion}|${e.fecha}`] ?? 0) > 1
  }

  // Apply filters
  const filtered = allEventos.filter(e => {
    if (filterTipo && e.tipo !== filterTipo) return false
    if (filterLote && e.animales?.lote_id !== filterLote) return false
    if (filterAnimal && e.animal_id !== filterAnimal) return false
    if (filterDesde && e.fecha < filterDesde) return false
    if (filterHasta && e.fecha > filterHasta) return false
    return true
  })

  function openEdit(e: EventoRow) {
    setEventoToEdit(e)
    setEditForm({
      tipo: e.tipo,
      descripcion: e.descripcion,
      fecha: e.fecha,
      costo: e.costo != null ? String(e.costo) : '',
      proxima_fecha: e.proxima_fecha ?? '',
    })
    setEditFechaError(null)
  }

  async function handleEditSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!eventoToEdit) return
    if (editForm.fecha > todayStr) { setEditFechaError('La fecha no puede ser futura.'); return }
    setEditFechaError(null)
    setSavingEdit(true)
    const supabase = createClient()
    await supabase.from('eventos_animal').update({
      tipo: editForm.tipo,
      descripcion: editForm.descripcion,
      fecha: editForm.fecha,
      costo: editForm.costo ? parseFloat(editForm.costo) : null,
      proxima_fecha: editForm.proxima_fecha || null,
    }).eq('id', eventoToEdit.id)
    setSavingEdit(false)
    setEventoToEdit(null)
    loadData()
  }

  async function handleDelete() {
    if (!eventoToDelete) return
    setDeletingEvento(true)
    const supabase = createClient()
    await supabase.from('eventos_animal').delete().eq('id', eventoToDelete.id)
    setDeletingEvento(false)
    setEventoToDelete(null)
    loadData()
  }

  function animalLabel(e: EventoRow) {
    if (!e.animales) return '—'
    return e.animales.nombre
      ? `${e.animales.codigo} — ${e.animales.nombre}`
      : e.animales.codigo
  }

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>
      Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.
    </div>
  )

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '32px', color: '#1c1a17', margin: '0 0 4px' }}>Eventos</h1>
        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: 0 }}>
          {filtered.length} evento{filtered.length !== 1 ? 's' : ''}{filtered.length !== allEventos.length ? ` de ${allEventos.length} total` : ' en total'}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={filterStyle}>
          <option value="">Todos los tipos</option>
          <option value="vacuna">Vacuna</option>
          <option value="tratamiento">Tratamiento</option>
          <option value="pesaje">Pesaje</option>
          <option value="venta">Venta</option>
          <option value="parto">Parto</option>
          <option value="servicio">Servicio</option>
          <option value="otro">Otro</option>
        </select>
        <select value={filterLote} onChange={e => setFilterLote(e.target.value)} style={filterStyle}>
          <option value="">Todos los lotes</option>
          {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
        <select value={filterAnimal} onChange={e => setFilterAnimal(e.target.value)} style={filterStyle}>
          <option value="">Todos los animales</option>
          {animales.map(a => <option key={a.id} value={a.id}>{a.codigo}{a.nombre ? ` — ${a.nombre}` : ''}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74' }}>Desde</span>
          <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}
            style={{ ...filterStyle, cursor: 'default', padding: '7px 10px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74' }}>Hasta</span>
          <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}
            style={{ ...filterStyle, cursor: 'default', padding: '7px 10px' }} />
        </div>
        {(filterTipo || filterLote || filterAnimal || filterDesde || filterHasta) && (
          <button onClick={() => { setFilterTipo(''); setFilterLote(''); setFilterAnimal(''); setFilterDesde(''); setFilterHasta('') }}
            style={{ padding: '7px 12px', border: '1px solid rgba(60,45,30,0.15)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', cursor: 'pointer' }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)', backgroundColor: '#faf8f4' }}>
                {['Fecha', 'Tipo', 'Descripción', 'Animal', 'Lote', 'Costo', 'Próxima fecha', 'Acciones'].map(col => (
                  <th key={col} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: '#8c7f74', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px' }}>Sin eventos registrados</td></tr>
              ) : filtered.map((e, i) => (
                <tr key={e.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none' }}>
                  <td style={{ padding: '11px 14px', color: '#1c1a17', whiteSpace: 'nowrap' }}>{e.fecha}</td>
                  <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap' }}>
                      <span style={{
                        backgroundColor: typeBg[e.tipo] ?? '#f3f4f6',
                        color: typeColors[e.tipo] ?? '#9ca3af',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap'
                      }}>
                        {typeLabels[e.tipo] ?? e.tipo}
                      </span>
                      {isMasivo(e) && (
                        <span style={{ backgroundColor: '#f0ece4', color: '#8c7f74', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          Masivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.descripcion}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', whiteSpace: 'nowrap' }}>{animalLabel(e)}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', whiteSpace: 'nowrap' }}>{e.animales?.lotes?.nombre ?? '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', whiteSpace: 'nowrap' }}>
                    {e.costo != null ? `$${e.costo.toLocaleString('es-CO')}` : '—'}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#4a4540', whiteSpace: 'nowrap' }}>{e.proxima_fecha ?? '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(e)}
                        style={{ padding: '4px 10px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#4a4540', whiteSpace: 'nowrap' }}>
                        Editar
                      </button>
                      <button onClick={() => setEventoToDelete(e)}
                        style={{ padding: '4px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#8B1A1A', whiteSpace: 'nowrap' }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- EDIT MODAL ---- */}
      {eventoToEdit && (
        <div onClick={() => setEventoToEdit(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={ev => ev.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 22px' }}>Editar evento</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))} required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Seleccionar</option>
                    <option value="vacuna">Vacuna</option>
                    <option value="tratamiento">Tratamiento</option>
                    <option value="parto">Parto</option>
                    <option value="servicio">Servicio</option>
                    <option value="pesaje">Pesaje</option>
                    <option value="venta">Venta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={editForm.fecha} max={todayStr}
                    onChange={e => { setEditForm(f => ({ ...f, fecha: e.target.value })); setEditFechaError(null) }}
                    required style={inputStyle} />
                  {editFechaError && <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8B1A1A', margin: '4px 0 0' }}>{editFechaError}</p>}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} required style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Costo (COP)</label>
                  <input type="number" step="0.01" value={editForm.costo} onChange={e => setEditForm(f => ({ ...f, costo: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Próxima fecha</label>
                  <input type="date" value={editForm.proxima_fecha} onChange={e => setEditForm(f => ({ ...f, proxima_fecha: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setEventoToEdit(null)}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingEdit}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.7 : 1 }}>
                  {savingEdit ? 'Guardando...' : 'Actualizar evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- DELETE CONFIRM ---- */}
      {eventoToDelete && (
        <div onClick={() => setEventoToDelete(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div onClick={ev => ev.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 10px' }}>¿Eliminar evento?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 6px', lineHeight: 1.6 }}>
              ¿Estás seguro de eliminar este evento? Solo se eliminará este registro individual, no afecta otros animales.
            </p>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: '0 0 22px' }}>
              <strong>{eventoToDelete.descripcion}</strong> — {eventoToDelete.fecha}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEventoToDelete(null)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deletingEvento}
                style={{ padding: '10px 20px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: deletingEvento ? 'not-allowed' : 'pointer', opacity: deletingEvento ? 0.7 : 1 }}>
                {deletingEvento ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
