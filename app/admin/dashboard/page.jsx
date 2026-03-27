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
      <Navbar hideLinks />
      <div className={styles.body}>
        <div className={styles.header}>
          <h1 className={styles.title}>แดชบอร์ดผู้ดูแลระบบ (Admin)</h1>
          <p className={styles.subtitle}>ยินดีต้อนรับกลับ! นี่คือสรุปภาพรวมของระบบ BiteSync</p>
        </div>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statLabel}>ออเดอร์ทั้งหมด</div>
            <div className={styles.statVal}>{stats?.totalOrders || 0}</div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#4caf50'}}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statLabel}>ยอดขายอาหารทั้งหมด (Gross)</div>
            <div className={styles.statVal} style={{color:'#2e7d32'}}>{Number(stats?.totalFoodPrice || 0).toLocaleString()} ฿</div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#f0c419'}}>
            <div className={styles.statIcon}>🛵</div>
            <div className={styles.statLabel}>ค่าจัดส่งทั้งหมด (Gross)</div>
            <div className={styles.statVal} style={{color:'#f9a825'}}>{Number(stats?.totalDelFee || 0).toLocaleString()} ฿</div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#2196f3', background:'#e3f2fd'}}>
            <div className={styles.statIcon}>💎</div>
            <div className={styles.statLabel}>กำไรสะสมของระบบ (Admin)</div>
            <div className={styles.statVal} style={{color:'#1565c0'}}>{Number(stats?.totalAdminProfit || 0).toLocaleString()} ฿</div>
          </div>
        </div>

        <div className={styles.statsGrid} style={{marginTop: 20}}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statLabel}>ลูกค้าทั้งหมด</div>
            <div className={styles.statVal}>{stats?.customerCount || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏪</div>
            <div className={styles.statLabel}>ร้านค้าทั้งหมด</div>
            <div className={styles.statVal}>{stats?.shopCount || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🛵</div>
            <div className={styles.statLabel}>ไรเดอร์ทั้งหมด</div>
            <div className={styles.statVal}>{stats?.riderCount || 0}</div>
          </div>
        </div>

        <div className={styles.actionRow} style={{marginTop: 30, marginBottom: 30, gap: '20px'}}>
          <button className={styles.actionBtn} onClick={() => router.push('/admin/settlement')}>
            💰 การเคลียร์ยอดเงิน (Settlement)
          </button>
          <button className={styles.actionBtn} style={{borderColor: '#1e293b', color: '#1e293b'}} onClick={() => router.push('/admin/data')}>
            📊 ตัวสำรวจข้อมูล (Data Explorer)
          </button>
        </div>

        <div className={styles.detailsBox}>
          <h2 className={styles.secTitle}>💰 รายละเอียดส่วนแบ่งรายได้ร้านค้า (Shop Revenue)</h2>
          <div className={styles.gpRow}>
            <span>ยอดขายอาหารรวมทั้งหมด:</span>
            <strong>{Number(stats?.totalFoodPrice || 0).toLocaleString()} ฿</strong>
          </div>
          <div className={styles.gpRow}>
            <span>ร้านค้าได้รับเงินสุทธิ (75%):</span>
            <span style={{color:'#2a6129', fontWeight:'800'}}>฿{Number((stats?.totalFoodPrice || 0) - (stats?.totalGP || 0)).toLocaleString()}</span>
          </div>
          <div className={styles.divider}/>
          <div className={styles.gpRow} style={{fontSize: '14px', color: '#64748b'}}>
             โอนส่วนแบ่ง GP (25%) เข้าระบบแอดมิน: ฿{Number(stats?.totalGP || 0).toLocaleString()}
          </div>
        </div>

        <div className={styles.detailsBox} style={{marginTop: 20}}>
          <h2 className={styles.secTitle}>🛵 รายละเอียดส่วนแบ่งค่าจัดส่ง (Delivery Revenue)</h2>
          <div className={styles.gpRow}>
            <span>ค่าจัดส่งรวมทั้งหมด:</span>
            <strong>{Number(stats?.totalDelFee || 0).toLocaleString()} ฿</strong>
          </div>
          <div className={styles.gpRow}>
            <span>ส่วนแบ่งไรเดอร์ได้รับสุทธิ (80%):</span>
            <span style={{color:'#f9a825', fontWeight:'800'}}>฿{Number(stats?.totalRiderFee || 0).toLocaleString()} ฿</span>
          </div>
          <div className={styles.divider}/>
          <div className={styles.gpRow} style={{fontSize: '14px', color: '#64748b'}}>
             โอนส่วนแบ่ง 20% เข้าระบบแอดมิน: ฿{Number((stats?.totalDelFee || 0) - (stats?.totalRiderFee || 0)).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

