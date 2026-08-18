'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const valueProps = [
  'Calendario de vacunas automático por animal',
  'Proyección de ingresos y ciclos reproductivos',
  'Resumen semanal directo a tu WhatsApp',
]

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${focused === field ? '#1a6b45' : 'rgba(60,45,30,0.15)'}`,
    borderRadius: '8px',
    backgroundColor: '#f0ece4',
    fontSize: '14px',
    fontFamily: 'var(--font-sans), sans-serif',
    color: '#1c1a17',
    marginTop: '6px',
    outline: 'none',
    boxShadow: focused === field ? '0 0 0 3px rgba(26,107,69,0.10)' : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  })

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans), sans-serif',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4a4540',
    display: 'block',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
  }

  return (
    <main style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* ── LEFT COLUMN ── */}
      <div
        style={{
          width: '58%',
          backgroundColor: '#1a6b45',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Image
            src="/micampo_logo_cream.png"
            alt="Mi Campo.AI"
            width={180}
            height={54}
            priority
            style={{ objectFit: 'contain', mixBlendMode: 'multiply', width: '180px' }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif), serif',
              fontStyle: 'italic',
              fontWeight: 'normal',
              fontSize: '52px',
              color: '#faf8f4',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            La finca que se gestiona sola.
          </h1>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {valueProps.map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    minWidth: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#2d9162',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '15px', color: 'rgba(250,248,244,0.75)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', color: 'rgba(250,248,244,0.35)', margin: 0, position: 'relative', zIndex: 1 }}>
          Confiado por ganaderos en Colombia y Latinoamérica
        </p>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div
        style={{
          width: '42%',
          backgroundColor: '#faf8f4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: '340px', width: '100%' }}>

          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8c7f74', margin: 0 }}>
            Comienza gratis
          </p>

          <h2 style={{ fontFamily: 'var(--font-serif), serif', fontWeight: 'normal', fontSize: '36px', color: '#1c1a17', marginTop: '8px', marginBottom: 0 }}>
            Crea tu cuenta
          </h2>

          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '14px', fontWeight: 300, color: '#8c7f74', marginTop: '6px', marginBottom: 0 }}>
            Gestiona tu finca desde cualquier lugar
          </p>

          <div style={{ height: '1px', backgroundColor: 'rgba(60,45,30,0.10)', margin: '28px 0' }} />

          {success ? (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#e8f5ee',
                borderRadius: '8px',
                border: '1px solid rgba(26,107,69,0.2)',
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '15px', color: '#1a6b45', fontWeight: 500, margin: '0 0 6px' }}>
                ¡Registro exitoso!
              </p>
              <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#4a4540', margin: 0 }}>
                Revisa tu correo para confirmar tu cuenta.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" style={labelStyle}>Nombre completo</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  placeholder="Juan Pérez"
                  required
                  style={inputStyle('name')}
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <label htmlFor="email" style={labelStyle}>Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="tu@correo.com"
                  required
                  style={inputStyle('email')}
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <label htmlFor="password" style={labelStyle}>Contraseña</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  style={inputStyle('password')}
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <label htmlFor="confirm" style={labelStyle}>Confirmar contraseña</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  placeholder="Repite tu contraseña"
                  required
                  style={inputStyle('confirm')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '13px',
                  backgroundColor: loading ? '#2d9162' : '#1a6b45',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontFamily: 'var(--font-sans), sans-serif',
                  fontWeight: 500,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s',
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#2d9162' }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1a6b45' }}
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>

              {error && (
                <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8B1A1A', marginTop: '12px', textAlign: 'center' }}>
                  {error}
                </p>
              )}
            </form>
          )}

          <div style={{ height: '1px', backgroundColor: 'rgba(60,45,30,0.08)', margin: '24px 0' }} />

          <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: '#8c7f74', margin: 0 }}>
            ¿Ya tienes cuenta?{' '}
            <a
              href="/login"
              style={{ color: '#1a6b45', fontWeight: 500, textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
            >
              Inicia sesión
            </a>
          </p>
        </div>
      </div>

      <p style={{ position: 'absolute', bottom: '24px', right: '24px', fontFamily: 'var(--font-sans), sans-serif', fontSize: '11px', color: 'rgba(60,45,30,0.3)', margin: 0 }}>
        Mi Campo.AI 2026 — Todos los derechos reservados
      </p>
    </main>
  )
}
