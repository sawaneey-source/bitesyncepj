'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  return (
    <section className={styles.hero}>
      {/* Background image */}
      <div className={styles.heroBg} />
      <div className={styles.heroOverlay} />

      {/* Center content */}
      <div className={styles.heroCenter}>
        <p className={styles.heroSmall}>สั่งอาหารจากร้านโปรดของคุณ ส่งถึงบ้านรวดเร็วทันใจ</p>
        <h1 className={styles.heroH1}>
          เอาใจสัมผัส{' ' }
          <em className={styles.heroEm}>รวดเร็วและสดใหม่</em>
        </h1>
        <p className={styles.heroSub}>
          อาหารส่งถึงหน้าบ้านรวดเร็วทันใจ · ค้นหาร้านโปรดของคุณใกล้บ้านได้เลย
        </p>
        {/* Search removed as requested */}
      </div>
    </section>
  )
}
