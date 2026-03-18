'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'
import Logo from './Logo'

export default function Navbar({ showSearch = false, searchValue = '', onSearchChange = () => {}, cartCount = 0 }) {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  
  const LINKS = [
    { href: '/',          label: 'หน้าหลัก' },
    { href: '/home',          label: 'เมนูอาหาร' },
    { href: '/home/restaurants', label: 'หน้าร้านอาหาร' },
  ]
  const [showDropdown, setShowDropdown] = useState(false)
  const [localCartCount, setLocalCartCount] = useState(cartCount)
  const [lastOrder, setLastOrder] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
    
    // Auto-sync cart if not provided
    if (cartCount === 0) {
      const cart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
      setLocalCartCount(cart.reduce((s, c) => s + (Number(c.qty) || 1), 0))
    } else {
      setLocalCartCount(cartCount)
    }
    setLastOrder(localStorage.getItem('bs_last_order') || null)
  }, [cartCount])

  const handleLogout = () => {
    localStorage.removeItem('bs_user')
    localStorage.removeItem('bs_token')
    window.location.href = '/'
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <Link href={user ? "/home" : "/"} className={styles.logo}>
          <Logo size="small" />
        </Link>

        <div className={styles.links}>
          {LINKS.map(l => (
            <Link 
              key={l.href} 
              href={l.href}
              className={`${styles.link} ${path === l.href ? styles.active : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {showSearch && (
          <div className={styles.searchWrap}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="ค้นหาเมนูหรือร้านอาหาร..."
              className={styles.searchInp}
            />
          </div>
        )}

        <div className={styles.auth}>
          {user ? (
            <div key="auth-user" className={styles.userSection}>
              <div className={styles.cartBtn} onClick={() => router.push('/checkout')}>
                <i className="fa-solid fa-basket-shopping" />
                {localCartCount > 0 && <span className={styles.cartDot}>{localCartCount}</span>}
              </div>

              <div className={styles.userNavWrap}>
                <div className={styles.userAvatarBtn} onClick={() => setShowDropdown(!showDropdown)}>
                  <div className={styles.avatarCircle}>{user.name?.[0].toUpperCase() || 'U'}</div>
                  <i className={`fa-solid fa-chevron-down ${showDropdown ? styles.rotate : ''}`} />
                </div>

                {showDropdown && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownInfo}>
                      <span className={styles.dropdownName}>{user.name}</span>
                      <span className={styles.dropdownRole}>{user.role || 'ลูกค้าระดับ VIP'}</span>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <Link href={user?.role === 'restaurant' || user?.role === 'shop' ? '/shop/profile' : '/profile'} className={styles.dropdownItem}>
                      <i className="fa-regular fa-circle-user" /> โปรไฟล์ของฉัน
                    </Link>
                    {lastOrder && (
                      <Link href={`/home/track/${lastOrder}`} className={styles.dropdownItem}>
                        <i className="fa-solid fa-motorcycle" /> ติดตามออเดอร์
                      </Link>
                    )}
                    <Link href="/home" className={styles.dropdownItem}>
                      <i className="fa-solid fa-utensils" /> สั่งอาหาร
                    </Link>
                    <div className={styles.dropdownDivider} />
                    <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logout}`}>
                      <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key="auth-guest">
              <Link href="/login" className={styles.loginBtn}>
                <i className="fa-solid fa-user" /> เข้าสู่ระบบ
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
