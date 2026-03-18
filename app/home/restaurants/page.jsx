'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Logo from '@/components/Logo'
import Navbar from '@/components/Navbar'

export default function RestaurantsListPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))

    fetch('http://localhost/bitesync/api/home/restaurants.php')
      .then(r => r.json())
      .then(d => {
        if (d.success) setShops(d.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Fetch Error (Shops):', err)
        setLoading(false)
      })
  }, [router])

  const filtered = shops.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className={styles.loading}>กำลังโหลด...</div>

  return (
    <div className={styles.page}>
      {/* Navbar copied from home for consistency */}
      <Navbar 
        showSearch={true} 
        searchValue={search} 
        onSearchChange={setSearch} 
      />

      <div className={styles.body}>
        <div className={styles.secHdr}>
          <h2 className={styles.secTitle}>🏦 ร้านอาหารทั้งหมด</h2>
          <span className={styles.secCount}>{filtered.length} ร้านค้า</span>
        </div>

        <div className={styles.grid}>
          {filtered.map(s => (
            <div key={s.id} className={styles.shopCard} onClick={() => router.push(`/home/restaurant/${s.id}`)}>
              <div className={styles.shopImgWrap}>
                <img src={s.img} alt={s.name} className={styles.shopImg} />
                {s.tag && <span className={styles.shopTag}>{s.tag}</span>}
                {!s.open && <div className={styles.closedOverlay}>ร้านปิดอยู่</div>}
              </div>
              <div className={styles.shopBody}>
                <h3 className={styles.shopName}>{s.name}</h3>
                <div className={styles.shopMeta}>
                  <span className={styles.rating}>⭐ {s.rating}</span>
                  <span className={styles.dot}>·</span>
                  <span>{s.reviews} รีวิว</span>
                  <span className={styles.dot}>·</span>
                  <span>{s.deliveryTime} นาที</span>
                </div>
                <div className={styles.shopFoot}>
                  <span className={styles.fee}>ค่าส่ง ฿{s.deliveryFee}</span>
                  <span className={styles.min}>ขั้นต่ำ ฿{s.minOrder}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
