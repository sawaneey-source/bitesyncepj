'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function RiderJobsPage() {
  const router = useRouter()
  const [jobs, setJobs]   = useState([])
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState(null)
  const [toast, setToast] = useState(null)
  const [online, setOnline] = useState(false)
  const [hasActiveJob, setHasActiveJob] = useState(false)
  const [riderLoc, setRiderLoc] = useState(null)

  useEffect(() => {
    setOnline(localStorage.getItem('rider_online') === 'true')
    fetchJobs()
    checkActiveJob()

    // Watch rider location
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setRiderLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    )

    const iv = setInterval(() => {
      fetchJobs()
      checkActiveJob()
    }, 15000)
    return () => {
      clearInterval(iv)
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = (lat2-lat1) * Math.PI / 180;
    const dLon = (lon2-lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async function checkActiveJob() {
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id
      const res = await fetch(`http://localhost/bitesync/api/rider/active-job.php?usrId=${uid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      setHasActiveJob(data.success && data.data)
    } catch { setHasActiveJob(false) }
  }

  function showToast(msg, type='ok') { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  async function fetchJobs() {
    setLoading(true)
    try {
      const uStr = localStorage.getItem('bs_user')
      let uid = 0
      if (uStr) { try { uid = JSON.parse(uStr).id } catch(e){} }

      const isOnline = localStorage.getItem('rider_online') === 'true'
      if (!isOnline) {
        setJobs([])
        setLoading(false)
        return
      }

      const res  = await fetch(`http://localhost/bitesync/api/rider/jobs.php?usrId=${uid}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        setJobs(data.data)
        // Fallback position if browser hasn't fired geolocation yet
        if (!riderLoc && data.riderPos && data.riderPos.lat !== 0) {
          setRiderLoc(data.riderPos)
        }
      }
    } catch {}
    setLoading(false)
  }

  async function acceptJob(jobId) {
    setAccepting(jobId)
    try {
      const userStr = localStorage.getItem('bs_user')
      let rId = 0
      if (userStr) {
         try { rId = JSON.parse(userStr).id } catch(e){}
      }

      const res  = await fetch('http://localhost/bitesync/api/rider/accept-job.php', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('bs_token')}` },
        body: JSON.stringify({ orderId: jobId, riderId: rId })
      })
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        if (data.success) {
          showToast('รับงานสำเร็จ!')
          setTimeout(() => router.push('/rider/active'), 800)
        } else showToast(data.message || 'เกิดข้อผิดพลาด', 'err')
      } catch (e) {
        console.error("Parse error:", text)
        showToast('เซิร์ฟเวอร์ตอบกลับผิดพลาด: ' + text.substring(0,30), 'err')
      }
    } catch(err) {
      console.error(err)
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + err.message, 'err')
    }
    setAccepting(null)
  }

  return (
    <div>
      {toast && <div className={`${styles.toast} ${toast.type==='err'?styles.toastErr:styles.toastOk}`}>{toast.type==='err'?'⚠️':'✅'} {toast.msg}</div>}

      <div className={styles.hdr}>
        <div>
          <h1 className={styles.title}>งานใหม่</h1>
          <p className={styles.sub}>ออเดอร์ที่รอไรเดอร์รับ</p>
        </div>
        <button onClick={fetchJobs} className={styles.refreshBtn}><i className="fa-solid fa-rotate" /> รีเฟรช</button>
      </div>

      {!online && (
        <div className={styles.offlineWarn}>
          ⚫ คุณปิดรับงานอยู่ — เปิด Online เพื่อรับงานได้ที่หน้าหลัก
        </div>
      )}



      {loading && jobs.length === 0 ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>กำลังค้นหางานใหม่ในระยะทางที่กำหนด...</p>
        </div>
      ) : (
        <>
          {online && riderLoc && (
            <div style={{background:'#e3f2fd', color:'#1976d2', padding:'10px 16px', borderRadius:'10px', marginBottom:'15px', display:'flex', alignItems:'center', gap:'8px', fontSize:'14px', fontWeight:'600'}}>
              <i className="fa-solid fa-filter" /> กำลังกรองงานในระยะ 5 กม. รอบตัวคุณ
            </div>
          )}

          {hasActiveJob && (
            <div style={{background:'#fff3e0', border:'1px solid #ffe0b2', color:'#e65100', padding:'16px', borderRadius:'12px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px', fontWeight:'500'}}>
              <span style={{fontSize:'20px'}}>⚠️</span>
              <span>คุณมีงานที่ยังทำไม่เสร็จอยู่ (Order {hasActiveJob.id}) กรุณาส่งงานให้เสร็จก่อนรับงานใหม่</span>
            </div>
          )}

          {(() => {
            const filteredJobs = jobs.filter(job => {
              if (!riderLoc) return true; // Show all if no GPS yet
              const dist = getDistance(riderLoc.lat, riderLoc.lng, parseFloat(job.shopLat), parseFloat(job.shopLng));
              return dist <= 5.0;
            });

            if (filteredJobs.length === 0) {
              return (
                <div className={styles.empty}>
                  <span>📭</span>
                  <span>ไม่มีงานใหม่ในระยะ 5 กม.</span>
                  <span className={styles.emptySub}>รองานใหม่สักครู่ หรือลองเปลี่ยนพื้นที่นะครับ</span>
                </div>
              );
            }

            return (
              <div className={styles.list}>
                {filteredJobs.map(job => (
                <div key={job.id} className={styles.jobCard}>
                  <div className={styles.jobTop}>
                    <img src={job.img} className={styles.jobImg}/>
                    <div className={styles.jobInfo}>
                      <div className={styles.jobId}>{job.id}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={styles.shopLogoMini}>
                          {job.logo ? (
                            <img src={job.logo} alt="Shop" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            '🏪'
                          )}
                        </div>
                        <div className={styles.shopName}>{job.shopName}</div>
                      </div>
                      <div className={styles.shopAddr}>📍 {job.shopAddr}</div>
                    </div>
                    <div className={styles.jobFee}>
                      <div className={styles.feeVal}>+{job.fee} ฿</div>
                      <div className={styles.feeLbl}>ค่าส่ง</div>
                    </div>
                  </div>

                  <div className={styles.jobMid}>
                    <div className={styles.routeRow}>
                      <div className={styles.routePoint}>
                        <span className={styles.routeDotShop}/>
                        <span className={styles.routeAddr}>{job.shopAddr}</span>
                      </div>
                      <div className={styles.routeLine}/>
                      <div className={styles.routePoint}>
                        <span className={styles.routeDotCust}/>
                        <span className={styles.routeAddr}>{job.custAddr}</span>
                      </div>
                    </div>
                     <div className={styles.jobMeta}>
                      <span>📦 {job.items}</span>
                      <span>·</span>
                      <span title="ระยะทางจากร้านไปบ้านลูกค้า">🚚 {job.distance}</span>
                      {riderLoc && (
                        <>
                          <span>·</span>
                          <span title="ระยะทางจากตำแหน่งคุณไปที่ร้าน" style={{color:'#f39c12', fontWeight:'700'}}>
                            📍 ไปร้าน: {getDistance(riderLoc.lat, riderLoc.lng, parseFloat(job.shopLat), parseFloat(job.shopLng)).toFixed(1)} กม.
                          </span>
                          <span>·</span>
                          <span title="ระยะทางรวมทั้งหมด" style={{color:'#3498db', fontWeight:'800'}}>
                            🏁 รวม: {(getDistance(riderLoc.lat, riderLoc.lng, parseFloat(job.shopLat), parseFloat(job.shopLng)) + parseFloat(job.distance)).toFixed(1)} กม.
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>💰 {job.total} ฿</span>
                    </div>
                  </div>

                  <div className={styles.phoneBadges}>
                    <a href={`tel:${job.shopPhone}`} className={styles.phoneBadge}>
                      <span>🏪</span>
                      <span>{job.shopPhone || 'ไม่มีเบอร์ร้าน'}</span>
                    </a>
                    <a href={`tel:${job.custPhone}`} className={styles.phoneBadge} style={{background:'#e8f5e9', color:'#2e7d32'}}>
                      <span>👤</span>
                      <span>{job.custPhone || 'ไม่มีเบอร์ลูกค้า'}</span>
                    </a>
                  </div>

                  <div className={styles.jobFoot}>
                    <button
                      onClick={() => acceptJob(job.id)}
                      disabled={!!accepting || !online || !!hasActiveJob}
                      className={styles.acceptBtn}
                      style={hasActiveJob ? {opacity:0.5, cursor:'not-allowed'} : {}}
                    >
                      {accepting === job.id ? '⏳ กำลังรับ...' : 
                       hasActiveJob ? '❌ มีงานค้างอยู่' : '✅ รับงาน'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </>
      )}
    </div>
  )
}

