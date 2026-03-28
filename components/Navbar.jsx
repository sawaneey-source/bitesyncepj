'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'
import Logo from './Logo'
import { API_BASE, PUBLIC_URL } from '@/utils/api'

export default function Navbar({
  showSearch = false,
  searchValue = '',
  onSearchChange = () => { },
  cartCount = 0,
  hideLinks = false
}) {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)

  const LINKS = [
    { href: '/', label: 'หน้าหลัก' },
    { href: '/home', label: 'เมนูอาหาร' },
    { href: '/home/restaurants', label: 'หน้าร้านอาหาร' },
  ]
  const [showDropdown, setShowDropdown] = useState(false)
  const [localCartCount, setLocalCartCount] = useState(cartCount)
  const [lastOrder, setLastOrder] = useState(null)

  useEffect(() => {
    const syncState = () => {
      const u = localStorage.getItem('bs_user')
      if (u) setUser(JSON.parse(u))
      else setUser(null)

      const cart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
      setLocalCartCount(cart.reduce((s, c) => s + (Number(c.qty) || 1), 0))

      setLastOrder(localStorage.getItem('bs_last_order') || null)
    }

    syncState()

    // Polling and Storage listener for real-time sync across tabs/actions
    const interval = setInterval(syncState, 2000)
    window.addEventListener('storage', syncState)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', syncState)
    }
  }, [cartCount, user?.id])

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

        {!hideLinks && (
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
        )}

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
              {(user?.role === 'admin' || (user?.role !== 'rider' && user?.role !== 'restaurant' && user?.role !== 'shop')) && (
                <div className={styles.chatIconBtn}
                  onClick={() => router.push(user?.role === 'admin' ? '/admin/chat' : '/chat')}
                  title="แชทติดต่อแอดมิน"
                >
                  <i className={user?.role === 'admin' ? "fa-solid fa-comments" : "fa-solid fa-headset"} />
                </div>
              )}

              {(user?.role !== 'admin' && user?.role !== 'rider' && user?.role !== 'restaurant' && user?.role !== 'shop') && (
                <div className={styles.cartBtn} onClick={() => router.push('/checkout')}>
                  <i className="fa-solid fa-basket-shopping" />
                  {localCartCount > 0 && <span className={styles.cartDot}>{localCartCount}</span>}
                </div>
              )}

              {(user?.role === 'admin' || (user?.role !== 'rider' && user?.role !== 'restaurant' && user?.role !== 'shop')) && (
                <div className={styles.userNavWrap}>
                  <div className={styles.userAvatarBtn} onClick={() => setShowDropdown(!showDropdown)}>
                    <div className={styles.avatarCircle}>
                      {user.image ? (
                        <img
                          src={`${PUBLIC_URL}${user.image}`}
                          alt="Profile"
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        user.name?.[0].toUpperCase() || 'U'
                      )}
                    </div>
                    <i className={`fa-solid fa-chevron-down ${showDropdown ? styles.rotate : ''}`} />
                  </div>

                  {showDropdown && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownInfo}>
                        <span className={styles.dropdownName}>{user.name}</span>
                        <span className={styles.dropdownRole}>{user.role || 'ลูกค้าระดับ VIP'}</span>
                      </div>
                      <div className={styles.dropdownDivider} />
                      {user?.role !== 'admin' && (
                        <Link href={user?.role === 'restaurant' || user?.role === 'shop' ? '/shop/profile' : '/profile'} className={styles.dropdownItem}>
                          <i className="fa-regular fa-circle-user" /> โปรไฟล์ของฉัน
                        </Link>
                      )}
                      {lastOrder && (
                        <Link href={`/home/track/${lastOrder}`} className={styles.dropdownItem}>
                          <i className="fa-solid fa-motorcycle" /> ติดตามออเดอร์
                        </Link>
                      )}

                      {/* Conditional Order link for non-business roles */}
                      {(user?.role !== 'admin' && user?.role !== 'rider' && user?.role !== 'restaurant' && user?.role !== 'shop') && (
                        <Link href="/home" className={styles.dropdownItem}>
                          <i className="fa-solid fa-utensils" /> สั่งอาหาร
                        </Link>
                      )}
                      <div className={styles.dropdownDivider} />
                      <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logout}`}>
                        <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            path !== '/login' && path !== '/register' && (
              <div key="auth-guest">
                <Link href="/login" className={styles.loginBtn}>
                  <i className="fa-solid fa-user" /> เข้าสู่ระบบ
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </nav>
  )
}
