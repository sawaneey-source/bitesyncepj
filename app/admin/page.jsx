'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u || JSON.parse(u).role !== 'admin') {
      // router.replace('/login')
      // return
    }
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('http://localhost/bitesync/api/admin/stats.php')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  if (loading) return <div>กำลังโหลด...</div>

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.body}>
        <h1 className={styles.title}>Dashboard ผู้ดูแลระบบ (Admin)</h1>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statLabel}>ออเดอร์ทั้งหมด</div>
            <div className={styles.statVal}>{stats?.totalOrders || 0}</div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#4caf50'}}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statLabel}>ยอดขายรวม (อาหาร)</div>
            <div className={styles.statVal} style={{color:'#2e7d32'}}>{Number(stats?.totalFoodPrice || 0).toLocaleString()} ฿</div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#f0c419'}}>
            <div className={styles.statIcon}>🛵</div>
            <div className={styles.statLabel}>จ่ายให้ไรเดอร์</div>
            <div className={styles.statVal} style={{color:'#f9a825'}}>{Number(stats?.totalRiderFee || 0).toLocaleString()} ฿</div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#2196f3', background:'#e3f2fd'}}>
            <div className={styles.statIcon}>💎</div>
            <div className={styles.statLabel}>กำไรกองกลาง (Admin)</div>
            <div className={styles.statVal} style={{color:'#1565c0'}}>{Number(stats?.totalAdminProfit || 0).toLocaleString()} ฿</div>
          </div>
        </div>

        <div className={styles.detailsBox}>
          <h2 className={styles.secTitle}>รายละเอียดการหัก GP (รายได้ร้านค้า)</h2>
          <div className={styles.gpRow}>
            <span>ยอดขายร้านค้าทั้งหมด:</span>
            <strong>{Number(stats?.totalFoodPrice || 0).toLocaleString()} ฿</strong>
          </div>
          <div className={styles.gpRow}>
            <span>หัก GP (30%):</span>
            <span style={{color:'#d32f2f'}}> - {Number(stats?.totalGP || 0).toLocaleString()} ฿</span>
          </div>
          <div className={styles.divider}/>
          <div className={styles.gpRow} style={{fontSize:'18px', fontWeight:'800'}}>
            <span>ร้านค้าได้รับจริง:</span>
            <span style={{color:'#2a6129'}}>{Number((stats?.totalFoodPrice || 0) - (stats?.totalGP || 0)).toLocaleString()} ฿</span>
          </div>
        </div>
      </div>
    </div>
  )
}
