'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Logo from '@/components/Logo'

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
  const [lastOrder, setLastOrder]       = useState(null)

  // Address states
  const [provinces, setProvinces] = useState([])
  const [selProvince, setSelProvince] = useState('')
  const [selAmphure, setSelAmphure] = useState('')
  const [selTambon, setSelTambon] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [houseNo, setHouseNo] = useState('')
  const [village, setVillage] = useState('')
  const [road, setRoad] = useState('')
  const [soi, setSoi] = useState('')
  const [moo, setMoo] = useState('')

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('bs_cart') || '[]'))
    setAddress(localStorage.getItem('bs_order_address') || '')
    setNote(localStorage.getItem('bs_order_note') || '')
    
    const u = localStorage.getItem('bs_user')
    if (u) {
      const userData = JSON.parse(u)
      if (userData.role === 'restaurant' || userData.role === 'shop') {
        router.replace('/shop')
        return
      } else if (userData.role === 'rider') {
        router.replace('/rider')
        return
      } else if (userData.role === 'admin') {
        router.replace('/admin/dashboard')
        return
      }
      setUser(userData)
    } else {
      router.replace('/login')
      return
    }
    
    setLastOrder(localStorage.getItem('bs_last_order') || null)

    // Load saved address
    const saved = localStorage.getItem('bs_address_full')
    if (saved) {
      const s = JSON.parse(saved)
      setSelProvince(s.province || '')
      setSelAmphure(s.amphure || '')
      setSelTambon(s.tambon || '')
      setZipcode(s.zip || '')
      setHouseNo(s.houseNo || '')
      setVillage(s.village || '')
      setRoad(s.road || '')
      setSoi(s.soi || '')
      setMoo(s.moo || '')
      setAddress(s.full || '')
    } else {
      setAddress(localStorage.getItem('bs_order_address') || '')
    }

    // Fetch provinces
    fetch('http://localhost/bitesync/api/home/thai_address.php')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(() => {})
  }, [router])

  function changeQty(index, delta) {
    const next = [...cart]
    next[index].qty = Math.max(1, Number(next[index].qty) + delta)
    setCart(next)
    localStorage.setItem('bs_cart', JSON.stringify(next))
  }

  function removeItem(index) {
    const next = cart.filter((_, i) => i !== index)
    setCart(next)
    localStorage.setItem('bs_cart', JSON.stringify(next))
  }

  // Address helpers
  const currentPro = provinces.find(p => p.name_th === selProvince)
  const currentAmp = currentPro?.amphure.find(a => a.name_th === selAmphure)
  const currentTam = currentAmp?.tambon.find(t => t.name === selTambon)

  function updateFullAddress(h, v, r, s, m, t, a, p, z) {
    const parts = []
    if (h) parts.push(h)
    if (m) parts.push(`หมู่ ${m}`)
    if (v) parts.push(v)
    if (s) parts.push(`ซอย ${s}`)
    if (r) parts.push(`ถนน ${r}`)
    if (t) parts.push(`ต.${t}`)
    if (a) parts.push(`อ.${a}`)
    if (p) parts.push(`จ.${p}`)
    if (z) parts.push(z)
    
    const full = parts.join(' ').trim()
    setAddress(full)
    localStorage.setItem('bs_address_full', JSON.stringify({ 
      houseNo:h, village:v, road:r, soi:s, moo:m, 
      tambon:t, amphure:a, province:p, zip:z, full 
    }))
  }

  const isAddressValid = selProvince && selAmphure && selTambon && houseNo.trim().length >= 1

  const subtotal = (cart || []).reduce((s, c) => s + Math.round((parseFloat(c.price || 0) * Number(c.qty || 0))), 0)
  const deliveryFee = 15
  const total = Math.round(subtotal + deliveryFee)

  async function placeOrder() {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('bs_user') || '{}')
      const token = localStorage.getItem('bs_token')
      
      // Send structured address record
      const addressRecord = {
        houseNo: houseNo,
        village: village,
        road: road,
        soi: soi,
        moo: moo,
        tambon: selTambon,
        amphure: selAmphure,
        province: selProvince,
        zip: zipcode
      }

      const res = await fetch('http://localhost/bitesync/api/customer/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: user.id, 
          items: cart, 
          addressRecord, // Real structured address
          total, 
          deliveryFee
        })
      })
      const data = await res.json()
      if (data.success) {
        setOrderId(data.orderId)
        setStep(2)
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ')
      }
    } catch {
      // Fallback for demo
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
      const res = await fetch(`http://localhost/bitesync/api/customer/payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, method: 'qr', amount: total })
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || 'การชำระเงินไม่ถูกต้อง')
        setLoading(false)
        return
      }
    } catch (e) {
      alert('ไม่สามารถแจ้งยืนยันการชำระเงินได้ กรุณาลองใหม่')
      setLoading(false)
      return
    }
    const history = JSON.parse(localStorage.getItem('bs_history') || '[]')
    const newOrder = {
      id: orderId,
      date: new Date().toLocaleString('th-TH'),
      items: [...cart],
      subtotal,
      deliveryFee,
      total,
      // Standard structure
      customer: {
        name: user?.name || 'Customer',
        phone: user?.phone || '08x-xxx-xxxx',
        address: address || 'No address',
        lat: 7.0085, lng: 100.4734
      },
      shop: {
        id: cart[0]?.ShopId || cart[0]?.shopId || 1,
        name: cart[0]?.shopName || 'BiteSync Shop',
        lat: 7.0042, lng: 100.4651
      },
      rider: { 
        name: 'Aek (BiteSync)', 
        phone: '096-456-9088', 
        vehicle: 'Honda PCX', 
        plate: 'กข-1234',
        lat: 7.0067, lng: 100.4698
      },
      paymentMethod: 'QR Code / PromptPay',
      status: 'กำลังเตรียมอาหาร',
      currentStep: 1,
      estimatedTime: '20-30 min'
    }
    history.unshift(newOrder)
    localStorage.setItem('bs_history', JSON.stringify(history))

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
            <Logo size="small" />
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

      {/* Step indicator */}
      <div className={styles.steps}>
        <div className={`${styles.stepItem} ${step >= 1 ? styles.stepOn : ''}`}>
          <div className={styles.stepCircle}>1</div>
          <span>ตรวจสอบ</span>
        </div>
        <div className={`${styles.stepLine} ${step >= 2 ? styles.stepLineOn : ''}`}/>
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
                      {item.addons && item.addons.length > 0 && (
                        <div className={styles.orderAddons}>
                          {(item.addons || []).map(a => `${a.name} x${a.qty || 1}`).join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.qtyCtrl}>
                      <button className={styles.qtyBtn} onClick={() => changeQty(idx, -1)}>−</button>
                      <span className={styles.qtyNum}>{item.qty}</span>
                      <button className={styles.qtyBtn} onClick={() => changeQty(idx, 1)}>+</button>
                    </div>

                    <div className={styles.orderPrice}>
                      {Math.round(parseFloat(item.price) * Number(item.qty)).toLocaleString()} ฿
                    </div>
                    
                    <button className={styles.removeBtn} onClick={() => removeItem(idx)}>🗑️</button>
                  </div>
                ))}
              </div>

              {/* Delivery */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>📍 ที่อยู่จัดส่ง</h2>
                
                <div className={styles.addrFull}>
                  <label>บ้านเลขที่ / อาคาร</label>
                  <input
                    type="text"
                    value={houseNo}
                    onChange={e => {
                      setHouseNo(e.target.value);
                      updateFullAddress(e.target.value, village, road, soi, moo, selTambon, selAmphure, selProvince, zipcode);
                    }}
                    className={styles.inp}
                    placeholder="เช่น 123/4 หมู่บ้านสุขใจ"
                  />
                </div>

                <div className={styles.addrGrid}>
                  <div className={styles.addrField}>
                    <label>หมู่ที่</label>
                    <input 
                      type="text" 
                      placeholder="เช่น 5" 
                      value={moo} 
                      onChange={e => {
                        setMoo(e.target.value);
                        updateFullAddress(houseNo, village, road, soi, e.target.value, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                  <div className={styles.addrField}>
                    <label>หมู่บ้าน</label>
                    <input 
                      type="text" 
                      placeholder="หมู่บ้าน..." 
                      value={village} 
                      onChange={e => {
                        setVillage(e.target.value);
                        updateFullAddress(houseNo, e.target.value, road, soi, moo, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                </div>

                <div className={styles.addrGrid}>
                  <div className={styles.addrField}>
                    <label>ซอย</label>
                    <input 
                      type="text" 
                      placeholder="ซอย..." 
                      value={soi} 
                      onChange={e => {
                        setSoi(e.target.value);
                        updateFullAddress(houseNo, village, road, e.target.value, moo, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                  <div className={styles.addrField}>
                    <label>ถนน</label>
                    <input 
                      type="text" 
                      placeholder="ถนน..." 
                      value={road} 
                      onChange={e => {
                        setRoad(e.target.value);
                        updateFullAddress(houseNo, village, e.target.value, soi, moo, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                </div>

                <div className={styles.addrGrid}>
                  <div className={styles.addrField}>
                    <label>จังหวัด</label>
                    <select 
                      value={selProvince} 
                      onChange={e => {
                        const v = e.target.value;
                        setSelProvince(v); setSelAmphure(''); setSelTambon(''); setZipcode('');
                        updateFullAddress(houseNo, village, road, soi, moo, '', '', v, '');
                      }}
                      className={styles.sel}
                    >
                      <option value="">เลือกจังหวัด</option>
                      {provinces.map(p => <option key={p.name_th} value={p.name_th}>{p.name_th}</option>)}
                    </select>
                  </div>

                  <div className={styles.addrField}>
                    <label>อำเภอ/เขต</label>
                    <select 
                      value={selAmphure} 
                      disabled={!selProvince}
                      onChange={e => {
                        const v = e.target.value;
                        setSelAmphure(v); setSelTambon(''); setZipcode('');
                        updateFullAddress(houseNo, village, road, soi, moo, '', v, selProvince, '');
                      }}
                      className={styles.sel}
                    >
                      <option value="">เลือกอำเภอ</option>
                      {currentPro?.amphure.map(a => <option key={a.name_th} value={a.name_th}>{a.name_th}</option>)}
                    </select>
                  </div>

                  <div className={styles.addrField}>
                    <label>ตำบล/แขวง</label>
                    <select 
                      value={selTambon} 
                      disabled={!selAmphure}
                      onChange={e => {
                        const v = e.target.value;
                        const t = currentAmp?.tambon.find(x => (x.name_th === v || x.name === v));
                        setSelTambon(v);
                        setZipcode(t?.zip_code || t?.zip || '');
                        updateFullAddress(houseNo, village, road, soi, moo, v, selAmphure, selProvince, t?.zip_code || t?.zip || '');
                      }}
                      className={styles.sel}
                    >
                      <option value="">เลือกตำบล</option>
                      {currentAmp?.tambon.map(t => <option key={t.name_th || t.name} value={t.name_th || t.name}>{t.name_th || t.name}</option>)}
                    </select>
                  </div>

                  <div className={styles.addrField}>
                    <label>รหัสไปรษณีย์</label>
                    <input type="text" value={zipcode} readOnly className={`${styles.sel} ${styles.readOnly}`} placeholder="Zipcode"/>
                  </div>
                </div>

                {address && <div className={styles.addrPreview}><strong>Preview:</strong> {address}</div>}
                
                {note && <div className={styles.noteRow}>📝 {note}</div>}
              </div>
            </div>

            <div className={styles.right}>
              <div className={styles.summaryCard}>
                <h2 className={styles.cardTitle}>สรุปออเดอร์</h2>
                <div className={styles.summaryRow}><span>ยอดรวม</span><span>{Math.round(subtotal).toLocaleString()} ฿</span></div>
                <div className={styles.summaryRow}><span>ค่าจัดส่ง</span><span>{deliveryFee.toLocaleString()} ฿</span></div>
                <div className={styles.divider}/>
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <span>ทั้งหมด</span><span>{Math.round(total).toLocaleString()} ฿</span>
                </div>
                <button 
                  onClick={placeOrder} 
                  disabled={loading || !isAddressValid || cart.length === 0} 
                  className={styles.payBtn}
                >
                  {loading ? '⏳ กำลังดำเนินการ...' : (!isAddressValid ? '⚠️ กรุณาใส่ที่อยู่ให้ครบ' : `ยืนยันออเดอร์ — ${Math.round(total).toLocaleString()} ฿`)}
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
              <div className={styles.totalBig}>{Math.round(total).toLocaleString()} ฿</div>

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
