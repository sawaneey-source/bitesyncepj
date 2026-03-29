'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

function Chart({ pts = [] }) {
  const data = Array.isArray(pts) && pts.length > 0 ? pts : [0, 0, 0, 0, 0, 0, 0]
  const W = 520, H = 100, P = 10
  const maxVal = Math.max(...data, 10)

  const points = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2)
    const y = H - P - ((v / maxVal) * (H - P * 2))
    return { x, y }
  })

  const pathD = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x},${H - P} L ${points[0].x},${H - P} Z`

  return (
    <div style={{ height: 160, width: '100%', position: 'relative', background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #eee' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="adminG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a6129" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2a6129" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#adminG)" />
        <path d={pathD} fill="none" stroke="#2a6129" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2a6129" stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
    </div>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')

  const PERIOD_TABS = [
    { id: 'today', label: 'วันนี้' },
    { id: '3days', label: '3 วัน' },
    { id: '7days', label: '7 วัน' },
    { id: '30days', label: '30 วัน' },
    { id: 'all', label: 'ทั้งหมด' }
  ]

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u || JSON.parse(u).role !== 'admin') {
      // router.replace('/login')
      // return
    }
    fetchStats()
  }, [period])

  async function fetchStats() {
    try {
      const res = await fetch(`http://localhost/bitesync/api/admin/stats.php?period=${period}`)
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

        {/* Period Selector */}
        <div style={{display:'flex', gap:'10px', marginBottom:'25px'}}>
          {PERIOD_TABS.map(t => (
            <button 
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={styles.actionBtn}
              style={{
                padding: '8px 20px',
                fontSize: '14px',
                background: period === t.id ? '#2a6129' : 'white',
                color: period === t.id ? 'white' : '#2a6129'
              }}
            >
              {t.label}
            </button>
          ))}
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
            <div className={styles.statLabel}>กำไรสุทธิที่ได้รับจริง (Settled)</div>
            <div className={styles.statVal} style={{color:'#1565c0'}}>{Number(stats?.settledAdminProfit || 0).toLocaleString()} ฿</div>
            <div style={{fontSize: '12px', color: '#64748b', marginTop: '5px'}}>
              รอการโอน (Pending): {Number((stats?.totalAdminProfit || 0) - (stats?.settledAdminProfit || 0)).toLocaleString()} ฿
            </div>
          </div>
          <div className={styles.statCard} style={{borderColor:'#7c4dff', background:'#f3e5f5'}}>
            <div className={styles.statIcon}>🔌</div>
            <div className={styles.statLabel}>ยอดค่าธรรมเนียมระบบ (Service Fee)</div>
            <div className={styles.statVal} style={{color:'#6200ea'}}>{Number(stats?.totalPlatformFee || 0).toLocaleString()} ฿</div>
            <div style={{fontSize: '11px', color: '#7b1fa2', marginTop: '5px'}}>
               จาก {stats?.totalOrders || 0} ออเดอร์ (12 ฿/ออเดอร์)
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div style={{marginBottom: 40}}>
          <h2 className={styles.secTitle} style={{marginBottom: 15}}>📈 สถิติรายได้ค่าธรรมเนียม (7 วันล่าสุด)</h2>
          <Chart pts={stats?.chartPlatformFee} />
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

        <div className={styles.detailsBox} style={{marginTop: 20, borderColor: '#6200ea', borderWidth: '1px', borderStyle: 'solid'}}>
          <h2 className={styles.secTitle} style={{color: '#6200ea'}}>🔌 รายละเอียดค่าธรรมเนียมระบบ (Platform Service Fee)</h2>
          <div className={styles.gpRow}>
            <span>อัตราค่าบริการต่อออเดอร์:</span>
            <strong>12.00 ฿</strong>
          </div>
          <div className={styles.gpRow}>
            <span>จำนวนออเดอร์ทั้งหมด ({period}):</span>
            <strong>{stats?.totalOrders || 0} รายการ</strong>
          </div>
          <div className={styles.divider}/>
          <div className={styles.gpRow}>
            <span>รายได้ค่าธรรมเนียมสุทธิ:</span>
            <span style={{color:'#6200ea', fontWeight:'800', fontSize: '20px'}}>฿{Number(stats?.totalPlatformFee || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

