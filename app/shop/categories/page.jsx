'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

export default function CategoriesPage() {
  const [cats, setCats]     = useState([])
  const [newName, setNew]   = useState('')
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast]   = useState(null)

  useEffect(() => { load() }, [])

  function toast_(msg, type='ok') { setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function load() {
    try {
      const res  = await fetch('http://localhost/bitesync/api/shop/categories.php', { headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`} })
      const data = await res.json()
      if (data.success) setCats(data.data)
    } catch {
      setCats([{CatId:1,CatName:'Cake'},{CatId:2,CatName:'Ice Cream'},{CatId:3,CatName:'Toast'},{CatId:4,CatName:'Drinks'},{CatId:5,CatName:'Waffles'}])
    }
  }

  async function add() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('http://localhost/bitesync/api/shop/categories.php',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('bs_token')}`},body:JSON.stringify({name:newName.trim()})})
      const data = await res.json()
      if (data.success) setCats(p=>[...p,data.data])
    } catch { setCats(p=>[...p,{CatId:Date.now(),CatName:newName.trim()}]) }
    setNew(''); toast_('เพิ่มหมวดหมู่แล้ว!'); setLoading(false)
  }

  async function saveEdit(id) {
    if (!editVal.trim()) return
    try { await fetch(`http://localhost/bitesync/api/shop/categories.php?id=${id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('bs_token')}`},body:JSON.stringify({name:editVal.trim()})}) } catch {}
    setCats(p=>p.map(c=>c.CatId===id?{...c,CatName:editVal.trim()}:c)); setEditId(null); toast_('แก้ไขแล้ว!')
  }

  async function del(id) {
    if (!confirm('ลบหมวดหมู่นี้?')) return
    try { await fetch(`http://localhost/bitesync/api/shop/categories.php?id=${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}}) } catch {}
    setCats(p=>p.filter(c=>c.CatId!==id)); toast_('ลบแล้ว','err')
  }

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'🗑️':'✅'} {toast.msg}</div>}

      <div className={styles.hdr}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.sub}>Menu Categories for ร้านของคุณ</p>
        </div>
        <div className={styles.addRow}>
          <input value={newName} onChange={e=>setNew(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="New category..." className={styles.addInput}/>
          <button onClick={add} disabled={loading||!newName.trim()} className={styles.addBtn}>+ Add Category</button>
        </div>
      </div>

      <div className={styles.card}>
        {cats.length===0?(
          <div className={styles.empty}><span>📂</span><span>ยังไม่มีหมวดหมู่</span></div>
        ):cats.map(c=>(
          <div key={c.CatId} className={styles.row}>
            {editId===c.CatId?(
              <>
                <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveEdit(c.CatId);if(e.key==='Escape')setEditId(null)}} autoFocus className={styles.editInput}/>
                <div className={styles.rowBtns}>
                  <button onClick={()=>saveEdit(c.CatId)} className={styles.btnSave}>Save</button>
                  <button onClick={()=>setEditId(null)} className={styles.btnCancel}>Cancel</button>
                </div>
              </>
            ):(
              <>
                <span className={styles.catName}>{c.CatName}</span>
                <div className={styles.rowBtns}>
                  <button onClick={()=>{setEditId(c.CatId);setEditVal(c.CatName)}} className={styles.btnEdit}>✏️</button>
                  <button onClick={()=>del(c.CatId)} className={styles.btnDel}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
