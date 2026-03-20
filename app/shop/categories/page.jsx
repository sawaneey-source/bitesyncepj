'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'

export default function CategoriesPage() {
  const [cats, setCats]     = useState([])
  const [newName, setNew]   = useState('')
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [toast, setToast]   = useState(null)
  const q = useSearchParams().get('q') || ''

  useEffect(() => { load() }, [])

  function toast_(msg, type='ok') { setToast({msg,type}); setTimeout(()=>setToast(null),2400) }

  async function load() {
    try {
      setLoading(true)
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const res  = await fetch(`http://localhost/bitesync/api/shop/categories.php?usrId=${u.id}`, { headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`} })
      const data = await res.json()
      if (data.success) setCats(data.data)
    } catch {
      toast_('ไม่สามารถโหลดข้อมูลได้', 'err')
    } finally {
      setLoading(false)
    }
  }

  async function add() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const res  = await fetch(`http://localhost/bitesync/api/shop/categories.php?usrId=${u.id}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('bs_token')}`},body:JSON.stringify({name:newName.trim()})})
      const data = await res.json()
      if (data.success) setCats(p=>[...p,data.data])
    } catch {
      toast_('เพิ่มหมวดหมู่ไม่สำเร็จ', 'err')
    }
    setNew(''); toast_('เพิ่มหมวดหมู่แล้ว!'); setAdding(false)
  }

  async function saveEdit(id) {
    if (!editVal.trim()) return
    try {
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const res = await fetch(`http://localhost/bitesync/api/shop/categories.php?id=${id}&usrId=${u.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bs_token')}`
        },
        body: JSON.stringify({ name: editVal.trim() })
      })
      if (res.ok) {
        setCats(p => p.map(c => c.CatId === id ? { ...c, CatName: editVal.trim() } : c))
        setEditId(null)
        toast_('แก้ไขแล้ว!')
      } else {
        toast_('แก้ไขไม่สำเร็จ', 'err')
      }
    } catch {
      toast_('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'err')
    }
  }

  async function del(id) {
    if (!confirm('ลบหมวดหมู่นี้?')) return
    try { 
      const u = JSON.parse(localStorage.getItem('bs_user'))
      await fetch(`http://localhost/bitesync/api/shop/categories.php?id=${id}&usrId=${u.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}}) 
    } catch {}
    setCats(p=>p.filter(c=>c.CatId!==id)); toast_('ลบแล้ว','err')
  }

  if (loading) return <div style={{ minHeight: '80vh' }}></div>

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
          <button onClick={add} disabled={false} className={styles.addBtn}>+ Add Category</button>
        </div>
      </div>

      <div className={styles.card}>
        {cats.length===0?(
          <div className={styles.empty}><span>📂</span><span>ยังไม่มีหมวดหมู่</span></div>
        ):cats.filter(c => c.CatName?.toLowerCase().includes(q.toLowerCase())).map(c=>(
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
