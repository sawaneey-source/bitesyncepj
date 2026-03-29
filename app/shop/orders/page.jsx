'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'
import PremiumModal from '@/components/PremiumModal'

const TABS = ['ทั้งหมด','รอดำเนินการ','กำลังเตรียม','เสร็จแล้ว','กำลังส่ง','สำเร็จ','ยกเลิก']

// Map Thai Tab to internal Status for logic
const TAB_MAP = {
  'ทั้งหมด': 'All',
  'รอดำเนินการ': 'Pending',
  'กำลังเตรียม': 'Preparing',
  'เสร็จแล้ว': 'Ready',
  'กำลังส่ง': 'Delivering',
  'สำเร็จ': 'Completed',
  'ยกเลิก': 'Cancelled'
}

const SS = {
  'Pending':    {bg:'#fff9c4',color:'#856404',dot:'#f0c419', lbl: 'รอดำเนินการ'},
  'Preparing':  {bg:'#fff3e0',color:'#e65100',dot:'#ff6d00', lbl: 'กำลังเตรียม'},
  'Ready':      {bg:'#e8f5e9',color:'#2a6129',dot:'#4caf50', lbl: 'ทำเสร็จแล้ว'},
  'Delivering': {bg:'#e3f2fd',color:'#1565c0',dot:'#1e88e5', lbl: 'กำลังส่ง'},
  'Completed':  {bg:'#ede7f6',color:'#6a1b9a',dot:'#9c27b0', lbl: 'สำเร็จแล้ว'},
  'Cancelled':  {bg:'#fce4ec',color:'#b71c1c',dot:'#e53935', lbl: 'ยกเลิกแล้ว'},
}

const NEXT = {
  'Pending':    {lbl:'ยืนยันออเดอร์',  next:'Preparing',  color:'#2a6129'},
  'Preparing':  {lbl:'เตรียมเสร็จแล้ว (ค้นหาไรเดอร์)', next:'Ready', color:'#1565c0'},
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [tab, setTab]       = useState('ทั้งหมด')
  const [openId, setOpenId] = useState(null)
  const [toast, setToast]   = useState(null)
  const [modal, setModal]   = useState({ isOpen: false, title: '', description: '', icon: '', onConfirm: null, type: 'confirm' })

  useEffect(() => { 
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  function toast_(msg,type='ok'){ setToast({msg,type}); setTimeout(()=>setToast(null),2400) }
  function closeModal() { setModal(prev => ({ ...prev, isOpen: false })) }

  async function fetchOrders() {
    try {
      const user = JSON.parse(localStorage.getItem('bs_user') || '{}')
      const res  = await fetch(`http://localhost/bitesync/api/shop/orders.php?usrId=${user.id || 1}`,{headers:{Authorization:`Bearer ${localStorage.getItem('bs_token')}`}})
      const data = await res.json()
      if(data.success) setOrders(data.data)
    } catch (e) {
      console.error("Fetch orders failed:", e);
    }
  }

  async function upStatus(id,next) {
    try { 
      await fetch(`http://localhost/bitesync/api/shop/orders.php?id=${encodeURIComponent(id)}`,{
        method:'PUT',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('bs_token')}`},
        body:JSON.stringify({status:next})
      }) 
    } catch {}
    setOrders(p=>p.map(o=>o.OdrId===id?{...o,status:next}:o)); 
    toast_(next === 'Cancelled' ? 'ยกเลิกออเดอร์เรียบร้อยแล้ว' : `อัปเดตเป็น "${SS[next]?.lbl || next}"`)
    window.dispatchEvent(new Event('orderUpdate'))
  }

  async function cancel(id) {
    setModal({
      isOpen: true,
      title: 'ยืนยันการยกเลิกออเดอร์',
      description: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกออเดอร์ #${id}? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      icon: '🛑',
      type: 'confirm',
      confirmText: 'ยืนยันการยกเลิก',
      onConfirm: async () => {
        await upStatus(id, 'Cancelled')
        closeModal()
      }
    })
  }

  function handleConfirm(id, next, lbl) {
    setModal({
      isOpen: true,
      title: 'รับออเดอร์ใหม่',
      description: `คุณต้องการรับออเดอร์ #${id} และเริ่ม "${lbl}" ใช่หรือไม่?`,
      icon: '👨‍🍳',
      type: 'confirm',
      confirmText: 'รับออเดอร์และเริ่มทำ',
      onConfirm: async () => {
        await upStatus(id, next)
        closeModal()
      }
    })
  }

  const currentStatusTab = TAB_MAP[tab] || 'All'
  const counts  = TABS.reduce((a,t)=>{
    const s = TAB_MAP[t]
    a[t] = s === 'All' ? orders.length : orders.filter(o=>o.status===s).length;
    return a
  },{})

  const filtered = currentStatusTab === 'All' ? orders : orders.filter(o=>o.status === currentStatusTab)

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'❌':'✅'} {toast.msg}</div>}

      <div className={styles.hdr}>
        <h1 className={styles.title}>รายการสั่งซื้อข้อมูล</h1>
        <button onClick={fetchOrders} className={styles.refreshBtn}>
          <i className="fa-solid fa-rotate" /> รีเฟรช
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`${styles.tab} ${tab===t?styles.tabOn:''}`}>
            {t}
            {counts[t]>0&&<span className={`${styles.cnt} ${tab===t?styles.cntOn:''}`}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length===0?(
          <div className={styles.empty}><span>📭</span><span>ยังไม่มีรายการในหมวดนี้</span></div>
        ):filtered.map(o=>{
          const ss=SS[o.status]||{bg:'#f4f6f4',color:'#6b7280',dot:'#aaa', lbl: o.status}
          const nx=NEXT[o.status]
          const open=openId===o.OdrId
          return (
            <div key={o.OdrId} className={styles.card}>
              <div className={styles.cardHead} onClick={()=>setOpenId(open?null:o.OdrId)}>
                <div className={styles.cardImgWrap}>
                  {o.img ? (
                    <img src={o.img} className={styles.cardImg} alt=""/>
                  ) : (
                    <div className={styles.cardImgPlaceholder}>👤</div>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTopRow}>
                    <span className={styles.ordId}>{o.OdrId}</span>
                    <span className={styles.sBadge} style={{background:ss.bg,color:ss.color}}>
                      <span className={styles.sDot} style={{background:ss.dot}}/>
                      {ss.lbl}
                      {o.status === 'Cancelled' && o.OdrCancelBy && (
                        <span className={styles.cancelBy}>
                          ({o.OdrCancelBy === 'customer' ? 'โดยลูกค้า' : 'โดยร้านค้า'})
                        </span>
                      )}
                    </span>
                    {o.RiderId && (o.status === 'Ready' || o.status === 'Delivering') && (
                      <span className={styles.rBadge} style={{background:'#e3f2fd', color:'#1565c0', fontSize:'11px', padding:'3px 8px', borderRadius:'12px', marginLeft:'6px', fontWeight:'600'}}>
                        🛵 {o.riderName || 'ไรเดอร์'}{o.status==='Ready' ? ' (มารับ)' : ''}
                      </span>
                    )}
                    <span className={styles.oTime}>{o.time}</span>
                  </div>
                  <div className={styles.oCust}><strong>ลูกค้า:</strong> {o.customer}</div>
                  <div className={styles.oItems}>{o.items}</div>
                </div>
                <div className={styles.cardRight}>
                  <div className={`${styles.oTotal} ${o.status === 'Cancelled' ? styles.strikePrice : ''}`}>
                    {Number(o.total).toFixed(2)} บาท
                  </div>
                  <div className={styles.oToggle}>{open?'▲':'▼'}</div>
                </div>
              </div>
              {open&&(
                <div className={styles.detail}>
                  <div className={styles.dGrid}>
                    <div>
                      <div className={styles.dLbl}>👤 ลูกค้า</div>
                      <div className={styles.dVal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={styles.customerMiniAvatar}>
                          {o.customerImage ? (
                            <img src={o.customerImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            '👤'
                          )}
                        </div>
                        {o.customer}
                      </div>
                    </div>
                    <div><div className={styles.dLbl}>📱 เบอร์โทรศัพท์</div><div className={styles.dVal}>{o.phone}</div></div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div className={styles.dLbl}>📍 ที่อยู่จัดส่ง</div>
                      <div className={styles.dVal}>{o.address}</div>
                    </div>
                    {o.OdrNote && (
                      <div style={{ gridColumn: '1/-1', background: '#fff9c4', padding: '10px 14px', borderRadius: '10px', marginTop: '5px' }}>
                        <div className={styles.dLbl}>📝 โน้ตจากลูกค้า</div>
                        <div className={styles.dVal} style={{ fontWeight: '700', color: '#856404' }}>{o.OdrNote}</div>
                      </div>
                    )}
                    {o.RiderId && (
                      <div style={{gridColumn:'1/-1', borderTop:'1px solid #eee', paddingTop:'10px'}}>
                        <div className={styles.dLbl}>🛵 ข้อมูลไรเดอร์ที่รับงาน</div>
                        <div className={styles.dVal} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <span>{o.riderName || 'Rider'}</span>
                          {o.riderPhone && (
                            <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px'}}>
                              <span style={{fontSize:'14px', fontWeight:'700', color:'#333', letterSpacing:'0.5px'}}>{o.riderPhone}</span>
                              <a href={`tel:${o.riderPhone}`} style={{color:'#1e88e5', textDecoration:'none', fontWeight:'600', fontSize:'13px'}}>📞 โทรหาไรเดอร์</a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div style={{ gridColumn: '1/-1', borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px' }}>
                      <div className={styles.dLbl}>💰 สรุปรายได้ของร้าน</div>
                      <div className={styles.dVal} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span>ราคาอาหาร:</span>
                          <span>{Number(o.total || 0).toFixed(2)} ฿</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#e53935' }}>
                          <span>หักค่าธรรมเนียม GP (25%):</span>
                          <span>-{Number(o.OdrGP || 0).toFixed(2)} ฿</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', borderTop: '1px dashed #ccc', paddingTop: '4px', marginTop: '4px', color: '#2e7d32', fontSize: '16px' }}>
                          <span>รายได้สุทธิที่ร้านจะได้รับ:</span>
                          <span>{(Number(o.total || 0) - Number(o.OdrGP || 0)).toFixed(2)} ฿</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.actRow}>
                    {o.status!=='Completed'&&o.status!=='Cancelled'&&(
                      <button onClick={()=>cancel(o.OdrId)} className={styles.btnCancel}>❌ ยกเลิกออเดอร์</button>
                    )}
                    {nx && (
                      <button 
                        onClick={() => {
                          if (o.status === 'Pending') {
                            handleConfirm(o.OdrId, nx.next, nx.lbl)
                          } else {
                            upStatus(o.OdrId, nx.next)
                          }
                        }} 
                        className={styles.btnNext} 
                        style={{background:nx.color}}
                      >
                        ✅ {nx.lbl}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <PremiumModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        description={modal.description}
        icon={modal.icon}
        type={modal.type}
        confirmText={modal.confirmText}
      />
    </div>
  )
}
