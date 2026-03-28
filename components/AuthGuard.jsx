'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PremiumModal from './PremiumModal'
import { API_BASE } from '@/utils/api'

export default function AuthGuard() {
  const router = useRouter()
  const [banned, setBanned] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [userId, setUserId] = useState(null)
  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    // Initial user sync
    const syncUser = () => {
      const u = localStorage.getItem('bs_user')
      if (u) {
        try {
          const parsed = JSON.parse(u)
          if (parsed.id !== userId) setUserId(parsed.id);
        } catch (e) {
          setUserId(null)
        }
      } else {
        setUserId(null)
      }
    }

    syncUser()
    const intv = setInterval(syncUser, 5000)
    return () => clearInterval(intv)
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const checkBanStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/common/check_auth.php?userId=${userId}`)
        const data = await res.json()
        
        // Account deleted (not found)
        if (!data.success) {
          setIsDeleted(true)
          setBanned(true)
          return
        }

        // Account banned
        if (data.status === 0) {
          setBanned(true)
        }
      } catch (e) {
        console.error("Ban check failed", e)
      }
    }

    checkBanStatus()
    const heartbeat = setInterval(checkBanStatus, 20000)
    return () => clearInterval(heartbeat)
  }, [userId])

  useEffect(() => {
    if (banned && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (banned && countdown === 0) {
      handleKicked()
    }
  }, [banned, countdown])

  const handleKicked = () => {
    localStorage.removeItem('bs_user')
    localStorage.removeItem('bs_token')
    window.location.href = '/'
  }

  if (!banned) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, color: 'white', textAlign: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'white', color: '#1a1c1a', padding: '40px',
        borderRadius: '24px', maxWidth: '450px', width: '90%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>{isDeleted ? '🏠' : '⚠️'}</div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '15px', color: '#c62828' }}>
          {isDeleted ? 'บัญชีถูกลบเลิกการใช้งาน' : 'บัญชีของคุณถูกระงับ!'}
        </h2>
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#607060', marginBottom: '30px' }}>
          {isDeleted 
            ? 'บัญชีนี้ถูกนำออกจากระบบถาวรโดยผู้ดูแลคอมมูนิตี้'
            : 'บัญชีนี้ถูกระงับการใช้งานชั่วคราวโดยผู้ดูแลระบบ'
          }<br/>
          กําลังจะพาส่งคุณออกไปยังหน้าหลักใน...
        </p>
        
        <div style={{ position: 'relative', height: '60px', width: '60px', margin: '0 auto' }}>
            <div style={{
                fontSize: '28px', fontWeight: '900', color: '#c62828',
                lineHeight: '60px', textAlign: 'center'
            }}>
                {countdown}
            </div>
            {/* Simple Animated Ring */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                border: '4px solid #f1f1f1', borderRadius: '50%', boxSizing: 'border-box'
            }} />
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                border: '4px solid #c62828', borderRadius: '50%', boxSizing: 'border-box',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
            }} />
        </div>

        <p style={{ fontSize: '12px', color: '#9baa9b', marginTop: '25px' }}>
            {isDeleted ? '* คุณสามารถสมัครสมาชิกใหม่ได้หากต้องการ' : '* หากมีข้อสงสัย กรุณาติดต่อ admin@bitesync.com'}
        </p>
      </div>

      <style jsx>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
