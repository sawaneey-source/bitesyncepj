'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function RiderDashboard() {
  const router = useRouter()
  const [online, setOnline]   = useState(false)
  const [user, setUser]       = useState(null)
  const [todayStats, setStats] = useState({ deliveries:0, earnings:0, distance:0, rating:0.0 })
  const [activeJob, setActiveJob] = useState(null)

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('bs_user') || '{}')
    setUser(u)
    setOnline(localStorage.getItem('rider_online') === 'true')
    fetchStats()
    fetchActiveJob()
  }, [])

  async function fetchStats() {
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id

      const res  = await fetch(`http://localhost/bitesync/api/rider/stats.php?usrId=${uid}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch {}
  }

  async function fetchActiveJob() {
    try {
      const uStr = localStorage.getItem('bs_user')
      let uid = 0
      if (uStr) { try { uid = JSON.parse(uStr).id } catch(e){} }

      const res  = await fetch(`http://localhost/bitesync/api/rider/active-job.php?usrId=${uid}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success && data.data) {
          setActiveJob(data.data)
      } else {
          setActiveJob(null)
      }
    } catch {}
  }

  function toggleOnline() {
    const next = !online
    setOnline(next)
    localStorage.setItem('rider_online', String(next))
    fetch('http://localhost/bitesync/api/rider/status.php', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('bs_token')}` },
      body: JSON.stringify({ status: next ? 'Online' : 'Offline' })
    }).catch(() => {})
  }

  return (
    <div>
      <h1 className={styles.title}>สวัสดี, {user?.name || 'ไรเดอร์'} 👋</h1>
      {activeJob && (
        <div className={styles.activeAlert} onClick={() => router.push('/rider/active')}>
          <span className={styles.activeAlertIcon}>🔥</span>
          <div className={styles.activeAlertInfo}>
            <div className={styles.activeAlertTitle}>มีงานที่กำลังส่งอยู่!</div>
            <div className={styles.activeAlertSub}>Order {activeJob.id} · {activeJob.shopName}</div>
          </div>
          <span className={styles.activeAlertArrow}>→</span>
        </div>
      )}

      {/* Today stats */}
      <h2 className={styles.secTitle}>สถิติวันนี้</h2>
      <div className={styles.statsGrid}>
        {[
          { icon:'📦', val:todayStats.deliveries, lbl:'ส่งสำเร็จ', unit:'ออเดอร์', color:'#2a6129' },
          { icon:'💰', val:`฿${todayStats.earnings}`, lbl:'รายได้', unit:'บาท', color:'#e65100' },
          { icon:'📍', val:`${todayStats.distance}`, lbl:'ระยะทาง', unit:'กม.', color:'#1565c0' },
          { icon:'⭐', val:todayStats.rating, lbl:'คะแนน', unit:'/5.0', color:'#856404' },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statVal} style={{ color:s.color }}>{s.val}</div>
            <div className={styles.statLbl}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className={styles.secTitle}>เมนูด่วน</h2>
      <div className={styles.quickGrid}>
        {[
          { icon:'📋', label:'งานใหม่', sub:'ดูออเดอร์ที่รอรับ', href:'/rider/jobs', color:'#e8f5e9', iconBg:'#2a6129' },
          { icon:'🛵', label:'งานปัจจุบัน', sub:'ออเดอร์ที่กำลังส่ง', href:'/rider/active', color:'#fff3e0', iconBg:'#e65100' },
          { icon:'📊', label:'ประวัติ', sub:'การส่งและรายได้', href:'/rider/history', color:'#e3f2fd', iconBg:'#1565c0' },
          { icon:'👤', label:'โปรไฟล์', sub:'ข้อมูลส่วนตัว', href:'/rider/profile', color:'#f3e5f5', iconBg:'#6a1b9a' },
        ].map((q, i) => (
          <div key={i} className={styles.quickCard} style={{ background:q.color }} onClick={() => router.push(q.href)}>
            <div className={styles.quickIconWrap} style={{ background:q.iconBg }}>
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
