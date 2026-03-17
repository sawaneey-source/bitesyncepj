'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const LINKS = [
  { href: '/',              label: 'หน้าหลัก' },
  { href: '/home',          label: 'เมนูอาหาร' },
  { href: '/offers',        label: 'โปรโมชั่น' },
  { href: '/restaurants',   label: 'ร้านอาหาร' },
  { href: '/track',         label: 'ติดตามออเดอร์' },
]

export default function Navbar() {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('bs_user')
    localStorage.removeItem('bs_token')
    window.location.href = '/'
  }

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

      <div className="nav-auth">
        {user ? (
          <div className="user-nav-wrap">
            <div className="user-avatar-btn" onClick={() => setShowDropdown(!showDropdown)}>
              <span className="nav-avatar-circle">{user.name?.[0].toUpperCase() || 'U'}</span>
              <span className="nav-user-name">{user.name}</span>
              <i className={`fa-solid fa-chevron-down ${showDropdown ? 'rotate' : ''}`} />
            </div>

            {showDropdown && (
              <div className="nav-dropdown glass">
                <Link 
                  href={user?.role === 'restaurant' || user?.role === 'shop' ? '/shop/profile' : '/profile'} 
                  className="dropdown-item"
                >
                  <i className="fa-regular fa-circle-user" /> โปรไฟล์ของฉัน
                </Link>
                <Link href="/home" className="dropdown-item">
                  <i className="fa-solid fa-utensils" /> สั่งอาหาร
                </Link>
                <div className="dropdown-divider" />
                <button onClick={handleLogout} className="dropdown-item logout">
                  <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn-login-nav">
            <span className="nav-avatar"><i className="fa-solid fa-user" /></span>
            เข้าสู่ระบบ / สมัครสมาชิก
          </Link>
        )}
      </div>
    </nav>
  )
}
