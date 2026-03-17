'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function OrderCompletePage() {
  const router  = useRouter()
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('bs_last_order') || 'ORD-XXXXX'
    setOrderId(id)
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>🍃</div>
            <span className={styles.logoTxt}>Bite<em>Sync</em></span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
          {/* Success animation */}
          <div className={styles.successCircle}>
            <span className={styles.successIcon}>✓</span>
          </div>

          <h1 className={styles.title}>Your order is complete !!!</h1>
          <p className={styles.sub}>ออเดอร์ของคุณได้รับการยืนยันแล้ว<br/>ร้านค้ากำลังเตรียมอาหารให้คุณ</p>

          <div className={styles.orderIdBox}>
            Order: <strong>{orderId}</strong>
          </div>

          <div className={styles.btnRow}>
            <button onClick={() => router.push(`/track/${orderId}`)} className={styles.btnTrack}>
              🛵 Track Your Order →
            </button>
            <button onClick={() => router.push('/home')} className={styles.btnHome}>
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
