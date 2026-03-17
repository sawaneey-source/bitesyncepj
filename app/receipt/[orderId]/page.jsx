'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'

const MOCK = {
  id:'ORD-123456', date:'17 Mar 2026, 14:35',
  customer:{ name:'สมชาย ใจดี', phone:'081-234-5678', address:'123 ถ.กาญจนวนิช หาดใหญ่' },
  shop:{ name:'มอกกี้เบเกอรี่' },
  rider:{ name:'อาร์ม' },
  items:[
    { name:'White Cherry Cake', qty:1, price:80 },
    { name:'Thai Milk Tea',     qty:2, price:55 },
  ],
  subtotal:190, deliveryFee:15, total:205,
  paymentMethod:'QR Code', status:'Delivered',
}

export default function ReceiptPage() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState(MOCK)

  useEffect(() => { fetchReceipt() }, [])

  async function fetchReceipt() {
    try {
      const token = localStorage.getItem('bs_token')
      const res   = await fetch(`http://localhost/bitesync/api/customer/receipt.php?id=${params?.orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data  = await res.json()
      if (data.success) setOrder(data.data)
    } catch {}
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => router.back()} className={styles.backBtn}>← กลับ</button>
          <div className={styles.logo}>
            <div className={styles.logoMark}>🍃</div>
            <span className={styles.logoTxt}>Bite<em>Sync</em></span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.receiptCard}>
          {/* Header */}
          <div className={styles.rcptHdr}>
            <div className={styles.rcptLogo}>
              <div className={styles.rcptLogoMark}>🍃</div>
              <span className={styles.rcptLogoTxt}>Bite<em>Sync</em></span>
            </div>
            <h2 className={styles.rcptTitle}>Order Receipt</h2>
            <div className={styles.rcptId}>{order.id}</div>
            <div className={styles.rcptDate}>{order.date}</div>
            <span className={styles.rcptStatus}>✅ {order.status}</span>
          </div>

          <div className={styles.divider}/>

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div>
              <div className={styles.infoLabel}>Delivery to</div>
              <div className={styles.infoVal}>{order.customer.name}</div>
              <div className={styles.infoSub}>{order.customer.address}</div>
            </div>
            <div>
              <div className={styles.infoLabel}>Restaurant</div>
              <div className={styles.infoVal}>{order.shop.name}</div>
              <div className={styles.infoLabel} style={{marginTop:10}}>Rider</div>
              <div className={styles.infoVal}>{order.rider.name}</div>
            </div>
          </div>

          <div className={styles.divider}/>

          {/* Items */}
          <div className={styles.itemsSection}>
            <div className={styles.itemsTitle}>รายการอาหาร</div>
            {order.items.map((item, i) => (
              <div key={i} className={styles.item}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemQty}>x{item.qty}</span>
                <span className={styles.itemPrice}>{item.price * item.qty} ฿</span>
              </div>
            ))}
          </div>

          <div className={styles.divider}/>

          {/* Summary */}
          <div className={styles.summary}>
            <div className={styles.summRow}><span>ยอดรวม</span><span>{order.subtotal} ฿</span></div>
            <div className={styles.summRow}><span>ค่าจัดส่ง</span><span>{order.deliveryFee} ฿</span></div>
            <div className={`${styles.summRow} ${styles.summTotal}`}>
              <span>Total</span><span>{order.total} THB</span>
            </div>
            <div className={styles.payMethod}>💳 {order.paymentMethod}</div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={() => window.print()} className={styles.btnPrint}>🖨️ พิมพ์ใบเสร็จ</button>
            <button onClick={() => router.push('/home')} className={styles.btnHome}>กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    </div>
  )
}
