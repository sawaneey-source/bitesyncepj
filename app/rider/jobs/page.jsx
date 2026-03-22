'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const MOCK_JOBS = [
  { id:'#1025', shopName:'มอกกี้เบเกอรี่', shopAddr:'123 ถ.กาญจนวนิช', custAddr:'56/2 ม.1 ต.หาดใหญ่', items:'1x เค้กช็อก, 2x ชาไทย', total:195, distance:'1.2 กม.', fee:25, img:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&q=70' },
  { id:'#1026', shopName:'Sweet Garden',   shopAddr:'89 ถ.เพชรเกษม',    custAddr:'12/4 ถ.รถไฟ',          items:'3x คุกกี้, 1x เค้ก',    total:280, distance:'2.5 กม.', fee:35, img:'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=100&q=70' },
  { id:'#1027', shopName:'Boba & Co.',      shopAddr:'45 ถ.นิพัทธ์อุทิศ', custAddr:'88 ถ.กาญจนวนิช',      items:'2x บอบา, 1x มัทฉะ',   total:155, distance:'0.8 กม.', fee:15, img:'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=100&q=70' },
]

export default function RiderJobsPage() {
  const router = useRouter()
  const [jobs, setJobs]   = useState([])
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState(null)
  const [toast, setToast] = useState(null)
  const [online, setOnline] = useState(false)
  const [hasActiveJob, setHasActiveJob] = useState(false)

  useEffect(() => {
    setOnline(localStorage.getItem('rider_online') === 'true')
    fetchJobs()
    checkActiveJob()
    const iv = setInterval(() => {
      fetchJobs()
      checkActiveJob()
    }, 15000)
    return () => clearInterval(iv)
  }, [])

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

      const res  = await fetch(`http://localhost/bitesync/api/rider/jobs.php?usrId=${uid}`, {
        headers:{ Authorization:`Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) setJobs(data.data)
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
        <button onClick={fetchJobs} className={styles.refreshBtn}>🔄 รีเฟรช</button>
      </div>

      {!online && (
        <div className={styles.offlineWarn}>
          ⚫ คุณปิดรับงานอยู่ — เปิด Online เพื่อรับงานได้ที่หน้าหลัก
        </div>
      )}

      {hasActiveJob && (
        <div style={{background:'#fff3e0', border:'1px solid #ffe0b2', color:'#e65100', padding:'16px', borderRadius:'12px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px', fontWeight:'500'}}>
          <span style={{fontSize:'20px'}}>⚠️</span>
          <span>คุณมีงานที่ยังทำไม่เสร็จอยู่ (Order {hasActiveJob.id}) กรุณาส่งงานให้เสร็จก่อนรับงานใหม่</span>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <span>📭</span>
          <span>ไม่มีงานใหม่ตอนนี้</span>
          <span className={styles.emptySub}>รอสักครู่ ระบบจะแจ้งเมื่อมีออเดอร์ใหม่</span>
        </div>
      ) : (
        <div className={styles.list}>
          {jobs.map(job => (
            <div key={job.id} className={styles.jobCard}>
              <div className={styles.jobTop}>
                <img src={job.img} className={styles.jobImg}/>
                <div className={styles.jobInfo}>
                  <div className={styles.jobId}>{job.id}</div>
                  <div className={styles.shopName}>🏪 {job.shopName}</div>
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
                  <span>📍 {job.distance}</span>
                  <span>·</span>
                  <span>💰 {job.total} ฿</span>
                </div>
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
      )}
    </div>
  )
}
