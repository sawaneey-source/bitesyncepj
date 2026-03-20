'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../cropHelper'
import styles from './page.module.css'

export default function AddMenuPage() {
  const router  = useRouter()
  const fileRef = useRef()
  const [form, setForm]     = useState({ name:'', category:'', price:'', description:'', status:'available' })
  const [addons, setAddons] = useState([{ name:'', price:'' }])
  const [cats, setCats]     = useState([])
  const [preview, setPreview] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [prepTime, setPrepTime]   = useState(30)
  const [noCats, setNoCats]   = useState(false)
  const [toast, setToast]     = useState(null)
  const [originalImg, setOriginalImg] = useState(null)
  
  // Cropper State
  const [imageToCrop, setImageToCrop] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  useEffect(() => { fetchCats() }, [])

  function toast_(msg,type='ok'){ setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function fetchCats() {
    try {
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const res  = await fetch(`http://localhost/bitesync/api/shop/categories.php?usrId=${u.id}`,{headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}})
      const data = await res.json()
      if(data.success&&data.data.length>0) setCats(data.data)
      else setNoCats(true)
    } catch {
      toast_('ไม่สามารถโหลดข้อมูลหมวดหมู่ได้', 'err')
    } finally {
      setLoading(false)
    }
  }

  function onImg(e) {
    const f=e.target.files?.[0]; if(!f) return
    const url = URL.createObjectURL(f)
    setOriginalImg(url)
    setImageToCrop(url)
  }

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels)
      const croppedUrl = URL.createObjectURL(croppedBlob)
      setPreview(croppedUrl)
      
      // Convert Blob to File to keep it compatible with FormData
      const file = new File([croppedBlob], 'menu_item.jpg', { type: 'image/jpeg' })
      setImgFile(file)
      setImageToCrop(null)
    } catch (e) {
      console.error(e)
      toast_(`เกิดข้อผิดพลาด: ${e.message || 'ไม่สามารถครอบรูปได้'}`, 'err')
    }
  }

  const removeImg = () => {
    setImgFile(null)
    setPreview(null)
    setOriginalImg(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const addAddon    = ()           => setAddons(p=>[...p,{name:'',price:''}])
  const rmAddon     = i            => setAddons(p=>p.filter((_,j)=>j!==i))
  const upAddon     = (i,k,v)      => setAddons(p=>p.map((a,j)=>j===i?{...a,[k]:v}:a))
  const set         = (k,v)        => setForm(f=>({...f,[k]:v}))

  async function save() {
    if(!form.name.trim())         return toast_('กรุณากรอกชื่อเมนู','err')
    if(!form.category)            return toast_('กรุณาเลือกหมวดหมู่','err')
    if(!form.price||isNaN(+form.price)) return toast_('กรุณากรอกราคา','err')
    setSaving(true)
    try {
      const fd=new FormData()
      fd.append('name',form.name.trim()); fd.append('category',form.category)
      fd.append('price',form.price); fd.append('description',form.description)
      fd.append('status',form.status)
      fd.append('addons',JSON.stringify(addons.filter(a=>a.name.trim())))
      const u=JSON.parse(localStorage.getItem('bs_user'))
      fd.append('usrId', u.id)
      fd.append('prepTime', prepTime)
      if(imgFile) fd.append('image',imgFile)
      const res  = await fetch('http://localhost/bitesync/api/shop/menu.php',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`},body:fd})
      const data = await res.json()
      if(data.success){ toast_('เพิ่มเมนูสำเร็จ!'); setTimeout(()=>router.push('/shop/menu'),800) }
      else toast_(data.message||'เกิดข้อผิดพลาด','err')
    } catch { toast_('เกิดข้อผิดพลาด','err') }
    setSaving(false)
  }

  if (loading) return <div style={{ minHeight: '80vh' }}></div>

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'⚠️':'✅'} {toast.msg}</div>}

      {noCats && (
        <div className={styles.warn}>
          ⚠️ ยังไม่มีหมวดหมู่! <a href="/shop/categories" className={styles.warnLink}>สร้างหมวดหมู่ก่อน</a>
        </div>
      )}

      <div className={styles.hdr}>
        <button onClick={()=>router.back()} className={styles.backBtn}>←</button>
        <h1 className={styles.title}>Add New Menu</h1>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
          {/* ข้อมูลหลัก */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Menu Name</h2>
            <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Menu name..." className={styles.inp}/>

            <div className={styles.row2}>
              <div>
                <h2 className={styles.cardTitle} style={{marginTop:14}}>Category</h2>
                <select value={form.category} onChange={e=>set('category',e.target.value)} className={styles.inp}>
                  <option value="">Select...</option>
                  {cats.map(c=><option key={c.CatId} value={c.CatName}>{c.CatName}</option>)}
                </select>
              </div>
              <div>
                <h2 className={styles.cardTitle} style={{marginTop:14}}>Price & Time</h2>
                <div style={{display:'flex', gap:8}}>
                  <div className={styles.priceWrap} style={{flex:1}}>
                    <input type="number" value={form.price} onChange={e=>set('price',e.target.value)} placeholder="Price" className={styles.inp}/>
                    <span className={styles.priceBaht}>THB</span>
                  </div>
                  <div className={styles.priceWrap} style={{flex:1}}>
                    <input type="number" value={prepTime} onChange={e=>setPrepTime(e.target.value)} placeholder="Mins" className={styles.inp}/>
                    <span className={styles.priceBaht}>min</span>
                  </div>
                </div>
              </div>
            </div>


            <h2 className={styles.cardTitle} style={{marginTop:14}}>Description</h2>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe your menu..." rows={3} className={`${styles.inp} ${styles.ta}`}/>
          </div>

          {/* Upload Image */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Upload Image</h2>
            <div className={styles.uploadRow}>
              <button onClick={()=>fileRef.current?.click()} className={styles.btnFile}>📁 Choose File</button>
              {preview && <button onClick={removeImg} className={styles.btnRemoveImg}>🗑️ Remove</button>}
              <span className={styles.uploadHint}>MAX 5 MB</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={onImg}/>
          </div>

          {/* Add-ons */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Add-ons</h2>
            {addons.map((a,i)=>(
              <div key={i} className={styles.addonRow}>
                <input value={a.name} onChange={e=>upAddon(i,'name',e.target.value)} placeholder="e.g. Extra Ice Cream" className={`${styles.inp} ${styles.addonInp}`}/>
                <span className={styles.addonPlus}>+</span>
                <input type="number" value={a.price} onChange={e=>upAddon(i,'price',e.target.value)} placeholder="0" className={`${styles.inp} ${styles.addonPrice}`}/>
                <span className={styles.addonBaht}>THB</span>
                {addons.length>1&&<button onClick={()=>rmAddon(i)} className={styles.addonRm}>✕</button>}
              </div>
            ))}
            <button onClick={addAddon} className={styles.btnAddAddon}>+ Add add-on</button>
          </div>
        </div>

        <div className={styles.right}>
          {/* Preview */}
          <div className={`${styles.previewCard} ${preview ? styles.previewActive : ''}`} 
               onClick={preview ? () => setImageToCrop(originalImg || preview) : null}>
            {preview
              ? <><img src={preview} className={styles.previewImg}/><div className={styles.previewOver}>✎ แก้ไขรูปภาพ</div></>
              : <div className={styles.previewEmpty}><span>🖼️</span><span>ยังไม่มีรูปภาพ</span></div>
            }
          </div>

          {/* Availability */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Availability</h2>
            {[{val:'available',lbl:'Available'},{val:'out_of_stock',lbl:'Out of Stock'}].map(o=>(
              <label key={o.val} className={`${styles.radio} ${form.status===o.val?styles.radioOn:''}`}>
                <input type="radio" name="status" value={o.val} checked={form.status===o.val} onChange={()=>set('status',o.val)} style={{accentColor:'#2a6129'}}/>
                <span>{o.lbl}</span>
              </label>
            ))}
          </div>

          <button onClick={save} disabled={saving||noCats} className={styles.btnSave}>
            {saving?'⏳ Saving...':'Save Menu'}
          </button>
          <button onClick={()=>router.back()} className={styles.btnBack}>Cancel</button>
        </div>
      </div>

      {/* Cropper Modal */}
      {imageToCrop && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.cropHdr}>
              <h3 className={styles.cropTitle}>ปรับแต่งรูปภาพ</h3>
              <button onClick={() => setImageToCrop(null)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <div className={styles.cropArea}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
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
                <button onClick={confirmCrop} className={styles.btnCropDone}>ตกลง (Crop)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
