'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'
import Logo from '@/components/Logo'
import PremiumModal from '@/components/PremiumModal'

const STATUS_MAP = {
  1: { lbl: 'ยังไม่ชำระเงิน', color: '#b71c1c' },
  2: { lbl: 'รอทางร้านรับออเดอร์', color: '#856404' },
  3: { lbl: 'กำลังเตรียมอาหาร', color: '#e65100' },
  4: { lbl: 'รอไรเดอร์มารับ', color: '#2a6129' },
  5: { lbl: 'กำลังจัดส่ง', color: '#1565c0' },
  6: { lbl: 'จัดส่งสำเร็จ', color: '#2a6129' },
  7: { lbl: 'ยกเลิกออเดอร์', color: '#b71c1c' }
}

const formatThaiDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    let d = new Date(dateStr.replace(' ', 'T'))
    if (isNaN(d.getTime())) d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr

    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear() + 543
    const hours = d.getHours().toString().padStart(2, '0')
    const mins = d.getMinutes().toString().padStart(2, '0')

    return `${day} ${month} ${year} ${hours}:${mins}`
  } catch (e) {
    return dateStr
  }
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
  
  // Premium Modal State
  const [modal, setModal] = useState({ 
    open: false, 
    title: '', 
    description: '', 
    type: 'success', 
    icon: '✅',
    onConfirm: null,
    confirmText: 'ตกลง'
  })

  const openModal = (config) => setModal(prev => ({ ...prev, ...config, open: true }))
  const closeModal = () => setModal(prev => ({ ...prev, open: false }))
  
  // Food Review Modal State
  const [foodReviewModal, setFoodReviewModal] = useState({ 
    open: false, 
    foodId: null, 
    foodName: '',
    score: 5, 
    text: '', 
    images: [],
    previewUrls: []
  })

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
                date: (Number(row.OdrStatus) === 6 || Number(row.OdrStatus) === 7) ? (row.OdrUpdatedAt || row.OdrCreatedAt) : row.OdrCreatedAt,
                paymentMethod: row.PaymentMethod || 'โอนเงิน (QR Code / PromptPay)',
                paymentSlip: row.PaymentSlip,
                total: row.OdrGrandTotal,
                subtotal: row.OdrFoodPrice,
                deliveryFee: row.OdrDelFee,
                platformFee: row.OdrPlatformFee,
                OdrStatus: row.OdrStatus,
                items: row.items || [],
                shop: { id: row.ShopId, name: row.ShopName },
                rider: { name: row.RiderName || 'รอยืนยันคนขับ' },
                customer: { 
                    name: user?.name, 
                    address: [
                        row.HouseNo,
                        row.Moo && `ม.${row.Moo}`,
                        row.Village && `หมู่บ้าน${row.Village}`,
                        row.Soi && `ซ.${row.Soi}`,
                        row.Road && `ถ.${row.Road}`,
                        row.SubDistrict && `ต.${row.SubDistrict}`,
                        row.District && `อ.${row.District}`,
                        row.Province && `จ.${row.Province}`,
                        row.Zipcode
                    ].filter(Boolean).join(' ')
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
        openModal({ title: 'เกิดข้อผิดพลาด', description: data.message, type: 'alert', icon: '⚠️' })
      }
    } catch (e) {
      openModal({ title: 'ข้อผิดพลาด', description: 'เกิดข้อผิดพลาดในการให้คะแนน', type: 'alert', icon: '⚠️' })
    }
    setSubmitting(false)
  }

  const handleFoodImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (foodReviewModal.images.length + files.length > 3) {
      openModal({ title: 'จำกัดจำนวนรูป', description: 'อัปโหลดรูปภาพได้สูงสุด 3 รูปเท่านั้นครับ', type: 'alert', icon: '⚠️' })
      return
    }
    const newImages = [...foodReviewModal.images, ...files].slice(0, 3)
    const newPreviews = newImages.map(file => URL.createObjectURL(file))
    setFoodReviewModal({ ...foodReviewModal, images: newImages, previewUrls: newPreviews })
  }

  const submitFoodReview = async () => {
    if (!foodReviewModal.foodId) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('usrId', user.id)
      fd.append('odrId', order.id)
      fd.append('foodId', foodReviewModal.foodId)
      fd.append('score', foodReviewModal.score)
      fd.append('text', foodReviewModal.text)
      
      foodReviewModal.images.forEach((file, index) => {
        if (index < 3) fd.append(`img${index + 1}`, file)
      })

      const res = await fetch('http://localhost/bitesync/api/home/submit_review.php', {
        method: 'POST',
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        setFoodReviewModal({ open: false, foodId: null, foodName: '', score: 5, text: '', images: [], previewUrls: [] })
        openModal({
          title: 'สำเร็จ 🎉',
          description: 'ส่งรีวิวอาหารสำเร็จ ขอบคุณสำหรับความคิดเห็นครับ!',
          type: 'success',
          icon: '✅',
          onConfirm: () => closeModal()
        })
      } else {
        openModal({ title: 'เกิดข้อผิดพลาด', description: data.message || 'เกิดข้อผิดพลาดในการส่งรีวิว', type: 'alert', icon: '⚠️' })
      }
    } catch(e) {
      openModal({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถเชื่อมต่อเพื่อส่งรีวิวได้', type: 'alert', icon: '⚠️' })
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
          {Number(order.OdrStatus) === 1 ? (
            <span className={styles.unpaidBadge}>⏳ รอการชำระเงิน</span>
          ) : (
            <span className={styles.paidBadge}>✅ ชำระเงินเรียบร้อย</span>
          )}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.receiptCard}>
          <div className={styles.rcptHdr}>
            <div className={styles.rcptLogoRow}>
              <Logo theme="dark" size="small" />
            </div>
            <h2 className={styles.rcptTitle}>
              {Number(order.OdrStatus) === 1 ? 'รายละเอียดออเดอร์' : 'ใบแจ้งหนี้ / ใบเสร็จ'}
            </h2>
          </div>

          {/* Status Banner */}
          <div style={{
            background: Number(order.OdrStatus) === 1 ? '#fff5f5' : '#f1f8f1',
            padding: '12px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '800',
            color: Number(order.OdrStatus) === 1 ? '#d32f2f' : '#2a6129',
            borderBottom: '1px solid #eee'
          }}>
            {Number(order.OdrStatus) === 1 ? '⚠️ ยังไม่ชำระเงิน (UNPAID)' : '✅ ชำระเงินเรียบร้อยแล้ว (PAID)'}
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>เลขที่ออเดอร์</div>
              <div className={styles.metaVal}>#{order.id}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>{Number(order.OdrStatus) === 6 ? 'เวลาที่จัดส่งสำเร็จ' : 'เวลาที่สั่งซื้อ'}</div>
              <div className={styles.metaVal}>{formatThaiDate(order.date)}</div>
            </div>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>ชำระโดย</div>
              <div className={styles.metaVal}>
                {order.paymentMethod}
                {order.paymentSlip && (
                  <a 
                    href={`http://localhost/bitesync/public${order.paymentSlip}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.viewSlipLink}
                  >
                    (ดูสลิป)
                  </a>
                )}
              </div>
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
            {order.items.map((item, i) => {
              const fId = item.id || item.FoodId || item.foodId;
              return (
                <div key={i} className={styles.item} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className={styles.itemMain} style={{ flex: '1 1 auto', minWidth: '150px' }}>
                    <span className={styles.itemName}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span className={styles.itemQty}>x{item.qty}</span>
                    <span className={styles.itemPrice}>{Math.round(item.price * item.qty).toLocaleString()} ฿</span>
                  </div>
                  {Number(order.OdrStatus) === 6 && fId && (
                    <div style={{ width: '100%', marginTop: '8px', textAlign: 'right' }}>
                      <button 
                        onClick={() => setFoodReviewModal({...foodReviewModal, open: true, foodId: fId, foodName: item.name, score: 5, text: '', images: [], previewUrls: []})}
                        style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '30px', border: '1.5px solid #81c784', background: '#f1f8e9', color: '#388e3c', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#e8f5e9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#f1f8e9'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        ⭐ รีวิวเมนูนี้
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.divider} />

          <div className={styles.summary}>
            <div className={styles.summRow}>
              <span>ค่าอาหารทั้งหมด</span>
              <span>{order.subtotal} ฿</span>
            </div>
            <div className={styles.summRow}>
              <span>ค่าจัดส่ง</span>
              <span>{Number(order.deliveryFee).toLocaleString()} ฿</span>
            </div>
            <div className={styles.summRow}>
              <span>ค่าบริการระบบ</span>
              <span>{Number(order.platformFee).toLocaleString()} ฿</span>
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
            {[2, 3, 4, 5].includes(Number(order.OdrStatus)) && (
              <button
                onClick={() => router.push(`/home/track/${params.orderId}`)}
                className={styles.btnTrack}
              >
                🛵 ติดตามออเดอร์
              </button>
            )}
            {Number(order.OdrStatus) !== 1 && (
              <button onClick={() => window.print()} className={styles.btnPrint}>🖨️ พิมพ์ใบเสร็จ</button>
            )}
            <button onClick={() => router.push('/home')} className={styles.btnHome}>
              <i className="fa-solid fa-house" /> กลับหน้าหลัก
            </button>
          </div>

          {/* Food Review Modal */}
          {foodReviewModal.open && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
              <div style={{
                background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '24px',
                padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'popIn 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#1B5E20', fontWeight: 800 }}>รีวิว: {foodReviewModal.foodName}</h3>
                  <button onClick={() => setFoodReviewModal({...foodReviewModal, open: false})} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>✕</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#555', marginBottom: '10px' }}>ให้คะแนนความอร่อย</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span 
                        key={s} 
                        onClick={() => setFoodReviewModal({...foodReviewModal, score: s})}
                        style={{
                          fontSize: '36px', cursor: 'pointer', transition: 'transform 0.2s',
                          color: s <= foodReviewModal.score ? '#f0c419' : '#e0e0e0',
                          textShadow: s <= foodReviewModal.score ? '0 2px 10px rgba(240,196,25,0.4)' : 'none'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <textarea 
                  value={foodReviewModal.text}
                  onChange={(e) => setFoodReviewModal({...foodReviewModal, text: e.target.value})}
                  placeholder="แบ่งปันความคิดเห็นเกี่ยวกับรสชาติอาหารให้เพื่อนๆ ฟัง..."
                  style={{
                    width: '100%', minHeight: '100px', padding: '12px 16px', borderRadius: '12px',
                    border: '1px solid #ddd', fontSize: '14px', outline: 'none', resize: 'vertical',
                    boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'inherit'
                  }}
                />

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '8px' }}>เพิ่มรูปภาพ (สูงสุด 3 รูป)</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {foodReviewModal.previewUrls.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                        <img src={url} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button 
                          onClick={() => {
                            const newImgs = [...foodReviewModal.images]; newImgs.splice(idx, 1);
                            const newUrls = [...foodReviewModal.previewUrls]; newUrls.splice(idx, 1);
                            setFoodReviewModal({...foodReviewModal, images: newImgs, previewUrls: newUrls})
                          }}
                          style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    ))}
                    {foodReviewModal.images.length < 3 && (
                      <label style={{ width: '70px', height: '70px', borderRadius: '8px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#999', fontSize: '20px', background: '#f9f9f9', transition: 'all 0.2s' }}>
                        +
                        <input type="file" accept="image/*" multiple onChange={handleFoodImageUpload} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>

                <button 
                  onClick={submitFoodReview}
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '14px', background: '#1B5E20', color: '#fff',
                    border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 15px rgba(27,94,32,0.3)', opacity: submitting ? 0.7 : 1
                  }}
                  onMouseOver={(e) => !submitting && (e.currentTarget.style.background = '#2E7D32')}
                  onMouseOut={(e) => !submitting && (e.currentTarget.style.background = '#1B5E20')}
                >
                  {submitting ? 'กำลังส่งรีวิว...' : 'ส่งรีวิวเลย 🚀'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <PremiumModal 
        isOpen={modal.open}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        icon={modal.icon}
        confirmText={modal.confirmText}
      />
    </div>
  )
}

