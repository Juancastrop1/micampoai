'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getFincaAndRol } from '@/lib/finca'
import type { Finca, Lote, CompraAnimal, Animal } from '@/lib/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid rgba(60,45,30,0.18)',
  borderRadius: '8px', backgroundColor: '#f0ece4', fontSize: '14px',
  fontFamily: 'var(--font-sans), sans-serif', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500,
  color: '#4a4540', display: 'block', marginBottom: '6px',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

type AnimalRow = {
  codigo: string; nombre: string; raza: string; sexo: string
  peso: string; fecha_nacimiento: string; proposito: string; lote_id: string
}
const emptyAnimalRow = (): AnimalRow => ({
  codigo: '', nombre: '', raza: '', sexo: '', peso: '',
  fecha_nacimiento: '', proposito: '', lote_id: '',
})

export default function ComprasPage() {
  const today = new Date().toISOString().split('T')[0]
  const [finca, setFinca] = useState<Finca | null>(null)
  const [rol, setRol] = useState<'admin' | 'colaborador' | null>(null)
  const [compras, setCompras] = useState<CompraAnimal[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [totalComprados, setTotalComprados] = useState(0)

  // Modal nuevo
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form fields
  const [fecha, setFecha] = useState(today)
  const [vendedor, setVendedor] = useState('')
  const [cedulaVendedor, setCedulaVendedor] = useState('')
  const [precioTotal, setPrecioTotal] = useState('')
  const [precioKg, setPrecioKg] = useState('')
  const [notas, setNotas] = useState('')
  const [animalRows, setAnimalRows] = useState<AnimalRow[]>([emptyAnimalRow()])

  // Edit
  const [editingCompra, setEditingCompra] = useState<CompraAnimal | null>(null)
  const [editFecha, setEditFecha] = useState('')
  const [editVendedor, setEditVendedor] = useState('')
  const [editCedula, setEditCedula] = useState('')
  const [editPrecioTotal, setEditPrecioTotal] = useState('')
  const [editPrecioKg, setEditPrecioKg] = useState('')
  const [editNotas, setEditNotas] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete
  const [compraToDelete, setCompraToDelete] = useState<CompraAnimal | null>(null)
  const [deletingCompra, setDeletingCompra] = useState(false)

  // Expandido
  const [expandedCompras, setExpandedCompras] = useState<Set<string>>(new Set())
  const [compraAnimalesMap, setCompraAnimalesMap] = useState<Record<string, Animal[]>>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { finca: f, rol: r } = await getFincaAndRol()
    setFinca(f); setRol(r)
    if (!f) { setLoading(false); return }
    const [comprasRes, lotesRes, totalRes] = await Promise.all([
      supabase.from('compras_animales').select('*').eq('finca_id', f.id).order('fecha', { ascending: false }),
      supabase.from('lotes').select('*').eq('finca_id', f.id),
      supabase.from('animales').select('id', { count: 'exact', head: true }).eq('finca_id', f.id).eq('origen', 'comprado'),
    ])
    setCompras((comprasRes.data ?? []) as CompraAnimal[])
    setLotes(lotesRes.data ?? [])
    setTotalComprados(totalRes.count ?? 0)
    setLoading(false)
  }

  async function loadCompraAnimales(compraId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('animales')
      .select('*, lotes(nombre)')
      .eq('compra_id', compraId)
      .order('codigo', { ascending: true })
    setCompraAnimalesMap(prev => ({ ...prev, [compraId]: (data ?? []) as Animal[] }))
  }

  function toggleExpand(compraId: string) {
    setExpandedCompras(prev => {
      const s = new Set(prev)
      if (s.has(compraId)) {
        s.delete(compraId)
      } else {
        s.add(compraId)
        if (!compraAnimalesMap[compraId]) loadCompraAnimales(compraId)
      }
      return s
    })
  }

  function resetModal() {
    setFecha(today); setVendedor(''); setCedulaVendedor('')
    setPrecioTotal(''); setPrecioKg(''); setNotas('')
    setAnimalRows([emptyAnimalRow()])
    setErrorMsg(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!finca || !vendedor.trim() || !precioTotal) return
    const validRows = animalRows.filter(r => r.codigo.trim() && r.sexo)
    if (validRows.length === 0) return
    setSaving(true)
    setErrorMsg(null)
    const supabase = createClient()
    try {
      console.log('[Compras] INSERT compras_animales', { finca_id: finca.id, fecha, vendedor: vendedor.trim() })
      const { data: compraData, error: compraError } = await supabase
        .from('compras_animales')
        .insert({
          finca_id: finca.id,
          fecha,
          vendedor: vendedor.trim(),
          cedula_nit_vendedor: cedulaVendedor.trim() || null,
          precio_total: parseFloat(precioTotal),
          precio_por_kg: precioKg ? parseFloat(precioKg) : null,
          notas: notas.trim() || null,
        })
        .select()
        .single()

      if (compraError) {
        console.error('[Compras] Error en INSERT compras_animales:', compraError)
        setErrorMsg(`Error al registrar compra: ${compraError.message}`)
        setSaving(false)
        return
      }
      console.log('[Compras] compras_animales OK — id:', compraData?.id)

      const animalesPayload = validRows.map(r => ({
        finca_id: finca.id,
        codigo: r.codigo.trim(),
        nombre: r.nombre.trim() || null,
        raza: r.raza.trim() || null,
        sexo: r.sexo as Animal['sexo'],
        peso_actual: r.peso ? parseFloat(r.peso) : null,
        fecha_nacimiento: r.fecha_nacimiento || null,
        proposito: (r.proposito || null) as Animal['proposito'],
        lote_id: r.lote_id || null,
        estado: 'activo',
        origen: 'comprado',
        compra_id: compraData!.id,
      }))
      console.log('[Compras] INSERT animales (', animalesPayload.length, ')', animalesPayload.map(a => ({ codigo: a.codigo, finca_id: a.finca_id, compra_id: a.compra_id })))
      const { error: animalesError } = await supabase.from('animales').insert(animalesPayload)

      if (animalesError) {
        console.error('[Compras] Error en INSERT animales:', animalesError)
        setErrorMsg(`Compra creada (id: ${compraData!.id}) pero error al agregar animales: ${animalesError.message}`)
        setSaving(false)
        loadData()
        return
      }
      console.log('[Compras] animales insertados OK')

      setSuccessMsg(`Compra registrada. ${validRows.length} animal${validRows.length !== 1 ? 'es' : ''} agregado${validRows.length !== 1 ? 's' : ''} a la finca.`)
      setSaving(false)
      setShowModal(false)
      resetModal()
      loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err) {
      console.error('[Compras] Excepción inesperada:', err)
      setErrorMsg(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`)
      setSaving(false)
    }
  }

  function openEdit(c: CompraAnimal) {
    setEditingCompra(c)
    setEditFecha(c.fecha)
    setEditVendedor(c.vendedor)
    setEditCedula(c.cedula_nit_vendedor ?? '')
    setEditPrecioTotal(String(c.precio_total))
    setEditPrecioKg(c.precio_por_kg != null ? String(c.precio_por_kg) : '')
    setEditNotas(c.notas ?? '')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCompra) return
    setSavingEdit(true)
    const supabase = createClient()
    await supabase.from('compras_animales').update({
      fecha: editFecha,
      vendedor: editVendedor.trim(),
      cedula_nit_vendedor: editCedula.trim() || null,
      precio_total: parseFloat(editPrecioTotal),
      precio_por_kg: editPrecioKg ? parseFloat(editPrecioKg) : null,
      notas: editNotas.trim() || null,
    }).eq('id', editingCompra.id)
    setSavingEdit(false)
    setEditingCompra(null)
    loadData()
  }

  async function handleDelete() {
    if (!compraToDelete) return
    setDeletingCompra(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('compras_animales').delete().eq('id', compraToDelete.id),
      supabase.from('animales').update({ compra_id: null }).eq('compra_id', compraToDelete.id),
    ])
    setDeletingCompra(false)
    setCompraToDelete(null)
    loadData()
  }

  const isAdmin = rol === 'admin'
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const thisMonthCompras = compras.filter(c => c.fecha.startsWith(thisMonth))
  const inversionEsteMes = thisMonthCompras.reduce((s, c) => s + c.precio_total, 0)

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.</div>

  const cardStyle: React.CSSProperties = { backgroundColor: '#faf8f4', borderRadius: '12px', padding: '18px 20px', border: '1px solid rgba(60,45,30,0.08)' }
  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c7f74', whiteSpace: 'nowrap' }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '32px', color: '#1c1a17', margin: '0 0 4px' }}>Compras</h1>
          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: 0 }}>{compras.length} compra{compras.length !== 1 ? 's' : ''} registrada{compras.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { resetModal(); setShowModal(true) }}
          style={{ backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
          + Registrar compra
        </button>
      </div>

      {/* Success msg */}
      {successMsg && (
        <div style={{ backgroundColor: '#e8f5ee', border: '1px solid rgba(26,107,69,0.2)', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#1a6b45', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ✓ {successMsg}
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b45', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Compras este mes</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '32px', color: '#1c1a17', lineHeight: 1 }}>{thisMonthCompras.length}</span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Inversión este mes</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '28px', color: '#8B1A1A', lineHeight: 1 }}>
            {inversionEsteMes > 0 ? `$${Math.round(inversionEsteMes).toLocaleString('es-CO')}` : '—'}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c7f74', display: 'block', marginBottom: '4px' }}>Total animales comprados</span>
          <span style={{ fontFamily: 'var(--font-serif), serif', fontSize: '32px', color: '#1c1a17', lineHeight: 1 }}>{totalComprados}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                {['Fecha','Vendedor','Cédula/NIT','Animales','Precio total','Notas','Acciones'].map((col, i) => (
                  <th key={i} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#8c7f74', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px' }}>Sin compras registradas</td></tr>
              ) : compras.map((c, i) => {
                const isExp = expandedCompras.has(c.id)
                const animals = compraAnimalesMap[c.id]
                return [
                  <tr key={c.id} style={{ borderBottom: isExp ? 'none' : (i < compras.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none') }}>
                    <td style={{ padding: '11px 14px', color: '#1c1a17', whiteSpace: 'nowrap' }}>
                      <button onClick={() => toggleExpand(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#8c7f74' }}>{isExp ? '▲' : '▼'}</span>
                        {c.fecha}
                      </button>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#1c1a17', fontWeight: 500 }}>{c.vendedor}</td>
                    <td style={{ padding: '11px 14px', color: '#4a4540' }}>{c.cedula_nit_vendedor ?? '—'}</td>
                    <td style={{ padding: '11px 14px', color: '#4a4540' }}>
                      {animals != null ? animals.length : (
                        <button onClick={() => loadCompraAnimales(c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a6b45', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', padding: 0, textDecoration: 'underline' }}>
                          Ver
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#8B1A1A', fontWeight: 600 }}>${Math.round(c.precio_total).toLocaleString('es-CO')}</td>
                    <td style={{ padding: '11px 14px', color: '#4a4540', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notas ?? '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEdit(c)}
                            style={{ padding: '4px 10px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#4a4540' }}>
                            Editar
                          </button>
                          <button onClick={() => setCompraToDelete(c)}
                            style={{ padding: '4px 10px', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '6px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', cursor: 'pointer', color: '#8B1A1A' }}>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>,
                  isExp && (
                    <tr key={`${c.id}-exp`} style={{ borderBottom: i < compras.length - 1 ? '1px solid rgba(60,45,30,0.07)' : 'none' }}>
                      <td colSpan={7} style={{ padding: '0 14px 14px 14px', backgroundColor: '#faf8f4' }}>
                        {animals == null ? (
                          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: '10px 0 0' }}>Cargando...</p>
                        ) : animals.length === 0 ? (
                          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: '10px 0 0' }}>Sin animales registrados para esta compra.</p>
                        ) : (
                          <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(60,45,30,0.10)' }}>
                                  {['Código','Nombre','Raza','Sexo','Peso (kg)','Lote','Estado'].map((h, hi) => (
                                    <th key={hi} style={{ padding: '7px 12px', textAlign: 'left', color: '#8c7f74', fontWeight: 500, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {animals.map((a, ai) => (
                                  <tr key={a.id} style={{ borderBottom: ai < animals.length - 1 ? '1px solid rgba(60,45,30,0.06)' : 'none' }}>
                                    <td style={{ padding: '7px 12px' }}>
                                      <a href={`/dashboard/animales/${a.id}`} style={{ color: '#1a6b45', textDecoration: 'none', fontWeight: 500 }}>{a.codigo}</a>
                                    </td>
                                    <td style={{ padding: '7px 12px', color: '#1c1a17' }}>{a.nombre ?? '—'}</td>
                                    <td style={{ padding: '7px 12px', color: '#4a4540' }}>{a.raza ?? '—'}</td>
                                    <td style={{ padding: '7px 12px', color: '#4a4540' }}>{a.sexo ?? '—'}</td>
                                    <td style={{ padding: '7px 12px', color: '#4a4540' }}>{a.peso_actual != null ? `${a.peso_actual} kg` : '—'}</td>
                                    <td style={{ padding: '7px 12px', color: '#4a4540' }}>{a.lotes?.nombre ?? '—'}</td>
                                    <td style={{ padding: '7px 12px' }}>
                                      <span style={{ backgroundColor: a.estado === 'activo' ? '#e8f5ee' : '#fee2e2', color: a.estado === 'activo' ? '#1a6b45' : '#8B1A1A', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>{a.estado}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- MODAL NUEVA COMPRA ---- */}
      {showModal && (
        <div onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '640px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '24px', color: '#1c1a17', margin: '0 0 22px' }}>Registrar compra</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {errorMsg && (
                <div style={{ backgroundColor: '#fee2e2', border: '1px solid rgba(139,26,26,0.25)', borderRadius: '8px', padding: '10px 14px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', lineHeight: 1.5 }}>
                  ⚠ {errorMsg}
                </div>
              )}
              {/* Header fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Fecha de compra *</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required max={today} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Vendedor *</label>
                  <input value={vendedor} onChange={e => setVendedor(e.target.value)} placeholder="Nombre del vendedor" required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Cédula o NIT del vendedor (opcional)</label>
                <input value={cedulaVendedor} onChange={e => setCedulaVendedor(e.target.value)} placeholder="Ej: 900.123.456-7" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Precio total de la compra (COP) *</label>
                  <input type="number" step="1" min="0" value={precioTotal} onChange={e => setPrecioTotal(e.target.value)} placeholder="Ej: 5000000" required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio por kg (opcional)</label>
                  <input type="number" step="1" min="0" value={precioKg} onChange={e => setPrecioKg(e.target.value)} placeholder="Ej: 8000" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones sobre la compra" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Animales comprados */}
              <div style={{ borderTop: '1px solid rgba(60,45,30,0.10)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 600, color: '#1c1a17', margin: 0 }}>Animales comprados *</p>
                  <button type="button"
                    onClick={() => setAnimalRows(prev => [...prev, emptyAnimalRow()])}
                    style={{ padding: '6px 14px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '7px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', cursor: 'pointer' }}>
                    + Agregar animal
                  </button>
                </div>
                {animalRows.map((row, idx) => (
                  <div key={idx}
                    style={{ backgroundColor: '#faf8f4', border: '1px solid rgba(60,45,30,0.10)', borderRadius: '10px', padding: '14px', marginBottom: '10px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', fontWeight: 600, color: '#8c7f74', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Animal {idx + 1}</span>
                      {animalRows.length > 1 && (
                        <button type="button"
                          onClick={() => setAnimalRows(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B1A1A', fontSize: '14px', padding: '0 4px', fontFamily: 'var(--font-sans), sans-serif' }}>
                          × Quitar
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Código *</label>
                        <input value={row.codigo} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, codigo: e.target.value } : r))} placeholder="A-001" required style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Nombre</label>
                        <input value={row.nombre} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, nombre: e.target.value } : r))} placeholder="Opcional" style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Raza</label>
                        <input value={row.raza} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, raza: e.target.value } : r))} placeholder="Holstein" style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Sexo *</label>
                        <select value={row.sexo} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, sexo: e.target.value } : r))} required style={{ ...selectStyle, fontSize: '13px', padding: '8px 12px' }}>
                          <option value="">Seleccionar</option>
                          <option value="hembra">Hembra</option>
                          <option value="macho">Macho</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Peso (kg)</label>
                        <input type="number" step="0.1" min="0" value={row.peso} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, peso: e.target.value } : r))} placeholder="Opcional" style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Fecha nacimiento</label>
                        <input type="date" value={row.fecha_nacimiento} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, fecha_nacimiento: e.target.value } : r))} max={today} style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Propósito</label>
                        <select value={row.proposito} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, proposito: e.target.value } : r))} style={{ ...selectStyle, fontSize: '13px', padding: '8px 12px' }}>
                          <option value="">Sin especificar</option>
                          <option value="leche">Leche</option>
                          <option value="carne">Carne</option>
                          <option value="doble_proposito">Doble propósito</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: '12px' }}>Lote</label>
                        <select value={row.lote_id} onChange={e => setAnimalRows(prev => prev.map((r, i) => i === idx ? { ...r, lote_id: e.target.value } : r))} style={{ ...selectStyle, fontSize: '13px', padding: '8px 12px' }}>
                          <option value="">Sin lote</option>
                          {lotes.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {animalRows.every(r => !r.codigo.trim() || !r.sexo) && (
                  <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8B1A1A', margin: '4px 0 0' }}>
                    Agrega al menos un animal con código y sexo para guardar.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', backgroundColor: '#1a6b45', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : 'Registrar compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- EDIT MODAL ---- */}
      {editingCompra && (
        <div onClick={() => setEditingCompra(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '22px', color: '#1c1a17', margin: '0 0 20px' }}>Editar compra</h2>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Fecha *</label>
                  <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} required max={today} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Vendedor *</label>
                  <input value={editVendedor} onChange={e => setEditVendedor(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Cédula o NIT del vendedor</label>
                <input value={editCedula} onChange={e => setEditCedula(e.target.value)} placeholder="Ej: 900.123.456-7" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Precio total (COP) *</label>
                  <input type="number" step="1" min="0" value={editPrecioTotal} onChange={e => setEditPrecioTotal(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio por kg</label>
                  <input type="number" step="1" min="0" value={editPrecioKg} onChange={e => setEditPrecioKg(e.target.value)} placeholder="Opcional" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setEditingCompra(null)}
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
      {compraToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#8B1A1A', margin: '0 0 12px' }}>¿Eliminar compra?</h3>
            <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#4a4540', margin: '0 0 20px', lineHeight: 1.6 }}>
              Se eliminará el registro de compra del {compraToDelete.fecha} ({compraToDelete.vendedor}).
              Los animales comprados <strong>permanecerán</strong> en la finca. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCompraToDelete(null)}
                style={{ padding: '10px 20px', border: '1px solid rgba(60,45,30,0.18)', borderRadius: '8px', backgroundColor: 'transparent', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', cursor: 'pointer', color: '#4a4540' }}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deletingCompra}
                style={{ padding: '10px 20px', backgroundColor: '#8B1A1A', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 500, cursor: deletingCompra ? 'not-allowed' : 'pointer', opacity: deletingCompra ? 0.7 : 1 }}>
                {deletingCompra ? 'Eliminando...' : 'Eliminar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
