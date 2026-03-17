'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'

const MOCK_SHOP = {
  id:1, name:'มอกกี้เบเกอรี่', category:'Bakery',
  rating:4.8, reviews:124, deliveryTime:'15-25', deliveryFee:15,
  address:'123 ถ.กาญจนวนิช อ.หาดใหญ่ จ.สงขลา',
  img:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
  open:true,
}

const MOCK_MENUS = [
  { id:1, name:'White Cherry Cake',  price:80,  category:'Cake',    rating:4.7, sold:45, img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&q=80',  desc:'เค้กสตรอว์เบอร์รี่สด หวานนุ่ม' },
  { id:2, name:'Chip Cookies',       price:65,  category:'Cake',    rating:4.5, sold:32, img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&q=80',  desc:'คุกกี้ช็อกโกแลตชิพ กรอบนอกนุ่มใน' },
  { id:3, name:'Coconut Flan',       price:90,  category:'Toast',   rating:4.8, sold:28, img:'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=300&q=80',  desc:'ฟลังมะพร้าวอ่อน หอมหวาน' },
  { id:4, name:'Lava Flan',          price:90,  category:'Cake',    rating:4.6, sold:19, img:'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&q=80',  desc:'ลาวาช็อกโกแลต ร้อนๆ เหนียวๆ' },
  { id:5, name:'Banana Cook',        price:65,  category:'Toast',   rating:4.4, sold:22, img:'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=300&q=80',  desc:'กล้วยอบกรอบ กินกับไอศกรีม' },
  { id:6, name:'Strawberry Waffle',  price:95,  category:'Waffle',  rating:4.9, sold:67, img:'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=300&q=80',  desc:'วาฟเฟิลสตรอว์เบอร์รี่ กรอบหอม' },
  { id:7, name:'Thai Milk Tea',      price:55,  category:'Drinks',  rating:4.5, sold:88, img:'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&q=80',  desc:'ชาไทยนม สูตรต้นตำรับ' },
  { id:8, name:'Matcha Latte',       price:65,  category:'Drinks',  rating:4.7, sold:54, img:'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=300&q=80',  desc:'มัทฉะลาเต้ นำเข้าจากญี่ปุ่น' },
]

const MOCK_REVIEWS = [
  { id:1, user:'สมชาย', avatar:'ส', rating:5, comment:'อร่อยมากครับ ส่งเร็ว ร้านนี้แนะนำเลย', date:'2 วันที่แล้ว', img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=100&q=70' },
  { id:2, user:'นิดา',  avatar:'น', rating:4, comment:'เค้กหอมมาก บรรจุภัณฑ์สวย แต่ส่งช้านิดหน่อย', date:'5 วันที่แล้ว', img:null },
  { id:3, user:'เอิร์ธ', avatar:'อ', rating:5, comment:'ประทับใจมากๆ ครั้งหน้าจะสั่งอีกแน่นอน', date:'1 สัปดาห์ที่แล้ว', img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=100&q=70' },
]

export default function RestaurantPage() {
  const router  = useRouter()
  const params  = useParams()
  const shopId  = params?.id

  const [tab, setTab]       = useState('Menu')
  const [catTab, setCatTab] = useState('ทั้งหมด')
  const [cart, setCart]     = useState([])
  const [user, setUser]     = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewText, setReviewText]         = useState('')
  const [reviewRating, setReviewRating]     = useState(5)
  const [showDropdown, setShowDropdown]     = useState(false)

  const shop   = MOCK_SHOP
  const cats   = ['ทั้งหมด', ...new Set(MOCK_MENUS.map(m => m.category))]
  const menus  = catTab === 'ทั้งหมด' ? MOCK_MENUS : MOCK_MENUS.filter(m => m.category === catTab)
  const totalItems = cart.reduce((s, c) => s + c.qty, 0)
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    setCart(saved)
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  function addToCart(menu) {
    setCart(prev => {
      const exists = prev.find(c => c.id === menu.id)
      const next   = exists
        ? prev.map(c => c.id === menu.id ? { ...c, qty: c.qty + 1 } : c)
        : [...prev, { ...menu, qty: 1 }]
      localStorage.setItem('bs_cart', JSON.stringify(next))
      return next
    })
  }

  function getQty(id) {
    return cart.find(c => c.id === id)?.qty || 0
  }

  return (
    <div className={styles.page}>
      {/* Back nav */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => router.push('/home')} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
          <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <div className={styles.logoMark}><i className="fa-solid fa-leaf" style={{color: 'white', fontSize: '14px'}} /></div>
            <span className={styles.logoTxt}>Bite<em>Sync</em></span>
          </div>
          <div className={styles.navRight}>
            <div className={styles.cartBtn} onClick={() => router.push('/checkout')}>
              <i className="fa-solid fa-basket-shopping" />
              {totalItems > 0 && <span className={styles.cartDot}>{totalItems}</span>}
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

      {/* Shop hero */}
      <div className={styles.shopHero}>
        <img src={shop.img} alt={shop.name} className={styles.shopHeroImg}/>
        <div className={styles.shopHeroOverlay}/>
        <div className={styles.shopHeroInfo}>
          <h1 className={styles.shopName}>{shop.name}</h1>
          <div className={styles.shopMeta}>
            <span>⭐ {shop.rating} ({shop.reviews} รีวิว)</span>
            <span>·</span>
            <span>🕐 {shop.deliveryTime} นาที</span>
            <span>·</span>
            <span>ค่าส่ง {shop.deliveryFee} ฿</span>
          </div>
          <div className={styles.shopAddr}>📍 {shop.address}</div>
          <span className={`${styles.openBadge} ${shop.open ? styles.openBadgeOpen : styles.openBadgeClosed}`}>
            {shop.open ? '● เปิดอยู่' : '● ปิดแล้ว'}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        {/* Tabs */}
        <div className={styles.tabs}>
          {['Menu','Reviews'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`${styles.tabBtn} ${tab===t?styles.tabBtnOn:''}`}>{t}</button>
          ))}
        </div>

        {tab === 'Menu' && (
          <div className={styles.menuSection}>
            {/* Category tabs */}
            <div className={styles.catTabs}>
              {cats.map(c => (
                <button key={c} onClick={() => setCatTab(c)} className={`${styles.catTab} ${catTab===c?styles.catTabOn:''}`}>{c}</button>
              ))}
            </div>

            {/* Menu grid */}
            <div className={styles.menuGrid}>
              {menus.map(m => {
                const qty = getQty(m.id)
                return (
                  <div key={m.id} className={styles.menuCard} onClick={() => router.push(`/food/${m.id}`)}>
                    <div className={styles.menuImgWrap}>
                      <img src={m.img} alt={m.name} className={styles.menuImg}/>
                    </div>
                    <div className={styles.menuBody}>
                      <div className={styles.menuName}>{m.name}</div>
                      <div className={styles.menuDesc}>{m.desc}</div>
                      <div className={styles.menuMeta}>
                        <span>⭐ {m.rating}</span>
                        <span>·</span>
                        <span>ขายแล้ว {m.sold}</span>
                      </div>
                      <div className={styles.menuFoot}>
                        <span className={styles.menuPrice}>{m.price} ฿</span>
                        <button
                          onClick={e => { e.stopPropagation(); addToCart(m) }}
                          className={styles.addBtn}
                        >
                          {qty > 0 ? `+${qty}` : '+'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Reviews' && (
          <div className={styles.reviewSection}>
            {/* Rating summary */}
            <div className={styles.ratingBox}>
              <div className={styles.ratingBig}>{shop.rating}</div>
              <div>
                <div className={styles.stars}>{'⭐'.repeat(Math.round(shop.rating))}</div>
                <div className={styles.ratingCount}>{shop.reviews} รีวิว</div>
              </div>
              <button onClick={() => setShowReviewForm(v => !v)} className={styles.btnAddReview}>
                + เขียนรีวิว
              </button>
            </div>

            {/* Review form */}
            {showReviewForm && (
              <div className={styles.reviewForm}>
                <h3 className={styles.reviewFormTitle}>Food Review</h3>
                <div className={styles.starRow}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} onClick={() => setReviewRating(s)} className={`${styles.starBtn} ${s<=reviewRating?styles.starBtnOn:''}`}>★</span>
                  ))}
                </div>
                <input placeholder="ชื่อของคุณ" className={styles.reviewInp}/>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="เล่าประสบการณ์ของคุณ..." rows={3} className={`${styles.reviewInp} ${styles.reviewTa}`}/>
                <div className={styles.uploadRow}>
                  <button className={styles.uploadBtn}>📷 อัปโหลดรูป</button>
                </div>
                <button className={styles.submitReviewBtn}>ส่งรีวิว</button>
              </div>
            )}

            {/* Review list */}
            <div className={styles.reviewList}>
              {MOCK_REVIEWS.map(r => (
                <div key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewTop}>
                    <div className={styles.reviewAvatar}>{r.avatar}</div>
                    <div className={styles.reviewInfo}>
                      <div className={styles.reviewUser}>{r.user}</div>
                      <div className={styles.reviewStars}>{'⭐'.repeat(r.rating)}</div>
                    </div>
                    <span className={styles.reviewDate}>{r.date}</span>
                  </div>
                  <p className={styles.reviewComment}>{r.comment}</p>
                  {r.img && <img src={r.img} className={styles.reviewImg}/>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div className={styles.cartBar} onClick={() => router.push('/checkout')}>
          <span className={styles.cartBarCount}>{totalItems}</span>
          <span className={styles.cartBarTxt}>ดูตะกร้า</span>
          <span className={styles.cartBarPrice}>{totalPrice} ฿</span>
        </div>
      )}
    </div>
  )
}
