'use client'
import { useState, useEffect, useRef } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/app/shop/menu/cropHelper'
import styles from './page.module.css'
import { API_BASE, PUBLIC_URL } from '@/utils/api'

export default function RiderProfilePage() {
  const fileRef = useRef()
  const [form, setForm] = useState({ name:'', phone:'', email:'', vehicle:'', plate:'', color:'', bankName:'', bankAccount:'', emergency:'', preview:null, img:null, oldPw: '', userPw: '', userPwConfirm: '' })
  const [stats, setStats] = useState({ rating:0.0, jobs:0, settled:0, outstanding:0 })
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)

  // Cropper State
  const [imageToCrop, setImageToCrop] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [originalImageUrl, setOriginalImageUrl] = useState(null)  // blob URL of local file chosen this session
  const [showOtherVehicle, setShowOtherVehicle] = useState(false)

  const VEHICLE_MODELS = ['Honda PCX', 'Yamaha NMAX', 'Honda Click', 'Honda Wave', 'Yamaha Aerox', 'PCX 150']

  useEffect(() => { load() }, [])
  function showToast(msg,type='ok'){ setToast({msg,type}); setTimeout(()=>setToast(null),2500) }
  function set(k,v){ setForm(f=>({...f,[k]:v})) }

  async function load() {
    setLoading(true)
    try {
      const userStr = localStorage.getItem('bs_user')
      if (!userStr) { showToast('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่','err'); return }
      const user = JSON.parse(userStr)
      if (!user.id) { showToast('User ID ไม่ถูกต้อง','err'); return }

      const res  = await fetch(`${API_BASE}/rider/profile.php?usrId=${user.id}&t=${Date.now()}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        const r = data.data
        setForm(f => ({ 
          ...f, 
          name:r.name||'', 
          phone:r.phone||'', 
          email:r.email||'',
          vehicle:r.vehicle||'', 
          plate:r.plate||'', 
          color:r.color||'',
          bankName:r.bankName||'', 
          bankAccount:r.bankAccount||'', 
          emergency:r.emergency||'',
          preview: r.img || null,
          imgOri: r.imgOri || null
        }))
        if (r.vehicle && !['Honda PCX', 'Yamaha NMAX', 'Honda Click', 'Honda Wave', 'Yamaha Aerox', 'PCX 150'].includes(r.vehicle)) {
          setShowOtherVehicle(true)
        }
        setStats({ 
          rating: r.rating, 
          jobs: r.ratingCount, 
          settled: r.balance, 
          outstanding: r.outstanding 
        })
      } else {
        console.error('Load Error:', data.message)
        showToast('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้: ' + data.message, 'err')
      }
    } catch (e) {
      console.error('Fetch Load Error:', e)
    } finally {
      setLoading(false)
    }
  }

  function onImg(e) { 
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setOriginalImageUrl(url)  // remember full original for re-crop
    setForm(prev => ({ ...prev, imgOriFile: f }))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setImageToCrop(url)
  }

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels)
      if (!croppedBlob) throw new Error('ไม่สามารถสร้างไฟล์รูปภาพได้')
      const url = URL.createObjectURL(croppedBlob)
      setForm(f => ({ 
        ...f, 
        preview: url, 
        img: new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' }) 
      }))
      setImageToCrop(null)
    } catch(e) { 
      showToast('ไม่สามารถครอบรูปได้: '+e.message, 'err') 
    }
  }

  function handleEditCrop() {
    const stamp = Date.now()
    const toProxy = (url) => {
      if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url
      const path = url.replace(/^https?:\/\/[^/]+\/bitesync\/public/, '')
      return `http://localhost/bitesync/api/shop/image_proxy.php?file=${encodeURIComponent(path)}&t=${stamp}`
    }

    if (originalImageUrl) {
      // Blob from this session — no CORS issue
      setImageToCrop(originalImageUrl)
    } else if (form.imgOri) {
      setImageToCrop(toProxy(form.imgOri))
    } else if (form.preview) {
      setImageToCrop(toProxy(form.preview))
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  async function save() {
    if(!form.name.trim()) return showToast('กรุณากรอกชื่อ','err')
    if (form.userPw.trim()) {
      if (!form.oldPw.trim()) return showToast('กรุณาระบุรหัสผ่านเดิมเพื่อเปลี่ยนรหัสใหม่', 'err')
      if (form.userPw !== form.userPwConfirm) return showToast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'err')
    }
    setLoading(true)
    try {
      const userStr = localStorage.getItem('bs_user')
      const user = JSON.parse(userStr || '{}')
      if (!user.id) throw new Error('ไม่พบ User ID')

      const fd = new FormData()
      fd.append('usrId', user.id)
      
      const fields = ['name', 'phone', 'vehicle', 'plate', 'color', 'bankName', 'bankAccount', 'emergency']
      fields.forEach(k => fd.append(k, form[k] || ''))
      
      if(form.userPw) {
        fd.append('oldPw', form.oldPw)
        fd.append('usrPassword', form.userPw)
      }
      
      if(form.img) fd.append('image', form.img)
      if(form.imgOriFile) fd.append('imageOri', form.imgOriFile)
      
      console.log('Saving Rider Profile for UsrId:', user.id)

      const res  = await fetch(`${API_BASE}/rider/profile.php`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('bs_token')}` }, 
        body:fd
      })
      const text = await res.text()
      let data;
      try {
        data = JSON.parse(text)
      } catch (errJson) {
        throw new Error('Server returned invalid response: ' + text.substring(0, 100))
      }

      if(data.success) {
        showToast(data.message || 'บันทึกข้อมูลสำเร็จ!')
        
        // Sync new data to localStorage for Sidebar/Navbar
        const userStr = localStorage.getItem('bs_user')
        if (userStr) {
          const u = JSON.parse(userStr)
          u.name = form.name
          if (data.data.rawImg) u.image = data.data.rawImg
          localStorage.setItem('bs_user', JSON.stringify(u))
        }

        if (data.data) {
          const r = data.data
          setForm(f => ({ ...f, 
            name: r.name, phone: r.phone, vehicle: r.vehicle, plate: r.plate, color: r.color,
            bankName: r.bankName, bankAccount: r.bankAccount, emergency: r.emergency,
            preview: r.img, imgOri: r.imgOri, img: null, oldPw: '', userPw: '', userPwConfirm: ''
          }))
          setStats({ rating: r.rating, jobs: r.ratingCount, settled: r.balance, outstanding: r.outstanding })
        }
        await load()
      } else {
        showToast(data.message||'เกิดข้อผิดพลาด','err')
      }
    } catch (e) { 
      showToast('เกิดข้อผิดพลาด: ' + e.message, 'err') 
    }
    setLoading(false)
  }

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'⚠️':'✅'} {toast.msg}</div>}
      <h1 className={styles.title}>โปรไฟล์ไรเดอร์</h1>

      {loading && !form.name ? (
        <div className={styles.loadingBox} style={{padding:'50px 0', textAlign:'center'}}>
          <div className={styles.spinner} style={{margin:'0 auto 10px'}} />
          <p>กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      ) : (
        <div className={styles.layout}>
        {/* Avatar */}
        <div className={styles.avatarCard}>
          <div className={styles.avatarWrap}>
            {form.preview
              ? <img src={form.preview} className={styles.avatarImg} onClick={() => fileRef.current?.click()} style={{cursor:'pointer'}} />
              : <div className={styles.avatarPlaceholder} onClick={() => fileRef.current?.click()} style={{fontSize:50, cursor:'pointer'}}>🛵</div>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={onImg}/>
          
          <div className={styles.avatarBtns}>
            <button className={styles.avatarEditBtn} onClick={() => fileRef.current?.click()}>เปลี่ยนรูป</button>
            {form.preview && (
              <button className={styles.avatarEditBtn} onClick={handleEditCrop}>แก้ไขการครอบ</button>
            )}
          </div>

          <div className={styles.avatarName}>{form.name||'ชื่อไรเดอร์'}</div>
          <div className={styles.avatarSub}>{form.vehicle||'ยานพาหนะ'} {form.color ? `(${form.color})` : ''}</div>
          <div className={styles.ratingBox}>
            <div className={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} style={{ color: s <= Math.round(stats.rating) ? '#f0c419' : '#ddd' }}>★</span>
              ))}
            </div>
            <span style={{fontWeight:800}}>{stats.rating}</span>
            <span className={styles.ratingDot}>·</span>
            <span>{stats.jobs} งาน</span>
          </div>
          <div style={{fontSize:12, color:'#666', marginTop:5}}>
             ชำระแล้ว (สะสม): <b style={{color:'#2a6129'}}>฿{stats.settled?.toLocaleString()}</b>
             {stats.outstanding > 0 && (
               <div style={{color:'#e11d48', marginTop:2}}>
                 ยอดค้างจ่าย: ฿{stats.outstanding?.toLocaleString()}
               </div>
             )}
          </div>
        </div>

        {/* Form */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>ข้อมูลส่วนตัว</h2>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>ชื่อ-นามสกุล</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="ชื่อ-นามสกุล" className={styles.inp}/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>เบอร์โทร</label>
              <input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="0xx-xxx-xxxx" className={styles.inp} maxLength={10}/>
            </div>
          </div>
          <div className={styles.field} style={{marginTop:12}}>
            <label className={styles.label}>เบอร์โทรฉุกเฉิน (10 หลัก)</label>
            <input value={form.emergency} onChange={e=>set('emergency',e.target.value)} placeholder="บุคคลที่ติดต่อได้ยามฉุกเฉิน" className={styles.inp} maxLength={10}/>
          </div>

          <h2 className={styles.sectionTitle} style={{marginTop:18}}>ยานพาหนะ</h2>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>ชนิดรถ</label>
              <select 
                value={showOtherVehicle ? 'Other' : (VEHICLE_MODELS.includes(form.vehicle) ? form.vehicle : '')} 
                onChange={e => {
                  const val = e.target.value
                  if (val === 'Other') {
                    setShowOtherVehicle(true)
                    set('vehicle', '')
                  } else {
                    setShowOtherVehicle(false)
                    set('vehicle', val)
                  }
                }} 
                className={styles.inp}
              >
                <option value="">เลือกชนิดรถ</option>
                {VEHICLE_MODELS.map(v => <option key={v} value={v}>{v}</option>)}
                <option value="Other">อื่นๆ (ระบุเอง)</option>
              </select>
              {showOtherVehicle && (
                <input 
                  value={form.vehicle} 
                  onChange={e => set('vehicle', e.target.value)} 
                  placeholder="ระบุยี่ห้อ/รุ่นรถของคุณ" 
                  className={styles.inp} 
                  style={{ marginTop: 8 }}
                  autoFocus
                />
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>ทะเบียนรถ (และสี)</label>
              <div style={{display:'flex', gap:8}}>
                <input value={form.plate} onChange={e=>set('plate',e.target.value)} placeholder="กข-1234" className={styles.inp} style={{flex:2}}/>
                <input value={form.color} onChange={e=>set('color',e.target.value)} placeholder="สีรถ" className={styles.inp} style={{flex:1}}/>
              </div>
            </div>
          </div>

          <h2 className={styles.sectionTitle} style={{marginTop:18}}>บัญชีธนาคาร</h2>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>ธนาคาร</label>
              <select value={form.bankName} onChange={e=>set('bankName',e.target.value)} className={styles.inp}>
                <option value="">เลือกธนาคาร</option>
                {['กสิกรไทย','กรุงไทย','กรุงเทพ','ไทยพาณิชย์','ออมสิน','ทหารไทย'].map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>เลขที่บัญชี</label>
              <input 
                value={form.bankAccount} 
                onChange={e => set('bankAccount', e.target.value.replace(/[^0-9]/g, ''))} 
                placeholder="xxxxxxxxxxxx" 
                className={styles.inp} 
                maxLength={12}
              />
            </div>
          </div>

          <h2 className={styles.sectionTitle} style={{marginTop:18}}>ความปลอดภัยและบัญชี</h2>
          <div className={styles.field}>
            <label className={styles.label}>อีเมล (เข้าสู่ระบบ - เปลี่ยนไม่ได้)</label>
            <input value={form.email} readOnly disabled className={styles.inp} style={{background:'#f5f5f5', color:'#888', cursor:'not-allowed'}}/>
          </div>
          
          <div className={styles.row2} style={{marginTop:12}}>
            <div className={styles.field}>
              <label className={styles.label}>รหัสผ่านเดิม (ระบุเมื่อต้องการเปลี่ยนรหัส)</label>
              <input type="password" value={form.oldPw} onChange={e=>set('oldPw',e.target.value)} placeholder="••••••••" className={styles.inp}/>
            </div>
          </div>
          <div className={styles.row2} style={{marginTop:12}}>
            <div className={styles.field}>
              <label className={styles.label}>รหัสผ่านใหม่</label>
              <input type="password" value={form.userPw} onChange={e=>set('userPw',e.target.value)} placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" className={styles.inp} minLength={6} autoComplete="new-password"/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>ยืนยันรหัสผ่านใหม่</label>
              <input type="password" value={form.userPwConfirm} onChange={e=>set('userPwConfirm',e.target.value)} placeholder="ยืนยันรหัสผ่านใหม่" className={styles.inp} minLength={6} autoComplete="new-password"/>
            </div>
          </div>

          <div className={styles.pwdHintBox}>
            <div className={styles.pwdHintIcon}>💡</div>
            <div className={styles.pwdHintText}>
              <strong>เปลี่ยนรหัสผ่าน:</strong> กรอกรหัสเดิมและรหัสใหม่แล้วกดบันทึกได้เลยครับ
            </div>
          </div>

          <button onClick={save} disabled={loading} className={styles.saveBtn}>
            {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึกโปรไฟล์'}
          </button>
        </div>
      </div>
      )}

      {imageToCrop && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.cropHdr}>
              <h3 className={styles.cropTitle}>ปรับแต่งรูปภาพ (โปรไฟล์)</h3>
              <button onClick={() => setImageToCrop(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div className={styles.cropArea}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
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

