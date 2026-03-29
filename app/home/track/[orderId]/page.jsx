'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './page.module.css'
import Navbar from '@/components/Navbar'
import PremiumModal from '@/components/PremiumModal'

const STEPS = [
  { key: 'received', label: 'รอทางร้านรับออเดอร์', icon: '📋' },
  { key: 'preparing', label: 'กำลังเตรียมอาหาร', icon: '👨‍🍳' },
  { key: 'waiting', label: 'รอไรเดอร์มารับ', icon: '⏳' },
  { key: 'assigned', label: 'จัดหาไรเดอร์แล้ว', icon: '🛵' },
  { key: 'pickup', label: 'รับอาหารแล้ว', icon: '📦' },
  { key: 'delivered', label: 'จัดส่งเรียบร้อย', icon: '🏁' },
]

export default function TrackPage() {
  const isValid = (loc) => loc && typeof loc.lat === 'number' && loc.lat !== 0 && !isNaN(loc.lat) && typeof loc.lng === 'number' && loc.lng !== 0 && !isNaN(loc.lng)

  const router = useRouter()
  const params = useParams()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const riderMarkerRef = useRef(null)
  const shopMarkerRef = useRef(null)
  const customerMarkerRef = useRef(null)
  const routePolylineRef = useRef(null)

  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [user, setUser] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const initializingRef = useRef(false)

  // Premium Modal State
  const [modal, setModal] = useState({ 
    open: false, 
    title: '', 
    description: '', 
    type: 'confirm', 
    icon: '💡',
    onConfirm: null,
    confirmText: 'ตกลง'
  })

  const openModal = (config) => {
    setModal(prev => ({ ...prev, ...config, open: true }))
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, open: false }))
  }

  useEffect(() => {
    const u = localStorage.getItem('bs_user')
    if (!u) {
      router.replace('/login')
      return
    }
    setUser(JSON.parse(u))

    fetchOrder()
    const interval = setInterval(fetchOrder, 2000)
    return () => clearInterval(interval)
  }, [router, params?.orderId])

  useEffect(() => {
    if (!showMap || mapInstanceRef.current || !order) return
    initMap()
  }, [showMap, order])

  // Live Marker & Route Update
  // Map Marker & Route Synchronization
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !order) return

    const syncMap = async () => {
      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current
      const bounds = []

      const createIcon = (emoji, size = 60) => {
        const content = `<span style="font-size: ${size}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); text-shadow: 0 0 4px white, 0 0 10px white; display: flex;">${emoji}</span>`;
        return L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">${content}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2]
        });
      };

      // 1. Rider Marker - 🛵
      if (order.rider && isValid(order.rider)) {
        if (!riderMarkerRef.current) {
          riderMarkerRef.current = L.marker([order.rider.lat, order.rider.lng], { icon: createIcon('🛵') }).addTo(map)
          riderMarkerRef.current.bindPopup(`<b>ผู้ส่ง: ${order.rider.name}</b>`)
        } else {
          riderMarkerRef.current.setLatLng([order.rider.lat, order.rider.lng])
          riderMarkerRef.current.setIcon(createIcon('🛵'))
        }
        riderMarkerRef.current.setZIndexOffset(1000); // 🛵 Always on top
        bounds.push([order.rider.lat, order.rider.lng])
      }

      // 2. Shop Marker - 🏪
      if (order.shop && isValid(order.shop)) {
        if (!shopMarkerRef.current) {
          shopMarkerRef.current = L.marker([order.shop.lat, order.shop.lng], { icon: createIcon('🏪') }).addTo(map)
          shopMarkerRef.current.bindPopup(`<b>ร้านค้า: ${order.shop.name}</b>`)
        } else {
          shopMarkerRef.current.setLatLng([order.shop.lat, order.shop.lng])
          shopMarkerRef.current.setIcon(createIcon('🏪'))
        }
        shopMarkerRef.current.setZIndexOffset(100);
        bounds.push([order.shop.lat, order.shop.lng])
      }

      // 3. Customer Marker - 📍
      if (order.customer && isValid(order.customer)) {
        if (!customerMarkerRef.current) {
          customerMarkerRef.current = L.marker([order.customer.lat, order.customer.lng], { icon: createIcon('📍') }).addTo(map)
          customerMarkerRef.current.bindPopup(`<b>ที่อยู่ของคุณ</b>`)
        } else {
          customerMarkerRef.current.setLatLng([order.customer.lat, order.customer.lng])
          customerMarkerRef.current.setIcon(createIcon('📍'))
        }
        customerMarkerRef.current.setZIndexOffset(50);
        bounds.push([order.customer.lat, order.customer.lng])
      }

      // 4. Update Route Line
      if (isValid(order.rider)) {
        let dest = order.customer
        let color = '#00b14f'
        let isDashed = false

        if (order.currentStep <= 3 && isValid(order.shop)) {
          dest = order.shop
          color = '#f39c12'
          isDashed = true
        }

        if (isValid(dest)) {
          try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${order.rider.lng},${order.rider.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`)
            const data = await res.json()
            if (data.routes && data.routes.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]])
              if (routePolylineRef.current) map.removeLayer(routePolylineRef.current)
              routePolylineRef.current = L.polyline(coords, {
                color: color, weight: 6, opacity: 0.6, dashArray: isDashed ? '10, 10' : null, lineJoin: 'round'
              }).addTo(map)
            }
          } catch (e) {
            console.error("Route update error:", e)
          }
        }
      }
    }

    syncMap()
  }, [mapReady, order?.rider?.lat, order?.rider?.lng, order?.customer?.lat, order?.customer?.lng, order?.currentStep])

  async function fetchOrder() {
    try {
      const token = localStorage.getItem('bs_token')
      const res = await fetch(`http://localhost/bitesync/api/customer/orders.php?id=${params?.orderId}&t=${Date.now()}`, {
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

        if (status === 7) {
          localStorage.removeItem('bs_last_order')
        }

        // Normalize data structure for frontend
        setOrder({
          id: d.OdrId,
          currentStep: d.currentStep,
          shopPrepTime: parseInt(d.ShopPrepTime || 15),
          maxPrepTime: parseInt(d.MaxPrepTime || 0),
          distance: parseFloat(d.OdrDistance || 0),
          date: d.OdrCreatedAt,
          total: d.OdrGrandTotal,
          deliveryFee: d.OdrDelFee,
          shop: {
            id: d.ShopId,
            name: d.ShopName,
            lat: (d.ShopLat && parseFloat(d.ShopLat) !== 0) ? parseFloat(d.ShopLat) : 0,
            lng: (d.ShopLng && parseFloat(d.ShopLng) !== 0) ? parseFloat(d.ShopLng) : 0
          },
          customer: {
            id: d.UsrId,
            name: d.CustName || 'คุณลูกค้า',
            address: [
              d.HouseNo,
              d.Moo && `ม.${d.Moo}`,
              d.Village && `หมู่บ้าน${d.Village}`,
              d.Soi && `ซ.${d.Soi}`,
              d.Road && `ถ.${d.Road}`,
              d.SubDistrict && `ต.${d.SubDistrict}`,
              d.District && `อ.${d.District}`,
              d.Province && `จ.${d.Province}`,
              d.Zipcode
            ].filter(Boolean).join(' '),
            lat: (d.AdrLat && parseFloat(d.AdrLat) !== 0) ? parseFloat(d.AdrLat) : 0,
            lng: (d.AdrLng && parseFloat(d.AdrLng) !== 0) ? parseFloat(d.AdrLng) : 0
          },
          rider: d.RiderId ? {
            name: d.RiderName,
            phone: d.RiderPhone,
            vehicle: d.RiderVehicleType || 'รถจักรยานยนต์',
            plate: d.RiderVehiclePlate || '-',
            lat: (d.RiderLat && parseFloat(d.RiderLat) !== 0) ? parseFloat(d.RiderLat) : (parseFloat(d.ShopLat) || 0),
            lng: (d.RiderLng && parseFloat(d.RiderLng) !== 0) ? parseFloat(d.RiderLng) : (parseFloat(d.ShopLng) || 0)
          } : null,
          RiderImage: d.RiderImage,
          ShopLogo: d.ShopLogo,
          items: d.items,
          note: d.OdrNote,
          OdrRefundStatus: d.OdrRefundStatus,
          OdrRefundSlip: d.OdrRefundSlip
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

  function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function calculateETA() {
    if (!order) return '...';

    // Average driving speed 30km/h -> 2m/km + buffer
    const driveSpeedMinPerKm = 2.5;
    const buffer = 5;

    let totalMin = 0;
    const status = order.currentStep;

    if (status <= 2) {
      // Preparing: Use Max of items or Shop default
      const pTime = order.maxPrepTime || order.shopPrepTime;
      totalMin = pTime + (order.distance * driveSpeedMinPerKm) + buffer;
    } else if (status === 3 || status === 4) {
      // Ready/Assigned: Wait for Pickup + Drive (Shop->Cust)
      totalMin = (order.distance * driveSpeedMinPerKm) + buffer + 2;
    } else if (status === 5) {
      // Delivering: Drive (Rider->Cust)
      if (order.rider && isValid(order.rider)) {
        const distToCust = getDistance(order.rider.lat, order.rider.lng, order.customer.lat, order.customer.lng);
        totalMin = (distToCust * driveSpeedMinPerKm) + 3;
      } else {
        totalMin = (order.distance * driveSpeedMinPerKm) + 2;
      }
    }

    const min = Math.max(5, Math.ceil(totalMin));
    return `${min}-${min + 10} นาที`;
  }

  async function initMap() {
    if (!order || !mapRef.current || mapInstanceRef.current || initializingRef.current) return
    initializingRef.current = true
    try {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (!mapRef.current || mapInstanceRef.current) return

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Default center: Hat Yai
      let centerLat = 6.9847, centerLng = 100.4748
      if (isValid(order.shop)) {
        centerLat = order.shop.lat; centerLng = order.shop.lng
      } else if (isValid(order.customer)) {
        centerLat = order.customer.lat; centerLng = order.customer.lng
      }

      const map = L.map(mapRef.current).setView([centerLat, centerLng], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      const bounds = []
      if (isValid(order.shop)) bounds.push([order.shop.lat, order.shop.lng])
      if (isValid(order.customer)) bounds.push([order.customer.lat, order.customer.lng])
      if (order.rider && isValid(order.rider)) bounds.push([order.rider.lat, order.rider.lng])

      if (bounds.length > 0) {
        if (bounds.length === 1) {
          map.setView(bounds[0], 15)
        } else {
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      }

      mapInstanceRef.current = map
      setMapReady(true)
    } finally {
      initializingRef.current = false
    }
  }

  if (error) return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.body}>
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}>📦</span>
          <h2 className={styles.emptyTitle}>ไม่พบข้อมูลออเดอร์นี้ในระบบ</h2>
          <p className={styles.emptyText}>
            ขออภัยครับ ออเดอร์หมายเลข #{params?.orderId} อาจถูกยกเลิก ลบออกไปแล้ว หรือลิงก์ไม่ถูกต้อง <br />
            กรุณาตรวจสอบอีกครั้งในหน้าประวัติ หรือกลับไปเลือกสั่งอาหารใหม่ครับ
          </p>
          <button onClick={() => router.push('/home')} className={styles.shopNowBtn}>
            กลับหน้าหลักเพื่อเลือกสั่งอาหาร
          </button>
        </div>
      </div>
    </div>
  )

  if (!order) return <div className={styles.loading}>กำลังโหลดข้อมูล...</div>

  const step = order.currentStep

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
          <div className={styles.navTitle}>ติดตามออเดอร์ #{order.id}</div>
        </div>
      </div>

      <div className={styles.body}>
        {order.currentStep !== -1 && (
          <div className={styles.mapBanner} onClick={() => setShowMap(v => !v)}>
            <span>🗺️ ติดตามบนแผนที่</span>
            <span className={styles.mapToggle}>{showMap ? '▲ ซ่อนแผนที่' : '▼ ดูแผนที่'}</span>
          </div>
        )}

        {showMap && (
          <div className={styles.mapWrap}>
            <div ref={mapRef} className={styles.mapContainer} />
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
                {order.currentStep !== -1 && (
                  <div className={styles.estSection}>
                    <div className={styles.estBadge}>🕐 คาดว่าจะถึงใน {calculateETA()}</div>
                  </div>
                )}
              </div>

              {step === 0 && (
                <div className={styles.cancelSection}>
                  <p className={styles.cancelHint}>* คุณสามารถยกเลิกออเดอร์ได้ก่อนที่ร้านค้าจะเริ่มเตรียมอาหาร</p>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                        openModal({
                            title: 'ยืนยันการยกเลิก?',
                            description: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกออเดอร์นี้? รายการอาหารที่คุณรอคอยจะถูกระงับทันทีครับ',
                            icon: '❌',
                            type: 'confirm',
                            confirmText: 'ยืนยันยกเลิก',
                            onConfirm: async () => {
                                closeModal();
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
                                        openModal({
                                            title: 'สำเร็จ ✨',
                                            description: 'ยกเลิกออเดอร์เรียบร้อยแล้วครับ ระบบได้แจ้งทางร้านค้าให้ทราบแล้ว',
                                            type: 'success',
                                            icon: '✅',
                                            onConfirm: () => { closeModal(); fetchOrder(); }
                                        });
                                    } else {
                                        openModal({
                                            title: 'ยกเลิกไม่สำเร็จ',
                                            description: data.message || 'เกิดข้อผิดพลาดในการยกเลิก กรุณาลองใหม่อีกครั้ง',
                                            type: 'alert',
                                            icon: '⚠️'
                                        });
                                    }
                                } catch (e) {
                                    openModal({
                                        title: 'เกิดข้อผิดพลาด',
                                        description: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ในขณะนี้',
                                        type: 'alert',
                                        icon: '🚫'
                                    });
                                }
                            }
                        });
                    }}
                  >
                    ❌ ยกเลิกออเดอร์นี้
                  </button>
                </div>
              )}

              <div className={styles.steps}>
                {(order.currentStep === -1) ? (
                  <div className={styles.cancelledCard}>
                    <div className={styles.cancelledTitle}>❌ ออเดอร์ของคุณถูกยกเลิกแล้ว</div>
                    <div className={styles.cancelledDivider} />
                    <p className={styles.cancelledText}>
                      ออเดอร์หมายเลข #{order.id} ถูกยกเลิกโดยร้านค้า หรือคุณเป็นคนยกเลิกเอง 
                    </p>
                    
                    {order.OdrRefundStatus > 0 && (
                      <div className={styles.trackRefundInfo}>
                        {order.OdrRefundStatus == 1 ? (
                          <div className={styles.refundBoxPending}>
                            <div className={styles.refundIcon}>⏳</div>
                            <div>
                              <div className={styles.refundTitle}>กำลังดำเนินการคืนเงิน</div>
                              <div className={styles.refundDesc}>เจ้าหน้าที่ได้รับเรื่องแล้ว กำลังตรวจสอบคิวโอนเงินคืนให้ท่านครับ</div>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.refundBoxSuccess}>
                            <div className={styles.refundIcon}>✅</div>
                            <div>
                              <div className={styles.refundTitle}>คืนเงินสำเร็จแล้ว</div>
                              <div className={styles.refundDesc}>โอนเงินเข้าบัญชีที่ท่านระบุเรียบร้อยแล้วครับ</div>
                              {order.OdrRefundSlip && (
                                <a 
                                  href={`http://localhost/bitesync/public${order.OdrRefundSlip}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={styles.viewSlipBtn}
                                >
                                  📄 คลิกดูหลักฐานการโอน
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className={styles.cancelledHint}>
                      หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อฝ่ายสนับสนุนลูกค้าได้ตลอด 24 ชม.
                    </p>
                    
                    <button onClick={() => router.push('/home')} className={styles.backHomeBtn}>
                      กลับหน้าหลักเพื่อสั่งอาหารใหม่
                    </button>
                  </div>
                ) : STEPS.map((s, i) => {
                  const done = i < step
                  const current = i === step
                  return (
                    <div key={s.key} className={styles.stepRow}>
                      <div className={styles.stepLeft}>
                        <div className={`${styles.stepCircle} ${done || current ? styles.stepDone : ''} ${current ? styles.stepCurrent : ''}`}>
                          {done ? '✓' : s.icon}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />
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

            {order.rider && order.currentStep !== -1 && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>ข้อมูลคนขับ</h2>
                <div className={styles.riderRow}>
                  <div className={styles.riderAvatar}>
                    {order.RiderImage ? (
                      <img 
                        src={order.RiderImage} 
                        alt="Rider" 
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      order.rider.name[0]
                    )}
                  </div>
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
                  <span className={styles.itemPrice}>{Math.round(item.price * item.qty).toLocaleString()} ฿</span>
                </div>
              ))}
              <div className={styles.divider} />
              <div className={styles.item}>
                <span>ค่าจัดส่ง</span><span>{order.deliveryFee} THB</span>
              </div>
              <div className={`${styles.item} ${styles.itemTotal}`}>
                <span>ยอดรวมทั้งหมด:</span><span>{order.total} THB</span>
              </div>
              
              {order.note && (
                <div className={styles.jobNote}>
                  <span>📝 โน้ตของคุณ:</span> {order.note}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PremiumModal 
        isOpen={modal.open}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        icon={modal.icon}
        confirmText={modal.confirmText}
      />
    </div>
  )
}

