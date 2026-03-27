'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'



export default function FoodDetailPage() {
  const router = useRouter()
  const params = useParams()

  const [food, setFood] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [selectedAddons, setSelA] = useState([])
  const [note, setNote]           = useState('')
  const [toast, setToast]         = useState(null)
  const [cart, setCart]           = useState([])
  const [user, setUser]           = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [lastOrder, setLastOrder]       = useState(null)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    setCart(saved)
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
    setLastOrder(localStorage.getItem('bs_last_order') || null)

    const foodId = params?.id
    if (foodId) {
      fetch(`http://localhost/bitesync/api/home/food_detail.php?id=${foodId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setFood(d.data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [params?.id])

  function toggleAddon(addon) {
    setSelA(prev => {
      const exists = prev.find(a => a.id === addon.id)
      if (exists) return prev.filter(a => a.id !== addon.id)
      return [...prev, { ...addon, qty: 1 }]
    })
  }

  function incAddon(id) {
    setSelA(prev => prev.map(a => a.id === id ? { ...a, qty: (a.qty || 1) + 1 } : a))
  }

  function decAddon(id) {
    setSelA(prev => {
      const exists = prev.find(a => a.id === id)
      const currentQty = exists?.qty || 1
      if (exists && currentQty > 1) {
        return prev.map(a => a.id === id ? { ...a, qty: currentQty - 1 } : a)
      }
      return prev.filter(a => a.id !== id)
    })
  }

  const addonTotal = selectedAddons.reduce((s, a) => {
    const p = parseFloat(a.price) || 0
    const q = Number(a.qty) || 1
    return s + (p * q)
  }, 0)
  
  const basePrice    = Number(food?.price) || 0
  const mainQty      = Number(qty) || 1
  const addonPerUnit = selectedAddons.reduce((s, a) => s + (Number(a.price) * (Number(a.qty) || 1)), 0)
  const total        = Math.round((basePrice + addonPerUnit) * mainQty)
  
  const totalItems = (cart || []).reduce((s, c) => s + (Number(c.qty) || 0), 0)
  const totalPrice = (cart || []).reduce((s, c) => s + (Number(c.price || 0) * Number(c.qty || 0)), 0)

  function addToCart() {
    if (!food || !food.available) return;
    if (parseInt(food.shopOpen) === 0) {
      alert("ขออภัย ขณะนี้ร้านค้าปิดรับออเดอร์ชั่วคราว")
      return
    }
    const nextCart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    const item = {
      id: food.id, name: food.name, 
      price: Math.round(basePrice + addonPerUnit),
      qty: mainQty, addons: selectedAddons, note, img: food.img,
      ShopId: food.ShopId, shopName: food.shopName,
    }
    // Deep equal for addons to group similar items
    const exists = nextCart.findIndex(c => {
      if (c.id !== food.id) return false;
      const cAddons = c.addons || [];
      const sAddons = selectedAddons || [];
      if (cAddons.length !== sAddons.length) return false;
      
      const a1 = [...cAddons].sort((a,b) => (a.id || 0) - (b.id || 0));
      const a2 = [...sAddons].sort((a,b) => (a.id || 0) - (b.id || 0));
      return JSON.stringify(a1) === JSON.stringify(a2);
    })
    
    if (exists >= 0) nextCart[exists].qty += qty
    else nextCart.push(item)
    
    localStorage.setItem('bs_cart', JSON.stringify(nextCart))
    setCart(nextCart)
    setToast('เพิ่มลงตะกร้าแล้ว!')
    setTimeout(() => { setToast(null) }, 1200)
  }

  if (loading) return <div className={styles.loading}>กำลังโหลด...</div>
  if (!food) return (
    <div className={styles.notFound}>
      <h2>ไม่พบข้อมูลอาหาร</h2>
      <button onClick={() => router.back()} className={styles.backBtn}>กลับ</button>
    </div>
  )

  return (
    <div className={styles.page}>
      {toast && <div className={styles.toast}>✅ {toast}</div>}

      {/* Nav */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => router.back()} className={styles.backBtn}>
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
                    {lastOrder && (
                      <div className={styles.dropdownItem} onClick={() => router.push(`/home/track/${lastOrder}`)}>
                        <i className="fa-solid fa-motorcycle" /> ติดตามออเดอร์
                      </div>
                    )}
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
                onClick={() => router.push(`/home/restaurant/${food.ShopId}`)}
                style={{ cursor: 'pointer' }}
              >
                🏪 {food.shopName}
              </div>
              <h1 className={styles.foodName}>{food.name}</h1>
              <div className={styles.foodMeta}>
                {food.reviews > 0 ? (
                  <>
                    <span className={styles.foodRating}>⭐ {Number(food.rating).toFixed(1)}</span>
                    <span className={styles.foodDot}>·</span>
                    <span className={styles.foodReviews}>({food.reviews} รีวิว)</span>
                  </>
                ) : (
                  <span className={styles.foodRating}>⭐ ยังไม่มีรีวิว</span>
                )}
                <span className={styles.foodDot}>·</span>
                <span className={styles.foodCat}>{food.category}</span>
                <span className={styles.foodDot}>·</span>
                <span className={styles.foodTime}>🕐 {food.deliveryTime || 30} นาที</span>
              </div>
              <p className={styles.foodDesc}>{food.desc}</p>

              <div className={styles.priceRow}>
                <span className={styles.basePrice}>{Math.round(basePrice)} ฿</span>
                {addonTotal > 0 && <span className={styles.addonPrice}>+ {Math.round(addonTotal)} ฿ (add-ons)</span>}
              </div>

              <div className={styles.addonsSection}>
                <h3 className={styles.addonsTitle}>Additional Items</h3>
                {food.addons.map(a => {
                  const sel = selectedAddons.find(s => s.id === a.id)
                  return (
                    <div key={a.id} className={`${styles.addonRow} ${sel ? styles.addonRowOn : ''}`}>
                      <div className={styles.addonLeft} onClick={() => toggleAddon(a)}>
                        <div className={`${styles.check} ${sel ? styles.checkOn : ''}`}>
                          {sel && <i className="fa-solid fa-check" />}
                        </div>
                        <span className={styles.addonName}>{a.name}</span>
                      </div>
                      
                      <div className={styles.addonRight}>
                        {sel && (
                          <div className={styles.addonQty}>
                            <button onClick={() => decAddon(a.id)} className={styles.aQtyBtn}>−</button>
                            <span className={styles.aQtyNum}>{sel.qty}</span>
                            <button onClick={() => incAddon(a.id)} className={styles.aQtyBtn}>+</button>
                          </div>
                        )}
                        <span className={styles.addonPrice2}>+{a.price * (sel?.qty || 1)} ฿</span>
                      </div>
                    </div>
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
                <span className={styles.totalVal}>{Math.round(total)} ฿</span>
              </div>

              {/* Add to cart */}
              <button 
                onClick={(food.available && parseInt(food.shopOpen) !== 0) ? addToCart : null} 
                className={`${styles.addCartBtn} ${(!food.available || parseInt(food.shopOpen) === 0) ? styles.addCartBtnOff : ''}`}
                disabled={!food.available || parseInt(food.shopOpen) === 0}
              >
                {parseInt(food.shopOpen) === 0 ? 'ร้านปิดให้บริการ' : (food.available ? `Add to Cart — ${Math.round(total)} ฿` : 'สินค้าหมด')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews Section ── */}
      {food.reviewsList && food.reviewsList.length > 0 && (
        <div className={styles.reviewsSection}>
          <div className={styles.reviewsInner}>
            <h3 className={styles.revSectionTitle}>รีวิวจากลูกค้า ({food.reviews})</h3>
            <div className={styles.reviewsList}>
              {food.reviewsList.map(r => (
                <div key={r.ReviewId} className={styles.reviewCard}>
                  <div className={styles.revHdr}>
                    <div className={styles.revUser}>
                      <div className={styles.revAvatar}>{r.userName?.[0]?.toUpperCase() || 'U'}</div>
                      <div>
                        <div className={styles.revName}>{r.userName}</div>
                        <div className={styles.revDate}>{new Date(r.ReviewAt).toLocaleDateString('th-TH')}</div>
                      </div>
                    </div>
                    <div className={styles.revStars}>
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className={`fa-solid fa-star ${i < r.ReviewScore ? styles.starActive : styles.starDim}`} />
                      ))}
                    </div>
                  </div>
                  {r.ReviewText && <p className={styles.revText}>{r.ReviewText}</p>}
                  {(r.ReviewImg1 || r.ReviewImg2 || r.ReviewImg3) && (
                    <div className={styles.revImgs}>
                      {[r.ReviewImg1, r.ReviewImg2, r.ReviewImg3].filter(Boolean).map((img, i) => (
                        <img key={i} src={`/${img}`} alt={`review-${i}`} className={styles.revImg} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div 
          className={`${styles.cartBar} ${parseInt(food?.shopOpen) === 0 ? styles.cartBarDisabled : ''}`} 
          onClick={() => {
            if (parseInt(food?.shopOpen) !== 0) router.push('/checkout')
            else alert("ขออภัย ขณะนี้ร้านค้าปิดรับออเดอร์ชั่วคราว")
          }}
        >
          <span className={styles.cartBarCount}>{totalItems}</span>
          <span className={styles.cartBarTxt}>{parseInt(food?.shopOpen) !== 0 ? 'ดูตะกร้า' : 'ร้านค้าปิดให้บริการ'}</span>
          <span className={styles.cartBarPrice}>{totalPrice} ฿</span>
        </div>
      )}
    </div>
  )
}

