import Link from 'next/link'
import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import FaqSection from '@/components/FaqSection'
import styles from './home.module.css'

const FOOD_PHOTOS = [
  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80',
]
const STATS = [
  { val:'546+',     lbl:'ไรเดอร์ที่ลงทะเบียน' },
  { val:'789,900+', lbl:'ออเดอร์ที่ส่งแล้ว' },
  { val:'690+',     lbl:'ร้านอาหารพาร์ทเนอร์' },
  { val:'17,457+',  lbl:'รายการอาหาร' },
]

export default function HomePage() {
  return (
    <div>
      <Navbar />

      <HeroSection />

      {/* FOOD GRID */}
      <div className={styles.foodGrid}>
        {FOOD_PHOTOS.map((src, i) => (
          <div key={i} className={styles.foodImgWrap}>
            <img src={src} alt={`อาหาร ${i+1}`} className={styles.foodImg} />
          </div>
        ))}
      </div>

      {/* PARTNER */}
      <div className={styles.partnerSection}>
        <div className={styles.partnerCard}
          style={{backgroundImage:"url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=80')"}}>
          <div className={styles.partnerOverlay}>
            <h3 className={styles.partnerH3}>ร่วมเป็นพาร์ทเนอร์</h3>
            <Link href="/register?role=restaurant" className={styles.partnerBtn}>สมัครเลย</Link>
          </div>
        </div>
        <div className={styles.partnerCard}
          style={{backgroundImage:"url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80')"}}>
          <div className={styles.partnerOverlay}>
            <h3 className={styles.partnerH3}>ร่วมเป็นไรเดอร์</h3>
            <Link href="/register?role=rider" className={styles.partnerBtn}>เริ่มต้นเลย</Link>
          </div>
        </div>
      </div>

      <FaqSection />

      {/* STATS */}
      <div className={styles.statsBar}>
        {STATS.map((s,i) => (
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
              <span className={styles.fLogoIcon}>🍃</span>
              <span className={styles.fLogoTxt}>Bite<span>Sync</span></span>
            </div>
            <p className={styles.footerDesc}>รับดีลพิเศษในกล่องจดหมาย</p>
            <div className={styles.emailRow}>
              <input className={styles.emailInput} type="email" placeholder="youremail@gmail.com"/>
              <button className={styles.subBtn}>สมัครรับข่าวสาร</button>
            </div>
            <div className={styles.footerApps}>
              {[['fa-apple','App Store'],['fa-google-play','Google Play']].map(([ic,lbl]) => (
                <div key={lbl} className={styles.appBtn}>
                  <i className={`fa-brands ${ic}`} style={{fontSize:17,color:'#fff'}}/>
                  <span>{lbl}</span>
                </div>
              ))}
            </div>
            <div className={styles.socialRow}>
              {['fa-facebook-f','fa-instagram','fa-twitter','fa-snapchat'].map(ic => (
                <a key={ic} href="#" className={styles.socialIcon}><i className={`fa-brands ${ic}`}/></a>
              ))}
            </div>
          </div>
          <div>
            <h4 className={styles.fColTitle}>ข้อกฎหมาย</h4>
            <ul className={styles.fList}>
              {['ข้อกำหนดการใช้งาน','นโยบายความเป็นส่วนตัว','คุกกี้','แถลงการณ์การค้ามนุษย์'].map(l => (
                <li key={l}><a href="#" className={styles.fLink}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className={styles.fColTitle}>ลิงก์สำคัญ</h4>
            <ul className={styles.fList}>
              {['ขอความช่วยเหลือ','เพิ่มร้านอาหารของคุณ','สมัครเป็นไรเดอร์','สร้างบัญชีธุรกิจ'].map(l => (
                <li key={l}><a href="#" className={styles.fLink}>{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>BiteSync ลิขสิทธิ์ 2024 สงวนสิทธิ์ทั้งหมด</span>
          <div style={{display:'flex',gap:16}}>
            {['นโยบายความเป็นส่วนตัว','เงื่อนไข','ราคา'].map(l => (
              <a key={l} href="#" className={styles.fBottomLink}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
