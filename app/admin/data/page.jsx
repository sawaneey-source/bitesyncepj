'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

const TABS = [
  { id: 'orders', label: 'ออเดอร์ (Orders)', icon: '📦' },
  { id: 'users', label: 'ลูกค้า (Users)', icon: '👥' },
  { id: 'shops', label: 'ร้านค้า (Shops)', icon: '🏪' },
  { id: 'riders', label: 'ไรเดอร์ (Riders)', icon: '🛵' },
]

export default function DataExplorerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('orders')
  const [data, setData] = useState({ orders: [], users: [], shops: [], riders: [] })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Custom Modal State
  const [modal, setModal] = useState({ show: false, title: '', msg: '', onConfirm: null, type: 'confirm' })

  useEffect(() => {
    fetchAllData()
  }, [])

  const showModal = (title, msg, onConfirm, type = 'confirm') => {
    setModal({ show: true, title, msg, onConfirm, type })
  }
  const closeModal = () => setModal({ ...modal, show: false })

  async function fetchAllData() {
    setLoading(true)
    try {
      const [orderRes, entRes] = await Promise.all([
        fetch('http://localhost/bitesync/api/admin/orders.php'),
        fetch('http://localhost/bitesync/api/admin/entities.php')
      ])
      const orderJson = await orderRes.json()
      const entJson = await entRes.json()
      
      setData({
        orders: orderJson.data || [],
        users: entJson.users || [],
        shops: entJson.shops || [],
        riders: entJson.riders || []
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const filteredData = () => {
    const list = data[activeTab] || []
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter(item => {
      if (activeTab === 'orders') return item.OdrId.toString().includes(s) || item.customer?.toLowerCase().includes(s)
      if (activeTab === 'users') return item.UsrFullName?.toLowerCase().includes(s) || item.UsrEmail?.toLowerCase().includes(s)
      if (activeTab === 'shops') return item.ShopName?.toLowerCase().includes(s) || item.owner?.toLowerCase().includes(s)
      if (activeTab === 'riders') return item.name?.toLowerCase().includes(s) || item.RiderVehiclePlate?.toLowerCase().includes(s)
      return true
    })
  }

async function handleManageUser(action, usrId) {
    const labels = { 'ban': 'ระงับการใช้งาน', 'unban': 'ยกเลิกการระงับ', 'delete': 'ลบบัญชีและข้อมูลทั้งหมด' }
    
    showModal(
        labels[action], 
        `คุณแน่ใจหรือไม่ว่าต้องการ${labels[action]}ผู้ใช้งานนี้?`, 
        async () => {
            try {
                const res = await fetch('http://localhost/bitesync/api/admin/manage-user.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, usrId })
                })
                const json = await res.json()
                if (json.success) {
                    showModal('สำเร็จ', 'ดำเนินการเสร็จเรียบร้อยแล้ว!', fetchAllData, 'alert')
                } else {
                    showModal('ผิดพลาด', 'ไม่สามารถดำเนินการได้: ' + json.message, null, 'alert')
                }
            } catch (e) {
                showModal('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', null, 'alert')
            }
        }
    )
  }

  if (loading) return <div className={styles.loading}>กำลังดึงข้อมูลทั้งหมดจากระบบ... ⏳</div>

  return (
    <div className={styles.page}>
      <Navbar hideLinks />
      <div className={styles.body}>
        <div className={styles.navActions}>
          <button className={styles.backBtn} onClick={() => router.push('/admin/dashboard')}>
            <i className="fa-solid fa-chevron-left" /> กลับหน้าหลัก
          </button>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>ตัวสำรวจข้อมูล (Data Explorer)</h1>
          <p className={styles.subtitle}>จัดการและตรวจสอบข้อมูลดิบทั้งหมดในฐานข้อมูล BiteSync</p>
        </div>

        <div className={styles.tabBar}>
          {TABS.map(t => (
            <button 
              key={t.id} 
              className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabOn : ''}`}
              onClick={() => { setActiveTab(t.id); setSearch('') }}
            >
              <span className={styles.tabIcon}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className={styles.controlRow}>
          <div className={styles.searchBox}>
            <span className={styles.searchIco}>🔍</span>
            <input 
              type="text" 
              placeholder={`ค้นหาใน ${TABS.find(t=>t.id===activeTab).label}...`} 
              className={styles.searchInp}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.refreshBtn} onClick={fetchAllData}>🔄 รีเฟรช</button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              {activeTab === 'orders' && (
                <tr>
                  <th>ID</th>
                  <th>วันที่</th>
                  <th>ลูกค้า</th>
                  <th>ร้านค้า</th>
                   <th>ยอดรวม</th>
                   <th>ค่าธรรมเนียม (12 ฿)</th>
                   <th>กำไรแอดมินรวม</th>
                   <th>สถานะ</th>
                </tr>
              )}
              {activeTab === 'users' && (
                <tr>
                  <th>ID</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>อีเมล</th>
                  <th>วันที่สร้าง</th>
                  <th style={{textAlign:'right'}}>เครื่องมือ</th>
                </tr>
              )}
              {activeTab === 'shops' && (
                <tr>
                  <th>ID</th>
                  <th>ชื่อร้าน</th>
                  <th>เจ้าของ</th>
                   <th>ยอดขายสะสม (Gross)</th>
                   <th>รายได้สะสม (Net)</th>
                   <th style={{color:'#e65100'}}>ยอดค้างโอน (Pending)</th>
                   <th>สถานะ</th>
                  <th style={{textAlign:'right'}}>เครื่องมือ</th>
                </tr>
              )}
              {activeTab === 'riders' && (
                <tr>
                  <th>ID</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ทะเบียนรถ</th>
                   <th>ยอดวิ่งสะสม (Gross)</th>
                   <th>รายได้สะสม (Net)</th>
                   <th style={{color:'#e65100'}}>ยอดค้างโอน (Pending)</th>
                   <th>สถานะ</th>
                  <th>คะแนน</th>
                  <th style={{textAlign:'right'}}>เครื่องมือ</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredData().map((item, idx) => (
                <tr key={idx} className={item.UsrStatus == 0 ? styles.bannedRow : ''}>
                  {activeTab === 'orders' && (
                    <>
                      <td className={styles.idCol}>#{item.OdrId}</td>
                      <td>{new Date(item.OdrCreatedAt).toLocaleDateString('th-TH')}</td>
                      <td>{item.customer || 'N/A'}</td>
                      <td>{item.ShopName || 'N/A'}</td>
                       <td className={styles.bold}>{Number(item.OdrGrandTotal).toLocaleString()} ฿</td>
                       <td style={{color: '#6200ea', fontWeight: 'bold'}}>{Number(item.OdrPlatformFee || 0).toLocaleString()} ฿</td>
                       <td className={styles.profit}>{Number(item.OdrAdminFee).toLocaleString()} ฿</td>
                       <td><span className={`${styles.status} ${styles['os' + item.OdrStatus]}`}>{getStatusLabel(item.OdrStatus)}</span></td>
                    </>
                  )}
                  {activeTab === 'users' && (
                    <>
                      <td className={styles.idCol}>{item.UsrId}</td>
                      <td className={styles.bold}>{item.UsrFullName} {item.UsrStatus == 0 && <span className={styles.banTag}>BANNED</span>}</td>
                      <td>{item.UsrEmail}</td>
                      <td>{new Date(item.UsrCreatedAt).toLocaleDateString('th-TH')}</td>
                      <td style={{textAlign:'right'}}>
                        {item.UsrStatus == 0 ? (
                          <button className={styles.unbanBtn} onClick={() => handleManageUser('unban', item.UsrId)}>🔓 ปลดแบน</button>
                        ) : (
                          <button className={styles.banBtn} onClick={() => handleManageUser('ban', item.UsrId)}>🚫 แบน</button>
                        )}
                        <button className={styles.delBtn} onClick={() => handleManageUser('delete', item.UsrId)}>🗑️ ลบ</button>
                      </td>
                    </>
                  )}
                  {activeTab === 'shops' && (
                    <>
                      <td className={styles.idCol}>{item.ShopId}</td>
                      <td className={styles.bold}>{item.ShopName} {item.ownerStatus == 0 && <span className={styles.banTag}>BANNED OWNER</span>}</td>
                      <td>{item.owner}</td>
                      <td>{Number(item.totalGross).toLocaleString()} ฿</td>
                      <td className={styles.profit}>{Number(item.totalNet).toLocaleString()} ฿</td>
                      <td className={styles.bold} style={{color:'#e65100'}}>{Number(item.pendingAmount || 0).toLocaleString()} ฿</td>
                      <td>{item.ShopStatus == 1 ? '🟢 เปิดร้าน' : '🔴 ปิดร้าน'}</td>
                      <td style={{textAlign:'right'}}>
                        {item.ownerStatus == 0 ? (
                          <button className={styles.unbanBtn} onClick={() => handleManageUser('unban', item.UsrId)}>🔓 ปลดแบนเจ้าของ</button>
                        ) : (
                          <button className={styles.banBtn} onClick={() => handleManageUser('ban', item.UsrId)}>🚫 แบนเจ้าของ</button>
                        )}
                        <button className={styles.delBtn} onClick={() => handleManageUser('delete', item.UsrId)}>🗑️ ลบ</button>
                      </td>
                    </>
                  )}
                  {activeTab === 'riders' && (
                    <>
                      <td className={styles.idCol}>{item.RiderId}</td>
                      <td className={styles.bold}>{item.name} {item.riderStatus == 0 && <span className={styles.banTag}>BANNED</span>}</td>
                      <td>{item.RiderVehiclePlate}</td>
                      <td>{Number(item.totalGross).toLocaleString()} ฿</td>
                      <td className={styles.profit}>{Number(item.totalNet).toLocaleString()} ฿</td>
                      <td className={styles.bold} style={{color:'#e65100'}}>{Number(item.pendingAmount || 0).toLocaleString()} ฿</td>
                      <td>{item.RiderStatus === 'Online' ? '🟢 ออนไลน์' : '⚪ ออฟไลน์'}</td>
                      <td>⭐ {item.RiderRatingAvg}</td>
                      <td style={{textAlign:'right'}}>
                         {item.riderStatus == 0 ? (
                          <button className={styles.unbanBtn} onClick={() => handleManageUser('unban', item.UsrId)}>🔓 ปลดแบน</button>
                        ) : (
                          <button className={styles.banBtn} onClick={() => handleManageUser('ban', item.UsrId)}>🚫 แบน</button>
                        )}
                        <button className={styles.delBtn} onClick={() => handleManageUser('delete', item.UsrId)}>🗑️ ลบ</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData().length === 0 && <div className={styles.noData}>ไม่พบข้อมูลที่ค้นหา</div>}
        </div>
      </div>

      {modal.show && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>{modal.title}</h3>
                <p className={styles.modalMsg}>{modal.msg}</p>
                <div className={styles.modalActions}>
                    {modal.type === 'confirm' && (
                        <button className={styles.modalCancel} onClick={closeModal}>ยกเลิก</button>
                    )}
                    <button className={styles.modalConfirm} onClick={() => {
                        if (modal.onConfirm) modal.onConfirm()
                        closeModal()
                    }}>ตกลง</button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}

function getStatusLabel(s) {
  const m = { 1: 'รอชำระ', 2: 'รอยืนยัน', 3: 'กำลังทำ', 4: 'เตรียมจัดส่ง', 5: 'กำลังส่ง', 6: 'สำเร็จ', 7: 'ยกเลิก' }
  return m[s] || 'Unknown'
}
