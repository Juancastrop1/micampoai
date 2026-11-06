'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getFincaAndRol } from '@/lib/finca'
import type { Animal, EventoAnimal, Lote, RegistroLeche } from '@/lib/types'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

type Cria = { id: string; codigo: string; nombre: string | null; sexo: string | null; fecha_nacimiento: string | null; estado: string }
type MadreMini = { id: string; codigo: string; nombre: string | null }

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

type EventoForm = {
  tipo: string; descripcion: string; fecha: string; costo: string; proxima_fecha: string
  cria_codigo: string; cria_nombre: string; cria_sexo: string; cria_peso: string
}

const emptyEvento = (today: string): EventoForm => ({
  tipo: '', descripcion: '', fecha: today, costo: '', proxima_fecha: '',
  cria_codigo: '', cria_nombre: '', cria_sexo: '', cria_peso: '',
})

export default function AnimalDetailPage({ params }: { params: { id: string } }) {
  const today = new Date().toISOString().split('T')[0]
  const router = useRouter()
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [rol, setRol] = useState<'admin' | 'colaborador' | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [eventos, setEventos] = useState<EventoAnimal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Reproductive state
  const [estadoRepro, setEstadoRepro] = useState('')
  const [fechaPartoEst, setFechaPartoEst] = useState('')

  // Crias + madre (Parts 4 & 3)
  const [crias, setCrias] = useState<Cria[]>([])
  const [madre, setMadre] = useState<MadreMini | null>(null)
  const [partoMsg, setPartoMsg] = useState<string | null>(null)

  // Delete animal (Part 5)
  const [showDeleteAnimal, setShowDeleteAnimal] = useState(false)
  const [deletingAnimal, setDeletingAnimal] = useState(false)
  const [deleteAnimalError, setDeleteAnimalError] = useState<string | null>(null)

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

  // Leche (hembras only)
  const [lecheAnimal, setLecheAnimal] = useState<RegistroLeche[]>([])
  const [hoveredLecheBar, setHoveredLecheBar] = useState<number | null>(null)
  const [hoveredPesoBar, setHoveredPesoBar] = useState<number | null>(null)

  // Venta individual
  const [showVentaModal, setShowVentaModal] = useState(false)
  const [showVentaConfirm, setShowVentaConfirm] = useState(false)
  const [savingVenta, setSavingVenta] = useState(false)
  const [ventaFecha, setVentaFecha] = useState(today)
  const [ventaPeso, setVentaPeso] = useState('')
  const [ventaPrecioKg, setVentaPrecioKg] = useState('')
  const [ventaComprador, setVentaComprador] = useState('')
  const [ventaNotas, setVentaNotas] = useState('')

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
    const { rol: currentRol } = await getFincaAndRol()
    setRol(currentRol)
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
      setEstadoRepro(a.estado_reproductivo ?? '')
      setFechaPartoEst(a.fecha_parto_estimada ?? '')
      const [lotesRes, lecheRes, criasRes] = await Promise.all([
        supabase.from('lotes').select('*').eq('finca_id', a.finca_id),
        a.sexo === 'hembra'
          ? supabase.from('registro_leche').select('*').eq('animal_id', a.id).order('fecha', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from('animales').select('id, codigo, nombre, sexo, fecha_nacimiento, estado').eq('madre_id', a.id).order('fecha_nacimiento', { ascending: false }),
      ])
      setLotes(lotesRes.data ?? [])
      setLecheAnimal((lecheRes.data ?? []) as RegistroLeche[])
      setCrias((criasRes.data ?? []) as Cria[])
      if (a.madre_id) {
        const { data: madreData } = await supabase.from('animales').select('id, codigo, nombre').eq('id', a.madre_id).single()
        setMadre(madreData as MadreMini | null)
      }
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
    const er = sexo === 'hembra' && estadoRepro ? estadoRepro : null
    const fp = er === 'prenada' && fechaPartoEst ? fechaPartoEst : null
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
      estado_reproductivo: er,
      fecha_parto_estimada: fp,
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
    setFormError(null)
    if (fechaNac && fechaNac > today) {
      setFormError('La fecha de nacimiento no puede ser futura')
      return
    }
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
      cria_codigo: '', cria_nombre: '', cria_sexo: '', cria_peso: '',
    })
    setShowEventoModal(true)
  }

  function openVentaModal() {
    setVentaFecha(today)
    setVentaPeso(animal?.peso_actual != null ? String(animal.peso_actual) : '')
    setVentaPrecioKg('')
    setVentaComprador('')
    setVentaNotas('')
    setShowVentaModal(true)
  }

  async function handleVenta() {
    if (!animal || !ventaFecha || !ventaPeso || !ventaPrecioKg) return
    const peso = parseFloat(ventaPeso)
    const precioKg = parseFloat(ventaPrecioKg)
    const total = peso * precioKg
    setSavingVenta(true)
    const supabase = createClient()
    const desc = `Venta: ${peso}kg x $${precioKg.toLocaleString('es-CO')}/kg = $${Math.round(total).toLocaleString('es-CO')}${ventaComprador ? ` - Comprador: ${ventaComprador}` : ''}`
    await Promise.all([
      supabase.from('animales').update({ estado: 'vendido', peso_actual: peso }).eq('id', animal.id),
      supabase.from('eventos_animal').insert({
        animal_id: animal.id, tipo: 'venta', descripcion: desc, fecha: ventaFecha, costo: total,
      }),
      supabase.from('ventas_animales').insert({
        animal_id: animal.id, finca_id: animal.finca_id, fecha: ventaFecha,
        precio: total, comprador: ventaComprador || null,
      }),
    ])
    router.push('/dashboard/animales')
  }

  async function handleSaveEvento(e: React.FormEvent) {
    e.preventDefault()
    if (!animal || !eventoForm.tipo || !eventoForm.fecha) return
    if (eventoForm.tipo !== 'pesaje' && !eventoForm.descripcion) return
    if (eventoForm.tipo === 'pesaje' && !eventoForm.costo) return
    setSavingEvento(true)
    setPartoMsg(null)
    const supabase = createClient()
    const descripcionFinal = eventoForm.tipo === 'pesaje'
      ? (eventoForm.descripcion.trim() || `Pesaje: ${eventoForm.costo} kg`)
      : eventoForm.descripcion
    const payload = {
      tipo: eventoForm.tipo as EventoAnimal['tipo'],
      descripcion: descripcionFinal,
      fecha: eventoForm.fecha,
      costo: eventoForm.costo ? parseFloat(eventoForm.costo) : null,
      proxima_fecha: eventoForm.proxima_fecha || null,
    }
    if (eventoToEdit) {
      await supabase.from('eventos_animal').update(payload).eq('id', eventoToEdit.id)
    } else {
      await supabase.from('eventos_animal').insert({ ...payload, animal_id: animal.id })
      if (eventoForm.tipo === 'pesaje' && eventoForm.costo) {
        const nuevoPeso = parseFloat(eventoForm.costo)
        await supabase.from('animales').update({ peso_actual: nuevoPeso }).eq('id', animal.id)
        setAnimal(prev => prev ? { ...prev, peso_actual: nuevoPeso } : prev)
        setPeso(eventoForm.costo)
      }
      // Part 6: update reproductive state
      if (animal.sexo === 'hembra') {
        if (eventoForm.tipo === 'servicio') {
          const fp = addDays(eventoForm.fecha, 283)
          await supabase.from('animales').update({ estado_reproductivo: 'prenada', fecha_parto_estimada: fp }).eq('id', animal.id)
          setEstadoRepro('prenada')
          setFechaPartoEst(fp)
          setAnimal(prev => prev ? { ...prev, estado_reproductivo: 'prenada', fecha_parto_estimada: fp } : prev)
        } else if (eventoForm.tipo === 'parto') {
          await supabase.from('animales').update({ estado_reproductivo: 'parida', fecha_parto_estimada: null }).eq('id', animal.id)
          setEstadoRepro('parida')
          setFechaPartoEst('')
          setAnimal(prev => prev ? { ...prev, estado_reproductivo: 'parida', fecha_parto_estimada: null } : prev)
          // Part 3: create cria if cria_codigo provided
          if (eventoForm.cria_codigo.trim() && eventoForm.cria_sexo) {
            await supabase.from('animales').insert({
              finca_id: animal.finca_id,
              lote_id: animal.lote_id,
              codigo: eventoForm.cria_codigo.trim(),
              nombre: eventoForm.cria_nombre.trim() || null,
              sexo: eventoForm.cria_sexo as Animal['sexo'],
              fecha_nacimiento: eventoForm.fecha,
              madre_id: animal.id,
              raza: animal.raza || null,
              proposito: animal.proposito,
              estado: 'activo',
              peso_actual: eventoForm.cria_peso ? parseFloat(eventoForm.cria_peso) : null,
            })
            setPartoMsg(`Cría ${eventoForm.cria_codigo} registrada exitosamente.`)
          }
        }
      }
    }
    setSavingEvento(false)
    setShowEventoModal(false)
    setEventoToEdit(null)
    setEventoForm(emptyEvento(today))
    await reloadEventos()
    // Reload crias if parto
    if (!eventoToEdit && eventoForm.tipo === 'parto' && animal.sexo === 'hembra') {
      const { data } = await supabase.from('animales').select('id, codigo, nombre, sexo, fecha_nacimiento, estado').eq('madre_id', animal.id).order('fecha_nacimiento', { ascending: false })
      setCrias((data ?? []) as Cria[])
    }
  }

  async function handleDeleteAnimal() {
    if (!animal) return
    if (crias.length > 0) {
      setDeleteAnimalError(`Este animal tiene ${crias.length} cría${crias.length !== 1 ? 's' : ''} registrada${crias.length !== 1 ? 's' : ''}. Elimina o reasigna las crías primero.`)
      return
    }
    setDeletingAnimal(true)
    const supabase = createClient()
    await supabase.from('animales').delete().eq('id', animal.id)
    router.push('/dashboard/animales')
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

  const isAdmin = rol === 'admin'

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
            <div>
              <label style={labelStyle}>Fecha de nacimiento</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} max={today} style={{ ...inputStyle, flex: '1 1 auto' }} />
                {fechaNac && (() => {
                  const nac = new Date(fechaNac + 'T00:00:00')
                  const isInactive = animal.estado === 'vendido' || animal.estado === 'muerto'
                  const ventaEv = eventos.filter(e => (e.tipo as string) === 'venta').sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
                  const refStr = isInactive
                    ? (ventaEv?.fecha ?? (animal as Animal & { updated_at?: string }).updated_at?.split('T')[0] ?? today)
                    : today
                  const hasta = new Date(refStr + 'T00:00:00')
                  let anios = hasta.getFullYear() - nac.getFullYear()
                  let meses = hasta.getMonth() - nac.getMonth()
                  if (meses < 0) { anios--; meses += 12 }
                  if (hasta.getDate() < nac.getDate()) { meses--; if (meses < 0) { anios--; meses += 12 } }
                  const label = anios > 0
                    ? `${anios} año${anios !== 1 ? 's' : ''}${meses > 0 ? ` ${meses} mes${meses !== 1 ? 'es' : ''}` : ''}`
                    : meses > 0
                    ? `${meses} mes${meses !== 1 ? 'es' : ''}`
                    : `${Math.max(0, Math.floor((hasta.getTime() - nac.getTime()) / 86400000))} días`
                  return (
                    <>
                      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', whiteSpace: 'nowrap' }}>({label})</span>
                      {isInactive && (
                        <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', whiteSpace: 'nowrap' }}>· al momento de {animal.estado === 'vendido' ? 'la venta' : 'la muerte'}</span>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Propósito</label>
              <select value={proposito} onChange={e => setProposito(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Sin especificar</option><option value="leche">Leche</option><option value="carne">Carne</option><option value="doble_proposito">Doble propósito</option>
              </select>
            </div>
            {sexo === 'hembra' && (
              <div>
                <label style={labelStyle}>Estado reproductivo</label>
                <select value={estadoRepro} onChange={e => { setEstadoRepro(e.target.value); if (e.target.value !== 'prenada') setFechaPartoEst('') }} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Sin especificar</option>
                  <option value="escotera">Escotera</option>
                  <option value="prenada">Preñada</option>
                  <option value="parida">Parida</option>
                </select>
              </div>
            )}
            {sexo === 'hembra' && estadoRepro === 'prenada' && (
              <div>
                <label style={labelStyle}>Fecha parto estimada</label>
                <input type="date" value={fechaPartoEst} onChange={e => setFechaPartoEst(e.target.value)} style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="activo">Activo</option>
                {isAdmin && <option value="vendido">Vendido</option>}
                {isAdmin && <option value="muerto">Muerto</option>}
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
          {formError && (
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', backgroundColor: '#fee2e2', padding: '10px 14px', borderRadius: '8px', margin: 0 }}>{formError}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {saved && <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1a6b45' }}>✓ Cambios guardados</span>}
          </div>
        </form>
      </div>

      {/* Parto confirmation message */}
      {partoMsg && (
        <div style={{ backgroundColor: '#e8f5ee', border: '1px solid rgba(26,107,69,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1a6b45', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {partoMsg}</span>
          <button onClick={() => setPartoMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b45', fontSize: '16px', padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Part 4: Madre/Padre banners */}
      {madre && (
        <div style={{ backgroundColor: '#faf8f4', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', padding: '14px 18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', fontWeight: 500 }}>Madre</span>
          <Link href={`/dashboard/animales/${madre.id}`} style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#1a6b45', textDecoration: 'none', fontWeight: 500 }}>
            {madre.nombre ?? madre.codigo} {madre.nombre ? `(${madre.codigo})` : ''}
          </Link>
        </div>
      )}
      <div style={{ backgroundColor: '#faf8f4', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', fontWeight: 500 }}>Padre</span>
        <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74' }}>No registrado</span>
      </div>

      {/* Part 4: Crias section */}
      {crias.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(60,45,30,0.08)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: 0 }}>Crías ({crias.length})</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                  {['Código','Nombre','Sexo','Fecha nacimiento','Estado'].map(col => (
                    <th key={col} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crias.map((c, i) => (
                  <tr key={c.id} onClick={() => window.location.href = `/dashboard/animales/${c.id}`}
                    style={{ borderBottom: i < crias.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1a6b45' }}>{c.codigo}</td>
                    <td style={{ padding: '10px 16px', color: '#4a4540' }}>{c.nombre ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#4a4540' }}>{c.sexo ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#4a4540' }}>{c.fecha_nacimiento ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ backgroundColor: c.estado === 'activo' ? '#e8f5ee' : '#fee2e2', color: c.estado === 'activo' ? '#1a6b45' : '#8B1A1A', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leche section — hembras only */}
      {animal.sexo === 'hembra' && (() => {
        function localToDateStr(d: Date): string {
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        }
        function getWeekBounds(anchor: Date): { start: string; end: string } {
          const d = new Date(anchor)
          const dow = d.getDay()
          const daysToMon = dow === 0 ? 6 : dow - 1
          const mon = new Date(d); mon.setDate(d.getDate() - daysToMon)
          const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
          return { start: localToDateStr(mon), end: localToDateStr(sun) }
        }
        function isoWeek(dateStr: string): number {
          const d = new Date(dateStr + 'T00:00:00')
          const dow = d.getDay() || 7
          d.setDate(d.getDate() + 4 - dow)
          const y1 = new Date(d.getFullYear(), 0, 1)
          return Math.ceil((((d.getTime() - y1.getTime()) / 86400000) + 1) / 7)
        }
        function fmtWeekLbl(start: string): string {
          const [, m, dy] = start.split('-').map(Number)
          const mo = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
          return `${dy} ${mo[m-1]}`
        }

        const now = new Date()
        const todayStr = localToDateStr(now)
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
        const lastMonthD = new Date(now.getFullYear(), now.getMonth()-1, 1)
        const lastMonth = `${lastMonthD.getFullYear()}-${String(lastMonthD.getMonth()+1).padStart(2,'0')}`

        const thisMonthRegs = lecheAnimal.filter(r => r.fecha.startsWith(thisMonth))
        const lastMonthRegs = lecheAnimal.filter(r => r.fecha.startsWith(lastMonth))

        const prodEsteMes = thisMonthRegs.reduce((s, r) => s + r.litros, 0)
        const prodMesAnterior = lastMonthRegs.reduce((s, r) => s + r.litros, 0)
        const diasConRegistro = new Set(thisMonthRegs.map(r => r.fecha)).size
        const promedioDiario = diasConRegistro > 0 ? prodEsteMes / diasConRegistro : 0
        const variacion = prodMesAnterior > 0 ? ((prodEsteMes - prodMesAnterior) / prodMesAnterior) * 100 : null
        const totalRegistros = lecheAnimal.length

        // Last 6 weeks
        const weeks6: { start: string; end: string }[] = []
        const seenW = new Set<string>()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now); d.setDate(now.getDate() - i * 7)
          const w = getWeekBounds(d)
          if (!seenW.has(w.start)) { seenW.add(w.start); weeks6.push(w) }
        }
        const weekData = weeks6.map(w => ({
          ...w,
          litros: lecheAnimal.filter(r => r.fecha >= w.start && r.fecha <= w.end).reduce((s, r) => s + r.litros, 0),
        }))
        const maxLitros = Math.max(...weekData.map(w => w.litros), 1)

        const ultimos = lecheAnimal.slice(0, 10)

        return (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 18px' }}>Producción de leche</h2>

            {/* 5 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Este mes (L)', value: prodEsteMes.toFixed(1) },
                { label: 'Mes anterior (L)', value: prodMesAnterior.toFixed(1) },
                { label: 'Promedio diario (L)', value: promedioDiario.toFixed(1) },
                { label: 'Total registros', value: String(totalRegistros) },
              ].map(m => (
                <div key={m.label} style={{ backgroundColor: '#faf8f4', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(60,45,30,0.08)' }}>
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>{m.label}</span>
                  <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '28px', color: '#1a6b45', lineHeight: 1 }}>{m.value}</span>
                </div>
              ))}
              <div style={{ backgroundColor: '#faf8f4', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(60,45,30,0.08)' }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Variación</span>
                {variacion !== null ? (
                  <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '28px', color: variacion >= 0 ? '#1a6b45' : '#8B1A1A', lineHeight: 1 }}>
                    {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', lineHeight: 1.3, display: 'block', marginTop: '4px' }}>Sin datos previos</span>
                )}
              </div>
            </div>

            {/* Mini bar chart: last 6 weeks */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', display: 'block', marginBottom: '10px' }}>Producción últimas 6 semanas</span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', position: 'relative' }}>
                {weekData.map((w, i) => {
                  const heightPct = w.litros > 0 ? Math.max((w.litros / maxLitros) * 100, 4) : 0
                  const isCur = todayStr >= w.start && todayStr <= w.end
                  return (
                    <div key={w.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'default' }}
                      onMouseEnter={() => setHoveredLecheBar(i)}
                      onMouseLeave={() => setHoveredLecheBar(null)}>
                      {hoveredLecheBar === i && (
                        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1c1a17', color: 'white', padding: '5px 8px', borderRadius: '5px', fontSize: '11px', fontFamily: 'var(--font-sans), sans-serif', whiteSpace: 'nowrap', zIndex: 10, lineHeight: 1.4 }}>
                          Sem del {fmtWeekLbl(w.start)}<br />{w.litros.toFixed(1)} L
                        </div>
                      )}
                      <div style={{
                        width: '100%',
                        height: w.litros > 0 ? `${heightPct}%` : '4px',
                        backgroundColor: w.litros > 0 ? (isCur ? '#1a6b45' : 'rgba(26,107,69,0.4)') : '#e5e7eb',
                        borderRadius: '3px 3px 0 0',
                      }} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
                {weekData.map(w => {
                  const isCur = todayStr >= w.start && todayStr <= w.end
                  return (
                    <div key={w.start} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '9px', color: isCur ? '#1a6b45' : '#8c7f74' }}>
                      {fmtWeekLbl(w.start)}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Records table */}
            {ultimos.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>Sin registros de leche para este animal.</p>
            ) : (
              <>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#4a4540', display: 'block', marginBottom: '10px' }}>Últimos registros</span>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                        {['Fecha', 'Semana', 'Litros', 'Precio/L', 'Ingreso'].map(col => (
                          <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ultimos.map((r, i) => {
                        const ingreso = r.litros * (r.precio_litro ?? 0)
                        return (
                          <tr key={r.id} style={{ borderBottom: i < ultimos.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                            <td style={{ padding: '9px 12px', color: '#1c1a17' }}>{r.fecha}</td>
                            <td style={{ padding: '9px 12px', color: '#8c7f74', whiteSpace: 'nowrap' }}>Sem {isoWeek(r.fecha)}</td>
                            <td style={{ padding: '9px 12px', color: '#1c1a17', fontWeight: 500 }}>{r.litros} L</td>
                            <td style={{ padding: '9px 12px', color: '#4a4540' }}>{r.precio_litro ? `$${r.precio_litro}` : '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#1a6b45' }}>{ingreso > 0 ? `$${Math.round(ingreso).toLocaleString('es-CO')}` : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Historial de peso */}
      {(() => {
        const pesajesAsc = eventos
          .filter(e => e.tipo === 'pesaje' && e.costo != null)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
        if (pesajesAsc.length === 0) return null
        const last6 = pesajesAsc.slice(-6)
        const maxPeso = Math.max(...last6.map(p => p.costo ?? 0), 1)
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
        function fmtPDate(ds: string): string {
          const [, m, d] = ds.split('-').map(Number)
          return `${d} ${months[m-1]}`
        }
        const tableRows = [...pesajesAsc].reverse()
        const showGanancia = pesajesAsc.length > 1
        return (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 18px' }}>Historial de peso</h2>
            {last6.length > 1 && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', display: 'block', marginBottom: '10px' }}>Últimos {last6.length} pesajes</span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px' }}>
                  {last6.map((p, i) => {
                    const h = Math.max(((p.costo ?? 0) / maxPeso) * 100, 4)
                    return (
                      <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'default' }}
                        onMouseEnter={() => setHoveredPesoBar(i)} onMouseLeave={() => setHoveredPesoBar(null)}>
                        {hoveredPesoBar === i && (
                          <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1c1a17', color: 'white', padding: '5px 8px', borderRadius: '5px', fontSize: '11px', fontFamily: 'var(--font-sans), sans-serif', whiteSpace: 'nowrap', zIndex: 10 }}>
                            {fmtPDate(p.fecha)}<br />{p.costo} kg
                          </div>
                        )}
                        <div style={{ width: '100%', height: `${h}%`, backgroundColor: i === last6.length - 1 ? '#1a6b45' : 'rgba(26,107,69,0.4)', borderRadius: '3px 3px 0 0' }} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px' }}>
                  {last6.map((p, i) => (
                    <div key={p.id} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '9px', color: i === last6.length - 1 ? '#1a6b45' : '#8c7f74' }}>{fmtPDate(p.fecha)}</div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                    {['Fecha', 'Peso (kg)', ...(showGanancia ? ['Ganancia (kg)', 'Ganancia diaria'] : [])].map(c => (
                      <th key={c} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((p, idx) => {
                    const idxAsc = pesajesAsc.findIndex(x => x.id === p.id)
                    const prev = idxAsc > 0 ? pesajesAsc[idxAsc - 1] : null
                    const ganancia = prev && prev.costo != null && p.costo != null ? p.costo - prev.costo : null
                    let gDiaria: number | null = null
                    if (ganancia != null && prev) {
                      const dias = Math.round((new Date(p.fecha + 'T00:00:00').getTime() - new Date(prev.fecha + 'T00:00:00').getTime()) / 86400000)
                      gDiaria = dias > 0 ? ganancia / dias : null
                    }
                    return (
                      <tr key={p.id} style={{ borderBottom: idx < tableRows.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                        <td style={{ padding: '9px 12px', color: '#1c1a17' }}>{p.fecha}</td>
                        <td style={{ padding: '9px 12px', color: '#1c1a17', fontWeight: 600 }}>{p.costo} kg</td>
                        {showGanancia && <>
                          <td style={{ padding: '9px 12px', color: ganancia != null ? (ganancia >= 0 ? '#1a6b45' : '#8B1A1A') : '#8c7f74' }}>
                            {ganancia != null ? `${ganancia >= 0 ? '+' : ''}${ganancia.toFixed(1)} kg` : '—'}
                          </td>
                          <td style={{ padding: '9px 12px', color: gDiaria != null ? (gDiaria >= 0 ? '#1a6b45' : '#8B1A1A') : '#8c7f74' }}>
                            {gDiaria != null ? `${gDiaria >= 0 ? '+' : ''}${gDiaria.toFixed(2)} kg/día` : '—'}
                          </td>
                        </>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Registrar venta (admin, animal activo) */}
      {isAdmin && animal.estado === 'activo' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button onClick={openVentaModal}
            style={{ padding: '10px 22px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            Registrar venta
          </button>
        </div>
      )}

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
                    <td style={{ padding: '12px 16px', color: '#4a4540' }}>
                      {ev.tipo === 'pesaje' && ev.costo != null
                        ? <span style={{ fontWeight: 600, color: '#1a6b45' }}>{ev.descripcion}</span>
                        : ev.descripcion}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4a4540' }}>
                      {ev.tipo === 'pesaje'
                        ? (ev.costo != null ? <span style={{ color: '#1a6b45', fontWeight: 500 }}>{ev.costo} kg</span> : '—')
                        : (ev.costo != null ? `$${ev.costo.toLocaleString('es-CO')}` : '—')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4a4540', whiteSpace: 'nowrap' }}>{ev.proxima_fecha ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => openEditEvento(ev)}
                          style={{ padding: '4px 10px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#4a4540' }}>
                          Editar
                        </button>
                        {isAdmin && (
                          <button onClick={() => setEventoToDelete(ev)}
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
        )}
      </div>

      {/* Part 5: Delete animal (admin only) */}
      {isAdmin && (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(139,26,26,0.12)' }}>
          <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '18px', color: '#8B1A1A', margin: '0 0 10px' }}>Zona de peligro</h3>
          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: '0 0 14px' }}>
            Eliminar este animal lo borrará permanentemente junto con todos sus eventos y registros de leche.
          </p>
          {deleteAnimalError && (
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', backgroundColor: '#fee2e2', padding: '10px 14px', borderRadius: '8px', margin: '0 0 12px' }}>{deleteAnimalError}</p>
          )}
          <button onClick={() => { setShowDeleteAnimal(true); setDeleteAnimalError(null) }}
            style={{ padding: '10px 20px', border: '1px solid rgba(139,26,26,0.4)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#8B1A1A', fontWeight: 500 }}>
            Eliminar animal
          </button>
        </div>
      )}

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
              <div>
                <label style={labelStyle}>{eventoForm.tipo === 'pesaje' ? 'Descripción (opcional)' : 'Descripción *'}</label>
                <input value={eventoForm.descripcion} onChange={e => setEventoForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder={eventoForm.tipo === 'pesaje' ? 'Ej: Pesaje mensual (auto si vacío)' : 'Describe el evento'}
                  required={eventoForm.tipo !== 'pesaje'} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>{eventoForm.tipo === 'pesaje' ? 'Peso (kg) *' : 'Costo (COP)'}</label>
                  <input type="number" step="0.1" value={eventoForm.costo} onChange={e => setEventoForm(f => ({ ...f, costo: e.target.value }))}
                    placeholder={eventoForm.tipo === 'pesaje' ? '340' : '0'} required={eventoForm.tipo === 'pesaje'} style={inputStyle} />
                </div>
                {eventoForm.tipo !== 'pesaje' && (
                  <div><label style={labelStyle}>Próxima fecha</label><input type="date" value={eventoForm.proxima_fecha} onChange={e => setEventoForm(f => ({ ...f, proxima_fecha: e.target.value }))} style={inputStyle} /></div>
                )}
              </div>
              {/* Part 3: cria fields for parto on hembra (new events only) */}
              {!eventoToEdit && eventoForm.tipo === 'parto' && animal.sexo === 'hembra' && (
                <div style={{ borderTop: '1px solid rgba(60,45,30,0.10)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600, color: '#4a4540', margin: 0 }}>Datos de la cría (opcional)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={labelStyle}>Código cría *</label><input value={eventoForm.cria_codigo} onChange={e => setEventoForm(f => ({ ...f, cria_codigo: e.target.value }))} placeholder="VCA-002" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Nombre cría</label><input value={eventoForm.cria_nombre} onChange={e => setEventoForm(f => ({ ...f, cria_nombre: e.target.value }))} placeholder="Opcional" style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>Sexo cría *</label>
                      <select value={eventoForm.cria_sexo} onChange={e => setEventoForm(f => ({ ...f, cria_sexo: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="">Seleccionar</option>
                        <option value="hembra">Hembra</option>
                        <option value="macho">Macho</option>
                      </select>
                    </div>
                    <div><label style={labelStyle}>Peso cría (kg)</label><input type="number" step="0.1" value={eventoForm.cria_peso} onChange={e => setEventoForm(f => ({ ...f, cria_peso: e.target.value }))} placeholder="Opcional" style={inputStyle} /></div>
                  </div>
                </div>
              )}
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
      {/* ---- VENTA MODAL ---- */}
      {showVentaModal && (
        <div onClick={() => setShowVentaModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 22px' }}>
              Registrar venta — {animal.nombre ?? animal.codigo}
            </h2>
            <form onSubmit={e => { e.preventDefault(); setShowVentaConfirm(true) }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={ventaFecha} onChange={e => setVentaFecha(e.target.value)} required max={today} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Peso al vender (kg) *</label>
                  <input type="number" step="0.1" min="0" value={ventaPeso} onChange={e => setVentaPeso(e.target.value)} placeholder="Ej: 340" required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Precio por kg (COP) *</label>
                <input type="number" step="1" min="0" value={ventaPrecioKg} onChange={e => setVentaPrecioKg(e.target.value)} placeholder="Ej: 8000" required style={inputStyle} />
              </div>
              {ventaPeso && ventaPrecioKg && parseFloat(ventaPeso) > 0 && parseFloat(ventaPrecioKg) > 0 && (
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-serif), serif', fontSize: '24px', color: '#1a6b45' }}>
                  Total: ${Math.round(parseFloat(ventaPeso) * parseFloat(ventaPrecioKg)).toLocaleString('es-CO')}
                </div>
              )}
              <div>
                <label style={labelStyle}>Comprador (opcional)</label>
                <input value={ventaComprador} onChange={e => setVentaComprador(e.target.value)} placeholder="Nombre del comprador" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notas (opcional)</label>
                <input value={ventaNotas} onChange={e => setVentaNotas(e.target.value)} placeholder="Observaciones adicionales" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowVentaModal(false)}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit"
                  style={{ padding: '10px 24px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- VENTA CONFIRM ---- */}
      {showVentaConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: '0 0 12px' }}>¿Confirmar venta?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 8px', lineHeight: 1.6 }}>
              Vas a registrar la venta de <strong>{animal.codigo}</strong>. El animal pasará a estado <strong>vendido</strong>.
            </p>
            {ventaPeso && ventaPrecioKg && (
              <p style={{ fontFamily: 'var(--font-serif), serif', fontSize: '20px', color: '#1a6b45', margin: '0 0 20px' }}>
                Total: ${Math.round(parseFloat(ventaPeso) * parseFloat(ventaPrecioKg)).toLocaleString('es-CO')}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVentaConfirm(false)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={handleVenta} disabled={savingVenta}
                style={{ padding: '10px 24px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: savingVenta ? 'not-allowed' : 'pointer', opacity: savingVenta ? 0.7 : 1 }}>
                {savingVenta ? 'Guardando...' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- DELETE ANIMAL CONFIRM ---- */}
      {showDeleteAnimal && (
        <div onClick={() => setShowDeleteAnimal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#8B1A1A', margin: '0 0 12px' }}>¿Eliminar animal?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 8px', lineHeight: 1.6 }}>
              Estás a punto de eliminar permanentemente a <strong>{animal.nombre ?? animal.codigo}</strong> junto con todos sus eventos y registros. Esta acción no se puede deshacer.
            </p>
            {crias.length > 0 && (
              <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', backgroundColor: '#fee2e2', padding: '10px 14px', borderRadius: '8px', margin: '0 0 16px' }}>
                Este animal tiene {crias.length} cría{crias.length !== 1 ? 's' : ''} registrada{crias.length !== 1 ? 's' : ''}. No se puede eliminar.
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowDeleteAnimal(false)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>Cancelar</button>
              <button onClick={handleDeleteAnimal} disabled={deletingAnimal || crias.length > 0}
                style={{ padding: '10px 20px', backgroundColor: crias.length > 0 ? '#d1d5db' : '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: deletingAnimal || crias.length > 0 ? 'not-allowed' : 'pointer', opacity: deletingAnimal ? 0.7 : 1 }}>
                {deletingAnimal ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
