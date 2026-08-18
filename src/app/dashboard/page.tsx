'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f4' }}>

      {/* Navbar */}
      <nav
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(60,45,30,0.10)',
          padding: '0 32px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Image
          src="/micampo_logo_horizontal.png"
          alt="Mi Campo.AI"
          width={140}
          height={42}
          priority
          style={{ objectFit: 'contain', mixBlendMode: 'multiply', width: '140px' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {userEmail && (
            <span
              style={{
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: '13px',
                color: '#4a4540',
              }}
            >
              {userEmail}
            </span>
          )}
          <button
            onClick={handleSignOut}
            disabled={loading}
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              color: '#1a6b45',
              backgroundColor: 'transparent',
              border: '1px solid rgba(26,107,69,0.3)',
              borderRadius: '6px',
              padding: '6px 14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1a6b45'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#1a6b45'
            }}
          >
            {loading ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 64px)',
          gap: '12px',
          textAlign: 'center',
          padding: '32px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif), serif',
            fontWeight: 'normal',
            fontSize: '32px',
            color: '#1c1a17',
            margin: 0,
          }}
        >
          Bienvenido a Mi Campo.AI
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '15px',
            color: '#8c7f74',
            margin: 0,
          }}
        >
          Tu dashboard está en construcción.
        </p>
      </div>
    </div>
  )
}
