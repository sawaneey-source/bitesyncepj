'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import styles from './register.module.css'
import Logo from '@/components/Logo'

const ROLES = [
  { value:'customer',   label:'ลูกค้า',       icon:'fa-user' },
  { value:'restaurant', label:'ร้านอาหาร',    icon:'fa-store' },
  { value:'rider',      label:'ไรเดอร์',      icon:'fa-motorcycle' },
]


function strengthScore(pw) {
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 8) s++
  if (/[A-Z]|[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const strengthColors = ['','#e53935','#f0c419','#5aa354','#3a7d38']
const strengthLabels = ['','อ่อน','พอใช้','ดี','แข็งแกร่ง']

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole]         = useState('customer')
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCpw, setShowCpw]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const r = params.get('role')
      if (r && ['customer', 'restaurant', 'rider'].includes(r)) {
        setRole(r)
      }
    }
  }, [])

  const score = strengthScore(password)

  async function handleRegister(e) {
    e.preventDefault()
    if (!fullName)                  return setError('กรุณากรอกชื่อ-นามสกุล')
    if (!email.includes('@'))       return setError('อีเมลไม่ถูกต้อง')
    if (!/^0[0-9]{9}$/.test(phone)) return setError('เบอร์โทรต้องเป็น 10 หลัก เช่น 0812345678')
    if (password.length < 6)        return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    if (password !== confirmPw)     return setError('รหัสผ่านไม่ตรงกัน')
    setError(''); setLoading(true)
    try {
      const res  = await fetch('http://localhost/bitesync/dbconnect/register.php', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ role, fullName, email, phone, password }),
      })
      const data = await res.json()
      if (data.success) setSuccess(true)
      else setError((data.errors || [data.message]).join(', '))
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div>
      <Navbar />
      <div className={styles.bg}/>
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>🎉</div>
          <h2 className={styles.successTitle}>สมัครสมาชิกสำเร็จ!</h2>
          <p className={styles.successSub}>ยินดีต้อนรับสู่ BiteSync<br/>กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน</p>
          <Link href="/login" className={styles.btnGoLogin}>เข้าสู่ระบบเลย →</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <div className={styles.bg}/>
      <div className={styles.modalWrap}>
        <div className={styles.modal}>

          {/* Logo */}
          <div className={styles.modalLogo}>
            <Logo size="medium" />
          </div>
          <h2 className={styles.modalTitle}>สร้างบัญชีผู้ใช้</h2>

          {error && <div className="error-box">⚠️ {error}</div>}

          {/* Role tabs */}
          <p className={styles.roleLabel}>สมัครในฐานะ:</p>
          <div className={styles.roleTabs}>
            {ROLES.map(r => (
              <button key={r.value} type="button"
                onClick={() => {
                  setRole(r.value)
                  // Update URL parameter without page refresh
                  const params = new URLSearchParams(window.location.search)
                  params.set('role', r.value)
                  router.replace(`/register?${params.toString()}`, { scroll: false })
                }}
                className={`${styles.roleTab} ${role === r.value ? styles.roleTabActive : ''}`}>
                <i className={`fa-solid ${r.icon}`}/>
                {r.label}
                {role === r.value && (
                  <span className={styles.roleCheck}><i className="fa-solid fa-check"/></span>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister}>
            {/* ชื่อ-นามสกุล */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>ชื่อ-นามสกุล</label>
              <div className="input-wrap">
                <span className="input-ic"><i className="fa-regular fa-user"/></span>
                <input type="text" placeholder="ชื่อ-นามสกุล" autoComplete="off"
                  value={fullName} onChange={e => setFullName(e.target.value)}/>
              </div>
            </div>

            {/* อีเมล */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>ที่อยู่อีเมล</label>
              <div className="input-wrap">
                <span className="input-ic"><i className="fa-regular fa-envelope"/></span>
                <input type="email" placeholder="อีเมล" autoComplete="off"
                  value={email} onChange={e => setEmail(e.target.value)}/>
              </div>
            </div>

            {/* เบอร์โทร */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>เบอร์โทรศัพท์</label>
              <div className="input-wrap">
                <span className="input-ic"><i className="fa-solid fa-phone"/></span>
                <input type="tel" placeholder="เบอร์โทรศัพท์ (10 หลัก)" maxLength={10} autoComplete="off"
                  value={phone} onChange={e => setPhone(e.target.value)}/>
              </div>
            </div>


            {/* รหัสผ่าน */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>รหัสผ่าน</label>
              <div className="input-wrap">
                <span className="input-ic"><i className="fa-solid fa-lock"/></span>
                <input type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  value={password} onChange={e => setPassword(e.target.value)}/>
                <button type="button" className="eye-btn" onClick={() => setShowPw(p=>!p)}>
                  <i className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}/>
                </button>
              </div>
              {password && (
                <div className={styles.strengthRow}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className={styles.strengthBar}
                      style={{background: i <= score ? strengthColors[score] : '#e8eee8'}}/>
                  ))}
                  <span style={{fontSize:11, color:strengthColors[score], minWidth:60}}>
                    {strengthLabels[score]}
                  </span>
                </div>
              )}
            </div>

            {/* ยืนยันรหัสผ่าน */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>ยืนยันรหัสผ่าน</label>
              <div className="input-wrap">
                <span className="input-ic"><i className="fa-solid fa-key"/></span>
                <input type={showCpw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                  value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  style={{color: confirmPw && confirmPw!==password ? '#e53935' : 'var(--dark)'}}/>
                <button type="button" className="eye-btn" onClick={() => setShowCpw(p=>!p)}>
                  <i className={`fa-regular ${showCpw ? 'fa-eye-slash' : 'fa-eye'}`}/>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.btnSignUp}
              style={{opacity: loading ? .7 : 1}}>
              {loading ? '⏳ กำลังสมัคร...' : 'สมัครสมาชิก'}
            </button>
          </form>

          <p className={styles.loginRow}>
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className={styles.loginLink}>เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

