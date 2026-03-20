'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './layout.module.css'

const NAV = [
  { href: '/shop', icon: '🏠', label: 'ภาพรวม' },
  { href: '/shop/orders', icon: '📋', label: 'รายการสั่งซื้อ' },
  { href: '/shop/categories', icon: '🗂️', label: 'หมวดหมู่เมนู' },
  { href: '/shop/menu', icon: '🍽️', label: 'จัดการเมนู' },
  { href: '/shop/reviews', icon: '⭐', label: 'การรีวิว' },
  { href: '/shop/riders',  icon: '🛵', label: 'ไรเดอร์' },
]


export default function ShopLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]       = useState(null)
  const [checking, setChecking] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '')

  
  const [shop, setShop] = useState({ name: 'กำลังโหลด...', id: null, logo: null })

  useEffect(() => {
    const savedUser = localStorage.getItem('bs_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      setUser(u)
      // Fetch Shop Info
      fetch(`http://localhost/bitesync/api/shop/get_shop_info.php?usrId=${u.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setShop({ name: d.data.ShopName, id: d.data.ShopId, logo: d.data.ShopLogoPath })
          else setShop({ name: u.name, id: null, logo: null })
        })
        .catch(() => setShop({ name: u.name, id: null, logo: null }))
    } else {
      setUser({ name: "ร้านค้า", role: "restaurant" })
      setShop({ name: "ร้านค้า", id: null, logo: null })
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    const s = searchParams.get('q') || ''
    if (s !== searchValue) setSearchValue(s)
  }, [searchParams])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = searchParams.get('q') || ''
      if (searchValue !== current) {
        const params = new URLSearchParams(searchParams.toString())
        if (searchValue) params.set('q', searchValue)
        else params.delete('q')
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchValue, pathname, router, searchParams])

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
            <span>🏪</span><span>ร้านค้า</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(n => {
            const active = n.href === '/shop' ? pathname === '/shop' : pathname.startsWith(n.href)
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
            {shop.logo ? (
              <img src={shop.logo} className={styles.userAvatar} style={{objectFit:'cover'}} alt="Logo" />
            ) : (
              <div className={styles.userAvatar}>{(user?.name || 'R')[0].toUpperCase()}</div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{shop.name}</span>
              <span className={styles.userRole}>{user?.role || 'Restaurant'}</span>
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
          <div className={styles.searchBox}>
            <span>🔍</span>
            <input 
              placeholder="ค้นหา..." 
              className={styles.searchInput}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

        </header>
        <main key={pathname} className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
