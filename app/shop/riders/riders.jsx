'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const MOCK_RIDERS = [
  { id:1, name:'อาร์ม สมใจ',    phone:'081-234-5678', status:'Busy',    vehicle:'Honda PCX', plate:'กข-1234', currentOrder:'#1026', avatar:'🛵', deliveries:12, rating:4.8 },
  { id:2, name:'นิว ใจดี',      phone:'082-345-6789', status:'Online',   vehicle:'Yamaha NMAX',plate:'ขค-5678', currentOrder:null,    avatar:'🛵', deliveries:8,  rating:4.6 },
  { id:3, name:'เจม รักงาน',    phone:'083-456-7890', status:'Offline',  vehicle:'Honda Click', plate:'คง-9012', currentOrder:null,    avatar:'🛵', deliveries:20, rating:4.9 },
  { id:4, name:'โบว์ สุขใจ',    phone:'084-567-8901', status:'Busy',    vehicle:'PCX 150',     plate:'งจ-3456', currentOrder:'#1025', avatar:'🛵', deliveries:5,  rating:4.5 },
]

const STATUS_STYLE = {
  'Online':  { bg:'#e8f5e9', color:'#2a6129', dot:'#4caf50' },
  'Busy':    { bg:'#fff3e0', color:'#e65100', dot:'#ff6d00' },
  'Offline': { bg:'#f4f6f4', color:'#6b7280', dot:'#bbb'    },
}

export default function RidersPage() {
  const [riders, setRiders]   = useState(MOCK_RIDERS)
  const [filter, setFilter]   = useState('All')
  const [openId, setOpenId]   = useState(null)

  useEffect(() => { fetchRiders() }, [])

  async function fetchRiders() {
    try {
      const res  = await fetch('http://localhost/bitesync/api/shop/riders.php', {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) setRiders(data.data)
    } catch {}
  }

  const counts = {
    All:     riders.length,
    Online:  riders.filter(r => r.status === 'Online').length,
    Busy:    riders.filter(r => r.status === 'Busy').length,
    Offline: riders.filter(r => r.status === 'Offline').length,
  }

  const filtered = filter === 'All' ? riders : riders.filter(r => r.status === filter)

  return (
    <div>
      <div className={styles.hdr}>
        <div>
          <h1 className={styles.title}>Riders</h1>
          <p className={styles.sub}>ไรเดอร์ที่กำลังส่งออเดอร์ของร้าน</p>
        </div>
        <button onClick={fetchRiders} className={styles.refreshBtn}>🔄 Refresh</button>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryGrid}>
        {[
          { label:'ทั้งหมด',    val:counts.All,     icon:'🛵', color:'#374137', bg:'#fff' },
          { label:'กำลังส่ง',  val:counts.Busy,    icon:'🔥', color:'#e65100', bg:'#fff3e0' },
          { label:'ว่าง',      val:counts.Online,  icon:'✅', color:'#2a6129', bg:'#e8f5e9' },
          { label:'ออฟไลน์',  val:counts.Offline, icon:'💤', color:'#6b7280', bg:'#f4f6f4' },
        ].map(s => (
          <div key={s.label} className={styles.summaryCard} style={{ background: s.bg }}>
            <span className={styles.summaryIcon}>{s.icon}</span>
            <div>
              <div className={styles.summaryVal} style={{ color: s.color }}>{s.val}</div>
              <div className={styles.summaryLbl}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className={styles.tabs}>
        {['All','Busy','Online','Offline'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`${styles.tab} ${filter === t ? styles.tabOn : ''}`}>
            {t === 'All' ? 'ทั้งหมด' : t === 'Busy' ? '🔥 กำลังส่ง' : t === 'Online' ? '✅ ว่าง' : '💤 ออฟไลน์'}
            <span className={`${styles.cnt} ${filter === t ? styles.cntOn : ''}`}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Rider list */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}><span>🛵</span><span>ไม่มีไรเดอร์ในสถานะนี้</span></div>
        ) : filtered.map(r => {
          const ss   = STATUS_STYLE[r.status]
          const open = openId === r.id
          return (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardHead} onClick={() => setOpenId(open ? null : r.id)}>

                {/* Avatar */}
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>{r.name[0]}</div>
                  <span className={styles.avatarDot} style={{ background: ss.dot }}/>
                </div>

                {/* Info */}
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.rName}>{r.name}</span>
                    <span className={styles.sBadge} style={{ background: ss.bg, color: ss.color }}>
                      <span className={styles.sDot} style={{ background: ss.dot }}/>
                      {r.status}
                    </span>
                  </div>
                  <div className={styles.rPhone}>📱 {r.phone}</div>
                  <div className={styles.rVehicle}>🛵 {r.vehicle} · {r.plate}</div>
                </div>

                {/* Stats */}
                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <span className={styles.statVal}>⭐ {r.rating}</span>
                    <span className={styles.statLbl}>Rating</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statVal}>📦 {r.deliveries}</span>
                    <span className={styles.statLbl}>วันนี้</span>
                  </div>
                  <span className={styles.toggle}>{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {open && (
                <div className={styles.detail}>
                  {r.currentOrder ? (
                    <div className={styles.activeOrder}>
                      <div className={styles.activeOrderTitle}>🔥 กำลังส่งออเดอร์</div>
                      <div className={styles.activeOrderId}>{r.currentOrder}</div>
                      <div className={styles.orderStatus}>
                        <div className={styles.statusSteps}>
                          {['รับออเดอร์','เตรียมอาหาร','ไรเดอร์รับ','กำลังส่ง','ส่งแล้ว'].map((s, i) => (
                            <div key={s} className={styles.step}>
                              <div className={`${styles.stepDot} ${i <= 2 ? styles.stepDone : ''}`}/>
                              <span className={styles.stepLbl}>{s}</span>
                              {i < 4 && <div className={`${styles.stepLine} ${i < 2 ? styles.stepLineDone : ''}`}/>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noOrder}>
                      {r.status === 'Online'
                        ? '✅ ว่าง พร้อมรับงาน'
                        : '💤 ออฟไลน์อยู่'}
                    </div>
                  )}
                  <div className={styles.detailStats}>
                    <div className={styles.dStat}><span>📦</span><span>ส่งวันนี้ <strong>{r.deliveries} ออเดอร์</strong></span></div>
                    <div className={styles.dStat}><span>⭐</span><span>คะแนน <strong>{r.rating}/5.0</strong></span></div>
                    <div className={styles.dStat}><span>🛵</span><span>{r.vehicle} <strong>{r.plate}</strong></span></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
