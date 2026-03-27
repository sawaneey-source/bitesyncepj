'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'


export default function MenuPage() {
  const router = useRouter()
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [cats, setCats]   = useState(['All','Cake','Ice Cream','Waffles','Toast','Drinks'])
  const [tab, setTab]     = useState('All')
  const [delId, setDelId] = useState(null)
  const [toast, setToast] = useState(null)
  const q = useSearchParams().get('q') || ''

  useEffect(() => { fetchData() }, [])

  function toast_(msg,type='ok'){ setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function fetchData() {
    try {
      setLoading(true)
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const tk = localStorage.getItem('bs_token')
      const [rc,rm] = await Promise.all([
        fetch(`http://localhost/bitesync/api/shop/categories.php?usrId=${u.id}`,{headers:{Authorization:`Bearer ${tk}`}}),
        fetch(`http://localhost/bitesync/api/shop/menu.php?usrId=${u.id}`,{headers:{Authorization:`Bearer ${tk}`}}),
      ])
      const dc=await rc.json(), dm=await rm.json()
      if(dc.success) setCats(['All',...dc.data.map(c=>c.CatName)])
      if(dm.success) setMenus(dm.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function del(id) {
    try { 
      const u = JSON.parse(localStorage.getItem('bs_user'))
      await fetch(`http://localhost/bitesync/api/shop/menu.php?id=${id}&usrId=${u.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}}) 
    } catch {}
    setMenus(p=>p.filter(m=>m.id!==id)); setDelId(null); toast_('ลบเมนูแล้ว','err')
  }
  
  async function toggleStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'available' ? 'out_of_stock' : 'available'
    try {
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const res = await fetch(`http://localhost/bitesync/api/shop/menu.php?id=${id}&usrId=${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bs_token')}` },
        body: JSON.stringify({ status: nextStatus })
      })
      const data = await res.json()
      if (data.success) {
        setMenus(p => p.map(m => m.id === id ? { ...m, status: nextStatus } : m))
        toast_(nextStatus === 'available' ? 'เปิดการขายแล้ว' : 'ปิดการขายแล้ว')
      }
    } catch {}
  }

  let list = tab==='All' ? menus : menus.filter(m=>m.category===tab)
  if (q) {
    const lowQ = q.toLowerCase()
    list = list.filter(m => m.name?.toLowerCase().includes(lowQ))
  }

  const getImg = (p) => p ? (p.startsWith('http') ? p : `http://localhost/bitesync/public${p}`) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80'

  if (loading) return <div style={{ minHeight: '80vh' }}></div>

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'🗑️':'✅'} {toast.msg}</div>}

      {delId && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalIco}>🗑️</div>
            <h3 className={styles.modalTitle}>ยืนยันการลบ?</h3>
            <p className={styles.modalSub}>เมนูนี้จะถูกลบออกถาวร</p>
            <div className={styles.modalBtns}>
              <button onClick={()=>setDelId(null)} className={styles.btnCancel}>ยกเลิก</button>
              <button onClick={()=>del(delId)} className={styles.btnDel}>ลบเลย</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.hdr}>
        <h1 className={styles.title}>Menu</h1>
      </div>

      <div className={styles.tabs}>
        {cats.map(c=><button key={c} onClick={()=>setTab(c)} className={`${styles.tab} ${tab===c?styles.tabOn:''}`}>{c}</button>)}
      </div>

      <div className={styles.grid}>
        
        <div className={styles.addCard} onClick={()=>router.push('/shop/menu/add')}>
          <div className={styles.addCardIco}>+</div>
          <span>Add Menu</span>
        </div>
        {list.map(m=>(
          <div key={m.id} className={styles.menuCard}>
            <div className={styles.imgWrap}>
              <img src={getImg(m.image)} alt={m.name} className={styles.img}/>
              <span 
                className={`${styles.sTag} ${m.status==='available'?styles.sTagOn:styles.sTagOff} ${styles.sTagClick}`}
                onClick={(e) => { e.stopPropagation(); toggleStatus(m.id, m.status); }}
              >
                {m.status==='available'?'Available':'Out of stock'}
              </span>
            </div>
            <div className={styles.body}>
              <div className={styles.mName}>{m.name}</div>
              <div className={styles.mCat}>{m.category}</div>
              <div className={styles.mPrice}>
                {m.price} THB
                {m.prepTime > 0 && <span style={{fontSize:'12px', color:'#777', marginLeft:'8px'}}>⏱️ {m.prepTime} นาที</span>}
              </div>
              <div className={styles.mBtns}>
                <button onClick={()=>router.push(`/shop/menu/edit/${m.id}`)} className={styles.btnEdit}>✏️ Edit</button>
                <button onClick={()=>setDelId(m.id)} className={styles.btnDelSm}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

