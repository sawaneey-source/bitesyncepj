'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'

export default function ShopReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [delId, setDelId] = useState(null)
  const [toast, setToast] = useState(null)
  const q = useSearchParams().get('q') || ''

  useEffect(() => {
    fetchReviews()
  }, [])

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchReviews = async () => {
    const user = JSON.parse(localStorage.getItem('bs_user'))
    if (!user) return
    try {
      const res = await fetch(`http://localhost/bitesync/api/shop/reviews.php?usrId=${user.id}`)
      const data = await res.json()
      if (data.success) {
        setReviews(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    const user = JSON.parse(localStorage.getItem('bs_user'))
    try {
      const res = await fetch(`http://localhost/bitesync/api/shop/reviews.php?usrId=${user.id}&id=${delId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setReviews(prev => prev.filter(r => r.ReviewId !== delId))
        showToast('ลบรีวิวเรียบร้อยแล้ว')
      } else {
        showToast(data.message || 'เกิดข้อผิดพลาด', false)
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', false)
    } finally {
      setDelId(null)
    }
  }

  const getImg = (path) => path ? `http://localhost/bitesync/public/${path}` : null

  if (loading) return <div style={{ minHeight: '80vh' }}></div>

  const avgScore = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + Number(r.ReviewScore), 0) / reviews.length).toFixed(1)
    : 0

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.ok ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {delId && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>🗑️</div>
            <h3 className={styles.modalTitle}>ยืนยันการลบ?</h3>
            <p className={styles.modalText}>คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            <div className={styles.modalBtns}>
              <button className={styles.mBtnCancel} onClick={() => setDelId(null)}>ยกเลิก</button>
              <button className={styles.mBtnDel} onClick={handleDelete}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.hdr}>
        <h1 className={styles.title}>รีวิวจากลูกค้า</h1>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#e8f5e9', color: '#2a6129' }}>⭐</div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{avgScore} / 5</span>
            <span className={styles.statLabel}>คะแนนเฉลี่ย</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fff9c4', color: '#856404' }}>💬</div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{reviews.length}</span>
            <span className={styles.statLabel}>รีวิวทั้งหมด</span>
          </div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📭</span>
          <p>ยังไม่มีรีวิวจากลูกค้าในขณะนี้</p>
        </div>
      ) : (
        <div className={styles.list}>
          {reviews
            .filter(r => ( (r.userName||'') + (r.FoodName||'') + (r.ReviewText||'') ).toLowerCase().includes(q.toLowerCase()))
            .map(r => (
            <div key={r.ReviewId} className={styles.reviewCard}>
              <div className={styles.reviewTop}>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{r.userName}</span>
                  <span className={styles.foodName}>สั่งเมนู: {r.FoodName}</span>
                </div>
                <div className={styles.rating}>
                  {'⭐'.repeat(r.ReviewScore)}
                </div>
              </div>
              <div className={styles.date}>
                {new Date(r.ReviewAt).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
              <p className={styles.text}>{r.ReviewText || 'ไม่มีข้อความรีวิว'}</p>

              <div className={styles.imgs}>
                {[r.ReviewImg1, r.ReviewImg2, r.ReviewImg3].map((img, i) => (
                  img && <img key={i} src={getImg(img)} className={styles.reviewImg} alt="Review" onClick={() => window.open(getImg(img), '_blank')} />
                ))}
              </div>

              <div className={styles.actions}>
                <button className={styles.btnDel} onClick={() => setDelId(r.ReviewId)}>
                  🗑️ ลบรีวิว
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
