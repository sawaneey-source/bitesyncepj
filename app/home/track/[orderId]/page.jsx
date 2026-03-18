'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'

const STEPS = [
  { key:'received',  label:'Order Received',   icon:'📋' },
  { key:'preparing', label:'Preparing Food',    icon:'👨‍🍳' },
  { key:'waiting',   label:'Waiting for Rider', icon:'⏳' },
  { key:'assigned',  label:'Rider Assigned',    icon:'🛵' },
  { key:'pickup',    label:'Picked Up',          icon:'📦' },
  { key:'delivered', label:'Delivered',          icon:'✅' },
]

// Mock order data
const MOCK_ORDER = {
  id: 'BSS92231',
  currentStep: 3,
  estimatedTime: '10-15 min',
  customer: { name: 'สมชาย', address: '123 ถ.กาญจนวนิช หาดใหญ่', lat: 7.0085, lng: 100.4734 },
  rider: { name: 'Aek', phone: '096-456-9088', vehicle: 'Honda PCX', plate: 'กข-1234', lat: 7.0067, lng: 100.4698 },
  shop: { name: 'มอกกี้เบเกอรี่', lat: 7.0042, lng: 100.4651 },
  items: [
    { name: 'Backyard Biscuit Cake', qty: 1, price: 50 },
    { name: 'Our Island Dessert Shot', qty: 1, price: 180 },
    { name: 'Matcha Jelly', qty: 2, price: 75 },
  ],
  subtotal: 380, deliveryFee: 15, total: 395,
}

export default function TrackPage() {
  const router  = useRouter()
  const params  = useParams()
  const mapRef  = useRef(null)
  const mapInstanceRef = useRef(null)
  const riderMarkerRef = useRef(null)

  const [order, setOrder]     = useState(MOCK_ORDER)
  const [showMap, setShowMap] = useState(false)
  const [user, setUser]       = useState(null)
  const [mapReady, setMapReady] = useState(false)

  // Poll order status every 10s
  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))
    
    fetchOrder()
    const interval = setInterval(fetchOrder, 10000)
    return () => clearInterval(interval)
  }, [router])

  // Init map after showMap = true
  useEffect(() => {
    if (!showMap || mapInstanceRef.current) return
    initMap()
  }, [showMap])

  // Update rider marker when order changes
  useEffect(() => {
    if (!mapReady || !riderMarkerRef.current) return
    riderMarkerRef.current.setLatLng([order.rider.lat, order.rider.lng])
  }, [order.rider.lat, order.rider.lng, mapReady])

  async function fetchOrder() {
    // 1. Check local history first for real data
    const history = JSON.parse(localStorage.getItem('bs_history') || '[]')
    const local = history.find(h => h.id === params?.orderId)
    
    if (local) {
      setOrder(prev => ({
        ...local,
        // Keep simulated rider movement if it was already moving
        rider: { 
          ...local.rider, 
          lat: prev.id === local.id ? prev.rider.lat : local.rider.lat,
          lng: prev.id === local.id ? prev.rider.lng : local.rider.lng
        }
      }))
      return
    }

    // 2. Fallback to API
    try {
      const token = localStorage.getItem('bs_token')
      const res   = await fetch(`http://localhost/bitesync/api/customer/orders.php?id=${params?.orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setOrder(data.data)
    } catch {
      // simulate rider moving
      setOrder(prev => ({
        ...prev,
        rider: {
          ...prev.rider,
          lat: prev.rider.lat + (Math.random() - 0.5) * 0.0005,
          lng: prev.rider.lng + (Math.random() - 0.5) * 0.0005,
        }
      }))
    }
  }

  async function initMap() {
    const L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')

    // Fix default icon
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView(
      [order.rider.lat, order.rider.lng], 15
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Shop marker (green)
    const shopIcon = L.divIcon({
      html: `<div style="background:#2a6129;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">🏪</div>`,
      className: '', iconAnchor: [18, 18]
    })
    L.marker([order.shop.lat, order.shop.lng], { icon: shopIcon })
      .addTo(map)
      .bindPopup(`<b>${order.shop.name}</b><br/><a href="/home/restaurant/${order.shop.id || order.shopId || 1}" style="color:#2a6129;font-weight:700">ไปที่หน้าร้าน →</a>`)

    // Customer marker (yellow)
    const custIcon = L.divIcon({
      html: `<div style="background:#f0c419;color:#1a1f1a;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">📍</div>`,
      className: '', iconAnchor: [18, 18]
    })
    L.marker([order.customer.lat, order.customer.lng], { icon: custIcon })
      .addTo(map)
      .bindPopup(`<b>ที่อยู่จัดส่ง</b><br/>${order.customer.address}`)

    // Rider marker (animated)
    const riderIcon = L.divIcon({
      html: `<div style="background:#e65100;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid #fff;box-shadow:0 2px 12px rgba(230,81,0,.4)">🛵</div>`,
      className: '', iconAnchor: [20, 20]
    })
    const riderMarker = L.marker([order.rider.lat, order.rider.lng], { icon: riderIcon })
      .addTo(map)
      .bindPopup(`<b>${order.rider.name}</b><br/>${order.rider.vehicle}`)

    riderMarkerRef.current = riderMarker

    // Draw route (shop → rider → customer)
    L.polyline([
      [order.shop.lat, order.shop.lng],
      [order.rider.lat, order.rider.lng],
      [order.customer.lat, order.customer.lng],
    ], { color: '#2a6129', weight: 4, opacity: 0.7, dashArray: '8,4' }).addTo(map)

    mapInstanceRef.current = map
    setMapReady(true)

    // Poll rider position and update marker every 10s
    setInterval(async () => {
      try {
        const token = localStorage.getItem('bs_token')
        const res   = await fetch(`http://localhost/bitesync/api/rider/location.php?orderId=${params?.orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success && riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([data.lat, data.lng])
          map.panTo([data.lat, data.lng])
        }
      } catch {
        // simulate movement
        if (riderMarkerRef.current) {
          const pos = riderMarkerRef.current.getLatLng()
          const newPos = {
            lat: pos.lat + (Math.random() - 0.5) * 0.0004,
            lng: pos.lng + (Math.random() - 0.5) * 0.0004,
          }
          riderMarkerRef.current.setLatLng([newPos.lat, newPos.lng])
        }
      }
    }, 10000)
  }

  const step = order.currentStep

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <button onClick={() => router.push('/home')} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับหน้าหลัก
          </button>
          <button onClick={fetchOrder} className={styles.refreshBtn}>
            <i className="fa-solid fa-arrows-rotate" /> อัปเดตสถานะ
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Map toggle banner */}
        <div className={styles.mapBanner} onClick={() => setShowMap(v => !v)}>
          <span>🗺️ Track Order on Map</span>
          <span className={styles.mapToggle}>{showMap ? '▲ ซ่อนแผนที่' : '▼ ดูแผนที่'}</span>
        </div>

        {/* Leaflet Map */}
        {showMap && (
          <div className={styles.mapWrap}>
            <div ref={mapRef} className={styles.mapContainer}/>
            <div className={styles.mapLegend}>
              <span>🏪 ร้านค้า</span>
              <span>🛵 ไรเดอร์</span>
              <span>📍 ปลายทาง</span>
            </div>
          </div>
        )}

        <div className={styles.layout}>
          {/* LEFT */}
          <div className={styles.left}>
            <div className={styles.card}>
              <div className={styles.orderHdr}>
                <div>
                  <h2 className={styles.cardTitle}>Track Your Order</h2>
                  <div className={styles.orderId}>Order id: #{order.id}</div>
                  <div className={styles.orderTime}>📅 Order Placed: {order.date}</div>
                </div>
                <div className={styles.estSection}>
                  <div className={styles.estBadge}>
                    🕐 Arriving in {order.estimatedTime}
                  </div>
                  <div className={styles.estTime}>Est. Delivery: 23:55 น.</div>
                </div>
              </div>

              {/* Status steps */}
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

            {/* Rider info */}
            {step >= 3 && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Rider</h2>
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

          {/* RIGHT */}
          <div className={styles.right}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Your order</h2>
              {order.items.map((item, i) => (
                <div 
                  key={i} 
                  className={styles.item}
                  onClick={() => router.push(`/home/restaurant/${order.shop.id || order.shopId || 1}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.addons && item.addons.length > 0 && (
                      <div className={styles.itemAddons}>
                        {item.addons.map(a => `${a.name} x${a.qty || 1}`).join(', ')}
                      </div>
                    )}
                  </div>
                  <span className={styles.itemQty}>x{item.qty}</span>
                  <span className={styles.itemPrice}>{item.price * item.qty} THB</span>
                </div>
              ))}
              <div className={styles.divider}/>
              <div className={styles.item}>
                <span>ค่าจัดส่ง</span><span/><span>{order.deliveryFee} THB</span>
              </div>
              <div className={`${styles.item} ${styles.itemTotal}`}>
                <span>Total:</span><span/><span>{order.total} THB</span>
              </div>
              <button
                onClick={() => router.push(`/home/receipt/${order.id}`)}
                className={styles.receiptBtn}
              >
                Order Details →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
