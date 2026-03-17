'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const emailValid = email.includes('@') && email.includes('.')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email)    return setError('กรุณากรอกอีเมล')
    if (!password) return setError('กรุณากรอกรหัสผ่าน')
    setError(''); setLoading(true)
    try {
      const res  = await fetch('http://localhost/bitesync/dbconnect/login.php', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('bs_token', data.token)
        localStorage.setItem('bs_user', JSON.stringify(data.user))
        const role = data.user.role
        if      (role === 'admin')      window.location.href = '/admin/dashboard'
        else if (role === 'rider')      window.location.href = '/rider/home'
        else if (role === 'restaurant') window.location.href = '/shop'
        else                            window.location.href = '/home'
      } else {
        setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      {/* BG */}
      <div className={styles.bg} />

      <div className={styles.pageWrap}>
        {/* LEFT */}
        <div className={styles.pageLeft}>
          <div className={styles.bigLogo}>
            <span className={styles.bigLogoIcon}>🍃</span>
            <span className={styles.bigLogoTxt}>Bite<span>Sync</span></span>
          </div>
          <h1 className={styles.bigTitle}>
            เอาใจสัมผัส<br/>
            <em className={styles.bigEm}>รวดเร็วและสดใหม่</em>
          </h1>
          <p className={styles.bigSub}>
            อาหารส่งถึงหน้าบ้านรวดเร็วทันใจ<br/>
            ค้นหาร้านโปรดใกล้บ้านและสั่งได้ภายในไม่กี่นาที
          </p>
        </div>

        {/* RIGHT */}
        <div className={styles.pageRight}>
          <div className={styles.card}>
            <div className={styles.cardLogo}>
              <span className={styles.cardLogoIcon}>🍃</span>
              <span className={styles.cardLogoTxt}>Bite<span>Sync</span></span>
            </div>
            <h2 className={styles.cardTitle}>ยินดีต้อนรับกลับ!!!</h2>
            <p className={styles.cardSub}>เข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ</p>

            {error && <div className="error-box">⚠️ {error}</div>}

            <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:0}}>
              {/* Email */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>อีเมล</label>
                <div className="input-wrap">
                  <span className="input-ic"><i className="fa-regular fa-envelope"/></span>
                  <input type="email" placeholder="อีเมล" value={email}
                    onChange={e => setEmail(e.target.value)} />
                  {emailValid && (
                    <span style={{width:38,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--green)',fontSize:16}}>
                      <i className="fa-solid fa-circle-check"/>
                    </span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>รหัสผ่าน</label>
                <div className="input-wrap">
                  <span className="input-ic"><i className="fa-solid fa-lock"/></span>
                  <input type={showPw ? 'text' : 'password'} placeholder="รหัสผ่าน"
                    value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" className="eye-btn" onClick={() => setShowPw(p=>!p)}>
                    <i className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}/>
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className={styles.rememberRow}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    style={{accentColor:'var(--green)',marginRight:6}} />
                  จดจำฉัน
                </label>
                <a href="#" className={styles.forgotLink}>ลืมรหัสผ่าน?</a>
              </div>

              <button type="submit" disabled={loading} className={styles.btnSignIn}
                style={{opacity: loading ? .7 : 1}}>
                {loading ? '⏳ กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <p className={styles.registerRow}>
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className={styles.registerLink}>สมัครสมาชิกฟรี</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
