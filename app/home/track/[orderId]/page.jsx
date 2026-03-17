'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'

const STEPS = [
  { key:'received',  label:'Order Received',  icon:'📋' },
  { key:'preparing', label:'Preparing Food',   icon:'👨‍🍳' },
  { key:'waiting',   label:'Waiting for Rider',icon:'⏳' },
  { key:'assigned',  label:'Rider Assigned',   icon:'🛵' },
  { key:'pickup',    label:'Picked Up',         icon:'📦' },
  { key:'delivered', label:'Delivered',         icon:'✅' },
]

const MOCK_ORDER = {
  id:'ORD-123456', currentStep:3,
  customer:{ name:'สมชาย', phone:'081-234-5678', address:'123 ถ.กาญจนวนิช หาดใหญ่' },
  rider:{ name:'อาร์ม', phone:'096-456-9088', vehicle:'Honda PCX', plate:'กข-1234' },
  items:[
    { name:'White Cherry Cake', qty:1, price:80 },
    { name:'Thai Milk Tea',     qty:2, price:55 },
  ],
  subtotal:190, deliveryFee:15, total:205,
  shop:{ name:'มอกกี้เบเกอรี่', phone:'074-123-456' },
  estimatedTime:'10-15 นาที',
}

export default function TrackPage() {
  const router  = useRouter()
  const params  = useParams()
  const [order, setOrder]   = useState(MOCK_ORDER)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchOrder() }, [])

  async function fetchOrder() {
    try {
      const token = localStorage.getItem('bs_token')
      const res   = await fetch(`http://localhost/bitesync/api/customer/orders.php?id=${params?.orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data  = await res.json()
      if (data.success) setOrder(data.data)
    } catch {}
  }

  const step = order.currentStep

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => router.push('/home')} className={styles.backBtn}>← หน้าหลัก</button>
          <div className={styles.logo}>
            <div className={styles.logoMark}>🍃</div>
            <span className={styles.logoTxt}>Bite<em>Sync</em></span>
          </div>
          <button onClick={fetchOrder} className={styles.refreshBtn}>🔄</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.layout}>
          {/* LEFT */}
          <div className={styles.left}>
            <div className={styles.card}>
              <div className={styles.orderHdr}>
                <h2 className={styles.cardTitle}>Your order</h2>
                <span className={styles.orderId}>Order {order.id}</span>
              </div>
              <div className={styles.estTime}>
                <span>🕐</span>
                <span>ประมาณ <strong>{order.estimatedTime}</strong></span>
              </div>

              {/* Status steps */}
              <div className={styles.steps}>
                {STEPS.map((s, i) => {
                  const done    = i < step
                  const current = i === step
                  return (
                    <div key={s.key} className={styles.stepRow}>
                      <div className={styles.stepLeft}>
                        <div className={`${styles.stepCircle} ${done||current?styles.stepDone:''} ${current?styles.stepCurrent:''}`}>
                          {done ? '✓' : s.icon}
                        </div>
                        {i < STEPS.length-1 && <div className={`${styles.stepLine} ${done?styles.stepLineDone:''}`}/>}
                      </div>
                      <div className={styles.stepInfo}>
                        <span className={`${styles.stepLbl} ${current?styles.stepLblCurrent:done?styles.stepLblDone:''}`}>{s.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rider info */}
            {step >= 3 && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>🛵 Rider</h2>
                <div className={styles.riderRow}>
                  <div className={styles.riderAvatar}>{order.rider.name[0]}</div>
                  <div className={styles.riderInfo}>
                    <div className={styles.riderName}>{order.rider.name}</div>
                    <div className={styles.riderSub}>📱 {order.rider.phone}</div>
                    <div className={styles.riderSub}>🛵 {order.rider.vehicle} · {order.rider.plate}</div>
                  </div>
                  <a href={`tel:${order.rider.phone}`} className={styles.callBtn}>📞</a>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className={styles.right}>
            {/* Order items */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Order Items</h2>
              {order.items.map((item, i) => (
                <div key={i} className={styles.item}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemQty}>x{item.qty}</span>
                  <span className={styles.itemPrice}>{item.price * item.qty} ฿</span>
                </div>
              ))}
              <div className={styles.divider}/>
              <div className={styles.item}>
                <span>ค่าจัดส่ง</span><span/><span>{order.deliveryFee} ฿</span>
              </div>
              <div className={`${styles.item} ${styles.itemTotal}`}>
                <span>Total:</span><span/><span>{order.total} THB</span>
              </div>
              <button onClick={() => router.push(`/receipt/${order.id}`)} className={styles.receiptBtn}>
                ดูใบเสร็จ →
              </button>
            </div>

            {/* Customer info */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📍 ที่อยู่จัดส่ง</h2>
              <p className={styles.addrTxt}>{order.customer.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
