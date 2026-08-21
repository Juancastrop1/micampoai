'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Animal, EventoAnimal, Lote } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)',
  borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
  fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500,
  color: '#4a4540', display: 'block', marginBottom: '6px',
}
const tipoLabels: Record<string, string> = {
  vacuna: 'Vacuna', tratamiento: 'Tratamiento', parto: 'Parto',
  servicio: 'Servicio', pesaje: 'Pesaje', otro: 'Otro',
}
const tipoBadge: Record<string, React.CSSProperties> = {
  vacuna:       { backgroundColor: '#dbeafe', color: '#1e40af' },
  tratamiento:  { backgroundColor: '#fef3c7', color: '#92400e' },
  parto:        { backgroundColor: '#fce7f3', color: '#9d174d' },
  servicio:     { backgroundColor: '#ede9fe', color: '#5b21b6' },
  pesaje:       { backgroundColor: '#e8f5ee', color: '#1a6b45' },
  otro:         { backgroundColor: '#f3f4f6', color: '#374151' },
}

type EventoForm = { tipo: string; descripcion: string; fecha: string; costo: string; proxima_fecha: string }

const emptyEvento = (today: string): EventoForm => ({ tipo: '', descripcion: '', fecha: today, costo: '', proxima_fecha: '' })

export default function AnimalDetailPage({ params }: { params: { id: string } }) {
  const today = new Date().toISOString().split('T')[0]
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [eventos, setEventos] = useState<EventoAnimal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Confirm dialog for vendido/muerto
  const [showConfirm, setShowConfirm] = useState(false)

  // Event modal (add + edit)
  const [showEventoModal, setShowEventoModal] = useState(false)
  const [eventoToEdit, setEventoToEdit] = useState<EventoAnimal | null>(null)
  const [savingEvento, setSavingEvento] = useState(false)
  const [eventoForm, setEventoForm] = useState<EventoForm>(emptyEvento(today))

  // Delete event confirm
  const [eventoToDelete, setEventoToDelete] = useState<EventoAnimal | null>(null)
  const [deletingEvento, setDeletingEvento] = useState(false)

  // Form fields
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [raza, setRaza] = useState('')
  const [sexo, setSexo] = useState('')
  const [fechaNac, setFechaNac] = useState('')
  const [proposito, setProposito] = useState('')
  const [estado, setEstado] = useState('')
  const [loteId, setLoteId] = useState('')
  const [peso, setPeso] = useState('')
  const [notas, setNotas] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [params.id])

  async function loadData() {
    const supabase = createClient()
    const [animalRes, eventosRes] = await Promise.all([
      supabase.from('animales').select('*, lotes(nombre)').eq('id', params.id).single(),
      supabase.from('eventos_animal').select('*').eq('animal_id', params.id).order('fecha', { ascending: false }),
    ])
    const a = animalRes.data as Animal | null
    if (a) {
      setAnimal(a)
      setCodigo(a.codigo)
      setNombre(a.nombre ?? '')
      setRaza(a.raza ?? '')
      setSexo(a.sexo ?? '')
      setFechaNac(a.fecha_nacimiento ?? '')
      setProposito(a.proposito ?? '')
      setEstado(a.estado)
      setLoteId(a.lote_id ?? '')
      setPeso(a.peso_actual != null ? String(a.peso_actual) : '')
      setNotas(a.notas ?? '')
      const lotesRes = await supabase.from('lotes').select('*').eq('finca_id', a.finca_id)
      setLotes(lotesRes.data ?? [])
    }
    setEventos((eventosRes.data ?? []) as EventoAnimal[])
    setLoading(false)
  }

  async function reloadEventos() {
    if (!animal) return
    const supabase = createClient()
    const { data } = await supabase.from('eventos_animal').select('*').eq('animal_id', animal.id).order('fecha', { ascending: false })
    setEventos((data ?? []) as EventoAnimal[])
  }

  // Actual save (called after confirmation if needed)
  async function doSave() {
    if (!animal) return
    setSaving(true)
    setShowConfirm(false)
    const supabase = createClient()
    await supabase.from('animales').update({
      codigo: codigo.trim(),
      nombre: nombre.trim() || null,
      raza: raza.trim() || null,
      sexo: (sexo || null) as Animal['sexo'],
      fecha_nacimiento: fechaNac || null,
      proposito: (proposito || null) as Animal['proposito'],
      estado: estado as Animal['estado'],
      lote_id: loteId || null,
      peso_actual: peso ? parseFloat(peso) : null,
      notas: notas.trim() || null,
    }).eq('id', animal.id)
    // Refresh animal to keep estado in sync
    const { data } = await supabase.from('animales').select('*, lotes(nombre)').eq('id', animal.id).single()
    if (data) setAnimal(data as Animal)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!animal) return
    const changingToInactive = (estado === 'vendido' || estado === 'muerto') && animal.estado !== estado
    if (changingToInactive) {
      setShowConfirm(true)
      return
    }
    await doSave()
  }

  // Event modal helpers
  function openAddEvento() {
    setEventoToEdit(null)
    setEventoForm(emptyEvento(today))
    setShowEventoModal(true)
  }

  function openEditEvento(ev: EventoAnimal) {
    setEventoToEdit(ev)
    setEventoForm({
      tipo: ev.tipo,
      descripcion: ev.descripcion,
      fecha: ev.fecha,
      costo: ev.costo != null ? String(ev.costo) : '',
      proxima_fecha: ev.proxima_fecha ?? '',
    })
    setShowEventoModal(true)
  }

  async function handleSaveEvento(e: React.FormEvent) {
    e.preventDefault()
    if (!animal || !eventoForm.tipo || !eventoForm.descripcion || !eventoForm.fecha) return
    setSavingEvento(true)
    const supabase = createClient()
    const payload = {
      tipo: eventoForm.tipo as EventoAnimal['tipo'],
      descripcion: eventoForm.descripcion,
      fecha: eventoForm.fecha,
      costo: eventoForm.costo ? parseFloat(eventoForm.costo) : null,
      proxima_fecha: eventoForm.proxima_fecha || null,
    }
    if (eventoToEdit) {
      await supabase.from('eventos_animal').update(payload).eq('id', eventoToEdit.id)
    } else {
      await supabase.from('eventos_animal').insert({ ...payload, animal_id: animal.id })
    }
    setSavingEvento(false)
    setShowEventoModal(false)
    setEventoToEdit(null)
    setEventoForm(emptyEvento(today))
    await reloadEventos()
  }

  async function handleDeleteEvento() {
    if (!eventoToDelete) return
    setDeletingEvento(true)
    const supabase = createClient()
    await supabase.from('eventos_animal').delete().eq('id', eventoToDelete.id)
    setDeletingEvento(false)
    setEventoToDelete(null)
    await reloadEventos()
  }

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!animal) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>Animal no encontrado.</div>

  const confirmLabel = estado === 'vendido' ? 'vendido' : 'muerto'

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <Link href="/dashboard/animales" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', textDecoration: 'none', marginBottom: '20px' }}>
        ← Volver a animales
      </Link>

      <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 0 4px' }}>
        {animal.nombre ?? animal.codigo}
      </h1>
      <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: '0 0 28px' }}>Código: {animal.codigo}</p>

      {/* Edit form */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '28px', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 22px' }}>Información del animal</h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><label style={labelStyle}>Código *</label><input value={codigo} onChange={e => setCodigo(e.target.value)} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del animal" style={inputStyle} /></div>
            <div><label style={labelStyle}>Raza</label><input value={raza} onChange={e => setRaza(e.target.value)} placeholder="Holstein" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Sexo</label>
              <select value={sexo} onChange={e => setSexo(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Sin especificar</option><option value="hembra">Hembra</option><option value="macho">Macho</option>
              </select>
            </div>
            <div><label style={labelStyle}>Fecha de nacimiento</label><input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>Propósito</label>
              <select value={proposito} onChange={e => setProposito(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Sin especificar</option><option value="leche">Leche</option><option value="carne">Carne</option><option value="doble_proposito">Doble propósito</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="activo">Activo</option><option value="vendido">Vendido</option><option value="muerto">Muerto</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Lote</label>
              <select value={loteId} onChange={e => setLoteId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Sin lote</option>{lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Peso actual (kg)</label><input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} placeholder="350" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>Notas</label><textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} placeholder="Observaciones..." style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {saved && <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1a6b45' }}>✓ Cambios guardados</span>}
          </div>
        </form>
      </div>

      {/* Event history */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: 0 }}>Historial de eventos</h2>
          <button onClick={openAddEvento}
            style={{ padding: '8px 16px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
            + Agregar evento
          </button>
        </div>

        {eventos.length === 0 ? (
          <p style={{ padding: '28px 24px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: 0 }}>Sin eventos registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                  {['Fecha', 'Tipo', 'Descripción', 'Costo', 'Próxima fecha', ''].map((col, i) => (
                    <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev, i) => (
                  <tr key={ev.id} style={{ borderBottom: i < eventos.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: '#1c1a17', whiteSpace: 'nowrap' }}>{ev.fecha}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ ...tipoBadge[ev.tipo], padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{tipoLabels[ev.tipo]}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4a4540' }}>{ev.descripcion}</td>
                    <td style={{ padding: '12px 16px', color: '#4a4540' }}>{ev.costo != null ? `$${ev.costo.toLocaleString('es-CO')}` : '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#4a4540', whiteSpace: 'nowrap' }}>{ev.proxima_fecha ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditEvento(ev)}
                          style={{ padding: '4px 10px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#4a4540' }}>
                          Editar
                        </button>
                        <button onClick={() => setEventoToDelete(ev)}
                          style={{ padding: '4px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#8B1A1A' }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- CONFIRM INACTIVE STATE ---- */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 12px' }}>¿Confirmar cambio de estado?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 24px', lineHeight: 1.6 }}>
              ¿Estás seguro de marcar este animal como <strong>{confirmLabel}</strong>? Ya no aparecerá en el listado principal.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={doSave} disabled={saving}
                style={{ padding: '10px 24px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- EVENT ADD/EDIT MODAL ---- */}
      {showEventoModal && (
        <div onClick={() => { setShowEventoModal(false); setEventoToEdit(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 22px' }}>
              {eventoToEdit ? 'Editar evento' : 'Agregar evento'}
            </h2>
            <form onSubmit={handleSaveEvento} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={eventoForm.tipo} onChange={e => setEventoForm(f => ({ ...f, tipo: e.target.value }))} required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Seleccionar</option>
                    <option value="vacuna">Vacuna</option><option value="tratamiento">Tratamiento</option>
                    <option value="parto">Parto</option><option value="servicio">Servicio</option>
                    <option value="pesaje">Pesaje</option><option value="otro">Otro</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Fecha *</label><input type="date" value={eventoForm.fecha} onChange={e => setEventoForm(f => ({ ...f, fecha: e.target.value }))} required style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Descripción *</label><input value={eventoForm.descripcion} onChange={e => setEventoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Describe el evento" required style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={labelStyle}>Costo (COP)</label><input type="number" step="0.01" value={eventoForm.costo} onChange={e => setEventoForm(f => ({ ...f, costo: e.target.value }))} placeholder="0" style={inputStyle} /></div>
                <div><label style={labelStyle}>Próxima fecha</label><input type="date" value={eventoForm.proxima_fecha} onChange={e => setEventoForm(f => ({ ...f, proxima_fecha: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowEventoModal(false); setEventoToEdit(null) }}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
                <button type="submit" disabled={savingEvento}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingEvento ? 'not-allowed' : 'pointer', opacity: savingEvento ? 0.7 : 1 }}>
                  {savingEvento ? 'Guardando...' : (eventoToEdit ? 'Actualizar evento' : 'Guardar evento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- DELETE EVENT CONFIRM ---- */}
      {eventoToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '18px', color: '#1c1a17', margin: '0 0 10px' }}>¿Eliminar evento?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 20px' }}>
              Se eliminará el evento <strong>&ldquo;{eventoToDelete.descripcion}&rdquo;</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEventoToDelete(null)}
                style={{ padding: '9px 18px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
              <button onClick={handleDeleteEvento} disabled={deletingEvento}
                style={{ padding: '9px 18px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: deletingEvento ? 'not-allowed' : 'pointer', opacity: deletingEvento ? 0.7 : 1 }}>
                {deletingEvento ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
