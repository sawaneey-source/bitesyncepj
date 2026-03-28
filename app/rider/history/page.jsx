'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { API_BASE } from '@/utils/api'

const PERIOD_TABS = ['วันนี้', '3 วันล่าสุด', '7 วันล่าสุด', '30 วันล่าสุด', 'ทั้งหมด']

function Chart({ pts = [] }) {
  // Use 7 zeros as default if pts is missing or not an array
  const data = Array.isArray(pts) && pts.length > 0 ? pts : [0, 0, 0, 0, 0, 0, 0]
  const W = 520, H = 100, P = 10
  const maxVal = Math.max(...data, 100)

  const points = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2)
    const y = H - P - ((v / maxVal) * (H - P * 2))
    return { x, y }
  })

  const pathD = `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x},${H - P} L ${points[0].x},${H - P} Z`

  return (
    <div style={{ height: 130, width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="rcg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a6129" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2a6129" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#rcg)" />
        <path d={pathD} fill="none" stroke="#2a6129" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2a6129" stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
    </div>
  )
}

export default function RiderHistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState([])
  const [period, setPeriod] = useState('วันนี้')
  const [statusTab, setStatusTab] = useState('all') // all, delivered, cancelled
  const [summary, setSummary] = useState({ deliveries: 0, earnings: 0, distance: 0, cancelled: 0, rating: 5.0 })
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [period])

  async function fetchHistory() {
    setLoading(true)
    setHistory([])
    setSummary({ deliveries: 0, earnings: 0, distance: 0, cancelled: 0, rating: 5.0, gross: 0 })
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id

      const res = await fetch(`${API_BASE}/rider/history.php?usrId=${uid}&period=${encodeURIComponent(period)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        setHistory(data.data)
        setSummary(data.summary)
        setChartData(data.chart || [])
      }
    } catch (e) {
      console.error("Fetch history error:", e)
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter(h => {
    if (statusTab === 'delivered') return h.status === 'delivered'
    if (statusTab === 'cancelled') return h.status === 'cancelled'
    return true
  })

  return (
    <div>
      <div className={styles.hdr}>
        <h1 className={styles.title}>ประวัติและผลงาน</h1>
      </div>

      {/* Period selector */}
      <div className={styles.periodTabs}>
        {PERIOD_TABS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`${styles.periodBtn} ${period === p ? styles.periodBtnOn : ''}`}>{p}</button>
        ))}
      </div>

      {/* Stats Dashboard - Shop Contrast Style */}
      <div className={styles.summGrid}>
        <div className={`${styles.summCard} ${styles.summBlue}`}>
          <div className={styles.summIcon}>💎</div>
          <div>
            <div className={styles.summVal}>฿{(summary.settledEarnings || 0).toLocaleString()}</div>
            <div className={styles.summLbl}>รายได้สุทธิ (โอนแล้ว)</div>
          </div>
        </div>
        <div className={`${styles.summCard} ${styles.summBlue}`}>
           <div className={styles.summIcon}>💸</div>
           <div>
             <div className={styles.summVal}>฿{(summary.gross || 0).toLocaleString()}</div>
             <div className={styles.summLbl}>ค่าจัดส่งรวม ({period})</div>
           </div>
        </div>
        <div className={`${styles.summCard} ${styles.summGreen}`}>
          <div className={styles.summIcon}>⌛</div>
          <div>
            <div className={styles.summVal}>฿{(summary.pendingEarnings || 0).toLocaleString()}</div>
            <div className={styles.summLbl}>รอยืนยันจ่าย (Pending)</div>
          </div>
        </div>
        <div className={`${styles.summCard} ${styles.summDark}`}>
          <div className={styles.summIcon}>📦</div>
          <div>
            <div className={styles.summVal}>{summary.deliveries}</div>
            <div className={styles.summLbl}>ออเดอร์สำเร็จ</div>
          </div>
        </div>
        <div className={`${styles.summCard} ${styles.summBlue}`}>
          <div className={styles.summIcon}>📍</div>
          <div>
            <div className={styles.summVal}>{summary.distance}</div>
            <div className={styles.summLbl}>ระยะทางรวม</div>
          </div>
        </div>
        <div className={`${styles.summCard} ${styles.summYellow}`}>
          <div className={styles.summIcon} style={{ background: 'rgba(240,196,25,0.2)', color: '#856404' }}>⭐</div>
          <div>
            <div className={`${styles.summVal} ${styles.summValDark}`}>{summary.rating ? parseFloat(summary.rating).toFixed(1) : '5.0'}</div>
            <div className={`${styles.summLbl} ${styles.summLblDark}`}>เรตติ้งของคุณ</div>
          </div>
        </div>
      </div>

      {/* Visual Chart Card */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>สถิติรายได้ (7 วันล่าสุด)</h3>
        <Chart pts={chartData} />
        <div className={styles.xLabels}>
          {['6 วันก่อน', '5 วันก่อน', '4 วันก่อน', '3 วันก่อน', '2 วันก่อน', 'เมื่อวาน', 'วันนี้'].map(l => (
            <span key={l} className={styles.chartX}>{l}</span>
          ))}
        </div>
      </div>

      {/* Status Filter tabs */}
      <div className={styles.statusTabs}>
        <button onClick={() => setStatusTab('all')} className={`${styles.sTab} ${statusTab === 'all' ? styles.sTabOn : ''}`}>งานทั้งหมด</button>
        <button onClick={() => setStatusTab('delivered')} className={`${styles.sTab} ${statusTab === 'delivered' ? styles.sTabOn : ''}`}>สำเร็จแล้ว</button>
        <button onClick={() => setStatusTab('cancelled')} className={`${styles.sTab} ${statusTab === 'cancelled' ? styles.sTabOn : ''}`}>ที่ยกเลิก</button>
      </div>

      {/* History List */}
      <div className={styles.listSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <h2 className={styles.listTitle} style={{ margin: 0 }}>
            {statusTab === 'delivered' ? 'รายการที่สำเร็จ' : statusTab === 'cancelled' ? 'รายการที่ยกเลิก' : 'รายการออเดอร์'}
          </h2>
          <span style={{ fontSize: '14px', color: '#666' }}>{filteredHistory.length} รายการ</span>
        </div>

        {loading ? (
          <div className={styles.loading}>กำลังดึงข้อมูล...</div>
        ) : (
          <div className={styles.list}>
            {filteredHistory.length === 0 ? (
              <div className={styles.empty}><span>📭</span><span>ไม่พบประวัติในช่วงเวลานี้</span></div>
            ) : filteredHistory.map(h => (
              <div key={h.id} className={styles.histCard}>
                <div className={styles.histLeft}>
                  <div className={`${styles.histStatusDot} ${h.status === 'delivered' ? styles.dotGreen : styles.dotRed}`} />
                  <div className={styles.histInfo}>
                    <div className={styles.histId}>{h.id} · {h.shopName}</div>
                    <div className={styles.histAddr}>📍 {h.custAddr}</div>
                    <div className={styles.histMeta}>
                      <span>{h.date}</span>
                      <span>·</span>
                      <span>{h.distance}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.histRight}>
                  <div className={`${styles.histFee} ${h.status === 'cancelled' ? styles.histFeeCancelled : ''}`}>
                    {h.status === 'delivered' ? `+${h.fee} ฿` : `฿${h.fee}`}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className={`${styles.histStatus} ${h.status === 'delivered' ? styles.statusGreen : styles.statusRed}`}>
                      {h.status === 'delivered' ? '✅ สำเร็จ' : '❌ ยกเลิก'}
                    </div>
                    {h.status === 'delivered' && (
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: h.settled ? '#e8f5e9' : '#fff3e0',
                        color: h.settled ? '#2a6129' : '#e65100',
                        border: `1px solid ${h.settled ? '#2a6129' : '#e65100'}`
                      }}>
                        {h.settled ? 'โอนเงินแล้ว' : 'รอยืนยันจ่าย'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

