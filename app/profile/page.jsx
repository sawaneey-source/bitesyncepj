'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../shop/menu/cropHelper'
import styles from './page.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState({ name: '', email: '', phone: '', address: '' })
  const [pwFields, setPwFields] = useState({ oldPw: '', userPw: '', userPwConfirm: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imageFileOri, setImageFileOri] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('active') // active, complete, cancel
  const [addresses, setAddresses] = useState([])

  // Cropper State
  const [imageToCrop, setImageToCrop] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [originalImageUrl, setOriginalImageUrl] = useState(null)
  const [savedCrop, setSavedCrop] = useState(null)
  const [savedZoom, setSavedZoom] = useState(1)
  const [cropperKey, setCropperKey] = useState(0)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) {
      const userData = JSON.parse(u)
      if (userData.role === 'restaurant' || userData.role === 'shop') {
        router.replace('/shop/profile')
        return
      } else if (userData.role === 'rider') {
        router.replace('/rider/profile')
        return
      } else if (userData.role === 'admin') {
        router.replace('/admin/dashboard')
        return
      }
      setUser(userData);
      
      // Fetch latest profile from DB to ensure fields like email/phone are up to date
      fetch(`http://localhost/bitesync/api/customer/get_profile.php?userId=${userData.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const freshUser = d.user;
            setUser(freshUser);
            setEditedUser({
              name: freshUser.name || '',
              email: freshUser.email || '',
              phone: freshUser.phone || '',
              address: freshUser.address || ''
            });
            localStorage.setItem('bs_user', JSON.stringify({
              ...userData,
              ...freshUser
            }));
            if (freshUser.image) {
              setPreviewUrl(`http://localhost/bitesync/public${freshUser.image}`);
            }
          }
        })
        .catch(() => {});

      // Load History from API
      fetch(`http://localhost/bitesync/api/customer/orders.php?userId=${userData.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) setHistory(d.data)
        })
        .catch(() => { })

      fetchAddresses(userData.id)
    } else {
      router.push('/login')
    }
    setLoading(false)
  }, [router])

  const reOrder = (order) => {
    if (!order || !order.items || order.items.length === 0) return;
    const cart = order.items.map(it => ({
      id: it.FoodId || it.id,
      name: it.name || it.FoodName,
      price: it.price || it.OdtUnitPrice,
      qty: it.qty || it.OdtQty || 1,
      shopId: order.ShopId,
      shopName: order.shopName,
      img: it.img || '/food-placeholder.png'
    }))
    localStorage.setItem('bs_cart', JSON.stringify(cart))
    router.push('/checkout')
  }

  const filteredHistory = history.filter(h => {
    const s = Number(h.OdrStatus)
    if (activeTab === 'active') return [1, 2, 3, 4, 5].includes(s)
    if (activeTab === 'complete') return s === 6
    if (activeTab === 'cancel') return s === 7
    return true
  })

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setImageFileOri(file)
      setOriginalImageUrl(url)
      setImageToCrop(url)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setSavedCrop(null)
      setSavedZoom(1)
      setIsEditing(true) // Start editing mode when new image is picked
    }
  }

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return
    try {
      const src = imageToCrop
      const croppedBlob = await getCroppedImg(src, croppedAreaPixels)
      if (!croppedBlob) throw new Error('Could not create image')
      const url = URL.createObjectURL(croppedBlob)
      setPreviewUrl(url)
      setImageFile(new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' }))
      setSavedCrop(crop)
      setSavedZoom(zoom)
      setImageToCrop(null)
      setShowImageMenu(false)
    } catch (e) {
      console.error(e)
      alert('ไม่สามารถครอบรูปได้ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const handleEditCrop = () => {
    setIsEditing(true)
    const stamp = Date.now()
    
    // 1. If user picked a new photo in this session, use its original full source
    if (originalImageUrl) {
      setImageToCrop(originalImageUrl) // Blob URLs shouldn't have hashes, it can break them
    } 
    // 2. Otherwise, use the server's original image (imageOri)
    else if (user && user.imageOri) {
      if (!user.imageOri.startsWith('blob:') && !user.imageOri.startsWith('data:')) {
        const path = user.imageOri.replace(/^https?:\/\/[^/]+\/bitesync\/public/, '')
        const proxiedUrl = `http://localhost/bitesync/api/shop/image_proxy.php?file=${path}&t=${stamp}`
        setImageToCrop(proxiedUrl)
      } else {
         setImageToCrop(user.imageOri)
      }
    } 
    // 3. Fallback to user.image if no original is available (legacy profiles)
    else if (user && user.image) {
      if (!user.image.startsWith('blob:') && !user.image.startsWith('data:')) {
        const path = user.image.replace(/^https?:\/\/[^/]+\/bitesync\/public/, '')
        const proxiedUrl = `http://localhost/bitesync/api/shop/image_proxy.php?file=${path}&t=${stamp}`
        setImageToCrop(proxiedUrl)
      } else {
         setImageToCrop(user.image)
      }
    }
    // Always start fresh from full image to avoid confusion
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setSavedCrop(null)
    setSavedZoom(1)
    setCropperKey(prev => prev + 1) // Force Cropper re-mount
    setShowImageMenu(false)
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('id', user.id)
      formData.append('name', editedUser.name)
      formData.append('phone', editedUser.phone)
      formData.append('address', editedUser.address)
      if (imageFile) formData.append('image', imageFile)
      if (imageFileOri) formData.append('imageOri', imageFileOri)

      // Password change
      if (pwFields.userPw) {
        if (!pwFields.oldPw) { alert('กรุณาระบุรหัสผ่านเดิมก่อนเปลี่ยนรหัสผ่านใหม่'); setSaving(false); return }
        if (pwFields.userPw !== pwFields.userPwConfirm) { alert('รหัสผ่านใหม่ไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง'); setSaving(false); return }
        if (pwFields.userPw.length < 6) { alert('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); setSaving(false); return }
        formData.append('oldPw', pwFields.oldPw)
        formData.append('usrPassword', pwFields.userPw)
      }

      const resp = await fetch('http://localhost/bitesync/dbconnect/update_profile.php', {
        method: 'POST',
        body: formData
      })
      const data = await resp.json()
      if (data.success) {
        setUser(data.user)
        localStorage.setItem('bs_user', JSON.stringify(data.user))
        setIsEditing(false)
        setImageFile(null)
        setImageFileOri(null)
        setOriginalImageUrl(null)
        setSavedCrop(null)
        setSavedZoom(1)
        setPwFields({ oldPw: '', userPw: '', userPwConfirm: '' })
        alert('อัปเดตโปรไฟล์สำเร็จแล้ว ✨')
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  const fetchAddresses = async (id) => {
    const res = await fetch(`http://localhost/bitesync/api/customer/address_manager.php?userId=${id}`);
    const d = await res.json();
    if (d.success) setAddresses(d.data);
  }

  const setDefaultAddress = async (adrId) => {
    const res = await fetch(`http://localhost/bitesync/api/customer/address_manager.php?userId=${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adrId, setDefault: true })
    });
    const d = await res.json();
    if (d.success) {
      fetchAddresses(user.id);
      // Refresh user info for the UsrAddress string
      const uResp = await fetch(`http://localhost/bitesync/dbconnect/update_profile.php?id=${user.id}`, { method: 'GET' }); // assuming GET works for refresh
      // Wait, update_profile doesn't handle GET. I'll just refresh local state from one of the results or re-fetch user if I had a profile GET API.
      // For now, I'll just reload the page or rely on the next refresh.
      window.location.reload();
    }
  }

  const deleteAddress = async (adrId) => {
    if (!confirm('ยืนยันการลบที่อยู่นี้?')) return;
    const res = await fetch(`http://localhost/bitesync/api/customer/address_manager.php?userId=${user.id}&adrId=${adrId}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) fetchAddresses(user.id);
  }

  const handleLogout = () => {
    localStorage.removeItem('bs_user')
    localStorage.removeItem('bs_token')
    window.location.href = '/'
  }

  if (loading || !user) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loader}>🍃</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <div className={styles.profileCard}>
          <div className={styles.cardHeaderDecor} />

          <div className={styles.header}>
            <div className={styles.avatarContainer}>
              <div
                className={styles.avatarWrap}
                onClick={() => {
                  if (isEditing) {
                    if (previewUrl || user?.image) setShowImageMenu(!showImageMenu)
                    else document.getElementById('avatarInput').click()
                  }
                }}
              >
                {isEditing && (
                  <div className={styles.avatarOverlay}>
                    <i className="fa-solid fa-camera" />
                    <span>แก้ไขรูปภาพ</span>
                  </div>
                )}
                <div className={styles.avatarLarge}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Profile" className={styles.avatarImg} />
                  ) : user?.image ? (
                    <img src={`http://localhost/bitesync/public${user.image}`} alt="Profile" className={styles.avatarImg} />
                  ) : (
                    (editedUser.name || user?.name || 'U')[0].toUpperCase()
                  )}
                </div>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />
              </div>

              {showImageMenu && isEditing && (
                <div className={styles.imageActionMenu}>
                  <button onClick={() => { setShowImageMenu(false); document.getElementById('avatarInput').click(); }}>
                    <i className="fa-solid fa-upload" /> อัปโหลดใหม่
                  </button>
                  <button onClick={handleEditCrop}>
                    <i className="fa-solid fa-crop-simple" /> ปรับระยะ/ซูม
                  </button>
                  <button onClick={() => setShowImageMenu(false)} className={styles.menuCloseBtn}>ปิดเมนู</button>
                </div>
              )}
            </div>
            <div className={styles.headerInfo}>
              <h1 className={styles.name}>
                {isEditing ? 'แก้ไขข้อมูลส่วนตัว' : (user.name || 'User')}
              </h1>
              <div className={styles.headerStats}>
                <span className={styles.roleBadge}>{user.role || 'ลูกค้าระดับ VIP'}</span>
                <span className={styles.statItem}>
                  <i className="fa-solid fa-calendar-day" /> ตั้งแต่ มี.ค. 2024
                </span>
                <span className={styles.statItem}>
                  <i className="fa-solid fa-bag-shopping" /> {history.length} ออเดอร์
                </span>
              </div>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>รายละเอียดบัญชี</h2>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                  <i className="fa-solid fa-pen-to-square" /> แก้ไขข้อมูล
                </button>
              )}
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>ชื่อ-นามสกุล</label>
                {isEditing ? (
                  <input
                    className={styles.editInput}
                    value={editedUser.name}
                    onChange={e => setEditedUser({ ...editedUser, name: e.target.value })}
                  />
                ) : (
                  <div className={styles.value}>{user.name}</div>
                )}
              </div>
              <div className={styles.infoItem}>
                <label>
                  <i className="fa-solid fa-envelope" /> อีเมล 
                  <span style={{ fontSize: '11px', color: 'var(--gray)', fontWeight: 'normal', marginLeft: '6px' }}>(ไม่สามารถเปลี่ยนได้)</span>
                </label>
                <div className={styles.valueWrap}>
                  <input
                    className={`${styles.editInput} ${styles.disabledInput}`}
                    value={user.email}
                    disabled
                  />
                </div>
              </div>
              <div className={styles.infoItem}>
                <label><i className="fa-solid fa-phone" /> เบอร์โทรศัพท์</label>
                {isEditing ? (
                  <input
                    className={styles.editInput}
                    value={editedUser.phone}
                    onChange={e => setEditedUser({ ...editedUser, phone: e.target.value })}
                    placeholder="ใส่เบอร์โทรศัพท์ของคุณ..."
                  />
                ) : (
                    <div className={styles.value}>{user.phone || '-'}</div>
                )}
              </div>
              <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                <label>ที่อยู่ที่จัดส่ง</label>
                {isEditing ? (
                  <textarea
                    className={`${styles.editInput} ${styles.editArea}`}
                    value={editedUser.address}
                    onChange={e => setEditedUser({ ...editedUser, address: e.target.value })}
                    placeholder="ระบุที่อยู่สำหรับจัดส่งอาหารของคุณ..."
                  />
                ) : (
                  <div className={styles.value}>{user.address || 'ไม่ระบุที่อยู่'}</div>
                )}
              </div>
              <div className={styles.infoItem}>
                <label>ไอดีสมาชิก</label>
                <div className={styles.value} style={{ color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                  <i className="fa-solid fa-id-card-clip" style={{ marginRight: '8px', opacity: 0.5 }} />
                  BS-{user.id.toString().padStart(5, '0')}
                </div>
              </div>
            </div>

            {isEditing && (
              <>
                <div className={styles.sectionHeader} style={{marginTop:20}}>
                  <h2 className={styles.sectionTitle}>🔐 เปลี่ยนรหัสผ่าน</h2>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>รหัสผ่านเดิม</label>
                    <input type="password" className={styles.editInput} value={pwFields.oldPw} onChange={e=>setPwFields({...pwFields,oldPw:e.target.value})} placeholder="ระบุเมื่อต้องการเปลี่ยนรหัสผ่าน"/>
                  </div>
                  <div className={styles.infoItem}>
                    <label>รหัสผ่านใหม่</label>
                    <input type="password" className={styles.editInput} value={pwFields.userPw} onChange={e=>setPwFields({...pwFields,userPw:e.target.value})} placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete="new-password"/>
                  </div>
                  <div className={styles.infoItem}>
                    <label>ยืนยันรหัสผ่านใหม่</label>
                    <input type="password" className={styles.editInput} value={pwFields.userPwConfirm} onChange={e=>setPwFields({...pwFields,userPwConfirm:e.target.value})} placeholder="ยืนยันรหัสผ่านใหม่" autoComplete="new-password"/>
                  </div>
                </div>
                <div style={{background:'#fdfdf2',border:'1px solid #f1f1d1',borderRadius:'12px',padding:'14px 16px',display:'flex',gap:'12px',alignItems:'flex-start',marginTop:'12px'}}>
                  <span style={{fontSize:'18px'}}>💡</span>
                  <div style={{fontSize:'13px',color:'#555',lineHeight:'1.6'}}>
                    <strong>เปลี่ยนรหัสผ่าน:</strong> กรอกรหัสเดิมและรหัสใหม่แล้วกดบันทึกได้เลยครับ<br/>
                    <a href="#" onClick={e=>{e.preventDefault();alert('ติดต่อแอดมินเพื่อรีเซ็ตรหัสผ่าน\n\nLine OA: @BiteSyncAdmin\nโทร: 02-123-4567');}} style={{color:'#2a6129',fontWeight:'700',textDecoration:'underline',display:'inline-block',marginTop:'4px'}}>
                      ลืมรหัสผ่านเดิมใช่ไหม? คลิกที่นี่เพื่อติดต่อแอดมิน
                    </a>
                  </div>
                </div>
              </>
            )}

            <div className={styles.actions}>
              {isEditing ? (
                <>
                  <button onClick={handleUpdate} disabled={saving} className={styles.saveBtn}>
                    {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกข้อมูล'}
                  </button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setEditedUser({ name: user.name, email: user.email, phone: user.phone, address: user.address });
                  }} className={styles.cancelBtn}>ยกเลิก</button>
                </>
              ) : (
                <button onClick={handleLogout} className={styles.logoutBtn}>
                  <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.historyCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📍 ที่อยู่</h2>
            <button onClick={() => router.push('/checkout')} className={styles.addAddrBtn}>+ เพิ่มที่อยู่ใหม่</button>
          </div>

          <div className={styles.addressList}>
            {addresses.length === 0 ? (
              <p className={styles.emptyText}>ยังไม่มีที่อยู่ที่บันทึกไว้</p>
            ) : addresses.map(addr => (
              <div key={addr.AdrId} className={`${styles.addressItem} ${addr.IsDefault ? styles.addrDefault : ''}`}>
                <div className={styles.addrMain}>
                  <div className={styles.addrText}>
                    <strong>{addr.HouseNo}</strong> 
                    {addr.Moo && ` หมู่ ${addr.Moo}`}
                    {addr.Village && ` ${addr.Village}`}
                    {addr.Soi && ` ซอย ${addr.Soi}`}
                    {addr.Road && ` ถนน ${addr.Road}`}
                    {` ${addr.SubDistrict} ${addr.District} ${addr.Province} ${addr.Zipcode}`}
                  </div>
                  {addr.IsDefault && <span className={styles.defaultBadge}>ค่าเริ่มต้น</span>}
                </div>
                <div className={styles.addrActions}>
                  {!addr.IsDefault && (
                    <button onClick={() => setDefaultAddress(addr.AdrId)} className={styles.setDefBtn}>ตั้งเป็นค่าเริ่มต้น</button>
                  )}
                  <button onClick={() => deleteAddress(addr.AdrId)} className={styles.delAddrBtn}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.historyCard}>
          <div className={styles.histTabs}>
            <button onClick={() => setActiveTab('active')} className={`${styles.tabBtn} ${activeTab === 'active' ? styles.tabActive : ''}`}>กำลังดำเนินการ</button>
            <button onClick={() => setActiveTab('complete')} className={`${styles.tabBtn} ${activeTab === 'complete' ? styles.tabActive : ''}`}>สำเร็จแล้ว</button>
            <button onClick={() => setActiveTab('cancel')} className={`${styles.tabBtn} ${activeTab === 'cancel' ? styles.tabActive : ''}`}>ยกเลิกแล้ว</button>
          </div>

          <h2 className={styles.sectionTitle}>
            {activeTab === 'active' ? 'ออเดอร์ปัจจุปัน' : activeTab === 'complete' ? 'ประวัติการสั่งซื้อ' : 'ออเดอร์ที่ยกเลิก'}
          </h2>

          {filteredHistory.length === 0 ? (
            <div className={styles.emptyHistory}>
              <span className={styles.emptyIcon}>{activeTab === 'active' ? '🥡' : activeTab === 'complete' ? '📜' : '❌'}</span>
              <p>ไม่พบรายการในหมวดหมู่นี้</p>
              {activeTab === 'active' && <button onClick={() => router.push('/home')} className={styles.orderNowBtn}>สั่งอาหารเลย</button>}
            </div>
          ) : (
            <div className={styles.historyList}>
              {filteredHistory.map((order, idx) => {
                const sMap = {
                  1: { lbl: 'ยังไม่ชำระเงิน', color: '#666' },
                  2: { lbl: 'รอดำเนินการ', color: '#856404' },
                  3: { lbl: 'กำลังเตรียมอาหาร', color: '#e65100' },
                  4: { lbl: 'เตรียมเสร็จแล้ว', color: '#2a6129' },
                  5: { lbl: 'กำลังจัดส่ง', color: '#1565c0' },
                  6: { lbl: 'จัดส่งสำเร็จ', color: '#2a6129' },
                  7: { lbl: 'ยกเลิกออเดอร์', color: '#b71c1c' }
                }
                const st = sMap[order.OdrStatus] || { lbl: 'กำลังดำเนินการ', color: '#666' }
                const isFinal = [6, 7].includes(Number(order.OdrStatus))
                const orderId = order.OdrId || order.id

                return (
                  <div key={orderId || idx} className={styles.historyItem}>
                    <div className={styles.histHeader}>
                      <div className={styles.histMain}>
                        <div className={styles.histShop}>{order.shopName || order.ShopName || 'ร้านอาหาร'}</div>
                        <div className={styles.histDate}>{order.OdrCreatedAt || order.date}</div>
                      </div>
                      <div className={styles.histPrice}>{(order.OdrGrandTotal || order.total).toLocaleString()} ฿</div>
                    </div>
                    <div className={styles.histItems}>
                      {Array.isArray(order.items) ? order.items.map((it, i) => (
                        <span key={i}>{it.name || it.FoodName || it}{i < order.items.length - 1 ? ', ' : ''}</span>
                      )) : 'ดูรายละเอียดอาหารในใบเสร็จ'}
                    </div>
                    <div className={styles.histFooter}>
                      <span className={styles.histStatus} style={{ color: st.color }}>
                        {Number(order.OdrStatus) === 5 ? '✅ ' : Number(order.OdrStatus) === 6 ? '❌ ' : '⏳ '}
                        {st.lbl}
                      </span>
                      <div className={styles.histActions}>
                        {!isFinal && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {Number(order.OdrStatus) === 1 && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm('ยืนยันการยกเลิกออเดอร์?')) return;
                                  try {
                                    const res = await fetch('http://localhost/bitesync/api/customer/orders.php', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bs_token')}` },
                                      body: JSON.stringify({ id: orderId, status: 6, userId: user.id })
                                    });
                                    const d = await res.json();
                                    alert(d.message);
                                    if (d.success) { window.location.reload(); }
                                  } catch (err) { alert('เครื่องเกิดข้อผิดพลาด'); }
                                }}
                                className={styles.cancelBtnSmall}
                                style={{ background: '#fff5f5', color: '#c53030', border: '1px solid #feb2b2', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                              >
                                ยกเลิก
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/home/track/${orderId}`)}
                              className={styles.trackBtn}
                              style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                            >
                              ติดตามออเดอร์
                            </button>
                          </div>
                        )}
                        {isFinal && (
                          <button onClick={() => reOrder(order)} className={styles.reorderBtn}>
                            🔄 สั่งอีกครั้ง
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/home/receipt/${orderId}`)}
                          className={styles.viewBtn}
                        >
                          {isFinal ? 'ใบเสร็จ' : 'รายละเอียด'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {imageToCrop && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.cropHdr}>
              <h3 className={styles.cropTitle}>ปรับระยะรูปโปรไฟล์</h3>
              <button onClick={() => setImageToCrop(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div className={styles.cropArea}>
              <Cropper
                key={cropperKey}
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className={styles.cropCtrls}>
              <div className={styles.zoomRow}>
                <span>ซูม</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(e.target.value)}
                  className={styles.zoomInp}
                />
              </div>
              <div className={styles.cropBtns}>
                <button onClick={() => setImageToCrop(null)} className={styles.btnCropCan}>ยกเลิก</button>
                <button onClick={confirmCrop} className={styles.btnCropDone}>ตกลง</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
