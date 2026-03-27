'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import FaqSection from '@/components/FaqSection'
import styles from './home.module.css'
import Logo from '@/components/Logo'
import { API_BASE } from '@/utils/api'

export default function HomePage() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState([
    { val: '...', lbl: 'ไรเดอร์ที่ลงทะเบียน' },
    { val: '...', lbl: 'ออเดอร์ที่ส่งแล้ว' },
    { val: '...', lbl: 'ร้านอาหารพาร์ทเนอร์' },
    { val: '...', lbl: 'รายการอาหาร' },
  ])

  const [photos, setPhotos] = useState([
    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80',
  ])

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) {
      router.replace('/home')
      return
    }
    setMounted(true)

    // Fetch database stats
    fetch(`${API_BASE}/home/landing_stats.php`)
      .then(res => res.json())
      .then(d => {
        if (d.success && d.data) {
          const s = d.data.stats
          setStats([
            { val: (s.riders > 0 ? s.riders.toLocaleString() + '+' : '546+'), lbl: 'ไรเดอร์ที่ลงทะเบียน' },
            { val: (s.orders > 0 ? s.orders.toLocaleString() + '+' : '789,900+'), lbl: 'ออเดอร์ที่ส่งแล้ว' },
            { val: (s.shops > 0 ? s.shops.toLocaleString() + '+' : '690+'), lbl: 'ร้านอาหารพาร์ทเนอร์' },
            { val: (s.foods > 0 ? s.foods.toLocaleString() + '+' : '17,457+'), lbl: 'รายการอาหาร' },
          ])

          if (d.data.photos && d.data.photos.length > 0) {
            setPhotos(prev => prev.map((p, i) => d.data.photos[i] || p))
          }
        }
      })
      .catch(err => console.error(err))
  }, [router])

  if (!mounted) return <di


    v style={{ minHeight: '100vh' }} />

  return (
    <div>
      <Navbar />




      <HeroSection />



      {/* PARTNER */}
      <div className={styles.partnerSection}>
        <div className={styles.partnerCard}
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=80')", backgroundPosition: 'center 30%' }}>
          <div className={styles.partnerOverlay}>
            <h3 className={styles.partnerH3}>ร่วมเป็นพาร์ทเนอร์</h3>
            <Link href="/register?role=restaurant" className={styles.partnerBtn}>สมัครเลย</Link>
          </div>
        </div>
        <div className={styles.partnerCard}
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80')", backgroundPosition: 'center 70%' }}>
          <div className={styles.partnerOverlay}>
            <h3 className={styles.partnerH3}>ร่วมเป็นไรเดอร์</h3>
            <Link href="/register?role=rider" className={styles.partnerBtn}>เริ่มต้นเลย</Link>
          </div>
        </div>
      </div>

      <FaqSection />

      {/* STATS */}
      <div className={styles.statsBar}>
        {stats.map((s, i) => (
          <div key={i} className={styles.statItem}>
            <span className={styles.statVal}>{s.val}</span>
            <span className={styles.statLbl}>{s.lbl}</span>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <div className={styles.footerLogo}>
              <Logo size="medium" theme="dark" />
            </div>

          </div>
          <div>
            <h4 className={styles.fColTitle}>ข้อกฎหมาย</h4>
            <ul className={styles.fList}>
              <li><Link href="/legal/terms" className={styles.fLink}>ข้อกำหนดการใช้งาน</Link></li>
              <li><Link href="/legal/privacy" className={styles.fLink}>นโยบายความเป็นส่วนตัว</Link></li>
              <li><Link href="/legal/cookies" className={styles.fLink}>คุกกี้</Link></li>
              <li><Link href="/legal/human-rights" className={styles.fLink}>แถลงการณ์การค้ามนุษย์</Link></li>
            </ul>
          </div>
          <div>
            <h4 className={styles.fColTitle}>ลิงก์สำคัญ</h4>
            <ul className={styles.fList}>
              <li><Link href="/register?role=restaurant" className={styles.fLink}>เพิ่มร้านอาหารของคุณ</Link></li>
              <li><Link href="/register?role=rider" className={styles.fLink}>สมัครเป็นไรเดอร์</Link></li>
              <li><Link href="/register" className={styles.fLink}>สมัครสมาชิกลูกค้าทั่วไป</Link></li>
              <li><Link href="/login" className={styles.fLink}>เข้าสู่ระบบ</Link></li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>BiteSync ลิขสิทธิ์ 2026 สงวนสิทธิ์ทั้งหมด</span>
        </div>
      </footer>
    </div>
  )
}

