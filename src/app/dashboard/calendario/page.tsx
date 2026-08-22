'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Finca } from '@/lib/types'

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const typeColors: Record<string, string> = {
  vacuna: '#16a34a',
  tratamiento: '#2563eb',
  pesaje: '#ca8a04',
  venta: '#dc2626',
  parto: '#7c3aed',
  servicio: '#7c3aed',
  otro: '#9ca3af',
}
const typeLabels: Record<string, string> = {
  vacuna: 'Vacuna', tratamiento: 'Tratamiento', pesaje: 'Pesaje',
  venta: 'Venta', parto: 'Parto', servicio: 'Servicio', otro: 'Otro',
}
const legendItems = [
  { tipo: 'vacuna', label: 'Vacuna' },
  { tipo: 'tratamiento', label: 'Tratamiento' },
  { tipo: 'pesaje', label: 'Pesaje' },
  { tipo: 'venta', label: 'Venta' },
  { tipo: 'parto', label: 'Parto/Servicio' },
  { tipo: 'otro', label: 'Otro' },
]

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

type LecheRow = {
  id: string
  fecha: string
  litros: number
  precio_litro: number | null
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CalendarioPage() {
  const today = new Date()
  const todayStr = toDateStr(today)

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [finca, setFinca] = useState<Finca | null>(null)
  const [eventos, setEventos] = useState<EventoRow[]>([])
  const [leche, setLeche] = useState<LecheRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: fincas } = await supabase.from('fincas').select('*').limit(1)
    const currentFinca: Finca | null = fincas?.[0] ?? null
    setFinca(currentFinca)
    if (!currentFinca) { setLoading(false); return }

    const [eventosRes, lecheRes] = await Promise.all([
      supabase
        .from('eventos_animal')
        .select('id, tipo, descripcion, fecha, proxima_fecha, costo, animal_id, animales(id, codigo, nombre, lote_id, lotes(nombre))')
        .order('fecha', { ascending: true }),
      supabase
        .from('registro_leche')
        .select('id, fecha, litros, precio_litro')
        .eq('finca_id', currentFinca.id),
    ])

    setEventos((eventosRes.data ?? []) as unknown as EventoRow[])
    setLeche(lecheRes.data ?? [])
    setLoading(false)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday=0 … Sunday=6
  let startDow = firstDay.getDay() - 1
  if (startDow === -1) startDow = 6

  type CalDay = { dateStr: string; inMonth: boolean }
  const calDays: CalDay[] = []

  // Prev-month padding
  for (let i = startDow; i > 0; i--) {
    calDays.push({ dateStr: toDateStr(new Date(year, month, 1 - i)), inMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calDays.push({ dateStr: toDateStr(new Date(year, month, d)), inMonth: true })
  }
  // Next-month padding to complete last row
  const tail = calDays.length % 7
  if (tail !== 0) {
    for (let d = 1; d <= 7 - tail; d++) {
      calDays.push({ dateStr: toDateStr(new Date(year, month + 1, d)), inMonth: false })
    }
  }

  // Look up events/leche by date
  function getEventsForDate(dateStr: string) {
    return {
      actual: eventos.filter(e => e.fecha === dateStr),
      scheduled: eventos.filter(e => e.proxima_fecha === dateStr),
    }
  }
  function getLecheForDate(dateStr: string) {
    return leche.filter(r => r.fecha === dateStr)
  }

  function getDots(dateStr: string) {
    const { actual, scheduled } = getEventsForDate(dateStr)
    const types = Array.from(new Set([...actual, ...scheduled].map(e => e.tipo)))
    const hasLeche = getLecheForDate(dateStr).length > 0
    return { types, hasLeche }
  }

  function animalLabel(e: EventoRow) {
    if (!e.animales) return 'Animal desconocido'
    return e.animales.nombre
      ? `${e.animales.codigo} — ${e.animales.nombre}`
      : e.animales.codigo
  }

  function formatFull(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${d} de ${MONTHS_ES[m - 1]} de ${y}`
  }

  // Selected day data
  const selActual = selectedDay ? getEventsForDate(selectedDay).actual : []
  const selScheduled = selectedDay ? getEventsForDate(selectedDay).scheduled : []
  const selLeche = selectedDay ? getLecheForDate(selectedDay) : []
  const hasAnything = selActual.length > 0 || selScheduled.length > 0 || selLeche.length > 0

  if (loading) return <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#8c7f74' }}>Cargando...</div>
  if (!finca) return (
    <div style={{ padding: '32px', fontFamily: 'var(--font-sans), sans-serif', color: '#4a4540' }}>
      Primero crea tu finca en el <a href="/dashboard" style={{ color: '#1a6b45' }}>Dashboard</a>.
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '28px', color: '#1c1a17', margin: '0 auto 0 0' }}>Calendario</h1>
        <button onClick={prevMonth}
          style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(60,45,30,0.2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4540', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '24px', color: '#1c1a17', minWidth: '200px', textAlign: 'center' }}>
          {MONTHS_ES[month]} {year}
        </span>
        <button onClick={nextMonth}
          style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(60,45,30,0.2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a4540', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
        {/* Calendar grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {DAYS_ES.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '8px 4px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', fontWeight: 600, color: '#8c7f74', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calDays.map(({ dateStr, inMonth }) => {
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDay
              const { types, hasLeche } = getDots(dateStr)
              const dayNum = parseInt(dateStr.split('-')[2], 10)

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{
                    minHeight: '80px',
                    padding: '8px',
                    border: isToday
                      ? '2px solid #1a6b45'
                      : isSelected
                      ? '2px solid #4a4540'
                      : '1px solid rgba(60,45,30,0.08)',
                    borderRadius: '6px',
                    backgroundColor: isToday
                      ? 'rgba(26,107,69,0.06)'
                      : isSelected
                      ? '#f0ece4'
                      : '#faf8f4',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    if (!isToday && !isSelected) e.currentTarget.style.backgroundColor = '#f0ece4'
                  }}
                  onMouseLeave={e => {
                    if (!isToday && !isSelected) e.currentTarget.style.backgroundColor = '#faf8f4'
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-sans), sans-serif',
                    fontSize: '13px',
                    fontWeight: isToday ? 700 : 400,
                    color: !inMonth ? 'rgba(60,45,30,0.22)' : isToday ? '#1a6b45' : '#1c1a17',
                    lineHeight: 1,
                  }}>
                    {dayNum}
                  </span>

                  {(types.length > 0 || hasLeche) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                      {types.map(tipo => (
                        <span key={tipo} style={{
                          width: '7px', height: '7px', borderRadius: '50%',
                          backgroundColor: typeColors[tipo] ?? '#9ca3af',
                          flexShrink: 0, display: 'inline-block',
                        }} />
                      ))}
                      {hasLeche && (
                        <svg width="6" height="8" viewBox="0 0 6 8" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M3 0.5C3 0.5 0.5 3.5 0.5 5.5C0.5 6.88 1.62 8 3 8C4.38 8 5.5 6.88 5.5 5.5C5.5 3.5 3 0.5 3 0.5Z" fill="#2563eb" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px', padding: '10px 14px', backgroundColor: '#ffffff', border: '1px solid rgba(60,45,30,0.08)', borderRadius: '8px', alignItems: 'center' }}>
            {legendItems.map(({ tipo, label }) => (
              <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: typeColors[tipo], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#4a4540' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="7" height="9" viewBox="0 0 6 8" fill="none" style={{ flexShrink: 0 }}>
                <path d="M3 0.5C3 0.5 0.5 3.5 0.5 5.5C0.5 6.88 1.62 8 3 8C4.38 8 5.5 6.88 5.5 5.5C5.5 3.5 3 0.5 3 0.5Z" fill="#2563eb" />
              </svg>
              <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#4a4540' }}>Leche</span>
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div style={{
            width: '300px', minWidth: '280px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(60,45,30,0.10)',
            borderRadius: '12px',
            padding: '20px',
            position: 'sticky',
            top: '32px',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '20px', color: '#1c1a17', margin: 0, lineHeight: 1.3 }}>
                {formatFull(selectedDay)}
              </h2>
              <button onClick={() => setSelectedDay(null)}
                style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid rgba(60,45,30,0.15)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c7f74', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {!hasAnything ? (
              <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', color: '#8c7f74', margin: 0 }}>
                Sin eventos para este día.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Actual events */}
                {selActual.map(e => (
                  <div key={e.id} style={{ padding: '12px', backgroundColor: '#faf8f4', borderRadius: '8px', border: '1px solid rgba(60,45,30,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: typeColors[e.tipo] ?? '#9ca3af', flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', fontWeight: 700, color: typeColors[e.tipo] ?? '#4a4540', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {typeLabels[e.tipo] ?? e.tipo}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', margin: '0 0 4px', fontWeight: 500 }}>{e.descripcion}</p>
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', margin: 0 }}>
                      {animalLabel(e)}
                      {e.animales?.lotes?.nombre && <> · {e.animales.lotes.nombre}</>}
                    </p>
                  </div>
                ))}

                {/* Scheduled events (proxima_fecha falls on this day) */}
                {selScheduled.map(e => (
                  <div key={`sched-${e.id}`} style={{ padding: '12px', backgroundColor: '#faf8f4', borderRadius: '8px', border: '1px dashed rgba(60,45,30,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="5" cy="5" r="4" stroke={typeColors[e.tipo] ?? '#9ca3af'} strokeWidth="1.3" />
                        <path d="M5 3V5.5L6.5 6.5" stroke={typeColors[e.tipo] ?? '#9ca3af'} strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', fontWeight: 700, color: '#8c7f74', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Programado: {typeLabels[e.tipo] ?? e.tipo}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', margin: '0 0 4px', fontWeight: 500 }}>{e.descripcion}</p>
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#8c7f74', margin: 0 }}>
                      Animal: {animalLabel(e)}
                    </p>
                  </div>
                ))}

                {/* Leche summary */}
                {selLeche.length > 0 && (
                  <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <svg width="8" height="10" viewBox="0 0 6 8" fill="none">
                        <path d="M3 0.5C3 0.5 0.5 3.5 0.5 5.5C0.5 6.88 1.62 8 3 8C4.38 8 5.5 6.88 5.5 5.5C5.5 3.5 3 0.5 3 0.5Z" fill="#2563eb" />
                      </svg>
                      <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Producción de leche
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#1c1a17', margin: '0 0 2px', fontWeight: 500 }}>
                      {selLeche.reduce((s, r) => s + r.litros, 0).toFixed(1)} L
                    </p>
                    {selLeche.some(r => r.precio_litro != null) && (
                      <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: '#4a4540', margin: 0 }}>
                        Ingreso: ${Math.round(selLeche.reduce((s, r) => s + r.litros * (r.precio_litro ?? 0), 0)).toLocaleString('es-CO')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
