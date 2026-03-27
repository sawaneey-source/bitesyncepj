'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './layout.module.css'
import Logo from '@/components/Logo'
import { API_BASE, PUBLIC_URL } from '@/utils/api'

const NAV = [
  { href: '/shop', icon: '🏠', label: 'ภาพรวม' },
  { href: '/shop/orders', icon: '📋', label: 'รายการสั่งซื้อ' },
  { href: '/shop/categories', icon: '🗂️', label: 'หมวดหมู่เมนู' },
  { href: '/shop/menu', icon: '🍽️', label: 'จัดการเมนู' },
  { href: '/shop/reviews', icon: '⭐', label: 'การรีวิว' },
  { href: '/shop/riders',  icon: '🛵', label: 'ไรเดอร์' },
  { href: '/chat',         icon: '🎧', label: 'แชทกับแอดมิน' },
]


export default function ShopLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]       = useState(null)
  const [checking, setChecking] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '')
  const [isOpen, setIsOpen] = useState(true) // ShopStatus (1=true, 0=false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [showBlockClose, setShowBlockClose] = useState(false)

  
  const [shop, setShop] = useState({ name: 'กำลังโหลด...', id: null, logo: null })
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    const savedUser = localStorage.getItem('bs_user')
    if (savedUser) {
      const u = JSON.parse(savedUser)
      if (u.role !== 'restaurant' && u.role !== 'shop') {
        if (u.role === 'rider') router.replace('/rider')
        else if (u.role === 'admin') router.replace('/admin/dashboard')
        else router.replace('/home')
        return
      }
      setUser(u)

      // Fetch Shop Info
      fetch(`http://localhost/bitesync/api/shop/get_shop_info.php?usrId=${u.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setShop({ name: d.data.ShopName, id: d.data.ShopId, logo: d.data.ShopLogoPath })
            setIsOpen(parseInt(d.data.ShopStatus) === 1)
          } else {
            setShop({ name: u.name, id: null, logo: null })
          }
        })
        .catch(() => setShop({ name: u.name, id: null, logo: null }))

      refreshCount()
      setChecking(false)
    } else {
      router.replace('/login')
    }
  }, [router])

  const refreshCount = () => {
    const savedUser = localStorage.getItem('bs_user')
    if (!savedUser) return
    const u = JSON.parse(savedUser)
    fetch(`${API_BASE}/shop/orders.php?usrId=${u.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setOrderCount(d.data.filter(o => o.status === 'Pending').length)
      })
      .catch(() => {})
  }

  useEffect(() => {
    window.addEventListener('orderUpdate', refreshCount)
    return () => window.removeEventListener('orderUpdate', refreshCount)
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

  async function toggleStatus() {
    if (isOpen) {
      setShowConfirmClose(true)
    } else {
      updateStatus(1)
    }
  }

  async function updateStatus(newStatus) {
    try {
      const res = await fetch(`${API_BASE}/shop/status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrId: user.id, status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        setIsOpen(newStatus === 1)
        setShowConfirmClose(false)
      } else {
        if (data.message.includes("active orders")) {
          setShowConfirmClose(false)
          setShowBlockClose(true)
        } else {
          alert(data.message)
        }
      }
    } catch (err) {
      alert("ไม่สามารถเปลี่ยนสถานะได้")
    }
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
          <Logo theme="dark" size="small" />
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
                {n.href === '/shop/orders' && orderCount > 0 && <span className={styles.navBadge}>{orderCount}</span>}
              </Link>
            )
          })}
        </nav>

        <div className={styles.sideBottom}>
          <div className={styles.userBtn} onClick={() => setProfileOpen(v => !v)}>
            {shop.logo ? (
              <img src={`${PUBLIC_URL}${shop.logo}`} className={styles.userAvatar} style={{objectFit:'cover'}} alt="Logo" />
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

          <div className={styles.topRight}>
             <div className={`${styles.statusPill} ${isOpen ? styles.pillOpen : styles.pillClosed}`} onClick={toggleStatus}>
                <span className={styles.pillDot} />
                <span className={styles.pillText}>{isOpen ? 'เปิดร้านอยู่' : 'ปิดร้านอยู่'}</span>
                <span className={styles.pillToggle}>{isOpen ? '🟢' : '⚫'}</span>
             </div>
          </div>

        </header>
        <main key={pathname} className={styles.content}>{children}</main>
      </div>

      {/* Confirmation Modal */}
      {showConfirmClose && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalIcon}>🌙</div>
            <h3 className={styles.modalTitle}>ต้องการปิดร้านหรือไม่?</h3>
            <p className={styles.modalDesc}>ลูกค้าจะไม่สามารถสั่งอาหารจากร้านของคุณได้จนกว่าคุณจะกดเปิดร้านอีกครั้ง</p>
            <div className={styles.modalBtns}>
              <button className={styles.modalBtnCancel} onClick={() => setShowConfirmClose(false)}>ยกเลิก</button>
              <button className={styles.modalBtnConfirm} onClick={() => updateStatus(0)}>ปิดร้าน</button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Modal */}
      {showBlockClose && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalIcon}>🛑</div>
            <h3 className={styles.modalTitle} style={{color:'#d32f2f'}}>ไม่สามารถปิดร้านได้</h3>
            <p className={styles.modalDesc}>คุณยังมีออเดอร์ที่ค้างการจัดเตรียมอยู่ครับ<br/>กรุณาทำรายการให้เสร็จสิ้นก่อนปิดร้านนะครับ 🍳</p>
            <div className={styles.modalBtns}>
              <button className={styles.modalBtnConfirm} style={{width:'100%', padding:'14px'}} onClick={() => setShowBlockClose(false)}>ตกลง, กลับไปทำงาน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

