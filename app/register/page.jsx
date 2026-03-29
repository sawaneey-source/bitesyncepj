'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import styles from './register.module.css'

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

const strengthColors = ['','#ef4444','#f59e0b','#10b981','#059669']
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
      if (data.success) {
        setSuccess(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      else setError((data.errors || [data.message]).join(', '))
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div key="view-success" className={styles.main}>
      <Navbar />
      <div className={styles.bgOverlay}/>
      <div className={styles.contentWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✨</div>
          <h2 className={styles.successTitle}>สร้างบัญชีสำเร็จ!</h2>
          <p className={styles.successSub}>
            ยินดีต้อนรับสู่ครอบครัว <strong>BiteSync</strong><br/>
            ตอนนี้คุณสามารถเริ่มใช้งานในฐานะ <strong>{ROLES.find(r=>r.value===role)?.label}</strong> ได้แล้วครับ
          </p>
          <Link href="/login" className={styles.btnSuccess}>
            เข้าสู่ระบบเพื่อเริ่มต้นใช้งาน <span><i className="fa-solid fa-arrow-right"/></span>
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div key="view-register" className={styles.main}>
      <Navbar />
      
      {/* Restore the Beautiful Background */}
      <div className={styles.bg} />
      
      <div className={styles.contentWrap}>
        <div className={styles.registerCard}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>ร่วมเป็นส่วนหนึ่งกับเรา</h1>
            <p className={styles.subtitle}>กรอกข้อมูลด้านล่างเพื่อสร้างบัญชีใหม่ของคุณ</p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span><i className="fa-solid fa-circle-exclamation"/></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className={styles.form}>
            {/* Role Selection */}
            <div className={styles.fieldSection}>
              <label className={styles.sectionLabel}>เลือกประเภทสมาชิก</label>
              <div className={styles.roleGrid}>
                {ROLES.map(r => (
                  <button 
                    key={r.value} 
                    type="button"
                    onClick={() => {
                      setRole(r.value)
                      const params = new URLSearchParams(window.location.search)
                      params.set('role', r.value)
                      router.replace(`/register?${params.toString()}`, { scroll: false })
                    }}
                    className={`${styles.roleOption} ${role === r.value ? styles.roleOptionActive : ''}`}
                  >
                    <div className={styles.roleIcon}>
                      <span><i className={`fa-solid ${r.icon}`}/></span>
                    </div>
                    <span className={styles.roleName}>{r.label}</span>
                    {role === r.value && <span><i className={`fa-solid fa-circle-check ${styles.checkMarker}`}/></span>}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>ชื่อ-นามสกุล</label>
                <div className={styles.inputWrap}>
                  <span><i className="fa-regular fa-user"/></span>
                  <input 
                    type="text" 
                    name="fullname"
                    placeholder="ป้อนชื่อและนามสกุลของคุณ" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>อีเมล</label>
                <div className={styles.inputWrap}>
                  <span><i className="fa-regular fa-envelope"/></span>
                  <input 
                    type="email" 
                    name="email"
                    placeholder="example@mail.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>เบอร์โทรศัพท์</label>
                <div className={styles.inputWrap}>
                  <span><i className="fa-solid fa-phone-flip"/></span>
                  <input 
                    type="tel" 
                    name="phone"
                    placeholder="08X-XXX-XXXX" 
                    maxLength={10} 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>รหัสผ่าน</label>
                <div className={styles.inputWrap}>
                  <span><i className="fa-solid fa-lock"/></span>
                  <input 
                    type={showPw ? 'text' : 'password'} 
                    name="password"
                    placeholder="รหัสผ่าน 6 ตัวขึ้นไป"
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className={styles.eyeBtn}>
                    <span><i className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}/></span>
                  </button>
                </div>
                {password && (
                  <div className={styles.strengthMeter}>
                    <div className={styles.strengthBars}>
                      {[1,2,3,4].map(i => (
                        <div 
                          key={i} 
                          className={styles.bar}
                          style={{ background: i <= score ? strengthColors[score] : '#eee' }}
                        />
                      ))}
                    </div>
                    <span className={styles.strengthText} style={{ color: strengthColors[score] }}>
                      {strengthLabels[score]}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>ยืนยันรหัสผ่านอีกครั้ง</label>
                <div className={`${styles.inputWrap} ${confirmPw && confirmPw !== password ? styles.inputError : ''}`}>
                  <span><i className="fa-solid fa-key"/></span>
                  <input 
                    type={showCpw ? 'text' : 'password'} 
                    name="confirm-password"
                    placeholder="ยืนยันรหัสผ่าน"
                    value={confirmPw} 
                    onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowCpw(!showCpw)} className={styles.eyeBtn}>
                    <span><i className={`fa-regular ${showCpw ? 'fa-eye-slash' : 'fa-eye'}`}/></span>
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? (
                <><span><i className="fa-solid fa-circle-notch fa-spin"/></span> กำลังดำเนินการ...</>
              ) : (
                'สมัครสมาชิกตอนนี้'
              )}
            </button>
          </form>

          <div className={styles.footer}>
            มีบัญชี BiteSync อยู่แล้ว? <Link href="/login" className={styles.loginLink}>เข้าสู่ระบบที่นี่</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

