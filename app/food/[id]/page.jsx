'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'

const MOCK_FOOD = {
  id: 1, name: 'Our Easiest Dessert Ideas', price: 75, rating: 4.8, reviews: 42,
  category: 'Dessert', shopId: 1, shopName: 'มอกกี้เบเกอรี่',
  desc: 'ช็อกโกแลตเค้กเนื้อนุ่ม ทำจากช็อกโกแลตนำเข้าคุณภาพสูง ตกแต่งด้วยสตรอว์เบอร์รี่สดและวิปครีม รสชาติหวานนุ่มถูกใจคนรักของหวาน',
  img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80',
  addons: [
    { id: 1, name: 'Extra Ice Cream', price: 20 },
    { id: 2, name: 'Chocolate Sauce', price: 15 },
    { id: 3, name: 'Extra Strawberry', price: 25 },
    { id: 4, name: 'Whipped Cream', price: 10 },
  ],
  available: true,
}

export default function FoodDetailPage() {
  const router = useRouter()
  const params = useParams()

  const food = MOCK_FOOD
  const [qty, setQty] = useState(1)
  const [selectedAddons, setSelA] = useState([])
  const [note, setNote]           = useState('')
  const [toast, setToast]         = useState(null)
  const [cart, setCart]           = useState([])
  const [user, setUser]           = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    setCart(saved)
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  function toggleAddon(addon) {
    setSelA(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0)
  const total      = (food.price + addonTotal) * qty
  const totalItems = cart.reduce((s, c) => s + c.qty, 0)
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0)

  function addToCart() {
    const nextCart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    const item = {
      id: food.id, name: food.name, price: food.price + addonTotal,
      qty, addons: selectedAddons, note, img: food.img,
      shopId: food.shopId, shopName: food.shopName,
    }
    const exists = nextCart.findIndex(c => c.id === food.id && JSON.stringify(c.addons) === JSON.stringify(selectedAddons))
    if (exists >= 0) nextCart[exists].qty += qty
    else nextCart.push(item)
    
    localStorage.setItem('bs_cart', JSON.stringify(nextCart))
    setCart(nextCart)
    setToast('เพิ่มลงตะกร้าแล้ว!')
    setTimeout(() => { setToast(null) }, 1200)
  }

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>✅ {toast}</div>}

      {/* Nav */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => router.push(`/home/restaurant/${food.shopId}`)} className={styles.backBtn}>
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

      <div className={styles.body}>
        <div className={styles.layout}>
          {/* LEFT — image */}
          <div className={styles.imgSide}>
            <div className={styles.imgWrap}>
              <img src={food.img} alt={food.name} className={styles.foodImg} />
              <span className={`${styles.availBadge} ${food.available ? styles.availOn : styles.availOff}`}>
                {food.available ? '✓ confirmed' : 'หมด'}
              </span>
            </div>
          </div>

          {/* RIGHT — detail */}
          <div className={styles.detailSide}>
            <div className={styles.card}>
              <div
                className={styles.shopTag}
                onClick={() => router.push(`/home/restaurant/${food.shopId}`)}
                style={{ cursor: 'pointer' }}
              >
                🏪 {food.shopName}
              </div>
              <h1 className={styles.foodName}>{food.name}</h1>
              <div className={styles.foodMeta}>
                <span>⭐ {food.rating}</span>
                <span>·</span>
                <span>{food.reviews} รีวิว</span>
                <span>·</span>
                <span className={styles.foodCat}>{food.category}</span>
              </div>
              <p className={styles.foodDesc}>{food.desc}</p>

              <div className={styles.priceRow}>
                <span className={styles.basePrice}>{food.price} ฿</span>
                {addonTotal > 0 && <span className={styles.addonPrice}>+ {addonTotal} ฿ (add-ons)</span>}
              </div>

              {/* Add-ons */}
              <div className={styles.addonsSection}>
                <h3 className={styles.addonsTitle}>Additional Items</h3>
                {food.addons.map(a => {
                  const sel = selectedAddons.find(s => s.id === a.id)
                  return (
                    <label key={a.id} className={`${styles.addonRow} ${sel ? styles.addonRowOn : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!sel}
                        onChange={() => toggleAddon(a)}
                        style={{ accentColor: '#2a6129' }}
                      />
                      <span className={styles.addonName}>{a.name}</span>
                      <span className={styles.addonPrice2}>+{a.price} ฿</span>
                    </label>
                  )
                })}
              </div>

              {/* Quantity */}
              <div className={styles.qtySection}>
                <span className={styles.qtyLabel}>Quantity</span>
                <div className={styles.qtyCtrl}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className={styles.qtyBtn}>−</button>
                  <span className={styles.qtyNum}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className={styles.qtyBtn}>+</button>
                </div>
              </div>

              {/* Total */}
              <div className={styles.totalRow}>
                <span className={styles.totalLbl}>Total</span>
                <span className={styles.totalVal}>{total} ฿</span>
              </div>

              {/* Add to cart */}
              <button onClick={addToCart} className={styles.addCartBtn}>
                Add to Cart — {total} ฿
              </button>
            </div>
          </div>
        </div>
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
