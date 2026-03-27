'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import dynamic from 'next/dynamic'

const RiderMap = dynamic(() => import('@/components/RiderMap'), { ssr: false })

const STEPS = [
  { key: 'pickup', label: 'กำลังไปรับอาหาร', icon: '📦', desc: 'เดินทางไปที่ร้านค้า' },
  { key: 'delivered', label: 'กำลังไปส่งลูกค้า', icon: '🛵', desc: 'เดินทางไปหาลูกค้า' },
  { key: 'done', label: 'ส่งสำเร็จ', icon: '🏁', desc: 'ออเดอร์เสร็จสมบูรณ์' },
]

export default function RiderActivePage() {
  const router = useRouter()
  const [job, setJob] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [riderLoc, setRiderLoc] = useState({ lat: 7.0067, lng: 100.4698 }) // Default center if no GPS yet
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, ok, err

  useEffect(() => {
    fetchActiveJob()
    const int = setInterval(fetchActiveJob, 10000)
    return () => clearInterval(int)
  }, [])

  // Location Pulse
  useEffect(() => {
    if (!job) return
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      setRiderLoc({ lat, lng })
      sendLocation(lat, lng)
    }, null, { enableHighAccuracy: true })
    return () => navigator.geolocation.clearWatch(watchId)
  }, [job?.id])

  async function sendLocation(lat, lng) {
    setSyncStatus('syncing')
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id
      const res = await fetch('http://localhost/bitesync/api/rider/update-location.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bs_token')}` },
        body: JSON.stringify({ usrId: uid, lat, lng })
      })
      const data = await res.json()
      if (data.success) setSyncStatus('ok')
      else setSyncStatus('err')
    } catch (e) {
      console.error("Sync error:", e)
      setSyncStatus('err')
    }
  }

  function showToast(msg, type = 'ok') { setToast({ msg, type }); setTimeout(() => setToast(null), 2500) }

  async function fetchActiveJob() {
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) throw new Error('No user data')
      const uid = JSON.parse(uStr).id

      const res = await fetch(`http://localhost/bitesync/api/rider/active-job.php?usrId=${uid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success && data.data) setJob(data.data)
      else setJob(null)
    } catch { setJob(null) }
  }

  async function updateStep(nextStep, statusKey) {
    setLoading(true)
    try {
      const res = await fetch('http://localhost/bitesync/api/rider/update-status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bs_token')}` },
        body: JSON.stringify({ orderId: job.id, status: statusKey })
      })
      const data = await res.json()

      if (!data.success) {
        showToast(data.message || 'อัปเดตสถานะไม่สำเร็จ', 'err')
        setLoading(false)
        return
      }

      // Success
      if (nextStep >= STEPS.length - 1) {
        setJob(prev => ({ ...prev, step: nextStep }))
        showToast('ส่งสำเร็จ! 🎉')
        setTimeout(() => { setJob(null); router.push('/rider/history') }, 1500)
      } else {
        setJob(prev => ({ ...prev, step: nextStep }))
        showToast(STEPS[nextStep - 1]?.label || 'อัปเดตแล้ว!')
      }
    } catch (e) {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'err')
    }
    setLoading(false)
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function cancelJob() {
    setShowConfirmCancel(false)
    setLoading(true)
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) throw new Error('No user data')
      const uid = JSON.parse(uStr).id

      const res = await fetch('http://localhost/bitesync/api/rider/cancel-job.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('bs_token')}` },
        body: JSON.stringify({ orderId: job.id, riderId: uid })
      })
      const data = await res.json()
      if (data.success) {
        showToast('ยกเลิกงานแล้ว!', 'ok')
        setTimeout(() => { setJob(null); router.push('/rider/jobs') }, 1200)
      } else {
        showToast(data.message || 'เกิดข้อผิดพลาด', 'err')
      }
    } catch (err) {
      showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'err')
    }
    setLoading(false)
  }

  if (!job) return (
    <div className={styles.noJob}>
      <span>🛵</span>
      <span>ไม่มีงานที่กำลังส่ง</span>
      <button onClick={() => router.push('/rider/jobs')} className={styles.goJobsBtn}>ดูงานใหม่</button>
    </div>
  )

  const currentStep = STEPS[job.step]
  const nextStep = STEPS[job.step + 1]

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type === 'err' ? styles.toastErr : styles.toastOk}`}>{toast.type === 'err' ? '⚠️' : '✅'} {toast.msg}</div>}

      <div className={styles.hdr}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className={styles.title}>งานปัจจุบัน</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
            {syncStatus === 'syncing' && <span style={{ color: '#1976d2' }}>📡 กำลังส่งพิกัด...</span>}
            {syncStatus === 'ok' && <span style={{ color: '#2e7d32' }}>✅ พิกัดอัปเดตแล้ว</span>}
            {syncStatus === 'err' && <span style={{ color: '#d32f2f' }}>❌ พิกัดไม่ส่ง (เช็คเน็ต/GPS)</span>}
            {syncStatus === 'idle' && <span style={{ color: '#666' }}>⚪ รอสัญญาณ GPS...</span>}
          </div>
        </div>
        <span className={styles.orderId}>{job.id}</span>
      </div>

      {job.statusLabel === 'Ready' && job.step === 0 && (
        <div className={styles.readyBanner} style={{ background: '#e8f5e9', color: '#2a6129', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 'bold', border: '2px solid #4caf50' }}>
          <span style={{ fontSize: '24px', animation: 'pulse 2s infinite' }}>🟢</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px' }}>ร้านอาหารเตรียมอาหารเสร็จแล้ว!</div>
            <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '4px' }}>กรุณาเดินเข้าไปติดต่อรับอาหารที่ร้านได้เลยเพื่อความรวดเร็ว</div>
          </div>
        </div>
      )}

      {/* Status progress */}
      <div className={styles.progressCard}>
        <div className={styles.progressTitle}>สถานะการส่ง</div>
        <div className={styles.progressSteps}>
          {STEPS.map((s, i) => {
            const done = i < job.step
            const current = i === job.step
            return (
              <div key={s.key} className={styles.progressStep}>
                <div className={`${styles.progCircle} ${done ? styles.progDone : ''} ${current ? styles.progCurrent : ''}`}>
                  {done ? '✓' : s.icon}
                </div>
                <span className={`${styles.progLbl} ${current ? styles.progLblCurrent : done ? styles.progLblDone : ''}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={`${styles.progLine} ${done ? styles.progLineDone : ''}`} />}
              </div>
            )
          })}
        </div>
        {currentStep && (
          <div className={styles.currentStatus}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={styles.currentIcon}>{currentStep.icon}</span>
              <span className={styles.currentDesc}>{currentStep.desc}</span>
            </div>
            {job.step === 0 && (
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f39c12', marginTop: 5 }}>
                📍 ระยะทางไปร้าน: {getDistance(riderLoc.lat, riderLoc.lng, job.shopLat, job.shopLng).toFixed(2)} กม.
              </div>
            )}
            {job.step === 1 && (
              <div style={{ fontSize: 15, fontWeight: 800, color: '#00b14f', marginTop: 5 }}>
                🛵 ระยะทางไปลูกค้า: {getDistance(riderLoc.lat, riderLoc.lng, job.custLat, job.custLng).toFixed(2)} กม.
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.mapSection}>
        <RiderMap
          riderLoc={riderLoc}
          shopLoc={{ lat: parseFloat(job.shopLat), lng: parseFloat(job.shopLng), name: job.shopName, logo: job.shopLogo }}
          custLoc={{ lat: parseFloat(job.custLat), lng: parseFloat(job.custLng), name: job.custName }}
          step={job.step}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
          {/* Shop info */}
          <div className={`${styles.card} ${job.step === 0 ? styles.focusedCard : ''}`}>
            <h2 className={styles.cardTitle}>🏪 ร้านค้า (ต้นทาง)</h2>
            <div className={styles.placeInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div className={styles.placeAvatar}>
                  {job.shopLogo ? (
                    <img src={job.shopLogo} alt="Shop" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>🏪</span>
                  )}
                </div>
                <div className={styles.placeName}>{job.shopName}</div>
              </div>
              <div className={styles.placeAddr}>📍 {job.shopAddr}</div>
              <div className={styles.placeAddr}>📞 {job.shopPhone || 'ไม่มีเบอร์โทร'}</div>
              <a href={`tel:${job.shopPhone}`} className={styles.callBtn}>📞 {'โทรหาร้าน'}</a>
            </div>
          </div>

          {/* Customer info */}
          <div className={`${styles.card} ${job.step === 1 ? styles.focusedCard : ''}`}>
            <h2 className={styles.cardTitle}>📍 ลูกค้า (ปลายทาง)</h2>
            <div className={styles.placeInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div className={styles.placeAvatar}>
                  {job.custImage ? (
                    <img src={job.custImage} alt="Customer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>👤</span>
                  )}
                </div>
                <div className={styles.placeName}>{job.custName}</div>
              </div>
              <div className={styles.placeAddr}>📍 {job.custAddr}</div>
              <div className={styles.placeAddr}>📞 {job.custPhone || 'ไม่มีเบอร์โทร'}</div>
              <a href={`tel:${job.custPhone}`} className={styles.callBtn}>📞 {'โทรหาลูกค้า'}</a>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          {/* Order items */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>รายการอาหาร</h2>
            {job.items.map((item, i) => (
              <div key={i} className={styles.item}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemQty}>x{item.qty}</span>
                <span className={styles.itemPrice}>{item.price * item.qty} ฿</span>
              </div>
            ))}
            <div className={styles.divider} />
            <div className={styles.totalRow}>
              <span title="ระยะทางจากร้านไปลูกค้า">ระยะทางจัดส่ง: {job.distance}</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.totalRow}>
              <span>ค่าส่งที่ได้รับ</span>
              <span className={styles.feeVal}>+{job.fee} ฿</span>
            </div>
          </div>

          {/* Action button */}
          {job.step < STEPS.length - 1 && (
            <button
              onClick={() => updateStep(job.step + 1, STEPS[job.step].key)}
              disabled={loading}
              className={styles.actionBtn}
            >
              {loading ? '⏳ กำลังอัปเดต...' :
                job.step === 0 ? '📦 รับอาหารเรียบร้อย' :
                  '✅ จัดส่งสำเร็จ'
              }
            </button>
          )}

          {/* Cancel button */}
          {job.step === 0 && (
            <button
              onClick={() => setShowConfirmCancel(true)}
              disabled={loading}
              style={{ marginTop: '12px', background: 'transparent', color: '#e53935', border: '1px solid #e53935', width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ❌ ยกเลิกการรับงานนี้
            </button>
          )}
        </div>
      </div>

      {/* Confirm Cancel Modal */}
      {showConfirmCancel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s cubic-bezier(0.2,0.8,0.2,1)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e53935', marginBottom: '8px' }}>ยืนยันยกเลิกงานนี้?</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', lineHeight: '1.5' }}>ระบบจะปลดคุณออกจากออเดอร์นี้ และส่งคิวต่อให้ไรเดอร์ท่านอื่นแทน คุณแน่ใจหรือไม่?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowConfirmCancel(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#f4f7f4', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>ปิด</button>
              <button onClick={cancelJob} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#e53935', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>ยืนยันยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

