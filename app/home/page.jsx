'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const CATS = [
  { id: 'all', icon: '🍽️', label: 'ทั้งหมด' },
  { id: 'cake', icon: '🎂', label: 'เค้ก' },
  { id: 'icecream', icon: '🍦', label: 'ไอศกรีม' },
  { id: 'waffle', icon: '🧇', label: 'วาฟเฟิล' },
  { id: 'toast', icon: '🍞', label: 'ขนมปัง' },
  { id: 'drinks', icon: '🧋', label: 'เครื่องดื่ม' },
  { id: 'special', icon: '⭐', label: 'พิเศษ' },
]

const MOCK_RESTAURANTS = [
  { id: 1, name: 'มอกกี้เบเกอรี่', category: 'cake', rating: 4.8, reviews: 124, deliveryTime: '15-25', deliveryFee: 15, minOrder: 50, img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80', tag: 'ยอดนิยม', open: true },
  { id: 2, name: 'Sweet Garden', category: 'cake', rating: 4.6, reviews: 89, deliveryTime: '20-30', deliveryFee: 20, minOrder: 80, img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80', tag: 'ใหม่', open: true },
  { id: 3, name: 'Ice Paradise', category: 'icecream', rating: 4.7, reviews: 201, deliveryTime: '10-20', deliveryFee: 10, minOrder: 40, img: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&q=80', tag: 'แนะนำ', open: true },
  { id: 4, name: 'Waffle House', category: 'waffle', rating: 4.5, reviews: 67, deliveryTime: '25-35', deliveryFee: 15, minOrder: 60, img: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&q=80', tag: '', open: false },
  { id: 5, name: 'The Toast Bar', category: 'toast', rating: 4.9, reviews: 312, deliveryTime: '15-25', deliveryFee: 0, minOrder: 70, img: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400&q=80', tag: 'ส่งฟรี!', open: true },
  { id: 6, name: 'Boba & Co.', category: 'drinks', rating: 4.4, reviews: 155, deliveryTime: '10-15', deliveryFee: 10, minOrder: 30, img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', tag: '', open: true },
]

export default function HomePage() {
  const router = useRouter()
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [user, setUser] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
    const cart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    setCartCount(cart.length)
  }, [])

  const filtered = MOCK_RESTAURANTS.filter(r => {
    const matchCat = cat === 'all' || r.category === cat
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <div className={styles.logoMark}>🍃</div>
            <span className={styles.logoTxt}>Bite<em>Sync</em></span>
          </div>
          <div className={styles.searchWrap}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาร้านอาหาร..."
              className={styles.searchInp}
            />
          </div>
          <div className={styles.navRight}>
            <div className={styles.cartBtn} onClick={() => router.push('/checkout')}>
              <i className="fa-solid fa-basket-shopping" />
              {cartCount > 0 && <span className={styles.cartDot}>{cartCount}</span>}
            </div>
            {user ? (
              <div className={styles.userNavWrap}>
                <div className={styles.userAvatarBtn} onClick={() => setShowDropdown(!showDropdown)}>
                  <div className={styles.navAvatarCircle}>{(user.name || 'U')[0].toUpperCase()}</div>
                  <i className={`fa-solid fa-chevron-down ${showDropdown ? styles.rotate : ''}`} />
                </div>
                {showDropdown && (
                  <div className={`${styles.navDropdown} glass`}>
                    <div className={styles.dropdownInfo}>
                      <span className={styles.dropdownName}>{user.name}</span>
                      <span className={styles.dropdownRole}>{user.role || 'ลูกค้าระดับ VIP'}</span>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.dropdownItem} onClick={() => router.push('/profile')}>
                      <i className="fa-regular fa-circle-user" /> โปรไฟล์ของฉัน
                    </div>
                    <div className={styles.dropdownItem} onClick={() => router.push('/home')}>
                      <i className="fa-solid fa-utensils" /> สั่งอาหาร
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button onClick={() => {
                      localStorage.removeItem('bs_user');
                      localStorage.removeItem('bs_token');
                      window.location.href = '/';
                    }} className={`${styles.dropdownItem} ${styles.logout}`}>
                      <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className={styles.loginBtn}>เข้าสู่ระบบ</button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            เอาใจสัมผัส<br />
            <span className={styles.heroEm}>รวดเร็วและสดใหม่</span>
          </h1>
          <p className={styles.heroSub}>สั่งอาหารจากร้านโปรดส่งถึงหน้าบ้าน</p>
        </div>
      </div>

      <div className={styles.body}>
        {/* Category tabs */}
        <div className={styles.cats}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`${styles.catBtn} ${cat === c.id ? styles.catBtnOn : ''}`}>
              <span className={styles.catIcon}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Section title */}
        <div className={styles.secHdr}>
          <h2 className={styles.secTitle}>
            {cat === 'all' ? '🏪 ร้านอาหารทั้งหมด' : `${CATS.find(c => c.id === cat)?.icon} ${CATS.find(c => c.id === cat)?.label}`}
          </h2>
          <span className={styles.secCount}>{filtered.length} ร้าน</span>
        </div>

        {/* Restaurant grid */}
        <div className={styles.grid}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <span>🔍</span>
              <span>ไม่พบร้านอาหาร</span>
            </div>
          ) : filtered.map(r => (
            <div
              key={r.id}
              className={`${styles.restCard} ${!r.open ? styles.restCardClosed : ''}`}
              onClick={() => r.open && router.push(`food/${r.id}`)}
            >
              <div className={styles.restImgWrap}>
                <img src={r.img} alt={r.name} className={styles.restImg} />
                {r.tag && <span className={styles.restTag}>{r.tag}</span>}
                {!r.open && <div className={styles.closedOverlay}>ปิดอยู่</div>}
                {r.deliveryFee === 0 && r.open && (
                  <span className={styles.freeTag}>ส่งฟรี</span>
                )}
              </div>
              <div className={styles.restBody}>
                <div 
                  className={styles.restName}
                  onClick={(e) => { e.stopPropagation(); router.push(`/home/restaurant/${r.id}`) }}
                  style={{ cursor: 'pointer' }}
                >
                  {r.name}
                </div>
                <div className={styles.restMeta}>
                  <span className={styles.restRating}>⭐ {r.rating}</span>
                  <span className={styles.restDot}>·</span>
                  <span className={styles.restReviews}>{r.reviews} รีวิว</span>
                  <span className={styles.restDot}>·</span>
                  <span className={styles.restTime}>🕐 {r.deliveryTime} นาที</span>
                </div>
                <div className={styles.restFee}>
                  {r.deliveryFee === 0
                    ? <span className={styles.restFeeFree}>ส่งฟรี</span>
                    : <span>ค่าส่ง {r.deliveryFee} ฿</span>
                  }
                  <span className={styles.restDot}>·</span>
                  <span>สั่งขั้นต่ำ {r.minOrder} ฿</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
