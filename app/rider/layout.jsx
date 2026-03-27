'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import styles from './layout.module.css'
import Logo from '@/components/Logo'
import { API_BASE, PUBLIC_URL } from '@/utils/api'

const NAV = [
  { href:'/rider', icon:'🏠', label:'หน้าหลัก' },
  { href:'/rider/jobs',      icon:'📋', label:'งานใหม่' },
  { href:'/rider/active',    icon:'🛵', label:'งานปัจจุบัน' },
  { href:'/rider/history',   icon:'📊', label:'ประวัติ' },
  { href:'/chat',            icon:'🎧', label:'แชทกับแอดมิน' },
]

export default function RiderLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]         = useState(null)
  const [checking, setChecking] = useState(true)
  const [online, setOnline]     = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showConfirmOffline, setShowConfirmOffline] = useState(false)
  const [showBlockOffline, setShowBlockOffline] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('bs_token')
    const raw   = localStorage.getItem('bs_user')
    if (!token || !raw) { router.replace('/login'); return }
    try {
      const u = JSON.parse(raw)
      if (u.role !== 'rider') {
        router.replace(u.role === 'restaurant' ? '/shop/dashboard' : u.role === 'admin' ? '/admin/dashboard' : '/')
        return
      }
      setUser(u)
      setOnline(localStorage.getItem('rider_online') === 'true')
      setChecking(false)

      // Sync fresh profile from API to handle potential stale image in localStorage
      fetch(`${API_BASE}/customer/get_profile.php?userId=${u.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.user) {
            const fresh = { ...u, ...d.user }
            setUser(fresh)
            localStorage.setItem('bs_user', JSON.stringify(fresh))
          }
        }).catch(err => console.error("Sync profile error:", err))

    } catch { router.replace('/login') }
  }, [])

  async function toggleOnline() {
    if (online) {
      try {
        const uStr = localStorage.getItem('bs_user')
        if (uStr) {
          const uid = JSON.parse(uStr).id
          const res = await fetch(`${API_BASE}/rider/active-job.php?usrId=${uid}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
          })
          const data = await res.json()
          if (data.success && data.data) {
            setShowBlockOffline(true)
            return
          }
        }
      } catch (err) {}

      setShowConfirmOffline(true)
      return
    }
    const next = !online
    setOnline(next)
    localStorage.setItem('rider_online', String(next))
    // อัปเดต status ใน API
    const uStr = localStorage.getItem('bs_user')
    let uid = 0
    if (uStr) { try { uid = JSON.parse(uStr).id } catch(e){} }

    fetch(`${API_BASE}/rider/status.php`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('bs_token')}` },
      body: JSON.stringify({ status: next ? 'Online' : 'Offline', usrId: uid })
    }).catch(() => {})
  }

  function confirmOffline() {
    setShowConfirmOffline(false)
    setOnline(false)
    localStorage.setItem('rider_online', 'false')
    const uStr = localStorage.getItem('bs_user')
    let uid = 0
    if (uStr) { try { uid = JSON.parse(uStr).id } catch(e){} }

    fetch(`${API_BASE}/rider/status.php`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('bs_token')}` },
      body: JSON.stringify({ status: 'Offline', usrId: uid })
    }).catch(() => {})
  }

  function logout() {
    localStorage.removeItem('bs_token')
    localStorage.removeItem('bs_user')
    localStorage.removeItem('rider_online')
    router.push('/login')
  }

  if (checking) return (
    <div className={styles.loading}>
      <div className={styles.loadingInner}>
        <span className={styles.loadingIcon}>🛵</span>
        <span>กำลังโหลด...</span>
      </div>
    </div>
  )

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* Logo */}
        <div className={styles.sideTop}>
          <Logo theme="dark" size="small" />
          <div className={styles.riderTag}>
            <span>🛵</span><span>Rider</span>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV.map(n => {
            const active = n.href === '/rider'
              ? pathname === '/rider' || pathname === '/rider/'
              : pathname.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} className={`${styles.navLink} ${active ? styles.navActive : ''}`}>
                <span className={styles.navIcon}>{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Profile bottom */}
        <div className={styles.sideBottom} style={{position:'relative'}}>
          {showUserMenu && (
            <>
              <div className={styles.menuDimmer} onClick={() => setShowUserMenu(false)} />
              <div className={styles.userMenu}>
                <Link href="/rider/profile" className={styles.userMenuItem} onClick={()=>setShowUserMenu(false)}>
                  <i className="fa-solid fa-user" style={{width:20}}/> จัดการโปรไฟล์
                </Link>
                <div className={styles.userMenuDiv}/>
                <button onClick={logout} className={`${styles.userMenuItem} ${styles.userMenuLogout}`}>
                  <i className="fa-solid fa-arrow-right-from-bracket" style={{width:20}}/> ออกจากระบบ
                </button>
              </div>
            </>
          )}
          <div className={styles.userRow} onClick={() => setShowUserMenu(!showUserMenu)} style={{cursor:'pointer'}}>
            <div className={styles.userAvatar}>
              {user?.image ? (
                <img src={`${PUBLIC_URL}${user.image}`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                (user?.name || 'R')[0].toUpperCase()
              )}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name || 'ไรเดอร์'}</span>
              <span className={styles.userRole}>Rider</span>
            </div>
            <div className={styles.moreBtn}><i className="fa-solid fa-ellipsis-vertical"/></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={`${styles.statusDot} ${online ? styles.statusDotOn : ''}`}/>
            <span className={styles.statusTxt}>{online ? 'กำลังรับงาน' : 'ปิดรับงานอยู่'}</span>
          </div>
          <div className={styles.topbarRight}>
            <button onClick={toggleOnline} className={`${styles.topOnlineBtn} ${online ? styles.topOnlineBtnOn : ''}`}>
              {online ? '🟢 Online' : '⚫ Offline'}
            </button>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>

      {/* Confirmation Modal */}
      {showConfirmOffline && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalIcon}>💤</div>
            <h3 className={styles.modalTitle}>ยืนยันปิดรับงาน?</h3>
            <p className={styles.modalDesc}>คุณจะไม่เห็นออเดอร์ใหม่ที่เข้ามาอีกจนกว่าคุณจะกดออนไลน์เพื่อเริ่มเปิดรับงานใหม่</p>
            <div className={styles.modalBtns}>
              <button className={styles.modalBtnCancel} onClick={() => setShowConfirmOffline(false)}>ยกเลิก</button>
              <button className={styles.modalBtnConfirm} onClick={confirmOffline}>ปิดรับงาน</button>
            </div>
          </div>
        </div>
      )}

      {/* Block Offline Modal */}
      {showBlockOffline && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalIcon}>🛑</div>
            <h3 className={styles.modalTitle} style={{color:'#d32f2f'}}>ไม่สามารถปิดรับงานได้</h3>
            <p className={styles.modalDesc}>คุณยังมีออเดอร์ที่ค้างจัดส่งอยู่ครับ<br/>กรุณาทำรายการให้เสร็จสิ้นก่อนพักผ่อน 🚀</p>
            <div className={styles.modalBtns}>
              <button className={styles.modalBtnConfirm} style={{width:'100%', padding:'14px'}} onClick={() => setShowBlockOffline(false)}>ตกลง, กลับไปทำงาน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

