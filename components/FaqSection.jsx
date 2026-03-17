'use client'
import { useState } from 'react'
import styles from './FaqSection.module.css'

const TABS = ['คำถามที่พบบ่อย', 'เกี่ยวกับเรา', 'โปรแกรมพาร์ทเนอร์', 'ช่วยเหลือ']

const FAQ_DATA = [
  {
    q: 'รับชำระเงินวิธีใดบ้าง?',
    a: 'เรารับชำระเงินผ่าน QR Code (PromptPay) และเงินสดเมื่อถึงที่หมาย รองรับทุกธนาคารในประเทศไทย เช่น กสิกร, กรุงไทย, SCB, Bangkok Bank และอื่นๆ อีกมากมาย',
  },
  {
    q: 'ติดตามออเดอร์แบบ real-time ได้ไหม?',
    a: 'ได้เลยครับ! คุณสามารถติดตามออเดอร์แบบ real-time ผ่านแผนที่ได้ตลอดเวลา ตั้งแต่ร้านรับออเดอร์ จนถึงไรเดอร์ส่งถึงหน้าบ้านคุณ',
  },
  {
    q: 'มีส่วนลดหรือโปรโมชั่นพิเศษไหม?',
    a: 'มีโปรโมชั่นพิเศษทุกสัปดาห์! สมัครสมาชิกและกดรับการแจ้งเตือนเพื่อรับข้อเสนอพิเศษก่อนใคร นอกจากนี้ยังมีโค้ดส่วนลดสำหรับลูกค้าใหม่ด้วย',
  },
  {
    q: 'BiteSync ให้บริการในพื้นที่ของฉันไหม?',
    a: 'BiteSync ให้บริการในเขตหาดใหญ่และพื้นที่ใกล้เคียงในจังหวัดสงขลา กำลังขยายไปยังจังหวัดอื่นๆ ในภาคใต้เร็วๆ นี้ ติดตามข่าวสารได้ทางโซเชียลมีเดียของเรา',
  },
]

const HOW_STEPS = [
  { icon: '📱', title: 'สั่งอาหาร!',       desc: 'สั่งอาหารผ่านเว็บไซต์หรือแอปมือถือ' },
  { icon: '📍', title: 'ติดตามออเดอร์',    desc: 'ดูสถานะออเดอร์แบบ real-time ตลอดเวลา' },
  { icon: '🎉', title: 'รับอาหารของคุณ!', desc: 'รับอาหารที่บ้านอย่างรวดเร็วทันใจ!' },
]

export default function FaqSection() {
  const [activeTab, setActiveTab] = useState(0)
  const [openIdx, setOpenIdx]     = useState(null)   // accordion index

  function toggleQ(i) {
    setOpenIdx(prev => prev === i ? null : i)
  }

  return (
    <section className={styles.faqSection}>
      <div className={styles.faqHeader}>
        <h2 className={styles.faqTitle}>รู้จักเราเพิ่มเติม!</h2>
        <div className={styles.faqTabs}>
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`${styles.faqTab} ${activeTab === i ? styles.faqTabActive : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.faqContent}>

        {/* LEFT — Accordion */}
        <div className={styles.faqQuestions}>
          {FAQ_DATA.map((item, i) => (
            <div key={i} className={`${styles.faqItem} ${openIdx === i ? styles.faqItemOpen : ''}`}>
              <button className={styles.faqQ} onClick={() => toggleQ(i)}>
                <span>{item.q}</span>
                <i className={`fa-solid ${openIdx === i ? 'fa-chevron-up' : 'fa-chevron-down'} ${styles.faqChevron}`} />
              </button>
              {openIdx === i && (
                <div className={styles.faqAnswer}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* RIGHT — How it works */}
        <div className={styles.faqHow}>
          <span className={styles.faqBadge}>BiteSync ทำงานอย่างไร? 🛵</span>
          <div className={styles.stepsGrid}>
            {HOW_STEPS.map((s, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepIcon}>{s.icon}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div className={styles.howDesc}>
            สั่งอาหารที่ชอบ เลือกร้านโปรด เราจะส่งให้ถึงมือคุณอย่างรวดเร็ว
            ผ่านระบบไรเดอร์ที่มีประสิทธิภาพ ติดตามได้ตลอดเวลา!
          </div>
        </div>

      </div>
    </section>
  )
}
