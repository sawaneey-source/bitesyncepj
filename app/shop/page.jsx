'use client'
import { useState } from 'react'
import styles from './page.module.css'

const PERIODS = [
  { label: 'ยอดขายวันนี้', key: 'today' },
  { label: '3 วันล่าสุด', key: '3days' },
  { label: '7 วันล่าสุด', key: '7days' },
  { label: '30 วันล่าสุด', key: '30days' },
  { label: 'ยอดขายรวม', key: 'all' }
]

const S = {
  'Preparing': { bg: '#fff3e0', color: '#e65100' },
  'Pending': { bg: '#fff9c4', color: '#856404' },
  'Complete': { bg: '#e8f5e9', color: '#2a6129' },
  'Delivering': { bg: '#e3f2fd', color: '#1565c0' },
  'Ready': { bg: '#e8f5e9', color: '#2a6129' },
  'Cancelled': { bg: '#fce4ec', color: '#b71c1c' },
}

function Chart({ pts = [] }) {
  if (!pts || pts.length === 0) pts = [0, 0, 0, 0, 0, 0, 0]
  const W = 520, H = 100, P = 8
  const max = Math.max(...pts, 100), min = Math.min(...pts, 0)
  const cx = i => P + (i / (pts.length - 1)) * (W - P * 2)
  const cy = v => P + (1 - (v - min) / (max - min + 1)) * (H - P * 2)
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i)},${cy(v)}`).join(' ')
  const area = `${path}L${cx(pts.length - 1)},${H - P}L${cx(0)},${H - P}Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120 }}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a6129" stopOpacity=".18" />
        <stop offset="100%" stopColor="#2a6129" stopOpacity="0" />
      </linearGradient></defs>
      <path d={area} fill="url(#cg)" />
      <path d={path} fill="none" stroke="#2a6129" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((v, i) => <circle key={i} cx={cx(i)} cy={cy(v)} r="3" fill="#2a6129" />)}
    </svg>
  )
}

import { useEffect } from 'react'

export default function DashboardPage() {
  const [period, setPeriod] = useState('today')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [period])

  async function fetchStats() {
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id
      const res = await fetch(`http://localhost/bitesync/api/shop/stats.php?usrId=${uid}&period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (e) {
      console.error("Fetch stats error:", e)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) return <div className={styles.loading}>กำลังโหลดข้อมูลภาพรวม...</div>

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>ภาพรวมร้านค้า</h1>
        <div className={styles.userGreeting}>
          <div className={styles.userAvatar}>
            {user?.image ? (
              <img src={`http://localhost/bitesync/public${user.image}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '👤'
            )}
          </div>
          สวัสดี, {user?.name || 'ร้านค้า'} 👋
        </div>
      </div>

      <div className={styles.periodRow}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`${styles.pBtn} ${period === p.key ? styles.pBtnOn : ''}`}>{p.label}</button>
        ))}
      </div>

      <div className={styles.statsRow}>
        <div className={`${styles.stat} ${styles.statGreen}`}>
          <div className={styles.statIco}>💰</div>
          <div><div className={styles.statNum}>{stats.totalSales.toLocaleString()} ฿</div><div className={styles.statLbl}>{PERIODS.find(p => p.key === period)?.label}</div></div>
        </div>
        <div className={`${styles.stat} ${styles.statDark}`}>
          <div className={styles.statIco}>📦</div>
          <div><div className={styles.statNum}>{stats.totalOrders}</div><div className={styles.statLbl}>ออเดอร์ทั้งหมด ({PERIODS.find(p => p.key === period)?.label})</div></div>
        </div>
        <div className={`${styles.stat} ${styles.statWarn}`}>
          <div className={styles.statIco}>🔔</div>
          <div><div className={`${styles.statNum} ${styles.statNumDark}`}>{stats.pendingOrdersCount}</div><div className={`${styles.statLbl} ${styles.statLblDark}`}>ออเดอร์รอยืนยัน</div></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><h2 className={styles.cardTitle}>กราฟยอดขาย (7 วันล่าสุด)</h2>
          <select className={styles.sel}><option>ยอดขาย ▼</option></select>
        </div>
        <Chart pts={stats.chart} />
        <div className={styles.xLabels}>
          {['6 วันก่อน', '5 วันก่อน', '4 วันก่อน', '3 วันก่อน', '2 วันก่อน', 'เมื่อวาน', 'วันนี้'].map(l => (
            <span key={l} className={styles.xLabel}>{l}</span>
          ))}
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>ออเดอร์ล่าสุด</h2>
          <a href="/shop/orders" className={styles.viewAll}>ดูทั้งหมด</a>
        </div>
        <table className={styles.tbl}>
          <thead><tr>{['หมายเลข ↕', 'วันที่', 'ลูกค้า', 'ยอดรวม', 'สถานะ'].map(h => (
            <th key={h} className={styles.th}>{h}</th>
          ))}</tr></thead>
          <tbody>{stats.recentOrders.map((o, i) => {
            const s = S[o.status] || { bg: '#f4f6f4', color: '#6b7280' }
            return (
              <tr key={i} className={styles.tr}>
                <td className={`${styles.td} ${styles.tdId}`}>{o.id}</td>
                <td className={`${styles.td} ${styles.tdMuted}`}>{o.date}</td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '6px', background: '#e8f5e9', border: '1px solid #dde8dd', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {o.customerImage ? (
                        <img src={o.customerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 14 }}>👤</span>
                      )}
                    </div>
                    <span>{o.customer}</span>
                  </div>
                </td>
                <td className={`${styles.td} ${styles.tdBold}`}>{o.total.toLocaleString()} ฿</td>
                <td className={styles.td}><span className={styles.badge} style={{ background: s.bg, color: s.color }}>{
                  o.status === 'Pending' ? 'รอยืนยัน' : o.status === 'Complete' ? 'สำเร็จ' : o.status
                }</span></td>
              </tr>
            )
          })}</tbody>
        </table>
        {stats.recentOrders.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>ยังไม่มีออเดอร์ในวันนี้</div>
        )}
      </div>
    </div>
  )
}

