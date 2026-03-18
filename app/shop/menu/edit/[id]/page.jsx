'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'

export default function EditMenuPage() {
  const router  = useRouter()
  const params  = useParams()
  const fileRef = useRef()
  const [form, setForm]     = useState({ name:'', category:'', price:'', description:'', status:'available', prepTime:30 })
  const [addons, setAddons] = useState([{ name:'', price:'' }])
  const [cats, setCats]     = useState([])
  const [preview, setPreview] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noCats, setNoCats]   = useState(false)
  const [toast, setToast]     = useState(null)

  useEffect(() => { 
    fetchCats()
    if (params?.id) fetchMenu(params.id)
  }, [params?.id])

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
    }
  }

  async function fetchMenu(id) {
    try {
      const res = await fetch(`http://localhost/bitesync/api/shop/menu_detail.php?id=${id}`,{headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}})
      const data = await res.json()
      if (data.success) {
        setForm({
          name: data.data.name,
          category: data.data.category,
          price: data.data.price,
          description: data.data.description,
          status: data.data.status,
          prepTime: data.data.prepTime || 30
        })
        if (data.data.img) setPreview(`http://localhost/bitesync/public${data.data.img}`)
        if (data.data.addons && data.data.addons.length > 0) setAddons(data.data.addons)
        setLoading(false)
      } else {
        toast_(data.message || 'ไม่พบข้อมูลเมนู', 'err')
        setLoading(false)
      }
    } catch {
      toast_('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'err')
      setLoading(false)
    }
  }

  function onImg(e) {
    const f=e.target.files?.[0]; if(!f) return
    setImgFile(f); setPreview(URL.createObjectURL(f))
  }

  const addAddon    = ()           => setAddons(p=>[...p,{name:'',price:''}])
  const rmAddon     = i            => setAddons(p=>p.filter((_,j)=>j!==i))
  const upAddon     = (i,k,v)      => setAddons(p=>p.map((a,j)=>j===i?{...a,[k]:v}:a))
  const set         = (k,v)        => setForm(f=>({...f,[k]:v}))

  async function save() {
    if(!form.name.trim())         return toast_('กรุณากรอกชื่อเมนู','err')
    if(!form.category)            return toast_('กรุณาเลือกหมวดหมู่','err')
    if(!form.price||isNaN(+form.price)) return toast_('กรุณากรอกราคา','err')
    if(!form.prepTime||isNaN(+form.prepTime)) return toast_('กรุณากรอกเวลาเตรียม','err')
    setLoading(true)
    try {
      const body = {
        id: params.id,
        name: form.name.trim(),
        category: form.category,
        price: form.price,
        description: form.description,
        status: form.status,
        prepTime: form.prepTime,
        addons: addons.filter(a => a.name.trim()),
        usrId: JSON.parse(localStorage.getItem('bs_user')).id
      }

      // Note: For image upload on PUT, we typically use POST with a hidden method or separate logic.
      // For now, we update text data via PUT. If image changed, we'd need another approach.
      // But let's try to keep it simple as requested.
      const res = await fetch(`http://localhost/bitesync/api/shop/menu.php?id=${params.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bs_token')}` 
        },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      if(data.success){ toast_('แก้ไขเมนูสำเร็จ!'); setTimeout(()=>router.push('/shop/menu'), 800) }
      else toast_(data.message||'เกิดข้อผิดพลาด','err')
    } catch { toast_('เกิดข้อผิดพลาด','err') }
    setLoading(false)
  }

  if (loading) return <div className={styles.loading}>Loading...</div>

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'⚠️':'✅'} {toast.msg}</div>}

      <div className={styles.hdr}>
        <button onClick={()=>router.back()} className={styles.backBtn}>←</button>
        <h1 className={styles.title}>Edit Menu</h1>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
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
                    <input type="number" value={form.prepTime} onChange={e=>set('prepTime',e.target.value)} placeholder="Mins" className={styles.inp}/>
                    <span className={styles.priceBaht}>min</span>
                  </div>
                </div>
              </div>
            </div>

            <h2 className={styles.cardTitle} style={{marginTop:14}}>Description</h2>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Describe your menu..." rows={3} className={`${styles.inp} ${styles.ta}`}/>
          </div>

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
          <div className={styles.previewCard}>
            {preview
              ? <img src={preview} className={styles.previewImg}/>
              : <div className={styles.previewEmpty}><span>🖼️</span><span>No image</span></div>
            }
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Availability</h2>
            {[{val:'available',lbl:'Available'},{val:'out_of_stock',lbl:'Out of Stock'}].map(o=>(
              <label key={o.val} className={`${styles.radio} ${form.status===o.val?styles.radioOn:''}`}>
                <input type="radio" name="status" value={o.val} checked={form.status===o.val} onChange={()=>set('status',o.val)} style={{accentColor:'#2a6129'}}/>
                <span>{o.lbl}</span>
              </label>
            ))}
          </div>

          <button onClick={save} disabled={loading} className={styles.btnSave}>
            {loading?'⏳ Saving...':'Update Menu'}
          </button>
          <button onClick={()=>router.back()} className={styles.btnBack}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
