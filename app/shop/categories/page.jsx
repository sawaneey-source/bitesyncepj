'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './page.module.css'
import PremiumModal from '@/components/PremiumModal'

export default function CategoriesPage() {
  const router = useRouter()
  const [cats, setCats]     = useState([])
  const [newName, setNew]   = useState('')
  const [editId, setEditId] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  
  // Premium Modal State
  const [modal, setModal] = useState({
    open: false,
    title: '',
    description: '',
    type: 'confirm',
    icon: '💡',
    onConfirm: null,
    confirmText: 'ตกลง'
  })

  const q = useSearchParams().get('q') || ''

  useEffect(() => { load() }, [])

  const openModal = (config) => setModal({ ...modal, ...config, open: true })
  const closeModal = () => setModal({ ...modal, open: false })

  async function load() {
    try {
      setLoading(true)
      const u = JSON.parse(localStorage.getItem('bs_user'))
      if (!u) { router.push('/login'); return; }
      const res  = await fetch(`http://localhost/bitesync/api/shop/categories.php?usrId=${u.id}`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` } 
      })
      const data = await res.json()
      if (data.success) setCats(data.data)
    } catch {
      openModal({ title: 'โหลดข้อมูลไม่สำเร็จ', description: 'ไม่สามารถดึงข้อมูลหมวดหมู่ได้ในขณะนี้', type: 'alert', icon: '⚠️' })
    } finally {
      setLoading(false)
    }
  }

  async function add() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const u = JSON.parse(localStorage.getItem('bs_user'))
      const res  = await fetch(`http://localhost/bitesync/api/shop/categories.php?usrId=${u.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('bs_token')}`
        },
        body: JSON.stringify({ name: newName.trim() })
      })
      const data = await res.json()
      if (data.success) {
        setCats(p => [...p, data.data])
        setNew('')
        openModal({ title: 'เพิ่มหมวดหมู่แล้ว ✨', description: `หมวดหมู่ "${newName.trim()}" ถูกสร้างเรียบร้อยแล้วครับ`, type: 'success', icon: '✅' })
      } else {
        openModal({ title: 'เพิ่มไม่สำเร็จ', description: data.message || 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่', type: 'alert', icon: '❌' })
      }
    } catch {
      openModal({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', type: 'alert', icon: '🚫' })
    } finally {
      setAdding(false)
    }
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
      const data = await res.json()
      if (data.success) {
        setCats(p => p.map(c => c.CatId === id ? { ...c, CatName: editVal.trim() } : c))
        setEditId(null)
        openModal({ title: 'อัปเดตเรียบร้อย ✨', description: 'แก้ไขชื่อหมวดหมู่สำเร็จแล้วครับ', type: 'success', icon: '✅' })
      } else {
        openModal({ title: 'แก้ไขไม่สำเร็จ', description: data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', type: 'alert', icon: '⚠️' })
      }
    } catch {
      openModal({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', type: 'alert', icon: '🚫' })
    }
  }

  async function del(id) {
    const target = cats.find(c => c.CatId === id)
    openModal({
      title: 'ลบหมวดหมู่นี้?',
      description: `คุณต้องการลบหมวดหมู่ "${target?.CatName}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้ครับ`,
      type: 'confirm',
      icon: '🗑️',
      confirmText: 'ลบทิ้ง',
      onConfirm: async () => {
        try {
          const u = JSON.parse(localStorage.getItem('bs_user'))
          const res = await fetch(`http://localhost/bitesync/api/shop/categories.php?id=${id}&usrId=${u.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
          })
          const data = await res.json()
          if (data.success) {
            setCats(p => p.filter(c => c.CatId !== id))
            closeModal()
          } else {
            openModal({ title: 'ลบไม่สำเร็จ', description: data.message || 'ไม่สามารถลบหมวดหมู่ได้', type: 'alert', icon: '⚠️' })
          }
        } catch {
          openModal({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', type: 'alert', icon: '🚫' })
        }
      }
    })
  }

  if (loading) return <div className={styles.loadingContainer}><div className={styles.loader}>🍃</div></div>

  return (
    <div className={styles.page}>
      <PremiumModal 
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        icon={modal.icon}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
      />

      <div className={styles.hdr}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.sub}>Menu Categories for ร้านอาหารของคุณ</p>
        </div>
        <div className={styles.addRow}>
          <div className={styles.inputWrap}>
            <i className="fa-solid fa-folder-plus" />
            <input 
              value={newName} 
              onChange={e => setNew(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && add()} 
              placeholder="กรอกชื่อหมวดหมู่ใหม่..." 
              className={styles.addInput}
            />
          </div>
          <button onClick={add} disabled={adding} className={styles.addBtn}>
            {adding ? '⏳' : '+ Add Category'}
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInfo}>
            <i className="fa-solid fa-list-ul" />
            <span>รายการหมวดหมู่ทั้งหมด ({cats.length})</span>
          </div>
        </div>
        
        {cats.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📂</div>
            <span>ยังไม่มีหมวดหมู่ในขณะนี้</span>
          </div>
        ) : cats.filter(c => c.CatName?.toLowerCase().includes(q.toLowerCase())).map(c => (
          <div key={c.CatId} className={styles.row}>
            {editId === c.CatId ? (
              <>
                <div className={styles.editInputWrap}>
                  <input 
                    value={editVal} 
                    onChange={e => setEditVal(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.CatId); if (e.key === 'Escape') setEditId(null) }} 
                    autoFocus 
                    className={styles.editInput}
                  />
                </div>
                <div className={styles.rowBtns}>
                  <button onClick={() => saveEdit(c.CatId)} className={styles.btnSave}>Save</button>
                  <button onClick={() => setEditId(null)} className={styles.btnCancel}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.catInfo}>
                   <div className={styles.catDot} />
                   <span className={styles.catName}>{c.CatName}</span>
                </div>
                <div className={styles.rowBtns}>
                  <button onClick={() => { setEditId(c.CatId); setEditVal(c.CatName) }} className={styles.btnEdit} title="แก้ไข">
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button onClick={() => del(c.CatId)} className={styles.btnDel} title="ลบ">
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

