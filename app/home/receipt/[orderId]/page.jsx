'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

const MOCK = {
  id: 'BSS92231', date: '17 Mar 2026, 14:35',
  customer: { name: 'สมชาย ใจดี', phone: '081-234-5678', address: '123 ถ.กาญจนวนิช หาดใหญ่' },
  shop: { name: 'มอกกี้เบเกอรี่' },
  rider: { name: 'Aek' },
  items: [
    { name: 'Backyard Biscuit Cake', qty: 1, price: 50 },
    { name: 'Our Island Dessert Shot', qty: 1, price: 180 },
    { name: 'Matcha Jelly', qty: 2, price: 75 },
  ],
  subtotal: 380, deliveryFee: 15, total: 395,
  paymentMethod: 'QR Code / PromptPay', status: 'Delivered',
}

export default function ReceiptPage() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState(MOCK)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))

    async function fetchReceipt() {
      // 1. Check local history first for real data
      const history = JSON.parse(localStorage.getItem('bs_history') || '[]')
      const localOrder = history.find(h => h.id === params?.orderId)

      if (localOrder) {
        setOrder(localOrder)
        setLoading(false)
        return
      }

      // 2. Fallback to API if not in history
      setLoading(true)
      try {
        const res = await fetch(`http://localhost/bitesync/api/customer/receipt.php?id=${params?.orderId}`)
        const d = await res.json()
        if (d.success) setOrder(d.data)
        else setOrder(MOCK) // Final fallback
      } catch {
        setOrder(MOCK)
      }
      setLoading(false)
    }
    if (params?.orderId) fetchReceipt()
  }, [params?.orderId])

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
          <span className={styles.paidBadge}>✅ Fully Paid</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.receiptCard}>

          {/* Header */}
          <div className={styles.rcptHdr}>
            <div className={styles.rcptLogoRow}>
              <div className={styles.rcptLogoMark}>🍃</div>
              <span className={styles.rcptLogoTxt}>Bite<em>Sync</em></span>
            </div>
            <h2 className={styles.rcptTitle}>Order Receipt</h2>
          </div>

          {/* Order meta */}
          <div className={styles.metaGrid}>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>Order ID</div>
              <div className={styles.metaVal}>#{order.id}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>Date</div>
              <div className={styles.metaVal}>{order.date}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>Payment</div>
              <div className={styles.metaVal}>{order.paymentMethod}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>Status</div>
              <div className={`${styles.metaVal} ${styles.metaValGreen}`}>✅ {order.status}</div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Info grid */}
          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <div className={styles.infoTitle}>🏪 Restaurant</div>
              <div
                className={styles.infoName}
                onClick={() => router.push(`/home/restaurant/${order.shop.id || order.shopId || 1}`)}
                style={{ cursor: 'pointer', color: '#2a6129' }}
              >
                {order.shop.name}
              </div>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoTitle}>🛵 Rider</div>
              <div className={styles.infoName}>{order.rider.name}</div>
            </div>
            <div className={`${styles.infoBox} ${styles.infoBoxFull}`}>
              <div className={styles.infoTitle}>📍 Delivery To</div>
              <div className={styles.infoName}>{order.customer.name}</div>
              <div className={styles.infoSub}>{order.customer.address}</div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Items */}
          <div className={styles.itemsSection}>
            <div className={styles.itemsTitle}>รายการอาหาร</div>
            {order.items.map((item, i) => (
              <div
                key={i}
                className={styles.item}
                onClick={() => router.push(`/home/restaurant/${order.shop.id || order.shopId || 1}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{item.name}</span>
                  {item.addons && item.addons.length > 0 && (
                    <div className={styles.itemAddons}>
                      {item.addons.map(a => `${a.name} x${a.qty || 1}`).join(', ')}
                    </div>
                  )}
                </div>
                <span className={styles.itemQty}>x{item.qty}</span>
                <span className={styles.itemPrice}>{Math.round(item.price * item.qty).toLocaleString()} THB</span>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          {/* Summary */}
          <div className={styles.summary}>
            <div className={styles.summRow}>
              <span>ยอดรวม</span>
              <span>{order.subtotal} THB</span>
            </div>
            <div className={styles.summRow}>
              <span>ค่าจัดส่ง</span>
              <span>{order.deliveryFee} THB</span>
            </div>
            <div className={`${styles.summRow} ${styles.summTotal}`}>
              <span>Total</span>
              <span>{order.total} THB</span>
            </div>
          </div>

          {/* Barcode decoration */}
          <div className={styles.barcode}>
            {'█░█░██░█░█░██░█░█░██░█░█░██░█░█░██░█░█░██░█'.split('').map((c, i) => (
              <span key={i} style={{ color: c === '█' ? '#1a1f1a' : '#fff', fontSize: 8 }}>{c}</span>
            ))}
            <div className={styles.barcodeId}>#{order.id}</div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              onClick={() => router.push(`/home/track/${params.orderId}`)}
              className={styles.btnTrack}
            >
              🛵 ติดตามออเดอร์
            </button>
            <button onClick={() => window.print()} className={styles.btnPrint}>🖨️ พิมพ์ใบเสร็จ</button>
            <button onClick={() => router.push('/home')} className={styles.btnHome}>กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    </div>
  )
}
