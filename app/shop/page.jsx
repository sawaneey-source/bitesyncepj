'use client'
import { useState } from 'react'
import styles from './page.module.css'

const PERIODS = ['Today\'s Sale','Last 3 Days','Last 7 Days','Last 30 Days','Custom']

const ORDERS = [
  { id:'#1026', date:'18 Apr 2025', customer:'Alex Johnson',    total:160, status:'In Progress' },
  { id:'#1027', date:'18 Apr 2025', customer:'Daniel Williams', total:120, status:'Pending' },
  { id:'#1028', date:'18 Apr 2025', customer:'Michael Brown',   total:240, status:'Complete' },
  { id:'#1029', date:'18 Apr 2025', customer:'Sophia Davis',    total:150, status:'Complete' },
  { id:'#1030', date:'18 Apr 2025', customer:'Emily Wilson',    total:400, status:'Complete' },
]

const S = {
  'In Progress': { bg:'#fff3e0', color:'#e65100' },
  'Pending':     { bg:'#fff9c4', color:'#856404' },
  'Complete':    { bg:'#e8f5e9', color:'#2a6129' },
}

function Chart() {
  const pts = [700,1100,850,1500,1000,1800,1300,2100,1600,2500,1900,2700]
  const W=520,H=100,P=8
  const max=Math.max(...pts),min=Math.min(...pts)
  const cx=i=>P+(i/(pts.length-1))*(W-P*2)
  const cy=v=>P+(1-(v-min)/(max-min))*(H-P*2)
  const path=pts.map((v,i)=>`${i===0?'M':'L'}${cx(i)},${cy(v)}`).join(' ')
  const area=`${path}L${cx(pts.length-1)},${H-P}L${cx(0)},${H-P}Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:120}}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a6129" stopOpacity=".18"/>
        <stop offset="100%" stopColor="#2a6129" stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill="url(#cg)"/>
      <path d={path} fill="none" stroke="#2a6129" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((v,i)=><circle key={i} cx={cx(i)} cy={cy(v)} r="3" fill="#2a6129"/>)}
    </svg>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('Today\'s Sale')
  return (
    <div>
      <h1 className={styles.title}>Restaurant Dashboard</h1>

      <div className={styles.periodRow}>
        {PERIODS.map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} className={`${styles.pBtn} ${period===p?styles.pBtnOn:''}`}>{p}</button>
        ))}
      </div>

      <div className={styles.statsRow}>
        <div className={`${styles.stat} ${styles.statGreen}`}>
          <div className={styles.statIco}>💰</div>
          <div><div className={styles.statNum}>5,400 THB</div><div className={styles.statLbl}>Today Sales</div></div>
        </div>
        <div className={`${styles.stat} ${styles.statDark}`}>
          <div className={styles.statIco}>📦</div>
          <div><div className={styles.statNum}>38</div><div className={styles.statLbl}>Today Orders</div></div>
        </div>
        <div className={`${styles.stat} ${styles.statWarn}`}>
          <div className={styles.statIco}>🔔</div>
          <div><div className={`${styles.statNum} ${styles.statNumDark}`}>6</div><div className={`${styles.statLbl} ${styles.statLblDark}`}>Pending Orders</div></div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><h2 className={styles.cardTitle}>Sales Overview</h2>
          <select className={styles.sel}><option>Sales ▼</option></select>
        </div>
        <Chart/>
        <div className={styles.xLabels}>
          {['Last 30 days','2 weeks','1 weeks','3 months','6 months','1 year','Latest'].map(l=>(
            <span key={l} className={styles.xLabel}>{l}</span>
          ))}
        </div>
      </div>

      <div className={styles.card} style={{marginTop:18}}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Recent Orders</h2>
          <a href="/shop/orders" className={styles.viewAll}>View all</a>
        </div>
        <table className={styles.tbl}>
          <thead><tr>{['Order ID ↕','Date','Customer','Total','Status'].map(h=>(
            <th key={h} className={styles.th}>{h}</th>
          ))}</tr></thead>
          <tbody>{ORDERS.map((o,i)=>{
            const s=S[o.status]||{bg:'#f4f6f4',color:'#6b7280'}
            return (
              <tr key={i} className={styles.tr}>
                <td className={`${styles.td} ${styles.tdId}`}>{o.id}</td>
                <td className={`${styles.td} ${styles.tdMuted}`}>{o.date}</td>
                <td className={styles.td}>{o.customer}</td>
                <td className={`${styles.td} ${styles.tdBold}`}>{o.total} THB</td>
                <td className={styles.td}><span className={styles.badge} style={{background:s.bg,color:s.color}}>{o.status}</span></td>
              </tr>
            )
          })}</tbody>
        </table>
        <div className={styles.pages}>
          <span className={styles.pagesLbl}>Pages</span>
          {[1,2,3].map(p=><button key={p} className={`${styles.pageBtn} ${p===1?styles.pageBtnOn:''}`}>{p}</button>)}
          <span className={styles.pagesLbl}>→</span>
        </div>
      </div>
    </div>
  )
}
