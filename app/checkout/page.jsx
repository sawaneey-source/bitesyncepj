'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function CheckoutPage() {
  const router  = useRouter()
  const [cart, setCart]       = useState([])
  const [address, setAddress] = useState('')
  const [note, setNote]       = useState('')
  const [step, setStep]       = useState(1) // 1=review, 2=payment QR
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [user, setUser]       = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('bs_cart') || '[]'))
    setAddress(localStorage.getItem('bs_order_address') || '')
    setNote(localStorage.getItem('bs_order_note') || '')
    const u = localStorage.getItem('bs_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  function changeQty(index, delta) {
    const next = [...cart]
    next[index].qty = Math.max(1, next[index].qty + delta)
    setCart(next)
    localStorage.setItem('bs_cart', JSON.stringify(next))
  }

  function removeItem(index) {
    const next = cart.filter((_, i) => i !== index)
    setCart(next)
    localStorage.setItem('bs_cart', JSON.stringify(next))
  }

  const subtotal    = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const deliveryFee = 15
  const total       = subtotal + deliveryFee

  async function placeOrder() {
    setLoading(true)
    try {
      const user  = JSON.parse(localStorage.getItem('bs_user') || '{}')
      const token = localStorage.getItem('bs_token')
      const res   = await fetch('http://localhost/bitesync/api/customer/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: user.id, items: cart, address,
          note, total, deliveryFee
        })
      })
      const data = await res.json()
      if (data.success) {
        setOrderId(data.orderId)
        setStep(2)
      }
    } catch {
      // mock
      const mockId = `ORD-${Date.now().toString().slice(-6)}`
      setOrderId(mockId)
      setStep(2)
    }
    setLoading(false)
  }

  async function confirmPayment() {
    setLoading(true)
    try {
      const token = localStorage.getItem('bs_token')
      await fetch(`http://localhost/bitesync/api/customer/payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, method: 'qr', amount: total })
      })
    } catch {}
    localStorage.removeItem('bs_cart')
    localStorage.removeItem('bs_order_address')
    localStorage.removeItem('bs_order_note')
    localStorage.setItem('bs_last_order', orderId)
    setLoading(false)
    router.push('/order-complete')
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => step === 2 ? setStep(1) : router.back()} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
          <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <div className={styles.logoMark}><i className="fa-solid fa-leaf" style={{color: 'white', fontSize: '14px'}} /></div>
            <span className={styles.logoTxt}>Bite<em>Sync</em></span>
          </div>
          <span className={styles.navTitle} style={{marginRight: 20}}>{step === 1 ? 'Checkout' : 'ชำระเงิน'}</span>
          <div className={styles.navRight}>
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

      {/* Step indicator */}
      <div className={styles.steps}>
        <div className={`${styles.stepItem} ${step >= 1 ? styles.stepOn : ''}`}>
          <div className={styles.stepCircle}>1</div>
          <span>ตรวจสอบออเดอร์</span>
        </div>
        <div className={styles.stepLine}/>
        <div className={`${styles.stepItem} ${step >= 2 ? styles.stepOn : ''}`}>
          <div className={styles.stepCircle}>2</div>
          <span>ชำระเงิน</span>
        </div>
        <div className={styles.stepLine}/>
        <div className={styles.stepItem}>
          <div className={styles.stepCircle}>3</div>
          <span>สำเร็จ</span>
        </div>
      </div>

      <div className={styles.body}>
        {step === 1 && (
          <div className={styles.layout}>
            <div className={styles.left}>
              {/* Order items */}
              <div className={styles.card}>
                <div className={styles.cardHdr}>
                  <h2 className={styles.cardTitle}>รายการสั่งซื้อ</h2>
                  {cart.length > 0 && (
                    <button 
                      className={styles.addMoreBtn} 
                      onClick={() => router.push(`/home/restaurant/${cart[0].shopId}`)}
                    >
                      + เลือกอาหารเพิ่ม
                    </button>
                  )}
                </div>
                {cart.length === 0 ? (
                  <div className={styles.emptyCart}>ไม่มีสินค้าในตะกร้า</div>
                ) : cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={styles.orderItem}>
                    <img src={item.img} className={styles.orderImg}/>
                    <div className={styles.orderInfo}>
                      <div className={styles.orderName}>{item.name}</div>
                      {item.addons?.length > 0 && (
                        <div className={styles.orderAddons}>{item.addons.map(a=>a.name).join(', ')}</div>
                      )}
                    </div>
                    
                    <div className={styles.qtyCtrl}>
                      <button className={styles.qtyBtn} onClick={() => changeQty(idx, -1)}>−</button>
                      <span className={styles.qtyNum}>{item.qty}</span>
                      <button className={styles.qtyBtn} onClick={() => changeQty(idx, 1)}>+</button>
                    </div>

                    <div className={styles.orderPrice}>{item.price * item.qty} ฿</div>
                    
                    <button className={styles.removeBtn} onClick={() => removeItem(idx)}>🗑️</button>
                  </div>
                ))}
              </div>

              {/* Delivery */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>📍 ที่อยู่จัดส่ง</h2>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  className={styles.inp}
                  placeholder="ที่อยู่จัดส่ง..."
                />
                {note && <div className={styles.noteRow}>📝 {note}</div>}
              </div>
            </div>

            <div className={styles.right}>
              <div className={styles.summaryCard}>
                <h2 className={styles.cardTitle}>สรุปออเดอร์</h2>
                <div className={styles.summaryRow}><span>ยอดรวม</span><span>{subtotal} ฿</span></div>
                <div className={styles.summaryRow}><span>ค่าจัดส่ง</span><span>{deliveryFee} ฿</span></div>
                <div className={styles.divider}/>
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <span>ทั้งหมด</span><span>{total} ฿</span>
                </div>
                <button onClick={placeOrder} disabled={loading} className={styles.payBtn}>
                  {loading ? '⏳ กำลังดำเนินการ...' : `ยืนยันออเดอร์ — ${total} ฿`}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.paymentWrap}>
            <div className={styles.paymentCard}>
              <h2 className={styles.payTitle}>Complete Your Payment</h2>
              <div className={styles.orderIdRow}>Order: <strong>{orderId}</strong></div>
              <div className={styles.totalBig}>{total} ฿</div>

              {/* QR Code placeholder */}
              <div className={styles.qrWrap}>
                <div className={styles.qrBox}>
                  <svg viewBox="0 0 100 100" className={styles.qrSvg}>
                    {/* QR pattern placeholder */}
                    {[...Array(10)].map((_,i)=>[...Array(10)].map((_,j)=>(
                      Math.random()>.5 && <rect key={`${i}-${j}`} x={i*10} y={j*10} width={9} height={9} fill="#1a1f1a"/>
                    )))}
                    <rect x="0" y="0" width="30" height="30" fill="#1a1f1a"/>
                    <rect x="4" y="4" width="22" height="22" fill="#fff"/>
                    <rect x="8" y="8" width="14" height="14" fill="#1a1f1a"/>
                    <rect x="70" y="0" width="30" height="30" fill="#1a1f1a"/>
                    <rect x="74" y="4" width="22" height="22" fill="#fff"/>
                    <rect x="78" y="8" width="14" height="14" fill="#1a1f1a"/>
                    <rect x="0" y="70" width="30" height="30" fill="#1a1f1a"/>
                    <rect x="4" y="74" width="22" height="22" fill="#fff"/>
                    <rect x="8" y="78" width="14" height="14" fill="#1a1f1a"/>
                  </svg>
                </div>
                <p className={styles.qrHint}>สแกน QR เพื่อชำระเงิน</p>
                <p className={styles.qrAmount}>{total} ฿</p>
              </div>

              <button onClick={confirmPayment} disabled={loading} className={styles.confirmBtn}>
                {loading ? '⏳ กำลังยืนยัน...' : '✅ ยืนยันการชำระเงิน'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
