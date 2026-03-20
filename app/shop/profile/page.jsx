'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../menu/cropHelper'
import styles from './page.module.css'

const API = 'http://localhost/bitesync/api/shop/profile.php'
const THAI_ADDR = 'http://localhost/bitesync/api/home/thai_address.php'

const SHOP_CATEGORIES = [
  'อาหารตามสั่ง', 'ก๋วยเตี๋ยว', 'กาแฟและชา', 'อาหารไทย', 'อาหารจีน',
  'อาหารอิตาเลี่ยน', 'อาหารแม็กซิกัน', 'อาหารเวียดนาม', 'อาหารเกาหลี',
  'อาหารภาคเหนือ', 'อาหารภาคอิสาน', 'อาหารภาคใต้', 'ยำ', 'ต้ม', 'แกง', 'ผัด',
  'ทอด', 'ปิ้งย่าง', 'อาหารจานด่วน', 'ทานเล่น', 'มังสวิรัต', 'นํ้าผลไม้',
  'อาหารทะเล', 'สเต๊ก'
]

export default function ShopProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [isMounted, setIsMounted] = useState(false)

  // Thai address data
  const [thaiData, setThaiData] = useState([])
  const [addrLoading, setAddrLoading] = useState(true)

  // tbl_shop fields
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopCatType, setShopCatType] = useState('อาหารตามสั่ง')
  const [shopStatus, setShopStatus] = useState(1)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [originalLogo, setOriginalLogo] = useState(null)
  const [originalBanner, setOriginalBanner] = useState(null)
  const [logoFileOri, setLogoFileOri] = useState(null)
  const [bannerFileOri, setBannerFileOri] = useState(null)

  // Cropper State
  const [imageToCrop, setImageToCrop] = useState(null)
  const [cropTarget, setCropTarget] = useState(null) // 'logo' | 'banner'
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  // tbl_address fields
  const [houseNo, setHouseNo] = useState('')
  const [village, setVillage] = useState('')
  const [road, setRoad] = useState('')
  const [soi, setSoi] = useState('')
  const [moo, setMoo] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [subDistrict, setSubDistrict] = useState('')
  const [zipcode, setZipcode] = useState('')

  // tbl_userinfo fields
  const [usrFullName, setUsrFullName] = useState('')
  const [usrEmail, setUsrEmail] = useState('')
  const [usrPhone, setUsrPhone] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [userPw, setUserPw] = useState('')
  const [userPwConfirm, setUserPwConfirm] = useState('')
  const [adrLat, setAdrLat] = useState(null)
  const [adrLng, setAdrLng] = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [showBannerMenu, setShowBannerMenu] = useState(false)
  const [showLogoMenu, setShowLogoMenu] = useState(false)

  // Derived cascading lists
  const provinces = useMemo(() => thaiData.map(p => p.name_th), [thaiData])
  const selProv = useMemo(() => thaiData.find(p => p.name_th === province), [thaiData, province])
  const districts = useMemo(() => selProv?.amphure?.map(a => a.name_th) || [], [selProv])
  const selDist = useMemo(() => selProv?.amphure?.find(a => a.name_th === district), [selProv, district])
  const subDistricts = useMemo(() => selDist?.tambon?.map(t => ({ name: t.name, zip: t.zip })) || [], [selDist])

  // Load Thai address data once
  useEffect(() => {
    fetch(`${THAI_ADDR}?v=${Date.now()}`)
      .then(r => r.json())
      .then(d => { setThaiData(d); setAddrLoading(false) })
      .catch(() => setAddrLoading(false))
  }, [])

  // Load shop data from API
  useEffect(() => {
    setIsMounted(true)
    const u = localStorage.getItem('bs_user')
    if (!u) { router.replace('/login'); return }
    const parsed = JSON.parse(u)
    if (parsed.role !== 'restaurant' && parsed.role !== 'shop') { router.replace('/profile'); return }
    setUser(parsed)

    fetch(`${API}?usrId=${parsed.id}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const s = d.data
          setShopName(s.ShopName || '')
          setShopPhone(s.ShopPhone || '')
          setShopCatType(s.ShopCatType || 'อาหารตามสั่ง')
          setShopStatus(s.ShopStatus ?? 1)
          setLogoPreview(s.ShopLogoPath)
          setOriginalLogo(s.ShopLogoOriPath || s.ShopLogoPath)
          setBannerPreview(s.ShopBannerPath)
          setOriginalBanner(s.ShopBannerOriPath || s.ShopBannerPath)
          setHouseNo(s.HouseNo || '')
          setVillage(s.Village || '')
          setRoad(s.Road || '')
          setSoi(s.Soi || '')
          setMoo(s.Moo || '')
          setProvince(s.Province || '')
          setDistrict(s.District || '')
          setSubDistrict(s.SubDistrict || '')
          setZipcode(s.Zipcode || '')
          setAdrLat(s.AdrLat || null)
          setAdrLng(s.AdrLng || null)

          setUsrFullName(s.UsrFullName || '')
          setUsrEmail(s.UsrEmail || '')
          setUsrPhone(s.UsrPhone || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const handleProvinceChange = (val) => { setProvince(val); setDistrict(''); setSubDistrict(''); setZipcode('') }
  const handleDistrictChange = (val) => { setDistrict(val); setSubDistrict(''); setZipcode('') }
  const handleSubDistrictChange = (val) => {
    setSubDistrict(val)
    const match = subDistricts.find(s => s.name === val)
    if (match) setZipcode(String(match.zip))
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return showToast('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง', false)
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAdrLat(pos.coords.latitude.toFixed(7))
        setAdrLng(pos.coords.longitude.toFixed(7))
        setGeoLoading(false)
        showToast('ดึงพิกัดปัจจุบันสำเร็จ ✅')
      },
      (err) => {
        setGeoLoading(false)
        showToast('ไม่สามารถดึงพิกัดได้: ' + err.message, false)
      },
      { enableHighAccuracy: true }
    )
  }

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const handleLogoChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setLogoFileOri(f)
    setOriginalLogo(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropTarget('logo')
    setImageToCrop(url)
  }

  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setBannerFileOri(file)
    setOriginalBanner(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCropTarget('banner')
    setImageToCrop(url)
  }

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels)
      if (!croppedBlob) throw new Error('ไม่สามารถสร้างไฟล์รูปภาพได้')
      const url = URL.createObjectURL(croppedBlob)
      if (cropTarget === 'logo') {
        setLogoPreview(url)
        setLogoFile(new File([croppedBlob], 'logo.jpg', { type: 'image/jpeg' }))
      } else {
        setBannerPreview(url)
        setBannerFile(new File([croppedBlob], 'banner.jpg', { type: 'image/jpeg' }))
      }
      setImageToCrop(null)
      setCropTarget(null)
    } catch (e) {
      console.error(e)
      showToast(`เกิดข้อผิดพลาด: ${e.message || 'ไม่สามารถครอบรูปได้'}`, false)
    }
  }

  const handleSave = async () => {
    if (userPw.trim()) {
      if (!oldPw.trim()) {
        return showToast('กรุณาระบุรหัสผ่านเดิมก่อนเปลี่ยนรหัสใหม่', false)
      }
      if (userPw !== userPwConfirm) {
        return showToast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', false)
      }
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('usrId', user.id); fd.append('shopName', shopName)
      fd.append('shopPhone', shopPhone); fd.append('shopCatType', shopCatType)
      fd.append('shopStatus', shopStatus)
      fd.append('houseNo', houseNo); fd.append('village', village)
      fd.append('road', road); fd.append('soi', soi)
      fd.append('moo', moo); fd.append('subDistrict', subDistrict)
      fd.append('district', district); fd.append('province', province)
      fd.append('zipcode', zipcode)
      if (adrLat) fd.append('adrLat', adrLat)
      if (adrLng) fd.append('adrLng', adrLng)
      if (usrFullName) fd.append('usrFullName', usrFullName)
      if (usrPhone) fd.append('usrPhone', usrPhone)
      if (oldPw) fd.append('oldPw', oldPw)
      if (userPw) fd.append('usrPassword', userPw)
      if (logoFile) fd.append('logo', logoFile)
      if (logoFileOri) fd.append('logoOri', logoFileOri)
      if (bannerFile) fd.append('banner', bannerFile)
      if (bannerFileOri) fd.append('bannerOri', bannerFileOri)

      const res = await fetch(API, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setLogoFile(null); setBannerFile(null)
        setLogoFileOri(null); setBannerFileOri(null)
        setOldPw(''); setUserPw(''); setUserPwConfirm('')
        showToast('บันทึกข้อมูลสำเร็จ ✅')

        try {
          const u = JSON.parse(localStorage.getItem('bs_user'))
          if (usrFullName) u.name = usrFullName
          localStorage.setItem('bs_user', JSON.stringify(u))
        } catch (e) { }

        // Update state with fresh data instead of full page reload
        if (data.data) {
          const s = data.data
          setShopName(s.ShopName || '')
          setShopPhone(s.ShopPhone || '')
          setShopCatType(s.ShopCatType || 'อาหารตามสั่ง')
          setShopStatus(s.ShopStatus ?? 1)
          
          if (s.ShopLogoPath) setLogoPreview(s.ShopLogoPath)
          if (s.ShopLogoOriPath || s.ShopLogoPath) setOriginalLogo(s.ShopLogoOriPath || s.ShopLogoPath)
          if (s.ShopBannerPath) setBannerPreview(s.ShopBannerPath)
          if (s.ShopBannerOriPath || s.ShopBannerPath) setOriginalBanner(s.ShopBannerOriPath || s.ShopBannerPath)
          if (s.UsrPhone) setUsrPhone(s.UsrPhone)
        }
      } else {
        showToast(data.message || 'เกิดข้อผิดพลาด', false)
      }
    } catch { showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', false) }
    setSaving(false)
  }

  if (!isMounted || loading) return <div style={{ minHeight: '80vh' }}></div>

  return (
    <div className={styles.restaurantPage}>
      {toast && <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>{toast.msg}</div>}

      <div className={styles.container}>
        <div className={styles.profileCard}>

          {/* Banner */}
          <div className={styles.bannerWrap}>
            <img src={bannerPreview || 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=1500'} alt="Banner" className={styles.bannerImg} />
            <div className={styles.bannerBtnContainer}>
              <button className={styles.bannerBtnMini} onClick={(e) => { 
                e.stopPropagation(); 
                if (!(originalBanner || bannerPreview)) {
                  document.getElementById('bannerInput').click();
                } else {
                  setShowBannerMenu(!showBannerMenu); 
                }
              }}>
                <span><i className="fa-solid fa-camera" /></span> จัดการรูปปก
              </button>
              {showBannerMenu && (originalBanner || bannerPreview) && (
                <div className={styles.bannerActionMenu} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setShowBannerMenu(false); document.getElementById('bannerInput').click(); }}>
                    <span><i className="fa-solid fa-upload" /></span> อัปโหลดใหม่
                  </button>
                    <button onClick={() => {
                      setShowBannerMenu(false);
                      const src = originalBanner || bannerPreview;
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      if (!src) return;
                      if (src.startsWith('blob:') || src.startsWith('data:')) {
                        setImageToCrop(src);
                      } else {
                        // Strip domain/public prefix to get just /uploads/profiles/...
                        const path = src.replace(/^https?:\/\/[^/]+\/bitesync\/public/, '');
                        setImageToCrop(`http://localhost/bitesync/api/shop/image_proxy.php?file=${path}`);
                      }
                      setCropTarget('banner');
                    }}>
                    <span><i className="fa-solid fa-crop-simple" /></span> แก้ไขการครอบ
                  </button>
                </div>
              )}
            </div>
            <input id="bannerInput" type="file" accept="image/*" hidden onChange={handleBannerChange} />
          </div>

          {/* Avatar + name */}
          <div className={styles.resHeader}>
            <div className={styles.avatarWrap} onClick={() => {
              if (!(originalLogo || logoPreview)) {
                document.getElementById('logoInput').click();
              } else {
                setShowLogoMenu(!showLogoMenu);
              }
            }}>
              <div className={styles.avatarLarge}>
                {console.log('Rendering Avatar. logoPreview=', logoPreview, 'shopName=', shopName)}
                {logoPreview ? <img src={logoPreview} alt="Logo" className={styles.avatarImg} /> : (shopName || 'S')[0].toUpperCase()}
              </div>
              <div className={styles.logoBtnWrap}>
                <div className={styles.logoActionBtn}>
                  <span><i className="fa-solid fa-camera" /></span>
                </div>
                {showLogoMenu && (originalLogo || logoPreview) && (
                  <div className={styles.logoActionMenu} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setShowLogoMenu(false); document.getElementById('logoInput').click(); }}>
                      <span><i className="fa-solid fa-upload" /></span> อัปโหลดใหม่
                    </button>
                    <button onClick={() => {
                      setShowLogoMenu(false);
                      const src = originalLogo || logoPreview;
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      if (!src) return;
                      if (src.startsWith('blob:') || src.startsWith('data:')) {
                        setImageToCrop(src);
                      } else {
                        // Strip domain/public prefix to get just /uploads/profiles/...
                        const path = src.replace(/^https?:\/\/[^/]+\/bitesync\/public/, '');
                        setImageToCrop(`http://localhost/bitesync/api/shop/image_proxy.php?file=${path}`);
                      }
                      setCropTarget('logo');
                    }}>
                      <span><i className="fa-solid fa-crop-simple" /></span> ปรับระยะรูป
                    </button>
                  </div>
                )}
              </div>
              <input id="logoInput" type="file" accept="image/*" hidden onChange={handleLogoChange} />
            </div>
            <div className={styles.headerInfo}>
              <h1 className={styles.name}>{shopName || 'ชื่อร้านของคุณ'}</h1>
              <div className={styles.statusBadge}>
                <div className={`${styles.statusDot} ${shopStatus === 1 ? styles.statusOpen : styles.statusClosed}`} />
                <span>{shopStatus === 1 ? 'กำลังเปิดร้าน' : 'ปิดร้านอยู่'}</span>
              </div>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.resInfoGrid}>

              {/* ── ข้อมูลร้าน ── */}
              <div className={styles.sectionHeader}>
                <span><i className="fa-solid fa-store" /></span>
                <span className={styles.sectionTitle}>ข้อมูลร้านค้า</span>
              </div>

              <div className={styles.infoItem}>
                <label className={styles.resLabel}>สถานะร้านค้า</label>
                <div className={styles.toggleRow}>
                  <span className={shopStatus === 0 ? styles.activeLabel : ''}>ปิด</span>
                  <button className={`${styles.toggleBtn} ${shopStatus === 1 ? styles.toggleOn : ''}`}
                    onClick={() => setShopStatus(shopStatus === 1 ? 0 : 1)}>
                    <span className={styles.toggleCircle} />
                  </button>
                  <span className={shopStatus === 1 ? styles.activeLabel : ''}>เปิด</span>
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ชื่อร้าน</label>
                  <input type="text" className={styles.resInput} value={shopName} onChange={e => setShopName(e.target.value)} placeholder="ชื่อร้านอาหาร" />
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>เบอร์โทรร้าน</label>
                  <input type="tel" className={styles.resInput} value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="08X-XXX-XXXX" maxLength={10} />
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ประเภทร้าน</label>
                  <select className={styles.resSelect} value={shopCatType} onChange={e => setShopCatType(e.target.value)}>
                    {SHOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* ── ที่อยู่ ── */}
              <div className={styles.divider} />
              <div className={styles.sectionHeader}>
                <span><i className="fa-solid fa-location-dot" /></span>
                <span className={styles.sectionTitle}>ที่อยู่ร้านค้า</span>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>บ้านเลขที่</label>
                  <input type="text" className={styles.resInput} value={houseNo} onChange={e => setHouseNo(e.target.value)} placeholder="123/4" />
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>หมู่บ้าน</label>
                  <input type="text" className={styles.resInput} value={village} onChange={e => setVillage(e.target.value)} placeholder="หมู่บ้าน..." />
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ถนน</label>
                  <input type="text" className={styles.resInput} value={road} onChange={e => setRoad(e.target.value)} placeholder="ถนน..." />
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ซอย</label>
                  <input type="text" className={styles.resInput} value={soi} onChange={e => setSoi(e.target.value)} placeholder="ซอย..." />
                </div>
              </div>

              <div className={styles.infoItem} style={{ maxWidth: 220 }}>
                <label className={styles.resLabel}>หมู่</label>
                <input type="text" className={styles.resInput} value={moo} onChange={e => setMoo(e.target.value)} placeholder="หมู่ที่..." />
              </div>

              {/* Cascading address dropdowns */}
              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>
                    จังหวัด {addrLoading && <span className={styles.loadingBadge}>กำลังโหลด…</span>}
                  </label>
                  <select className={styles.resSelect} value={province} onChange={e => handleProvinceChange(e.target.value)} disabled={addrLoading}>
                    <option value="">-- เลือกจังหวัด --</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>อำเภอ/เขต</label>
                  <select className={styles.resSelect} value={district} onChange={e => handleDistrictChange(e.target.value)} disabled={!province || addrLoading}>
                    <option value="">-- เลือกอำเภอ --</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ตำบล/แขวง</label>
                  <select className={styles.resSelect} value={subDistrict} onChange={e => handleSubDistrictChange(e.target.value)} disabled={!district}>
                    <option value="">-- เลือกตำบล --</option>
                    {subDistricts.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>รหัสไปรษณีย์ (กรอกอัตโนมัติ)</label>
                  <input type="text" className={styles.resInput} value={zipcode} onChange={e => setZipcode(e.target.value)} placeholder="10500" maxLength={5} readOnly={!!subDistrict} />
                </div>
              </div>

              {/* ── ปักหมุดตำแหน่ง (Geolocation) ── */}
              <div className={styles.gpsBox}>
                <label className={styles.resLabel}>ปักหมุดตำแหน่งร้าน (สำหรับไรเดอร์)</label>
                <div className={styles.gpsGrid}>
                  <div className={styles.infoItem}>
                    <input type="text" className={styles.resInput} value={adrLat || ''} onChange={e => setAdrLat(e.target.value)} placeholder="Latitude (เช่น 13.7563)" />
                  </div>
                  <div className={styles.infoItem}>
                    <input type="text" className={styles.resInput} value={adrLng || ''} onChange={e => setAdrLng(e.target.value)} placeholder="Longitude (เช่น 100.5018)" />
                  </div>
                  <button className={styles.gpsAutoBtn} onClick={getCurrentLocation} disabled={geoLoading}>
                    {geoLoading ? '⏳...' : <span><i className="fa-solid fa-location-crosshairs" /></span>}
                  </button>
                </div>
                {adrLat && adrLng && (
                  <p className={styles.gpsHint}>
                    <a href={`https://www.google.com/maps?q=${adrLat},${adrLng}`} target="_blank" rel="noreferrer" className={styles.gpsLink}>
                      [ ดูบนแผนที่ ]
                    </a>
                  </p>
                )}
              </div>

              {/* ── ตั้งค่าบัญชีความปลอดภัย ── */}
              <div className={styles.divider} />
              <div className={styles.sectionHeader}>
                <span><i className="fa-solid fa-lock" /></span>
                <span className={styles.sectionTitle}>ตั้งค่าบัญชีความปลอดภัย</span>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ชื่อ-นามสกุล (เจ้าของร้าน)</label>
                  <input type="text" className={styles.resInput} value={usrFullName} onChange={e => setUsrFullName(e.target.value)} placeholder="ชื่อ-นามสกุล" />
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>เบอร์ติดต่อ (เจ้าของร้าน)</label>
                  <input type="tel" className={styles.resInput} value={usrPhone} onChange={e => setUsrPhone(e.target.value)} placeholder="08X-XXX-XXXX" maxLength={10} />
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>อีเมลล็อกอิน (เปลี่ยนไม่ได้)</label>
                  <input type="email" className={styles.resInput} value={usrEmail} readOnly disabled style={{ background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }} />
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>รหัสผ่านเดิม (เว้นว่างหากไม่เปลี่ยน)</label>
                  <input type="password" className={styles.resInput} value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="••••••••" />
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>รหัสผ่านใหม่</label>
                  <input type="password" className={styles.resInput} value={userPw} onChange={e => setUserPw(e.target.value)} placeholder="••••••••" minLength={6} autoComplete="new-password" />
                </div>
                <div className={styles.infoItem}>
                  <label className={styles.resLabel}>ยืนยันรหัสผ่านใหม่</label>
                  <input type="password" className={styles.resInput} value={userPwConfirm} onChange={e => setUserPwConfirm(e.target.value)} placeholder="••••••••" minLength={6} autoComplete="new-password" />
                </div>
              </div>

              <div className={styles.pwdHintBox}>
                <div className={styles.pwdHintIcon}>💡</div>
                <div className={styles.pwdHintText}>
                  <strong>เปลี่ยนรหัสผ่าน:</strong> คุณสามารถพิมพ์รหัสผ่านใหม่ทับแล้วกดบันทึกได้เลยทันที<br/>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert('ติดต้อแอดมินเพื่อรีเซ็ตรหัสผ่านร้านค้า\n\nLine OA: @BiteSyncAdmin\nโทร: 02-123-4567'); }} className={styles.forgotLink}>
                    ลืมรหัสผ่านเดิมใช่ไหม? คลิกที่นี่เพื่อติดต่อแอดมิน
                  </a>
                </div>
              </div>

              <button onClick={handleSave} className={styles.resSaveBtn} disabled={saving}>
                {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
              </button>

            </div>
          </div>
        </div>
      </div>
      {/* Cropper Modal */}
      {imageToCrop && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.cropHdr}>
              <h3 className={styles.cropTitle}>ปรับแต่งรูปภาพ ({cropTarget === 'logo' ? 'โลโก้' : 'หน้าปก'})</h3>
              <button onClick={() => setImageToCrop(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div className={styles.cropArea}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={cropTarget === 'logo' ? 1 : 3 / 1}
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
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className={styles.zoomInp}
                />
              </div>
              <div className={styles.cropBtns}>
                <button onClick={() => setImageToCrop(null)} className={styles.btnCropCan}>ยกเลิก</button>
                <button onClick={confirmCrop} className={styles.btnCropDone}>ตกลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
