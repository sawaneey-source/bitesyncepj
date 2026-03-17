'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const MOCK = [
  { FodId:1, FodName:'White Cherry',  FodPrice:80,  FodCategory:'Cake',    FodStatus:'available', img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&q=80' },
  { FodId:2, FodName:'Chip Cookies',  FodPrice:65,  FodCategory:'Cake',    FodStatus:'available', img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&q=80' },
  { FodId:3, FodName:'Coconut Flan',  FodPrice:90,  FodCategory:'Toast',   FodStatus:'available', img:'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=300&q=80' },
  { FodId:4, FodName:'Lava Flan',     FodPrice:90,  FodCategory:'Cake',    FodStatus:'available', img:'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&q=80' },
  { FodId:5, FodName:'Banana Cook',   FodPrice:65,  FodCategory:'Toast',   FodStatus:'out_of_stock', img:'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=300&q=80' },
]

export default function MenuPage() {
  const router = useRouter()
  const [menus, setMenus] = useState(MOCK)
  const [cats, setCats]   = useState(['All','Cake','Ice Cream','Waffles','Toast','Drinks'])
  const [tab, setTab]     = useState('All')
  const [delId, setDelId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchData() }, [])

  function toast_(msg,type='ok'){ setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function fetchData() {
    try {
      const tk = localStorage.getItem('bs_token')
      const [rc,rm] = await Promise.all([
        fetch('http://localhost/bitesync/api/shop/categories.php',{headers:{Authorization:`Bearer ${tk}`}}),
        fetch('http://localhost/bitesync/api/shop/menu.php',{headers:{Authorization:`Bearer ${tk}`}}),
      ])
      const dc=await rc.json(), dm=await rm.json()
      if(dc.success) setCats(['All',...dc.data.map(c=>c.CatName)])
      if(dm.success) setMenus(dm.data)
    } catch {}
  }

  async function del(id) {
    try { await fetch(`http://localhost/bitesync/api/shop/menu.php?id=${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}}) } catch {}
    setMenus(p=>p.filter(m=>m.FodId!==id)); setDelId(null); toast_('ลบเมนูแล้ว','err')
  }

  const list = tab==='All' ? menus : menus.filter(m=>m.FodCategory===tab)

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
        <button onClick={()=>router.push('/shop/menu/add')} className={styles.addBtn}>+ Add New Menu</button>
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
          <div key={m.FodId} className={styles.menuCard}>
            <div className={styles.imgWrap}>
              <img src={m.img||m.FodFtpId} alt={m.FodName} className={styles.img}/>
              <span className={`${styles.sTag} ${m.FodStatus==='available'?styles.sTagOn:styles.sTagOff}`}>
                {m.FodStatus==='available'?'Available':'Out of stock'}
              </span>
            </div>
            <div className={styles.body}>
              <div className={styles.mName}>{m.FodName}</div>
              <div className={styles.mCat}>{m.FodCategory}</div>
              <div className={styles.mPrice}>{m.FodPrice} THB</div>
              <div className={styles.mBtns}>
                <button onClick={()=>router.push(`/shop/menu/edit/${m.FodId}`)} className={styles.btnEdit}>✏️ Edit</button>
                <button onClick={()=>setDelId(m.FodId)} className={styles.btnDelSm}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
