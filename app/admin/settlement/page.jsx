'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

export default function SettlementPage() {
  const router = useRouter()
  const [data, setData] = useState({ shops: [], riders: [] })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ show: false, title: '', msg: '', onConfirm: null, type: 'confirm' })

  useEffect(() => {
    fetchBalances()
  }, [])

  const showModal = (title, msg, onConfirm, type = 'confirm') => {
    setModal({ show: true, title, msg, onConfirm, type })
  }
  const closeModal = () => setModal({ ...modal, show: false })

  async function fetchBalances() {
    try {
      const res = await fetch('http://localhost/bitesync/api/admin/settlement.php')
      const json = await res.json()
      if (json.success) {
        setData(json)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handlePayout(type, id) {
    showModal(
        'ยืนยันการจ่ายเงิน', 
        'คุณแน่ใจหรือไม่ว่าคุณได้โอนเงินให้รายการนี้เรียบร้อยแล้ว? ยอดเงินสะสมจะถูกเพิ่มเข้ากระเป๋าตังค์ของผู้รับทันทีครับ', 
        async () => {
            try {
                const res = await fetch('http://localhost/bitesync/api/admin/settlement.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, id })
                })
                const json = await res.json()
                if (json.success) {
                    showModal('สำเร็จ', 'บันทึกการจ่ายเงินเสร็จเรียบร้อยแล้ว!', fetchBalances, 'alert')
                } else {
                    showModal('ผิดพลาด', 'ไม่สามารถบันทึกได้: ' + json.message, null, 'alert')
                }
            } catch (e) {
                showModal('ผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึก', null, 'alert')
            }
        }
    )
  }

  if (loading) return <div className={styles.loading}>กำลังโหลดข้อมูล...</div>

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
          <h1 className={styles.title}>การเคลียร์ยอดเงิน (Settlement)</h1>
          <p className={styles.subtitle}>จัดการการโอนเงินส่วนแบ่งให้ร้านค้าและไรเดอร์</p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.secTitle}>🏪 ร้านค้าที่รอยอดโอน ({data.shops.length})</h2>
          <div className={styles.grid}>
            {data.shops.map(s => (
              <div key={s.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.typeTag}>SHOP</span>
                  <span className={styles.balance}>{s.balance.toLocaleString()} ฿</span>
                </div>
                <div className={styles.name}>{s.name}</div>
                <div className={styles.bankInfo}>
                  <div><strong>ธนาคาร:</strong> {s.bank || 'ไม่ได้ระบุ'}</div>
                  <div><strong>เลขบัญชี:</strong> {s.account || 'ไม่ได้ระบุ'}</div>
                </div>
                <button className={styles.payBtn} onClick={() => handlePayout('shop', s.id)}>จ่ายเงินสำเร็จ</button>
              </div>
            ))}
            {data.shops.length === 0 && <p className={styles.empty}>ไม่มีร้านค้าที่ค้างยอด</p>}
          </div>
        </section>

        <section className={styles.section} style={{marginTop: 40}}>
          <h2 className={styles.secTitle}>🛵 ไรเดอร์ที่รอยอดโอน ({data.riders.length})</h2>
          <div className={styles.grid}>
            {data.riders.map(r => (
              <div key={r.id} className={styles.card} style={{borderColor: '#ff9800'}}>
                <div className={styles.cardHeader}>
                  <span className={styles.typeTag} style={{background: '#fff3e0', color: '#e65100'}}>RIDER</span>
                  <span className={styles.balance} style={{color: '#e65100'}}>{r.balance.toLocaleString()} ฿</span>
                </div>
                <div className={styles.name}>{r.name}</div>
                <div className={styles.bankInfo}>
                  <div><strong>ธนาคาร:</strong> {r.bank || 'ไม่ได้ระบุ'}</div>
                  <div><strong>เลขบัญชี:</strong> {r.account || 'ไม่ได้ระบุ'}</div>
                </div>
                <button className={styles.payBtn} style={{background: '#e65100'}} onClick={() => handlePayout('rider', r.id)}>จ่ายเงินสำเร็จ</button>
              </div>
            ))}
            {data.riders.length === 0 && <p className={styles.empty}>ไม่มีไรเดอร์ที่ค้างยอด</p>}
          </div>
        </section>
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
