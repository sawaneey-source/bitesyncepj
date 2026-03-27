'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Logo from '@/components/Logo'
import Navbar from '@/components/Navbar'


export default function RestaurantPage() {
  const router = useRouter()
  const params = useParams()
  const shopId = params?.id

  const [tab, setTab] = useState('Menu')
  const [catTab, setCatTab] = useState('ทั้งหมด')
  const [cart, setCart] = useState([])
  const [user, setUser] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [shop, setShop] = useState(null)
  const [menus_raw, setMenusRaw] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  // Review Form States
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewFoodId, setReviewFoodId] = useState(0)
  const [reviewImages, setReviewImages] = useState([]) // up to 3 files
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingMenu, setPendingMenu] = useState(null)

  const cats = ['ทั้งหมด', ...new Set(menus_raw.map(m => m.category))]
  const menus = catTab === 'ทั้งหมด' ? menus_raw : menus_raw.filter(m => m.category === catTab)
  const totalItems = (cart || []).reduce((s, c) => s + (Number(c.qty) || 0), 0)
  const totalPrice = (cart || []).reduce((s, c) => {
    const p = parseFloat(c.price) || 0
    const q = Number(c.qty) || 0
    return s + (p * q)
  }, 0)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))

    const saved = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    setCart(saved)

    if (shopId) {
      console.log('Fetching details for shop:', shopId);
      fetch(`http://localhost/bitesync/api/home/restaurant_detail.php?id=${shopId}`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
          return r.json();
        })
        .then(d => {
          console.log('API Response:', d);
          if (d.success) {
            setShop(d.data);
            setMenusRaw(d.menus || []);
            setReviews(d.reviews || []);
            if (d.menus && d.menus.length > 0) setReviewFoodId(d.menus[0].id);
          } else {
            console.error('API Error:', d.message);
          }
        })
        .catch(err => console.error('Fetch Error:', err))
        .finally(() => setLoading(false))
    }
  }, [shopId, router])

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (submitting) return;

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('usrId', user.id);
      form.append('foodId', reviewFoodId);
      form.append('score', reviewScore);
      form.append('text', reviewNote);
      reviewImages.slice(0, 3).forEach((f, i) => form.append(`img${i + 1}`, f));

      const res = await fetch('http://localhost/bitesync/api/home/submit_review.php', {
        method: 'POST',
        body: form
      });
      const d = await res.json();
      if (d.success) {
        setShowReviewForm(false);
        setReviewNote('');
        setReviewScore(5);
        setReviewImages([]);
        // Refresh reviews
        const res2 = await fetch(`http://localhost/bitesync/api/home/restaurant_detail.php?id=${shopId}`);
        const d2 = await res2.json();
        if (d2.success) setReviews(d2.reviews || []);
      } else {
        alert(d.message);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งรีวิว');
    } finally {
      setSubmitting(false);
    }
  };

  function addToCart(menu) {
    if (!menu.available) return
    if (shop && !shop.open) {
      alert("ขออภัย ขณะนี้ร้านค้าปิดรับออเดอร์ชั่วคราว")
      return
    }

    const currentCart = JSON.parse(localStorage.getItem('bs_cart') || '[]')
    if (currentCart.length > 0) {
      const firstItem = currentCart[0]
      const cartShopId = firstItem.ShopId || firstItem.shopId
      const targetShopId = shop.id || shop.ShopId

      if (cartShopId && targetShopId && cartShopId != targetShopId) {
        setPendingMenu(menu)
        setShowConfirm(true)
        return
      }
    }

    performAddToCart(menu)
  }

  function performAddToCart(menu) {
    setCart(prev => {
      const exists = prev.find(c => c.id === menu.id)
      const next = exists
        ? prev.map(c => c.id === menu.id ? { ...c, qty: c.qty + 1 } : c)
        : [...prev, { ...menu, qty: 1, shopId: shop.id }]
      localStorage.setItem('bs_cart', JSON.stringify(next))
      return next
    })
  }

  function getQty(id) {
    return cart.find(c => c.id === id)?.qty || 0
  }

  if (loading) return <div className={styles.loading}>กำลังโหลด...</div>
  if (!shop) return (
    <div className={styles.notFound}>
      <h2>ไม่พบร้านอาหาร</h2>
      <button onClick={() => router.push('/home')} className={styles.backBtn}>กลับหน้าหลัก</button>
    </div>
  )

  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <Navbar />

      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        {shop.banner ? (
          <img src={shop.banner} alt={shop.name} className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder} />
        )}
        <div className={styles.heroOverlay} />
        <div className={styles.heroInfo}>
          <div className={styles.shopMetaTop}>
            {shop.img ? (
              <img src={shop.img} alt="Logo" className={styles.heroLogo} />
            ) : (
              <div className={styles.heroLogoPlaceholder}>
                {shop.name ? shop.name[0].toUpperCase() : 'B'}
              </div>
            )}
            <h1 className={styles.shopName}>{shop.name}</h1>
          </div>
          <div className={styles.shopMeta}>
            {shop.reviews > 0 ? (
              <>
                <span>⭐ {Number(shop.rating).toFixed(1)}</span>
                <span>·</span>
                <span>({shop.reviews} รีวิว)</span>
                <span>·</span>
              </>
            ) : (
              <>
                <span>⭐ ยังไม่มีรีวิว</span>
                <span>·</span>
              </>
            )}
            <span>🕐 {shop.deliveryTime || 30} นาที</span>
            <span>·</span>
            <span className={styles.deliveryFee}>
              {shop.deliveryFee > 0 ? `ค่าส่งเริ่มต้น ฿${shop.deliveryFee}` : 'ส่งฟรี'}
            </span>
            {!shop.open && (
              <span className={styles.closedTag}>ปิดรับออเดอร์</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Tabs (Menu / Reviews) ── */}
        <div className={styles.mainTabs}>
          <button
            onClick={() => setTab('Menu')}
            className={`${styles.tabBtn} ${tab === 'Menu' ? styles.tabBtnActive : ''}`}
          >
            📋 เมนูอาหาร
          </button>
          <button
            onClick={() => setTab('Reviews')}
            className={`${styles.tabBtn} ${tab === 'Reviews' ? styles.tabBtnActive : ''}`}
          >
            ⭐ รีวิว ({reviews.length})
          </button>
        </div>

        {tab === 'Menu' && (
          <>
            {/* ── Categories ── */}
            <div className={styles.catTabs}>
              {cats.map(c => (
                <button
                  key={c}
                  onClick={() => setCatTab(c)}
                  className={`${styles.catTab} ${catTab === c ? styles.catTabActive : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* ── Menu Grid ── */}
            <div className={styles.menuGrid}>
              {menus.map(m => {
                const qty = getQty(m.id)
                return (
                  <div key={m.id} className={`${styles.menuCard} ${!m.available ? styles.outOfStock : ''}`} onClick={() => router.push(`/food/${m.id}`)}>
                    <div className={styles.menuImgWrap}>
                      <img src={m.img} alt={m.name} className={styles.menuImg} />
                      {qty > 0 && <div className={styles.qtyBadge}>x{qty}</div>}
                      {!m.available && <div className={styles.outBadge}>หมด</div>}
                    </div>
                    <div className={styles.menuBody}>
                      <div className={styles.menuName}>{m.name}</div>
                      <div className={styles.menuDesc}>{m.desc || 'เมนูแนะนำยอดฮิต'}</div>
                      <div className={styles.menuFoot}>
                        <span className={styles.menuPrice}>฿{m.price}</span>
                        <button
                          className={`${styles.addBtn} ${!m.available ? styles.addBtnOff : ''}`}
                          disabled={!m.available}
                          onClick={(e) => { e.stopPropagation(); m.available && addToCart(m); }}
                        >
                          {m.available ? '+' : '✕'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'Reviews' && (
          <div className={styles.reviewsList}>
            <div className={styles.reviewsHdrRow}>
              <h3 className={styles.revSectionTitle}>ความเห็นจากลูกค้า ({reviews.length})</h3>
              <button
                className={styles.writeRevBtn}
                onClick={() => setShowReviewForm(true)}
              >
                + เขียนรีวิว
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className={styles.emptyReviews}>
                <span>📝</span>
                <p>ยังไม่มีรีวิวสำหรับร้านนี้ เป็นคนแรกที่รีวิวกันเถอะ!</p>
              </div>
            ) : reviews.map(r => (
              <div key={r.ReviewId} className={styles.reviewCard}>
                <div className={styles.revHdr}>
                  <div className={styles.revUser}>
                    <div className={styles.revAvatar}>
                      {r.userImage ? (
                        <img
                          src={r.userImage}
                          alt="Reviewer"
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        r.userName ? r.userName[0] : '?'
                      )}
                    </div>
                    <div>
                      <div className={styles.revName}>{r.userName || 'Anonymous'}</div>
                      <div className={styles.revDate}>{new Date(r.ReviewAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className={styles.revStars}>
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className={`fa-solid fa-star ${i < r.ReviewScore ? styles.starActive : styles.starDim}`} />
                    ))}
                  </div>
                </div>
                <div className={styles.revFood}>
                  <i className="fa-solid fa-bowl-food" /> สั่งเมนู: {r.FoodName}
                </div>
                <p className={styles.revText}>{r.ReviewText}</p>
                {(r.ReviewImg1 || r.ReviewImg2 || r.ReviewImg3) && (
                  <div className={styles.revImgs}>
                    {[r.ReviewImg1, r.ReviewImg2, r.ReviewImg3].filter(Boolean).map((img, i) => (
                      <img key={i} src={img} alt={`review-img-${i}`} className={styles.revImg} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Review Modal ── */}
        {showReviewForm && (
          <div className={styles.modalOverlay} onClick={() => setShowReviewForm(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>เขียนรีวิวให้ร้านอาหาร</h3>
                <button className={styles.closeBtn} onClick={() => setShowReviewForm(false)}>×</button>
              </div>
              <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                <div className={styles.formGroup}>
                  <label>เลือกอาหารที่อยากรีวิว</label>
                  <select
                    value={reviewFoodId}
                    onChange={e => setReviewFoodId(e.target.value)}
                    className={styles.revSelect}
                  >
                    {menus_raw.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>ความพึงพอใจ</label>
                  <div className={styles.scorePicker}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`${styles.scoreBtn} ${reviewScore >= s ? styles.scoreBtnActive : ''}`}
                        onClick={() => setReviewScore(s)}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>แชร์ความรู้สึกของคุณ</label>
                  <textarea
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="เล่าความรู้สึกหลังจากทานอาหาร..."
                    className={styles.revTextArea}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>เพิ่มรูปภาพ (ไม่เกิน 3 รูป)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files).slice(0, 3);
                      setReviewImages(files);
                    }}
                    className={styles.imgUploadInput}
                  />
                  {reviewImages.length > 0 && (
                    <div className={styles.imgPreviewRow}>
                      {reviewImages.map((f, i) => (
                        <div key={i} className={styles.imgPreviewWrap}>
                          <img src={URL.createObjectURL(f)} alt={`preview-${i}`} className={styles.imgPreview} />
                          <button
                            type="button"
                            className={styles.imgRemoveBtn}
                            onClick={() => setReviewImages(prev => prev.filter((_, j) => j !== i))}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className={styles.submitRevBtn} disabled={submitting}>
                  {submitting ? 'กำลังส่ง...' : 'ส่งรีวิว'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Cart Bar ── */}
      {totalItems > 0 && (
        <div
          className={`${styles.cartBar} ${!shop?.open ? styles.cartBarDisabled : ''}`}
          onClick={() => {
            if (shop?.open) router.push('/checkout')
            else alert("ขออภัย ขณะนี้ร้านค้าปิดรับออเดอร์ชั่วคราว")
          }}
        >
          <div className={styles.cartBarLeft}>
            <div className={styles.cartCount}>{totalItems}</div>
            <span className={styles.cartBarTxt}>{shop?.open ? 'ดูตะกร้าของฉัน' : 'ร้านค้าปิดให้บริการ'}</span>
          </div>
          <span className={styles.cartBarPrice}>฿{Math.round(totalPrice)}</span>
        </div>
      )}

      {/* ── Custom Confirmation Modal ── */}
      {showConfirm && (
        <div className={styles.confirmModalOverlay}>
          <div className={styles.confirmModalContent}>
            <div className={styles.confirmModalIcon}>
              <i className="fa-solid fa-circle-exclamation" />
            </div>
            <h3 className={styles.confirmModalTitle}>เปลี่ยนร้านอาหารใหม่?</h3>
            <p className={styles.confirmModalText}>
              คุณมีหาสารจากร้านอื่นค้างอยู่ในตะกร้า <br />
              หากสั่งร้านนี้ ตะกร้าเดิมจะถูกล้างออกทั้งหมดครับ
            </p>
            <div className={styles.confirmModalBtns}>
              <button
                className={`${styles.confirmModalBtn} ${styles.confirmCancelBtn}`}
                onClick={() => { setShowConfirm(false); setPendingMenu(null); }}
              >
                ไว้วันหลัง
              </button>
              <button
                className={`${styles.confirmModalBtn} ${styles.confirmSubmitBtn}`}
                onClick={() => {
                  setShowConfirm(false)
                  localStorage.setItem('bs_cart', '[]')
                  setCart([])
                  if (pendingMenu) {
                    performAddToCart(pendingMenu)
                    setPendingMenu(null)
                  }
                }}
              >
                ล้างตะกร้าและสั่งเลย
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

