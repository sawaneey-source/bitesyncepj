'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import styles from './page.module.css'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState({ name: '', email: '', phone: '', address: '' })
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (u) {
      const userData = JSON.parse(u)
      if (userData.role === 'restaurant' || userData.role === 'shop') {
        router.replace('/shop/profile')
        return
      }
      setUser(userData)
      setEditedUser({
         name: userData.name || '',
         email: userData.email || '',
         phone: userData.phone || '',
         address: userData.address || ''
      })
      if (userData.image) {
        setPreviewUrl(`http://localhost/bitesync/public${userData.image}`)
      }
    } else {
      router.push('/login')
    }
    setLoading(false)
  }, [router])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('id', user.id)
      formData.append('name', editedUser.name)
      formData.append('phone', editedUser.phone)
      formData.append('address', editedUser.address)
      if (imageFile) {
        formData.append('image', imageFile)
      }

      const resp = await fetch('http://localhost/bitesync/dbconnect/update_profile.php', {
        method: 'POST',
        body: formData
      })
      const data = await resp.json()
      if (data.success) {
        setUser(data.user)
        localStorage.setItem('bs_user', JSON.stringify(data.user))
        setIsEditing(false)
        setImageFile(null)
        alert('อัปเดตโปรไฟล์สำเร็จแล้ว ✨')
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    } catch (err) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
    }
    setSaving(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('bs_user')
    localStorage.removeItem('bs_token')
    window.location.href = '/'
  }

  if (loading || !user) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loader}>🍃</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Navbar />
      
      <div className={styles.container}>
        <div className={styles.profileCard}>
          <div className={styles.cardHeaderDecor} />

          <div className={styles.header}>
            <div 
              className={styles.avatarWrap} 
              onClick={() => isEditing && document.getElementById('avatarInput').click()}
            >
              {isEditing && (
                <div className={styles.avatarOverlay}>
                  <i className="fa-solid fa-camera" />
                  <span>เปลี่ยนรูป</span>
                </div>
              )}
              <div className={styles.avatarLarge}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className={styles.avatarImg} />
                ) : (
                  (editedUser.name || 'U')[0].toUpperCase()
                )}
              </div>
              <input 
                id="avatarInput"
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
            </div>
            <div className={styles.headerInfo}>
              <h1 className={styles.name}>
                {isEditing ? 'แก้ไขข้อมูลส่วนตัว' : (user.name || 'User')}
              </h1>
              <div className={styles.headerStats}>
                <span className={styles.roleBadge}>{user.role || 'ลูกค้าระดับ VIP'}</span>
                <span className={styles.statItem}>
                  <i className="fa-solid fa-calendar-day" /> ตั้งแต่ มี.ค. 2024
                </span>
                <span className={styles.statItem}>
                  <i className="fa-solid fa-bag-shopping" /> 0 ออเดอร์
                </span>
              </div>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>รายละเอียดบัญชี</h2>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                   <i className="fa-solid fa-pen-to-square" /> แก้ไขข้อมูล
                </button>
              )}
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>ชื่อ-นามสกุล</label>
                {isEditing ? (
                  <input 
                    className={styles.editInput}
                    value={editedUser.name}
                    onChange={e => setEditedUser({...editedUser, name: e.target.value})}
                  />
                ) : (
                  <div className={styles.value}>{user.name}</div>
                )}
              </div>
              <div className={styles.infoItem}>
                <label>อีเมล (ไม่สามารถแก้ไขได้)</label>
                <input 
                  className={`${styles.editInput} ${styles.disabledInput}`}
                  value={user.email}
                  disabled
                />
              </div>
              <div className={styles.infoItem}>
                <label>เบอร์โทรศัพท์</label>
                {isEditing ? (
                  <input 
                    className={styles.editInput}
                    value={editedUser.phone}
                    onChange={e => setEditedUser({...editedUser, phone: e.target.value})}
                    placeholder="ใส่เบอร์โทรศัพท์ของคุณ..."
                  />
                ) : (
                  <div className={styles.value}>{user.phone || '-'}</div>
                )}
              </div>
              <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                <label>ที่อยู่ที่จัดส่ง</label>
                {isEditing ? (
                  <textarea 
                    className={`${styles.editInput} ${styles.editArea}`}
                    value={editedUser.address}
                    onChange={e => setEditedUser({...editedUser, address: e.target.value})}
                    placeholder="ระบุที่อยู่สำหรับจัดส่งอาหารของคุณ..."
                  />
                ) : (
                  <div className={styles.value}>{user.address || 'ไม่ระบุที่อยู่'}</div>
                )}
              </div>
              <div className={styles.infoItem}>
                <label>ไอดีสมาชิก</label>
                <div className={styles.value} style={{color: 'var(--primary)', fontVariantNumeric: 'tabular-nums'}}>
                  <i className="fa-solid fa-id-card-clip" style={{marginRight: '8px', opacity: 0.5}} />
                  BS-{user.id.toString().padStart(5, '0')}
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              {isEditing ? (
                <>
                  <button onClick={handleUpdate} disabled={saving} className={styles.saveBtn}>
                    {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกข้อมูล'}
                  </button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setEditedUser({ name: user.name, email: user.email, phone: user.phone, address: user.address });
                  }} className={styles.cancelBtn}>ยกเลิก</button>
                </>
              ) : (
                <button onClick={handleLogout} className={styles.logoutBtn}>
                  <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.historyCard}>
          <h2 className={styles.sectionTitle}>ประวัติการสั่งซื้อล่าสุด</h2>
          <div className={styles.emptyHistory}>
            <span className={styles.emptyIcon}>🥡</span>
            <p>ยังไม่มีประวัติการสั่งซื้อ</p>
            <button onClick={() => router.push('/home')} className={styles.orderNowBtn}>สั่งอาหารเลย</button>
          </div>
        </div>
      </div>
    </div>
  )
}
