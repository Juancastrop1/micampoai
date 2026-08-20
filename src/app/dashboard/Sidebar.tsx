'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6.5L8 2L14 6.5V14H10V10H6V14H2V6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/animales',
    label: 'Animales',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="10" rx="5" ry="3.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M3.5 10V12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M12.5 10V12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 6.5L4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M10.5 6.5L11.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="8" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/dashboard/leche',
    label: 'Leche',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2C8 2 4 7 4 10.5C4 12.4 5.8 14 8 14C10.2 14 12 12.4 12 10.5C12 7 8 2 8 2Z" stroke="currentColor" strokeWidth="1.4" fill="none" />
      </svg>
    ),
  },
  {
    href: '/dashboard/ventas',
    label: 'Ventas',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 2H8.5L14 7.5L9 12.5L3.5 7V2H2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
        <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/dashboard/eventos',
    label: 'Eventos',
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3.5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
        <path d="M2 7.5H14" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 2V4M10.5 2V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#1c1a17',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <Image
          src="/micampo_logo_cream.png"
          alt="Mi Campo.AI"
          width={140}
          height={42}
          priority
          style={{ objectFit: 'contain', mixBlendMode: 'multiply', width: '140px' }}
        />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const isHovered = hovered === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: '14px',
                transition: 'background-color 0.15s, color 0.15s',
                backgroundColor: isActive
                  ? 'rgba(26,107,69,0.4)'
                  : isHovered
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
                color: isActive ? '#6ee7b7' : isHovered ? '#ffffff' : 'rgba(255,255,255,0.6)',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '7px 12px',
            cursor: signingOut ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          }}
        >
          {signingOut ? 'Cerrando...' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
