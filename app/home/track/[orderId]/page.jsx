'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

const STEPS = [
  { key:'received',  label:'ได้รับคำสั่งซื้อแล้ว',   icon:'📋' },
  { key:'preparing', label:'กำลังเตรียมอาหาร',    icon:'👨‍🍳' },
  { key:'waiting',   label:'รอไรเดอร์มารับ', icon:'⏳' },
  { key:'assigned',  label:'จัดหาไรเดอร์แล้ว',    icon:'🛵' },
  { key:'pickup',    label:'รับอาหารแล้ว',          icon:'📦' },
  { key:'delivered', label:'จัดส่งเรียบร้อย',          icon:'🏁' },
]

export default function TrackPage() {
  const router  = useRouter()
  const params  = useParams()
  const mapRef  = useRef(null)
  const mapInstanceRef = useRef(null)
  const riderMarkerRef = useRef(null)

  const [order, setOrder]     = useState(null)
  const [error, setError]     = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [user, setUser]       = useState(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))
    
    fetchOrder()
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [router, params?.orderId])

  useEffect(() => {
    if (!showMap || mapInstanceRef.current || !order) return
    initMap()
  }, [showMap, order])

  // Live Marker Update
  useEffect(() => {
    if (!mapInstanceRef.current || !riderMarkerRef.current || !order?.rider) return
    const { lat, lng } = order.rider
    riderMarkerRef.current.setLatLng([lat, lng])
  }, [order?.rider?.lat, order?.rider?.lng])

  async function fetchOrder() {
    try {
      const token = localStorage.getItem('bs_token')
      const res   = await fetch(`http://localhost/bitesync/api/customer/orders.php?id=${params?.orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
          const d = data.data
          const status = Number(d.OdrStatus)
          
          // Only redirect on Completed (6)
          if (status === 6) {
             localStorage.removeItem('bs_last_order')
             router.replace(`/home/receipt/${params.orderId}`)
             return
          }

          // Normalize data structure for frontend
          setOrder({
              id: d.OdrId,
              currentStep: d.currentStep,
              estimatedTime: '10-20 นาที',
              date: d.OdrCreatedAt,
              total: d.OdrGrandTotal,
              deliveryFee: d.OdrDelFee,
              shop: { 
                  id: d.ShopId, 
                  name: d.ShopName, 
                  lat: parseFloat(d.ShopLat || 7.0042), 
                  lng: parseFloat(d.ShopLng || 100.4651) 
              },
              customer: { 
                  name: user?.name || d.UsrFullName, 
                  address: `${d.HouseNo} ${d.SubDistrict} ${d.District} ${d.Province}`,
                  lat: 7.0085, lng: 100.4734 
              },
              rider: d.RiderId ? {
                  name: d.RiderName,
                  phone: d.RiderPhone,
                  vehicle: d.RiderVehicleType || 'รถจักรยานยนต์',
                  plate: d.RiderVehiclePlate || '-',
                  lat: parseFloat(d.RiderLat || 7.0067),
                  lng: parseFloat(d.RiderLng || 100.4698)
              } : null,
              items: d.items
          })
          setError(null)
      } else {
          setError(data.message || 'ไม่พบข้อมูลออเดอร์')
      }
    } catch (e) {
      console.error("Fetch order error:", e)
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล")
    }
  }

  async function initMap() {
    if (!order) return
    const L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([order.shop.lat, order.shop.lng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const shopIcon = L.divIcon({
      html: `<div style="background:#2a6129;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">🏪</div>`,
      className: '', iconAnchor: [18, 18]
    })
    L.marker([order.shop.lat, order.shop.lng], { icon: shopIcon }).addTo(map).bindPopup(`<b>${order.shop.name}</b>`)

    const custIcon = L.divIcon({
      html: `<div style="background:#f0c419;color:#1a1f1a;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">📍</div>`,
      className: '', iconAnchor: [18, 18]
    })
    L.marker([order.customer.lat, order.customer.lng], { icon: custIcon }).addTo(map).bindPopup(`<b>ที่อยู่ของคุณ</b>`)

    if (order.rider) {
        const riderIcon = L.divIcon({
          html: `<div style="background:#e65100;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #fff;box-shadow:0 2px 12px rgba(230,81,0,.4)">🛵</div>`,
          className: '', iconAnchor: [20, 20]
        })
        riderMarkerRef.current = L.marker([order.rider.lat, order.rider.lng], { icon: riderIcon }).addTo(map).bindPopup(`<b>ผู้ส่ง: ${order.rider.name}</b>`)
    }

    mapInstanceRef.current = map
    setMapReady(true)
  }

  if (error) return (
    <div className={styles.loading}>
      <div style={{color:'#e53935', marginBottom:18}}>{error}</div>
      <button onClick={() => router.push('/home')} className={styles.backBtn} style={{background:'#f0f4f0'}}>
        กลับหน้าหลัก
      </button>
    </div>
  )

  if (!order) return <div className={styles.loading}>กำลังโหลดข้อมูล...</div>

  const step = order.currentStep

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <button onClick={() => router.push('/home')} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับหน้าหลัก
          </button>
          <div className={styles.navTitle}>ติดตามออเดอร์ #{order.id}</div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.mapBanner} onClick={() => setShowMap(v => !v)}>
          <span>🗺️ ติดตามบนแผนที่</span>
          <span className={styles.mapToggle}>{showMap ? '▲ ซ่อนแผนที่' : '▼ ดูแผนที่'}</span>
        </div>

        {showMap && (
          <div className={styles.mapWrap}>
            <div ref={mapRef} className={styles.mapContainer}/>
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.card}>
              <div className={styles.orderHdr}>
                <div>
                  <h2 className={styles.cardTitle}>สถานะการจัดส่ง</h2>
                  <div className={styles.orderId}>ออเดอร์หมายเลข: #{order.id}</div>
                </div>
                <div className={styles.estSection}>
                  <div className={styles.estBadge}>🕐 คาดว่าจะถึงใน {order.estimatedTime}</div>
                </div>
              </div>

              {step === 0 && (
                <div className={styles.cancelSection}>
                   <p className={styles.cancelHint}>* คุณสามารถยกเลิกออเดอร์ได้ก่อนที่ร้านค้าจะเริ่มเตรียมอาหาร</p>
                   <button 
                     className={styles.cancelBtn} 
                     onClick={async () => {
                       if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกออเดอร์นี้?')) return;
                       try {
                         const token = localStorage.getItem('bs_token');
                         const user = JSON.parse(localStorage.getItem('bs_user'));
                         const res = await fetch(`http://localhost/bitesync/api/customer/orders.php`, {
                           method: 'PUT',
                           headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                           body: JSON.stringify({ id: order.id, status: 6, userId: user.id })
                         });
                         const data = await res.json();
                         if (data.success) {
                           alert(data.message);
                           fetchOrder();
                         } else {
                           alert(data.message);
                         }
                       } catch (e) {
                         alert('เกิดข้อผิดพลาดในการยกเลิก');
                       }
                     }}
                   >
                     ❌ ยกเลิกออเดอร์นี้
                   </button>
                </div>
              )}

              <div className={styles.steps}>
                {STEPS.map((s, i) => {
                  const done    = i < step
                  const current = i === step
                  return (
                    <div key={s.key} className={styles.stepRow}>
                      <div className={styles.stepLeft}>
                        <div className={`${styles.stepCircle} ${done||current ? styles.stepDone : ''} ${current ? styles.stepCurrent : ''}`}>
                          {done ? '✓' : s.icon}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`}/>
                        )}
                      </div>
                      <span className={`${styles.stepLbl} ${current ? styles.stepLblCurrent : done ? styles.stepLblDone : ''}`}>
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {order.rider && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>ข้อมูลคนขับ</h2>
                <div className={styles.riderRow}>
                  <div className={styles.riderAvatar}>{order.rider.name[0]}</div>
                  <div className={styles.riderInfo}>
                    <div className={styles.riderName}>{order.rider.name}</div>
                    <div className={styles.riderSub}>📱 {order.rider.phone}</div>
                    <div className={styles.riderSub}>🛵 {order.rider.vehicle} · {order.rider.plate}</div>
                  </div>
                  <a href={`tel:${order.rider.phone}`} className={styles.callBtn}>📞</a>
                </div>
              </div>
            )}
          </div>

          <div className={styles.right}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>รายการอาหาร</h2>
              {order.items.map((item, i) => (
                <div key={i} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{item.name}</span>
                  </div>
                  <span className={styles.itemQty}>x{item.qty}</span>
                  <span className={styles.itemPrice}>{item.price * item.qty} THB</span>
                </div>
              ))}
              <div className={styles.divider}/>
              <div className={styles.item}>
                <span>ค่าจัดส่ง</span><span>{order.deliveryFee} THB</span>
              </div>
              <div className={`${styles.item} ${styles.itemTotal}`}>
                <span>ยอดรวมทั้งหมด:</span><span>{order.total} THB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
