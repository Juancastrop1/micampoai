'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const valueProps = [
  'Inventario completo de animales por finca y por lote',
  'Registro y seguimiento de producción lechera',
  'Historial de eventos, vacunas y ventas por animal',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${focused ? '#1a6b45' : 'rgba(60,45,30,0.15)'}`,
    borderRadius: '8px',
    backgroundColor: '#f0ece4',
    fontSize: '14px',
    fontFamily: 'var(--font-sans), sans-serif',
    color: '#1c1a17',
    marginTop: '6px',
    outline: 'none',
    boxShadow: focused ? '0 0 0 3px rgba(26,107,69,0.10)' : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Correo o contraseña incorrectos. Intenta de nuevo.')
      return
    }
    router.push('/dashboard')
    router.refresh()
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
            Software Ganadero.
          </h1>

          <p style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '16px', color: 'rgba(250,248,244,0.6)', margin: '12px 0 0' }}>
            Un Software exclusivo para la familia Castro &amp; Pepín.
          </p>

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

        <p
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '12px',
            color: 'rgba(250,248,244,0.35)',
            margin: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          Castro &amp; Pepín SAS
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
        }}
      >
        <div style={{ maxWidth: '340px', width: '100%' }}>

          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#8c7f74',
              margin: 0,
            }}
          >
            Bienvenido de vuelta
          </p>

          <h2
            style={{
              fontFamily: 'var(--font-serif), serif',
              fontWeight: 'normal',
              fontSize: '36px',
              color: '#1c1a17',
              marginTop: '8px',
              marginBottom: 0,
            }}
          >
            Ingresa a tu cuenta
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '14px',
              fontWeight: 300,
              color: '#8c7f74',
              marginTop: '6px',
              marginBottom: 0,
            }}
          >
            Gestiona tu finca desde cualquier lugar
          </p>

          <div style={{ height: '1px', backgroundColor: 'rgba(60,45,30,0.10)', margin: '28px 0' }} />

          <form onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, color: '#4a4540', display: 'block' }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="tu@correo.com"
                required
                style={inputStyle(emailFocused)}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              <label
                htmlFor="password"
                style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 500, color: '#4a4540', display: 'block' }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="••••••••"
                required
                style={inputStyle(passwordFocused)}
              />
            </div>

            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: 'block',
                textAlign: 'right',
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: '13px',
                color: '#1a6b45',
                marginTop: '10px',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
            >
              ¿Olvidaste tu contraseña?
            </a>

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
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            {error && (
              <p
                style={{
                  fontFamily: 'var(--font-sans), sans-serif',
                  fontSize: '13px',
                  color: '#8B1A1A',
                  marginTop: '12px',
                  textAlign: 'center',
                }}
              >
                {error}
              </p>
            )}
          </form>

          <div style={{ height: '1px', backgroundColor: 'rgba(60,45,30,0.08)', margin: '24px 0' }} />

          <p
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '13px',
              color: '#8c7f74',
              margin: 0,
            }}
          >
            ¿No tienes cuenta?{' '}
            <a
              href="/register"
              style={{ color: '#1a6b45', fontWeight: 500, textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
            >
              Regístrate
            </a>
          </p>
        </div>
      </div>

      <p
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: '11px',
          color: 'rgba(60,45,30,0.3)',
          margin: 0,
        }}
      >
        Mi Campo.AI 2026 — Todos los derechos reservados
      </p>
    </main>
  )
}
