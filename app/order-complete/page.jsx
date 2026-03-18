'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Logo from '@/components/Logo'

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
          <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <Logo size="small" />
          </div>
          <div className={styles.navTitle}>สำเร็จ</div>
        </div>
      </header>

      {/* Step indicator (Step 3) */}
      <div className={styles.steps}>
        <div className={`${styles.stepItem} ${styles.stepOn}`}>
          <div className={styles.stepCircle}>1</div>
          <span>ตรวจสอบ</span>
        </div>
        <div className={`${styles.stepLine} ${styles.stepLineOn}`}/>
        <div className={`${styles.stepItem} ${styles.stepOn}`}>
          <div className={styles.stepCircle}>2</div>
          <span>ชำระเงิน</span>
        </div>
        <div className={`${styles.stepLine} ${styles.stepLineOn}`}/>
        <div className={`${styles.stepItem} ${styles.stepOn}`}>
          <div className={styles.stepCircle}>3</div>
          <span>สำเร็จ</span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.card}>
          {/* Success animation */}
          <div className={styles.successCircle}>
            <i className="fa-solid fa-check" />
          </div>

          <h1 className={styles.title}>สั่งอาหารสำเร็จ! 🎉</h1>
          <p className={styles.sub}>ขอบคุณที่ใช้บริการ BiteSync<br/>ไรเดอร์กำลังเตรียมออกไปรับอาหารให้คุณ</p>

          <div className={styles.orderIdBox}>
            <span className={styles.orderLabel}>เลขที่ออเดอร์:</span>
            <span className={styles.orderVal}>#{orderId}</span>
          </div>

          <div className={styles.btnRow}>
            <button onClick={() => router.push(`/home/track/${orderId}`)} className={styles.btnTrack}>
              🛵 ติดตามออเดอร์ →
            </button>
            <button onClick={() => router.push(`/home/receipt/${orderId}`)} className={styles.btnReceipt}>
              📄 ดูใบเสร็จรับเงิน
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
