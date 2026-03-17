'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const STATUS_STEPS = ['Order Received','Preparing Food','Waiting for Rider','Rider Assigned','Picked Up','Delivered']

const MOCK = [
  {
    OdrId:'#1025', customer:'สมชาย ใจดี', phone:'081-234-5678',
    rider:{ name:'อาร์ม', phone:'096-456-9088', img:null, distance:'0.3 km away' },
    items:[
      { name:'Backyard Biscuit Cake', qty:1, price:50 },
      { name:'Our Island Dessert Shot', qty:1, price:180 },
      { name:'Matcha Jelly', qty:2, price:75 },
    ],
    total:310, step:3,
    img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&q=80',
  },
  {
    OdrId:'#1026', customer:'สมศรี มีสุข', phone:'082-345-6789',
    rider:{ name:'นิว', phone:'085-678-1234', img:null, distance:'1.2 km away' },
    items:[
      { name:'เค้กช็อกโกแลต', qty:2, price:90 },
      { name:'ชาไทยเย็น',     qty:1, price:55 },
    ],
    total:235, step:4,
    img:'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&q=80',
  },
]

export default function RidersPage() {
  const [orders, setOrders]   = useState(MOCK)
  const [selected, setSelected] = useState(null)
  const [toast, setToast]     = useState(null)

  useEffect(() => { fetchActiveJobs() }, [])

  function showToast(msg, type='ok') { setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function fetchActiveJobs() {
    try {
      const res  = await fetch('http://localhost/bitesync/api/shop/active-jobs.php', {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) setOrders(data.data)
    } catch {}
  }

  async function markReady(orderId) {
    try {
      await fetch(`http://localhost/bitesync/api/shop/orders.php?id=${orderId}`, {
        method:'PUT',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('bs_token')}`},
        body: JSON.stringify({ status:'Ready' })
      })
    } catch {}
    setOrders(p => p.map(o => o.OdrId===orderId ? {...o, step: Math.min(o.step+1, STATUS_STEPS.length-1)} : o))
    showToast('อัปเดตสถานะแล้ว!')
  }

  const sel = orders.find(o => o.OdrId === selected)

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>✅ {toast.msg}</div>}

      {/* List view */}
      {!selected ? (
        <>
          <div className={styles.hdr}>
            <h1 className={styles.title}>Rider's Active Jobs</h1>
            <button onClick={fetchActiveJobs} className={styles.refreshBtn}>🔄</button>
          </div>

          {orders.length === 0 ? (
            <div className={styles.empty}>
              <span>🛵</span>
              <span>ยังไม่มีไรเดอร์รับงานอยู่</span>
            </div>
          ) : (
            <div className={styles.list}>
              {orders.map(o => (
                <div key={o.OdrId} className={styles.jobCard} onClick={() => setSelected(o.OdrId)}>
                  <div className={styles.jobLeft}>
                    <div className={styles.riderAvatar}>{o.rider.name[0]}</div>
                    <div className={styles.jobInfo}>
                      <div className={styles.riderName}>{o.rider.name}</div>
                      <div className={styles.riderPhone}>📱 {o.rider.phone}</div>
                      <div className={styles.orderId}>Order {o.OdrId}</div>
                    </div>
                  </div>
                  <div className={styles.jobRight}>
                    <div className={styles.jobDist}>📍 {o.rider.distance}</div>
                    <img src={o.img} className={styles.jobImg}/>
                    <button className={styles.btnTrack}>Track now</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Detail view */
        <div>
          <div className={styles.hdr}>
            <button onClick={() => setSelected(null)} className={styles.backBtn}>← Back</button>
            <h1 className={styles.title}>Order {sel.OdrId}</h1>
          </div>

          <div className={styles.detailGrid}>
            {/* LEFT */}
            <div className={styles.detailLeft}>

              {/* Customer */}
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>Customer</h2>
                <div className={styles.personRow}>
                  <div className={styles.personIco}>👤</div>
                  <div>
                    <div className={styles.personName}>{sel.customer}</div>
                    <div className={styles.personPhone}>📱 {sel.phone}</div>
                  </div>
                </div>
              </div>

              {/* Order status */}
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>Order status</h2>
                <div className={styles.steps}>
                  {STATUS_STEPS.map((s, i) => {
                    const done    = i < sel.step
                    const current = i === sel.step
                    return (
                      <div key={s} className={styles.stepRow}>
                        <div className={styles.stepLeft}>
                          <div className={`${styles.stepCircle} ${done||current ? styles.stepCircleDone : ''} ${current ? styles.stepCircleCurrent : ''}`}>
                            {done ? '✓' : ''}
                          </div>
                          {i < STATUS_STEPS.length-1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`}/>}
                        </div>
                        <span className={`${styles.stepLbl} ${current ? styles.stepLblCurrent : done ? styles.stepLblDone : ''}`}>{s}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className={styles.detailRight}>

              {/* Rider */}
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>Rider</h2>
                <div className={styles.personRow}>
                  <div className={`${styles.personIco} ${styles.personIcoRider}`}>{sel.rider.name[0]}</div>
                  <div>
                    <div className={styles.personName}>{sel.rider.name}</div>
                    <div className={styles.personPhone}>📱 {sel.rider.phone}</div>
                    <div className={styles.riderDistBadge}>📍 {sel.rider.distance}</div>
                  </div>
                </div>
              </div>

              {/* Order items */}
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>Order Items</h2>
                <div className={styles.items}>
                  {sel.items.map((item, i) => (
                    <div key={i} className={styles.item}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemQty}>x{item.qty}</span>
                      <span className={styles.itemPrice}>{item.price * item.qty} THB</span>
                    </div>
                  ))}
                </div>
                <div className={styles.totalRow}>
                  <span>Total:</span>
                  <span className={styles.totalVal}>{sel.total} THB</span>
                </div>
                {sel.step < STATUS_STEPS.length - 1 && (
                  <button onClick={() => markReady(sel.OdrId)} className={styles.btnReady}>
                    Mark as ready
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
