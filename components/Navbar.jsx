'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',              label: 'หน้าหลัก' },
  { href: '/menu',          label: 'เมนูอาหาร' },
  { href: '/offers',        label: 'โปรโมชั่น' },
  { href: '/restaurants',   label: 'ร้านอาหาร' },
  { href: '/track',         label: 'ติดตามออเดอร์' },
]

export default function Navbar() {
  const path = usePathname()
  return (
    <nav className="navbar">
      <Link href="/" className="nav-logo">
        <span className="logo-icon">🍃</span>
        <span className="logo-txt">Bite<span>Sync</span></span>
      </Link>
      <div className="nav-links">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`nav-link ${path === l.href ? 'active' : ''}`}>
            {l.label}
          </Link>
        ))}
      </div>
      <Link href="/login" className="btn-login-nav">
        <span className="nav-avatar"><i className="fa-solid fa-user" /></span>
        เข้าสู่ระบบ / สมัครสมาชิก
      </Link>
    </nav>
  )
}
