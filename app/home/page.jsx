'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import Logo from '@/components/Logo'
import Navbar from '@/components/Navbar'

const CATS = [
  { id: 'all', icon: '🍽️', label: 'ทั้งหมด' },
  { id: 'อาหารตามสั่ง', icon: '🍳', label: 'อาหารตามสั่ง' },
  { id: 'ก๋วยเตี๋ยว', icon: '🍜', label: 'ก๋วยเตี๋ยว' },
  { id: 'กาแฟและชา', icon: '☕', label: 'กาแฟและชา' },
  { id: 'อาหารไทย', icon: '🥘', label: 'อาหารไทย' },
  { id: 'อาหารจีน', icon: '🥟', label: 'อาหารจีน' },
  { id: 'อาหารอิตาเลี่ยน', icon: '🍕', label: 'อาหารอิตาเลี่ยน' },
  { id: 'อาหารแม็กซิกัน', icon: '🌮', label: 'อาหารแม็กซิกัน' },
  { id: 'อาหารเวียดนาม', icon: '🍲', label: 'อาหารเวียดนาม' },
  { id: 'อาหารเกาหลี', icon: '🇰🇷', label: 'อาหารเกาหลี' },
  { id: 'อาหารภาคเหนือ', icon: '🏔️', label: 'อาหารภาคเหนือ' },
  { id: 'อาหารภาคอิสาน', icon: '🌶️', label: 'อาหารภาคอิสาน' },
  { id: 'อาหารภาคใต้', icon: '🌊', label: 'อาหารภาคใต้' },
  { id: 'ยำ', icon: '🥗', label: 'ยำ' },
  { id: 'ต้ม', icon: '🥣', label: 'ต้ม' },
  { id: 'แกง', icon: '🍛', label: 'แกง' },
  { id: 'ผัด', icon: '🍳', label: 'ผัด' },
  { id: 'ทอด', icon: '🍗', label: 'ทอด' },
  { id: 'ปิ้งย่าง', icon: '🍢', label: 'ปิ้งย่าง' },
  { id: 'อาหารจานด่วน', icon: '🍔', label: 'อาหารจานด่วน' },
  { id: 'ทานเล่น', icon: '🍟', label: 'ทานเล่น' },
  { id: 'มังสวิรัต', icon: '🥦', label: 'มังสวิรัต' },
  { id: 'นํ้าผลไม้', icon: '🍹', label: 'นํ้าผลไม้' },
  { id: 'อาหารทะเล', icon: '🦐', label: 'อาหารทะเล' },
  { id: 'สเต๊ก', icon: '🥩', label: 'สเต๊ก' },
]


export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAllCats, setShowAllCats] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))
    const cart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    setCartCount(cart.length)

    fetch('http://localhost/bitesync/api/home/foods.php')
      .then(r => r.json())
      .then(d => {
        if (d.success) setFoods(d.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Fetch Error (Foods):', err)
        setFoods([])
        setLoading(false)
      })
  }, [])

  const filtered = foods.filter(r => {
    const matchCat = cat === 'all' || r.shopCategory === cat || r.category === cat
    const s = search.toLowerCase()
    const matchSearch = r.name.toLowerCase().includes(s) || (r.shopName || '').toLowerCase().includes(s)
    return matchCat && matchSearch
  })

  return (
    <div className={styles.page}>
      <Navbar
        showSearch={true}
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className={styles.body}>
        <div className={styles.discovery}>

          {/* 1. Welcome Greeting */}
          <div className={styles.welcome}>
            <h1 className={styles.greeting}>
              สวัสดีคุณ {user?.name || 'ลูกค้า'}! 👋
            </h1>
            <p className={styles.subGreeting}>วันนี้เราคัดสรรเมนูสุดพิเศษมาเพื่อคุณโดยเฉพาะ</p>
          </div>

          {/* 3. Category Grid */}
          <div className={styles.catGrid}>
            {(showAllCats ? CATS : CATS.slice(0, 11)).map(c => (
              <div 
                key={c.id} 
                onClick={() => setCat(c.id)} 
                className={`${styles.catItem} ${cat === c.id ? styles.catItemActive : ''}`}
              >
                <div className={styles.catIconWrap}>
                  {c.icon}
                </div>
                <span className={styles.catLabel}>{c.label}</span>
              </div>
            ))}
            
            {!showAllCats && (
              <div className={styles.catItem} onClick={() => setShowAllCats(true)}>
                <div className={styles.catIconWrap} style={{ background: '#f8f9f8', color: '#999' }}>
                  ➕
                </div>
                <span className={styles.catLabel}>เพิ่มเติม</span>
              </div>
            )}
            
            {showAllCats && (
              <div className={styles.catItem} onClick={() => setShowAllCats(false)}>
                <div className={styles.catIconWrap} style={{ background: '#f8f9f8', color: '#999' }}>
                  ➖
                </div>
                <span className={styles.catLabel}>น้อยลง</span>
              </div>
            )}
          </div>

          <div className={styles.exploreSection}>
            <div className={styles.secHdr}>
              <h2 className={styles.secTitle}>
                {cat === 'all' ? '🍱 เมนูเด็ดแนะนำสำหรับคุณ' : `✨ เมนู ${CATS.find(c => c.id === cat)?.label}`}
              </h2>
              <span className={styles.secCount}>{filtered.length} รายการ</span>
            </div>

            <div className={styles.grid}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                <span>🔍</span>
                <span>ไม่พบรายการอาหารในหมวดหมู่นี้</span>
              </div>
            ) : filtered.map((r, idx) => (
              <div
                key={r.id || idx}
                className={`${styles.restCard} ${!r.open ? styles.restCardClosed : ''}`}
              >
                <div
                  className={styles.restImgWrap}
                  onClick={() => {
                    if (r.id) router.push(`/food/${r.id}`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={r.img} alt={r.name} className={styles.restImg} />
                  {r.tag && <span className={styles.restTag}>{r.tag}</span>}
                  {!r.open && <div className={styles.closedOverlay}>ร้านปิดอยู่</div>}
                  {!r.available && <div className={styles.closedOverlay}>หมด</div>}
                </div>
                <div className={styles.restBody}>
                  <div
                    className={styles.restName}
                    onClick={() => {
                      if (r.id) router.push(`/food/${r.id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {r.name}
                  </div>
                  <div
                    className={styles.shopLink}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (r.ShopId) router.push(`/home/restaurant/${r.ShopId}`);
                    }}
                  >
                    🏪 {r.shopName}
                  </div>

                  <div className={styles.restMeta}>
                    {r.reviews > 0 ? (
                      <>
                        <span className={styles.restRating}>⭐ {Number(r.rating).toFixed(1)}</span>
                        <span className={styles.restDot}>·</span>
                        <span className={styles.restReviews}>({r.reviews} รีวิว)</span>
                        <span className={styles.restDot}>·</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.restRating}>⭐ ยังไม่มีรีวิว</span>
                        <span className={styles.restDot}>·</span>
                      </>
                    )}
                    <span className={styles.restTime}>🕐 {r.deliveryTime || 30} นาที</span>
                  </div>
                  <div className={styles.restFee}>
                    <span className={styles.priceTag}>{r.price} ฿</span>
                    <span className={styles.restDot}>·</span>
                    {r.deliveryFee === 0
                      ? <span className={styles.restFeeFree}>ส่งฟรี</span>
                      : <span>ค่าส่งเริ่มต้น {r.deliveryFee} ฿</span>
                    }
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

