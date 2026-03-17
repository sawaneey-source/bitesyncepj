'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import styles from './layout.module.css'

const NAV = [
  { href: '/shop', icon: '🏠', label: 'Dashboard' },
  { href: '/shop/orders', icon: '📋', label: 'Order' },
  { href: '/shop/categories', icon: '🗂️', label: 'Categories' },
  { href: '/shop/menu', icon: '🍽️', label: 'Menu' },
  { href: '/shop/riders',  icon: '🛵', label: 'Rider' },
]


export default function ShopLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]       = useState(null)
  const [checking, setChecking] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)

  
   useEffect(() => {
  const demoUser = {
    name: "Demo Restaurant",
    role: "restaurant"
  }

  setUser(demoUser)
  setChecking(false)
}, [])

  function logout() {
    localStorage.removeItem('bs_token')
    localStorage.removeItem('bs_user')
    router.push('/login')
  }

  if (checking) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingInner}>
        <span className={styles.loadingLeaf}>🍃</span>
        <span className={styles.loadingText}>กำลังโหลด...</span>
      </div>
    </div>
  )

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sideTop}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>🍃</div>
            <span className={styles.logoText}>Bite<em>Sync</em></span>
          </div>
          <div className={styles.storeTag}>
            <span>🏪</span><span>Store</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(n => {
            const active = pathname.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} className={`${styles.navLink} ${active ? styles.navActive : ''}`}>
                <span className={styles.navIcon}>{n.icon}</span>
                <span>{n.label}</span>
                {n.href === '/shop/orders' && <span className={styles.navBadge}>6</span>}
              </Link>
            )
          })}
        </nav>

        <div className={styles.sideBottom}>
          <div className={styles.userBtn} onClick={() => setProfileOpen(v => !v)}>
            <div className={styles.userAvatar}>{(user?.name || 'R')[0].toUpperCase()}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || 'ร้านค้า'}</span>
              <span className={styles.userRole}>Restaurant</span>
            </div>
            <span className={styles.userChev}>{profileOpen ? '▲' : '▼'}</span>
          </div>
          {profileOpen && (
            <div className={styles.dropMenu}>
              <Link href="/shop/profile" className={styles.dropItem}>👤 โปรไฟล์ร้าน</Link>
              <div className={styles.dropItem} onClick={logout} style={{color:'#e53935',cursor:'pointer'}}>🚪 ออกจากระบบ</div>
            </div>
          )}
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <select className={styles.catSelect}>
            <option>All Categories</option>
          </select>
          <div className={styles.searchBox}>
            <span>🔍</span>
            <input placeholder="Search..." className={styles.searchInput}/>
          </div>
          <div className={styles.topRight}>
            <div className={styles.topAvatar}>{(user?.name||'R')[0].toUpperCase()}</div>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
