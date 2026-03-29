'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { API_BASE } from '@/utils/api'

const PERIODS = [
  { label: 'วันนี้', key: 'today' },
  { label: '3 วันล่าสุด', key: '3days' },
  { label: '7 วันล่าสุด', key: '7days' },
  { label: '30 วันล่าสุด', key: '30days' },
  { label: 'ทั้งหมด', key: 'all' }
]

export default function RiderDashboard() {
  const router = useRouter()
  const [online, setOnline] = useState(false)
  const [user, setUser] = useState(null)
  const [period, setPeriod] = useState('today')
  const [stats, setStats] = useState(null)
  const [activeJob, setActiveJob] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('bs_user')
    if (raw) {
      const u = JSON.parse(raw)
      setUser(u)
      
      // Proactive sync for potential stale image
      fetch(`http://localhost/bitesync/api/customer/get_profile.php?userId=${u.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.user) {
            const fresh = { ...u, ...d.user }
            setUser(fresh)
            localStorage.setItem('bs_user', JSON.stringify(fresh))
          }
        }).catch(() => {})
    }
    setOnline(localStorage.getItem('rider_online') === 'true')
    fetchActiveJob()

    const handleStorage = () => {
      const u = JSON.parse(localStorage.getItem('bs_user') || '{}')
      setUser(u)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    fetchStats().finally(() => setLoading(false))
  }, [period])

  async function fetchStats() {
    setLoading(true)
    setStats(null)
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id

      const res = await fetch(`http://localhost/bitesync/api/rider/stats.php?usrId=${uid}&period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch { }
  }

  async function fetchActiveJob() {
    try {
      const uStr = localStorage.getItem('bs_user')
      let uid = 0
      if (uStr) { try { uid = JSON.parse(uStr).id } catch (e) { } }

      const res = await fetch(`http://localhost/bitesync/api/rider/active-job.php?usrId=${uid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success && data.data) {
        setActiveJob(data.data)
      } else {
        setActiveJob(null)
      }
    } catch { }
  }

  function toggleOnline() {
    const next = !online
    setOnline(next)
    localStorage.setItem('rider_online', String(next))
    fetch('http://localhost/bitesync/api/rider/status.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bs_token')}` },
      body: JSON.stringify({ status: next ? 'Online' : 'Offline' })
    }).catch(() => { })
  }

  return (
    <div className={loading ? styles.fadeOut : styles.fadeIn}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>ภาพรวมไรเดอร์</h1>
        <div className={styles.userGreeting}>
          <div className={styles.userAvatar}>
            {user?.image ? (
              <img src={`http://localhost/bitesync/public${user.image}`} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              '👤'
            )}
          </div>
          สวัสดี, {user?.name || 'ไรเดอร์'} 👋
        </div>
      </div>

      <div className={styles.periodRow}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`${styles.pBtn} ${period === p.key ? styles.pBtnOn : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activeJob && (
        <div className={styles.activeAlert} onClick={() => router.push('/rider/active')}>
          <span className={styles.activeAlertIcon}>🔥</span>
          <div className={styles.activeAlertInfo}>
            <div className={styles.activeAlertTitle}>มีงานที่กำลังส่งอยู่!</div>
            <div className={styles.activeAlertSub}>Order {activeJob.id} · {activeJob.shopName} · ห่างจาก{activeJob.stopType} {activeJob.riderToStopDist} กม.</div>
          </div>
          <span className={styles.activeAlertArrow}>→</span>
        </div>
      )}

      {/* Analytics stats */}
      <div className={styles.statsGrid}>
        {(stats ? [
          { icon: '💰', val: `${stats.gross?.toLocaleString()} ฿`, lbl: 'ยอดวิ่งสะสม', unit: 'บาท', color: '#888', bg: '#f5f5f5' },
          { icon: '💎', val: `${stats.settledNet?.toLocaleString()} ฿`, lbl: 'รายได้สุทธิ (โอนแล้ว)', unit: 'บาท', color: '#2196f3', bg: '#e3f2fd' },
          { icon: '⌛', val: `${stats.pendingNet?.toLocaleString()} ฿`, lbl: 'รอยืนยันจ่าย (Pending)', unit: 'บาท', color: '#e65100', bg: '#fff3e0' },
        ] : [
          { icon: '...', val: '...', lbl: '...', unit: '', color: '#ccc', bg: '#f5f5f5' },
          { icon: '...', val: '...', lbl: '...', unit: '', color: '#ccc', bg: '#f5f5f5' },
          { icon: '...', val: '...', lbl: '...', unit: '', color: '#ccc', bg: '#f5f5f5' },
        ]).map((s, i) => (
          <div key={i} className={styles.statCard} style={{ borderLeft: `4px solid ${s.color}` }}>
            <div className={styles.statIcon} style={{ background: s.bg }}>{s.icon}</div>
            <div className={styles.statInfo}>
              <div className={styles.statVal} style={{ color: s.color }}>{s.val}</div>
              <div className={styles.statLbl}>{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className={styles.secTitle}>เมนูด่วน</h2>
      <div className={styles.quickGrid}>
        {[
          { icon: '📋', label: 'งานใหม่', sub: 'ดูออเดอร์ที่รอรับ', href: '/rider/jobs', color: '#e8f5e9', iconBg: '#2a6129' },
          { icon: '🛵', label: 'งานปัจจุบัน', sub: 'ออเดอร์ที่กำลังส่ง', href: '/rider/active', color: '#fff3e0', iconBg: '#e65100' },
          { icon: '📊', label: 'ประวัติ', sub: 'การส่งและรายได้', href: '/rider/history', color: '#e3f2fd', iconBg: '#1565c0' },
          { icon: '👤', label: 'โปรไฟล์', sub: 'ข้อมูลส่วนตัว', href: '/rider/profile', color: '#f3e5f5', iconBg: '#6a1b9a' },
        ].map((q, i) => (
          <div key={i} className={styles.quickCard} style={{ background: q.color }} onClick={() => router.push(q.href)}>
            <div className={styles.quickIconWrap} style={{ background: q.iconBg }}>
              <span className={styles.quickIcon}>{q.icon}</span>
            </div>
            <div className={styles.quickLabel}>{q.label}</div>
            <div className={styles.quickSub}>{q.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

