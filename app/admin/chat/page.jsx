'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

export default function AdminChat() {
  const router = useRouter()
  const [contacts, setContacts] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    fetchContacts()
    const interval = setInterval(fetchContacts, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeUser) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 3000)
      return () => clearInterval(interval)
    }
  }, [activeUser])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function fetchContacts() {
    try {
      const res = await fetch('http://localhost/bitesync/api/chat/contacts.php')
      const data = await res.json()
      if (data.success) {
        setContacts(data.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchMessages() {
    if (!activeUser) return
    try {
      const res = await fetch(`http://localhost/bitesync/api/chat/messages.php?senderId=0&receiverId=${activeUser.UsrId}`)
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
    if (!input.trim() || !activeUser) return

    const msg = { senderId: 0, receiverId: activeUser.UsrId, message: input }
    try {
      const res = await fetch('http://localhost/bitesync/api/chat/messages.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      })
      const data = await res.json()
      if (data.success) {
        setInput('')
        fetchMessages()
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar hideLinks />
      <div className={styles.adminBody}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <button className={styles.backBtn} onClick={() => router.push('/admin/dashboard')}>
              <i className="fa-solid fa-chevron-left" /> กลับหน้าเมนู
            </button>
            <h3>การแชททั้งหมด</h3>
          </div>
          <div className={styles.contactList}>
            {contacts.map(c => (
              <div 
                key={c.UsrId} 
                className={`${styles.contactItem} ${activeUser?.UsrId === c.UsrId ? styles.activeContact : ''}`}
                onClick={() => setActiveUser(c)}
              >
                <div className={styles.avatar}>
                  {c.UsrImagePath ? (
                    <img 
                      src={`http://localhost/bitesync/public${c.UsrImagePath}`} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    c.UsrFullName[0]
                  )}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.row}>
                    <span className={styles.name}>
                      {c.UsrRole === 'rider' && <span className={styles.roleTag} style={{background:'#e0f2fe', color:'#0369a1'}}>Rider</span>}
                      {c.UsrRole === 'shop' || c.UsrRole === 'restaurant' ? <span className={styles.roleTag} style={{background:'#fef3c7', color:'#92400e'}}>Shop</span> : null}
                      {c.UsrFullName}
                    </span>
                    <span className={styles.timeLabel}>
                      {new Date(c.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={styles.lastMsg}>{c.lastMsg}</div>
                </div>
                {c.unreadCount > 0 && <span className={styles.unread}>{c.unreadCount}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.chatMain}>
          {activeUser ? (
            <>
              <div className={styles.mainHeader}>
                <div className={styles.avatar}>
                  {activeUser.UsrImagePath ? (
                    <img 
                      src={`http://localhost/bitesync/public${activeUser.UsrImagePath}`} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    activeUser.UsrFullName[0]
                  )}
                </div>
                <div>
                  <h3 style={{margin:0}}>{activeUser.UsrFullName}</h3>
                  <span style={{fontSize:'12px', color:'#16a34a'}}>กำลังออนไลน์</span>
                </div>
              </div>

              <div className={styles.msgStream} ref={scrollRef}>
                {messages.map((m, i) => (
                  <div key={i} className={`${styles.msgRow} ${m.SenderId == 0 ? styles.own : styles.their}`}>
                    <div className={styles.bubble}>
                      {m.ChatMessage}
                      <div className={styles.timeTip}>
                       {new Date(m.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form className={styles.inpRow} onSubmit={handleSend}>
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="ตอบกลับลูกค้าคนนี้ที่นี่..."
                />
                <button type="submit">
                   <i className="fa-solid fa-paper-plane" />
                </button>
              </form>
            </>
          ) : (
            <div className={styles.noSelection}>
               <i className="fa-solid fa-comments" style={{fontSize:'4rem', marginBottom:'1rem', opacity:0.2}} />
               <p>เลือกรายการแชทจากแถบด้านซ้ายเพื่อเริ่มการสนทนา</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
