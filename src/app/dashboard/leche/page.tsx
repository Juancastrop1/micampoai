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

  const today = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(today)
  const [litros, setLitros] = useState('')
  const [precio, setPrecio] = useState('')
  const [animalId, setAnimalId] = useState('')
  const [loteId, setLoteId] = useState('')

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [registroToEdit, setRegistroToEdit] = useState<RegistroLeche | null>(null)
  const [editFecha, setEditFecha] = useState('')
  const [editLitros, setEditLitros] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editAnimalId, setEditAnimalId] = useState('')
  const [editLoteId, setEditLoteId] = useState('')
  const [editFechaError, setEditFechaError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete state
  const [registroToDelete, setRegistroToDelete] = useState<RegistroLeche | null>(null)
  const [deletingRegistro, setDeletingRegistro] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: fincas } = await supabase.from('fincas').select('*').limit(1)
    const currentFinca: Finca | null = fincas?.[0] ?? null
    setFinca(currentFinca)
    if (!currentFinca) { setLoading(false); return }

    const [regRes, animRes, lotRes, confRes] = await Promise.all([
      supabase.from('registro_leche').select('*').eq('finca_id', currentFinca.id).order('fecha', { ascending: false }).limit(50),
      supabase.from('animales').select('id, codigo, nombre, lote_id').eq('finca_id', currentFinca.id).eq('estado', 'activo').eq('sexo', 'hembra'),
      supabase.from('lotes').select('*').eq('finca_id', currentFinca.id),
      supabase.from('config_finca').select('*').eq('finca_id', currentFinca.id).maybeSingle(),
    ])

    const hembrasData = (animRes.data ?? []) as Animal[]
    setRegistros(regRes.data ?? [])
    setAnimales(hembrasData)

    const hembrasLoteIds = new Set(hembrasData.map(a => a.lote_id).filter((id): id is string => id != null))
    setLotes((lotRes.data ?? []).filter((l: Lote) => hembrasLoteIds.has(l.id)))

    setConfig(confRes.data ?? null)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finca || !litros) return
    if (fecha > today) { setFechaError('La fecha no puede ser futura.'); return }
    setFechaError(null)
    setSaving(true)
    const precioFinal = precio ? parseFloat(precio) : (config?.precio_litro_leche ?? null)
    const supabase = createClient()
    await supabase.from('registro_leche').insert({
      finca_id: finca.id,
      fecha,
      litros: parseFloat(litros),
      precio_litro: precioFinal,
      animal_id: animalId || null,
      lote_id: loteId || null,
    })
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
      fecha: editFecha,
      litros: parseFloat(editLitros),
      precio_litro: editPrecio ? parseFloat(editPrecio) : null,
      animal_id: editAnimalId || null,
      lote_id: editLoteId || null,
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

  // Week bounds: Monday to TODAY
  const _now = new Date()
  const _day = _now.getDay()
  const _daysToMon = _day === 0 ? 6 : _day - 1
  const _mon = new Date(_now); _mon.setDate(_now.getDate() - _daysToMon)
  const semanaInicio = _mon.toISOString().split('T')[0]
  const semanaFin = today

  const filtered = registros.filter(r =>
    (!filterAnimal || r.animal_id === filterAnimal) &&
    (!filterLote || r.lote_id === filterLote)
  )
  const produccionHoy = registros.filter(r => r.fecha === today).reduce((s, r) => s + r.litros, 0)
  const registrosSemana = registros.filter(r => r.fecha >= semanaInicio && r.fecha <= semanaFin)
  const produccionSemana = registrosSemana.reduce((s, r) => s + r.litros, 0)
  const ingresosSemana = registrosSemana.reduce((s, r) => s + r.litros * (r.precio_litro ?? config?.precio_litro_leche ?? 0), 0)

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>
      Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 24px' }}>Producción de leche</h1>

      {/* Metrics */}
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
        {/* Register form */}
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
          </form>
        </div>

        {/* Records table */}
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

      {/* ---- EDIT MODAL ---- */}
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
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
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
