'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import styles from './page.module.css'

export default function RestaurantProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(true)
  
  // State aligned with DB fields from image
  const [formData, setFormData] = useState({
    shopName: '',
    shopPhone: '',
    shopCatType: 'Bakery',
    shopStatus: 'open', // open/closed
    shopLat: '',
    shopLng: '',
    address: '' // for display and legacy
  })

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) {
      const userData = JSON.parse(u)
      if (userData.role !== 'restaurant' && userData.role !== 'shop') {
        router.replace('/profile')
        return
      }
      setUser(userData)
      setFormData({
         shopName: userData.shopName || userData.name || '',
         shopPhone: userData.shopPhone || userData.phone || '',
         shopCatType: userData.shopCatType || 'Bakery',
         shopStatus: userData.shopStatus || 'open',
         shopLat: userData.shopLat || '',
         shopLng: userData.shopLng || '',
         address: userData.address || ''
      })
      if (userData.image) {
        setLogoPreview(`http://localhost/bitesync/public${userData.image}`)
      }
      if (userData.banner) {
        setBannerPreview(`http://localhost/bitesync/public${userData.banner}`)
      }
    } else {
      router.push('/login')
    }
    setLoading(false)
  }, [router])

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setBannerFile(file)
      setBannerPreview(URL.createObjectURL(file))
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData(prev => ({
          ...prev,
          shopLat: pos.coords.latitude.toString(),
          shopLng: pos.coords.longitude.toString()
        }))
        alert('ดึงพิกัดปัจจุบันเรียบร้อยแล้ว 📍')
      }, () => {
        alert('ไม่สามารถเข้าถึงพิกัดของคุณได้ กรุณาลองใหม่อีกครั้ง')
      })
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const dataToSend = new FormData()
      dataToSend.append('id', user.id)
      dataToSend.append('shopName', formData.shopName)
      dataToSend.append('shopPhone', formData.shopPhone)
      dataToSend.append('shopCatType', formData.shopCatType)
      dataToSend.append('shopStatus', formData.shopStatus)
      dataToSend.append('shopLat', formData.shopLat)
      dataToSend.append('shopLng', formData.shopLng)
      dataToSend.append('address', formData.address)

      if (logoFile) dataToSend.append('logo', logoFile)
      if (bannerFile) dataToSend.append('banner', bannerFile)

      const resp = await fetch('http://localhost/bitesync/dbconnect/update_profile.php', {
        method: 'POST',
        body: dataToSend
      })
      const data = await resp.json()
      if (data.success) {
        const updatedUser = { ...user, ...data.user }
        setUser(updatedUser)
        localStorage.setItem('bs_user', JSON.stringify(updatedUser))
        setLogoFile(null)
        setBannerFile(null)
        alert('บันทึกข้อมูลร้านค้าสำเร็จแล้ว ✨')
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  if (loading || !user) return <div className={styles.loading}>🍃 Loading...</div>

  return (
    <div className={styles.restaurantPage}>
      <Navbar />
      
      <div className={styles.container}>
        <div className={styles.profileCard}>
          <div className={styles.bannerWrap}>
            <img 
              src={bannerPreview || "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=1500"} 
              alt="Banner" 
              className={styles.bannerImg} 
            />
            <button className={styles.bannerBtn} onClick={() => document.getElementById('bannerInput').click()}>
              <i className="fa-solid fa-camera" /> เปลี่ยนรูปหน้าปก
            </button>
            <input id="bannerInput" type="file" accept="image/*" hidden onChange={handleBannerChange} />
          </div>

          <div className={styles.resHeader}>
            <div 
              className={styles.avatarWrap} 
              onClick={() => document.getElementById('logoInput').click()}
            >
              <div className={styles.avatarOverlay}>
                <i className="fa-solid fa-camera" />
                <span>เปลี่ยนโลโก้</span>
              </div>
              <div className={styles.avatarLarge}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Store Logo" className={styles.avatarImg} />
                ) : (
                  (formData.shopName || 'S')[0].toUpperCase()
                )}
              </div>
              <input id="logoInput" type="file" accept="image/*" hidden onChange={handleLogoChange} />
            </div>
            <div className={styles.headerInfo}>
              <h1 className={styles.name}>{formData.shopName || 'Store Name'}</h1>
              <div className={styles.statusBadge}>
                <div className={`${styles.statusDot} ${formData.shopStatus === 'open' ? styles.statusOpen : styles.statusClosed}`} />
                <span>{formData.shopStatus === 'open' ? 'กำลังเปิดร้าน' : 'ปิดร้านอยู่'}</span>
              </div>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.resInfoGrid}>
              
              <div className={styles.infoItem}>
                <label className={styles.resLabel}>สถานะร้านค้า (Shop Status)</label>
                <div className={styles.toggleRow}>
                   <span className={formData.shopStatus === 'closed' ? styles.activeLabel : ''}>Closed</span>
                   <button 
                     className={`${styles.toggleBtn} ${formData.shopStatus === 'open' ? styles.toggleOn : ''}`}
                     onClick={() => setFormData({...formData, shopStatus: formData.shopStatus === 'open' ? 'closed' : 'open'})}
                   >
                     <span className={styles.toggleCircle} />
                   </button>
                   <span className={formData.shopStatus === 'open' ? styles.activeLabel : ''}>Open</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <label className={styles.resLabel}>Store Name</label>
                <input 
                  className={styles.resSelect} 
                  value={formData.shopName}
                  onChange={e => setFormData({...formData, shopName: e.target.value})}
                  placeholder="ชื่อร้านอาหารของคุณ"
                />
              </div>

              <div className={styles.infoItem}>
                <label className={styles.resLabel}>Category</label>
                <select 
                  className={styles.resSelect} 
                  value={formData.shopCatType}
                  onChange={e => setFormData({...formData, shopCatType: e.target.value})}
                >
                  <option value="Bakery">Bakery 🍰</option>
                  <option value="Thai Food">Thai Food 🍛</option>
                  <option value="Cafe">Cafe ☕</option>
                  <option value="Fast Food">Fast Food 🍔</option>
                </select>
              </div>
              
              <hr style={{opacity: 0.1, margin: '10px 0'}} />
              
              <div className={styles.infoItem}>
                <label className={styles.resLabel}>ที่ตั้งร้านค้า (Address)</label>
                <textarea 
                  className={styles.resTextArea} 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="ระบุที่อยู่ของร้านคุณอย่างละเอียด..."
                />
              </div>

              <div className={styles.infoItem}>
                <label className={styles.resLabel}>พิกัดร้านค้า (GPS Location)</label>
                <div className={styles.gpsGrid}>
                   <input className={styles.resSelect} value={formData.shopLat} readOnly placeholder="Latitude" />
                   <input className={styles.resSelect} value={formData.shopLng} readOnly placeholder="Longitude" />
                   <button className={styles.gpsBtn} onClick={getCurrentLocation}>
                      <i className="fa-solid fa-location-crosshairs" /> ดึงพิกัด
                   </button>
                </div>
              </div>

              <div className={styles.infoItem}>
                <label className={styles.resLabel}>Phone Number</label>
                <input 
                  className={styles.resSelect} 
                  value={formData.shopPhone}
                  onChange={e => setFormData({...formData, shopPhone: e.target.value})}
                  placeholder="08X-XXX-XXXX"
                />
              </div>

              <button onClick={handleUpdate} className={styles.resSaveBtn} disabled={saving}>
                {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกการเปลี่ยนแปลงจาก DB'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
