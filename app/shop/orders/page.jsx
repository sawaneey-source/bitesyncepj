'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const TABS = ['All','Pending','Preparing','Ready','Delivering','Completed','Cancelled']
const SS = {
  'Pending':    {bg:'#fff9c4',color:'#856404',dot:'#f0c419'},
  'Preparing':  {bg:'#fff3e0',color:'#e65100',dot:'#ff6d00'},
  'Ready':      {bg:'#e8f5e9',color:'#2a6129',dot:'#4caf50'},
  'Delivering': {bg:'#e3f2fd',color:'#1565c0',dot:'#1e88e5'},
  'Completed':  {bg:'#ede7f6',color:'#6a1b9a',dot:'#9c27b0'},
  'Cancelled':  {bg:'#fce4ec',color:'#b71c1c',dot:'#e53935'},
}
const NEXT = {
  'Pending':    {lbl:'Confirm Order',  next:'Preparing',  color:'#2a6129'},
  'Preparing':  {lbl:'Mark Ready',     next:'Ready',      color:'#1565c0'},
  'Ready':      {lbl:'Hand to Rider',  next:'Delivering', color:'#e65100'},
  'Delivering': {lbl:'Mark Delivered', next:'Completed',  color:'#6a1b9a'},
}
const MOCK = [
  {OdrId:'#1025',customer:'สมชาย',time:'5 min ago',status:'Pending',   total:145,items:'1x ส้มตำ, 2x ข้าวเหนียว',address:'123 ถ.กาญจนวนิช',phone:'081-234-5678',img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=100&q=70'},
  {OdrId:'#1026',customer:'สมศรี', time:'12 min ago',status:'Preparing',total:280,items:'2x เค้กช็อก, 1x ชาไทย',  address:'56/2 ถ.เพชรเกษม',  phone:'082-345-6789',img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=100&q=70'},
  {OdrId:'#1027',customer:'สมหมาย',time:'1 hr ago', status:'Completed', total:95, items:'1x วาฟเฟิล, 1x กาแฟ',    address:'8 ม.5 ต.คลองหอยโข่ง',phone:'083-456-7890',img:'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=100&q=70'},
]

export default function OrdersPage() {
  const [orders, setOrders] = useState(MOCK)
  const [tab, setTab]       = useState('All')
  const [openId, setOpenId] = useState(null)
  const [toast, setToast]   = useState(null)

  // useEffect(() => { fetchOrders() }, [])
  function toast_(msg,type='ok'){ setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function fetchOrders() {
    try {
      const res  = await fetch('http://localhost/bitesync/api/shop/orders.php',{headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}})
      const data = await res.json()
      if(data.success) setOrders(data.data)
    } catch {}
  }

  async function upStatus(id,next) {
    try { await fetch(`http://localhost/bitesync/api/shop/orders.php?id=${id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('bs_token')}`},body:JSON.stringify({status:next})}) } catch {}
    setOrders(p=>p.map(o=>o.OdrId===id?{...o,status:next}:o)); toast_(`Updated to "${next}"`)
  }

  async function cancel(id) {
    if(!confirm('Cancel this order?')) return
    setOrders(p=>p.map(o=>o.OdrId===id?{...o,status:'Cancelled'}:o)); toast_('Order cancelled','err')
  }

  const counts  = TABS.reduce((a,t)=>{a[t]=t==='All'?orders.length:orders.filter(o=>o.status===t).length;return a},{})
  const filtered= tab==='All'?orders:orders.filter(o=>o.status===tab)

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'❌':'✅'} {toast.msg}</div>}

      <div className={styles.hdr}>
        <h1 className={styles.title}>Orders</h1>
        <button onClick={fetchOrders} className={styles.refreshBtn}>
          <i className="fa-solid fa-rotate" /> รีเฟรช
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`${styles.tab} ${tab===t?styles.tabOn:''}`}>
            {t}
            {counts[t]>0&&<span className={`${styles.cnt} ${tab===t?styles.cntOn:''}`}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length===0?(
          <div className={styles.empty}><span>📭</span><span>No orders here</span></div>
        ):filtered.map(o=>{
          const ss=SS[o.status]||{bg:'#f4f6f4',color:'#6b7280',dot:'#aaa'}
          const nx=NEXT[o.status]
          const open=openId===o.OdrId
          return (
            <div key={o.OdrId} className={styles.card}>
              <div className={styles.cardHead} onClick={()=>setOpenId(open?null:o.OdrId)}>
                <img src={o.img} className={styles.cardImg}/>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTopRow}>
                    <span className={styles.ordId}>{o.OdrId}</span>
                    <span className={styles.sBadge} style={{background:ss.bg,color:ss.color}}>
                      <span className={styles.sDot} style={{background:ss.dot}}/>
                      {o.status}
                    </span>
                    <span className={styles.oTime}>{o.time}</span>
                  </div>
                  <div className={styles.oCust}>👤 {o.customer}</div>
                  <div className={styles.oItems}>{o.items}</div>
                </div>
                <div className={styles.cardRight}>
                  <div className={styles.oTotal}>{o.total} THB</div>
                  <div className={styles.oToggle}>{open?'▲':'▼'}</div>
                </div>
              </div>
              {open&&(
                <div className={styles.detail}>
                  <div className={styles.dGrid}>
                    <div><div className={styles.dLbl}>📍 Address</div><div className={styles.dVal}>{o.address}</div></div>
                    <div><div className={styles.dLbl}>📱 Phone</div><div className={styles.dVal}>{o.phone}</div></div>
                  </div>
                  <div className={styles.actRow}>
                    {o.status!=='Completed'&&o.status!=='Cancelled'&&(
                      <button onClick={()=>cancel(o.OdrId)} className={styles.btnCancel}>❌ Cancel</button>
                    )}
                    {nx&&<button onClick={()=>upStatus(o.OdrId,nx.next)} className={styles.btnNext} style={{background:nx.color}}>✅ {nx.lbl}</button>}
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
