'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

export default function CustomerChat() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [shopLogo, setShopLogo] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    const parsed = JSON.parse(u)
    setUser(parsed)
    fetchMessages(parsed.id)

    // Fetch shop logo if the user is a shop/restaurant
    if (parsed.role === 'restaurant' || parsed.role === 'shop') {
      fetchShopInfo(parsed.id)
    }

    const interval = setInterval(() => fetchMessages(parsed.id), 3000)
    return () => clearInterval(interval)
  }, [])

  async function fetchShopInfo(uid) {
    try {
      const res = await fetch(`http://localhost/bitesync/api/shop/profile.php?usrId=${uid}`)
      const data = await res.json()
      if (data.success) {
        setShopLogo(data.data.ShopLogoPath)
      }
    } catch {}
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function fetchMessages(uid) {
    try {
      const res = await fetch(`http://localhost/bitesync/api/chat/messages.php?senderId=${uid}&receiverId=0`)
      const data = await res.json()
      if (data.success) {
        setMessages(data.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const msg = { senderId: user.id, receiverId: 0, message: input }
    try {
      const res = await fetch('http://localhost/bitesync/api/chat/messages.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      })
      const data = await res.json()
      if (data.success) {
        setInput('')
        fetchMessages(user.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar hideLinks />
      <div className={styles.container}>
        <div className={styles.chatHeader}>
          <button className={styles.backBtn} onClick={() => {
            if (user?.role === 'rider') router.push('/rider')
            else if (user?.role === 'restaurant' || user?.role === 'shop') router.push('/shop')
            else router.push('/home')
          }}>
            <i className="fa-solid fa-chevron-left" /> กลับ
          </button>
          <div className={styles.adminStatus}>
            <div className={styles.circle}>
              <i className="fa-solid fa-headset" />
            </div>
            <div>
              <h3>ฝ่ายบริการลูกค้า (Admin)</h3>
              <span>พร้อมตอบข้อความของคุณ</span>
            </div>
          </div>
        </div>

        <div className={styles.msgBody} ref={scrollRef}>
          {messages.length === 0 && (
            <div className={styles.empty}>พิมพ์ข้อความเพื่อเริ่มคุยกับแอดมิน</div>
          )}
          {messages.map((m, i) => {
            const isOwn = m.SenderId == user?.id;
            return (
              <div key={i} className={`${styles.msgRow} ${isOwn ? styles.own : styles.their}`}>
                {!isOwn && (
                  <div className={styles.msgAvatar}>
                    <i className="fa-solid fa-user-shield" />
                  </div>
                )}
                <div className={styles.bubble}>
                  {m.ChatMessage}
                  <div className={styles.time}>
                    {new Date(m.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {isOwn && (
                    <div className={styles.msgAvatar}>
                        {shopLogo ? (
                            <img src={`${shopLogo}`} alt="ShopLogo" />
                        ) : user.image ? (
                            <img src={`http://localhost/bitesync/public${user.image}`} alt="Me" />
                        ) : (
                            user.name?.[0].toUpperCase()
                        )}
                    </div>
                )}
              </div>
            );
          })}
        </div>

        <form className={styles.inpBox} onSubmit={handleSend}>
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="พิมพ์ข้อความที่นี่..."
          />
          <button type="submit">
            <i className="fa-solid fa-paper-plane" />
          </button>
        </form>
      </div>
    </div>
  )
}
