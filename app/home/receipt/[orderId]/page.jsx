'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

const STATUS_MAP = {
  1: { lbl: 'รอรับออเดอร์', color: '#856404' },
  2: { lbl: 'รับออเดอร์แล้ว', color: '#2a6129' },
  3: { lbl: 'กำลังเตรียมอาหาร', color: '#e65100' },
  4: { lbl: 'รอไรเดอร์มารับ', color: '#2a6129' },
  5: { lbl: 'กำลังจัดส่ง', color: '#1565c0' },
  6: { lbl: 'จัดส่งสำเร็จ', color: '#2a6129' },
  7: { lbl: 'ยกเลิกออเดอร์', color: '#b71c1c' }
}

export default function ReceiptPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))

    async function fetchReceipt() {
      setLoading(true)
      try {
        const token = localStorage.getItem('bs_token')
        const res = await fetch(`http://localhost/bitesync/api/customer/orders.php?id=${params?.orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        const d = await res.json()
        if (d.success) {
            const row = d.data
            setOrder({
                id: row.OdrId,
                date: row.OdrCreatedAt,
                paymentMethod: 'โอนเงิน (QR Code / PromptPay)',
                total: row.OdrGrandTotal,
                subtotal: row.OdrFoodPrice,
                deliveryFee: row.OdrDelFee,
                OdrStatus: row.OdrStatus,
                items: row.items || [],
                shop: { id: row.ShopId, name: row.ShopName },
                rider: { name: row.RiderName || 'รอยืนยันคนขับ' },
                customer: { 
                    name: user?.name, 
                    address: `${row.HouseNo} ${row.SubDistrict} ${row.District} ${row.Province}` 
                }
            })
            if (row.RiderRating) {
                setRating(Number(row.RiderRating))
                setHasRated(true)
            }
        }
      } catch (e) {
        console.error("Receipt fetch failed", e)
      }
      setLoading(false)
    }
    if (params?.orderId) fetchReceipt()
  }, [params?.orderId, user?.name])

  async function handleRate(val) {
    if (hasRated || submitting) return
    setRating(val)
    setSubmitting(true)
    try {
      const token = localStorage.getItem('bs_token')
      const res = await fetch('http://localhost/bitesync/api/customer/rate-rider.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: params.orderId, rating: val })
      })
      const data = await res.json()
      if (data.success) {
        setHasRated(true)
      } else {
        alert(data.message)
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการให้คะแนน')
    }
    setSubmitting(false)
  }

  if (loading || !order) return <div className={styles.loading}>กำลังโหลดใบเสร็จ...</div>

  const st = STATUS_MAP[order.OdrStatus] || { lbl: 'ได้รับคำสั่งซื้อ', color: '#6d7280' }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
          <span className={styles.paidBadge}>✅ ชำระเงินเรียบร้อย</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.receiptCard}>
          <div className={styles.rcptHdr}>
            <div className={styles.rcptLogoRow}>
              <div className={styles.rcptLogoMark}>🍃</div>
              <span className={styles.rcptLogoTxt}>Bite<em>Sync</em></span>
            </div>
            <h2 className={styles.rcptTitle}>ใบแจ้งหนี้ / ใบเสร็จ</h2>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>เลขที่ออเดอร์</div>
              <div className={styles.metaVal}>#{order.id}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>วันที่สั่งซื้อ</div>
              <div className={styles.metaVal}>{order.date}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>ชำระโดย</div>
              <div className={styles.metaVal}>{order.paymentMethod}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>สถานะล่าสุด</div>
              <div className={styles.metaVal} style={{color: st.color}}>
                  {Number(order.OdrStatus) === 6 ? '✅ ' : Number(order.OdrStatus) === 7 ? '❌ ' : '⏳ '}
                  {st.lbl}
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <div className={styles.infoTitle}>🏪 ร้านอาหาร</div>
              <div
                className={styles.infoName}
                onClick={() => router.push(`/home/restaurant/${order.shop.id}`)}
                style={{ cursor: 'pointer', color: '#2a6129' }}
              >
                {order.shop.name}
              </div>
            </div>
            <div className={styles.infoBox}>
              <div className={styles.infoTitle}>🛵 ไรเดอร์</div>
              <div className={styles.infoName}>{order.rider.name}</div>
            </div>
            <div className={`${styles.infoBox} ${styles.infoBoxFull}`}>
              <div className={styles.infoTitle}>📍 ส่งที่</div>
              <div className={styles.infoName}>{order.customer.name}</div>
              <div className={styles.infoSub}>{order.customer.address}</div>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.itemsSection}>
            <div className={styles.itemsTitle}>รายการอาหาร</div>
            {order.items.map((item, i) => (
              <div key={i} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{item.name}</span>
                </div>
                <span className={styles.itemQty}>x{item.qty}</span>
                <span className={styles.itemPrice}>{Math.round(item.price * item.qty).toLocaleString()} ฿</span>
              </div>
            ))}
          </div>

          <div className={styles.divider} />

          <div className={styles.summary}>
            <div className={styles.summRow}>
              <span>ค่าอาหารทั้งหมด</span>
              <span>{order.subtotal} ฿</span>
            </div>
            <div className={styles.summRow}>
              <span>ค่าจัดส่ง</span>
              <span>{order.deliveryFee} ฿</span>
            </div>
            <div className={`${styles.summRow} ${styles.summTotal}`}>
              <span>ยอดรวมสุทธิ</span>
              <span>{order.total} ฿</span>
            </div>
          </div>

          {/* Rating Section */}
          {Number(order.OdrStatus) === 6 && (
            <div className={styles.ratingSection} style={{marginTop: '20px', textAlign: 'center', background: '#f9fbf9', padding: '15px', borderRadius: '12px', border: '1px dashed #2a6129'}}>
              <div style={{fontSize: '14px', fontWeight: 'bold', color: '#2a6129', marginBottom: '8px'}}>
                {hasRated ? '🌟 ขอบคุณสำหรับคะแนน!' : '⭐ ให้คะแนนไรเดอร์เพื่อเป็นกำลังใจ'}
              </div>
              <div style={{display: 'flex', justifyContent: 'center', gap: '8px'}}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span 
                    key={s} 
                    onClick={() => handleRate(s)}
                    style={{
                      fontSize: '32px', 
                      cursor: hasRated ? 'default' : 'pointer',
                      color: s <= rating ? '#f0c419' : '#ccc',
                      transition: 'transform 0.2s',
                      filter: submitting ? 'grayscale(1)' : 'none'
                    }}
                    onMouseEnter={(e) => !hasRated && (e.target.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => !hasRated && (e.target.style.transform = 'scale(1)')}
                  >
                    {s <= rating ? '★' : '☆'}
                  </span>
                ))}
              </div>
              {hasRated && <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>ออเดอร์นี้ได้รับ {rating} ดาว</div>}
            </div>
          )}

          <div className={styles.barcode}>
            {'█░█░██░█░█░██░█░█░██░█░█░██░█░█░██░█░█░██░█'.split('').map((c, i) => (
              <span key={i} style={{ color: c === '█' ? '#1a1f1a' : '#fff', fontSize: 8 }}>{c}</span>
            ))}
            <div className={styles.barcodeId}>#{order.id}</div>
          </div>

          <div className={styles.actions}>
            {!['6', '7'].includes(order.OdrStatus?.toString()) && (
              <button
                onClick={() => router.push(`/home/track/${params.orderId}`)}
                className={styles.btnTrack}
              >
                🛵 ติดตามออเดอร์
              </button>
            )}
            <button onClick={() => window.print()} className={styles.btnPrint}>🖨️ พิมพ์ใบเสร็จ</button>
            <button onClick={() => router.push('/home')} className={styles.btnHome}>กลับหน้าหลัก</button>
          </div>
        </div>
      </div>
    </div>
  )
}
