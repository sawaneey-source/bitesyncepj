'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './page.module.css'

const STATUS_STEPS = [
  'ได้รับคำสั่งซื้อแล้ว',
  'กำลังเตรียมอาหาร',
  'รอไรเดอร์มารับ',
  'ไรเดอร์รับงานแล้ว',
  'ไรเดอร์รับอาหารแล้ว',
  'จัดส่งสำเร็จ'
]

export default function RidersPage() {
  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ทั้งหมด')
  const initializingRef = useRef(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})

  useEffect(() => {
    fetchActiveJobs()
    const interval = setInterval(fetchActiveJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  // Map Initialization & Updates
  useEffect(() => {
    if (selected) {
      initMap();
      if (markersRef.current) markersRef.current.fitted = false;
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    }
  }, [selected])

  // Update markers
  useEffect(() => {
    if (selected && orders.length > 0) {
      const currentOrder = orders.find(o => o.OdrId === selected);
      if (currentOrder && currentOrder.step < 5 && mapInstanceRef.current) {
        updateMarkers();
      }
    }
  }, [orders, selected])

  async function initMap() {
    if (typeof window === 'undefined') return;
    if (mapInstanceRef.current) return;

    // Dynamic imports
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    // Wait for DOM to render the ref
    let retry = 0;
    while (!mapRef.current && retry < 10) {
      await new Promise(r => setTimeout(r, 100));
      retry++;
    }

    if (!mapRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([13.7563, 100.5018], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM'
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current.fitted = false;
    updateMarkers(L); // Pass L directly to ensure it is the imported one
  }

  function updateMarkers(L_arg) {
    const L = L_arg || window.L;
    const map = mapInstanceRef.current;
    if (!map || !L) return;

    const sel = orders.find(o => o.OdrId === selected);
    if (!sel) return;

    const points = [];

    const createIcon = (emoji, size = 60) => {
      const content = `<span style="font-size: ${size}px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); text-shadow: 0 0 4px white, 0 0 10px white; display: flex; align-items: center; justify-content: center;">${emoji}</span>`;

      const iconHtml = `<div style="width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
          ${content}
        </div>`;
      return L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
      });
    };

    // 1. Shop Marker
    if (sel.shop?.lat) {
      const pos = [sel.shop.lat, sel.shop.lng];
      if (!markersRef.current.shop) {
        markersRef.current.shop = L.marker(pos, { icon: createIcon('🏪') }).addTo(map).bindPopup("ร้านของคุณ");
      } else {
        markersRef.current.shop.setLatLng(pos);
        markersRef.current.shop.setIcon(createIcon('🏪'));
      }
      markersRef.current.shop.setZIndexOffset(100);
      points.push(pos);
    }

    // 2. Customer Marker
    if (sel.customer?.lat) {
      const pos = [sel.customer.lat, sel.customer.lng];
      if (!markersRef.current.cust) {
        markersRef.current.cust = L.marker(pos, { icon: createIcon('📍') }).addTo(map).bindPopup(`ลูกค้า: ${sel.customer.name}`);
      } else {
        markersRef.current.cust.setLatLng(pos);
      }
      markersRef.current.cust.setZIndexOffset(50);
      points.push(pos);
    }

    // 3. Rider Marker
    if (sel.rider?.lat) {
      const pos = [sel.rider.lat, sel.rider.lng];
      if (!markersRef.current.rider) {
        markersRef.current.rider = L.marker(pos, { icon: createIcon('🛵') }).addTo(map).bindPopup(`ไรเดอร์: ${sel.rider.name}`);
      } else {
        markersRef.current.rider.setLatLng(pos);
      }
      markersRef.current.rider.setZIndexOffset(1000); // 🛵 Always on top
      points.push(pos);
    }

    if (points.length > 0 && !markersRef.current.fitted) {
      map.fitBounds(points, { padding: [50, 50] });
      markersRef.current.fitted = true;
    }

    // 4. Update Route Line (OSRM)
    if (sel.rider?.lat) {
      updateRouteLine(L, map, sel);
    }
  }

  async function updateRouteLine(L, map, sel) {
    let dest = sel.customer;
    let color = '#2a6129';
    let isDashed = false;

    // If rider is coming to shop (step < 4)
    if (sel.step < 4 && sel.shop?.lat) {
      dest = sel.shop;
      color = '#e65100';
      isDashed = true;
    }

    if (!dest?.lat || !sel.rider?.lat) return;

    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${sel.rider.lng},${sel.rider.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        if (markersRef.current.route) map.removeLayer(markersRef.current.route);
        markersRef.current.route = L.polyline(coords, {
          color: color, weight: 5, opacity: 0.6, dashArray: isDashed ? '10, 10' : null, lineJoin: 'round'
        }).addTo(map);
      }
    } catch (e) {
      console.error("OSRM Route error:", e);
    }
  }

  function showToast(msg, type = 'ok') { setToast({ msg, type }); setTimeout(() => setToast(null), 2400) }

  async function fetchActiveJobs() {
    try {
      const uStr = localStorage.getItem('bs_user')
      if (!uStr) return
      const uid = JSON.parse(uStr).id
      const res = await fetch(`http://localhost/bitesync/api/shop/active-jobs.php?usrId=${uid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('bs_token')}` }
      })
      const data = await res.json()
      if (data.success) {
        setOrders(data.data)
      }
    } catch (e) {
      console.error("Fetch active jobs failed:", e)
    } finally {
      setLoading(false)
    }
  }

  const RIDER_TABS = ['ทั้งหมด', 'รอรับงาน', 'กำลังจัดส่ง', 'สำเร็จ']
  const getFilteredOrders = () => {
    if (tab === 'ทั้งหมด') return orders
    if (tab === 'รอรับงาน') return orders.filter(o => o.step < 3)
    if (tab === 'กำลังจัดส่ง') return orders.filter(o => o.step === 3 || o.step === 4)
    if (tab === 'สำเร็จ') return orders.filter(o => o.step === 5)
    return orders
  }

  const counts = RIDER_TABS.reduce((acc, t) => {
    if (t === 'ทั้งหมด') acc[t] = orders.length
    else if (t === 'รอรับงาน') acc[t] = orders.filter(o => o.step < 3).length
    else if (t === 'กำลังจัดส่ง') acc[t] = orders.filter(o => o.step === 3 || o.step === 4).length
    else if (t === 'สำเร็จ') acc[t] = orders.filter(o => o.step === 5).length
    return acc
  }, {})

  const filtered = getFilteredOrders()

  const sel = orders.find(o => o.OdrId === selected)

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${toast.type === 'err' ? styles.toastErr : styles.toastOk}`}>✅ {toast.msg}</div>}

      {!selected || !sel ? (
        <div className={styles.listView}>
          <div className={styles.hdr}>
            <div>
              <h1 className={styles.title}>ติดตามไรเดอร์</h1>
              <p className={styles.subtitle}>ติดตามสถานะไรเดอร์ที่กำลังมารับออเดอร์จากคุณ 🛵</p>
            </div>
            <button onClick={fetchActiveJobs} className={styles.refreshBtn}>
              <i className="fa-solid fa-rotate" /> รีเฟรช
            </button>
          </div>
          <div className={styles.tabs}>
            {RIDER_TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`${styles.tab} ${tab === t ? styles.tabOn : ''}`}>
                {t}
                {counts[t] > 0 && <span className={`${styles.cnt} ${tab === t ? styles.cntOn : ''}`}>{counts[t]}</span>}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <span>🛵</span>
              <span>ขณะนี้ยังไม่มีรายการในหมวดนี้</span>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map(o => (
                <div key={o.OdrId} className={styles.jobCard} onClick={() => setSelected(o.OdrId)}>
                  <div className={styles.jobTop}>
                    <div className={styles.riderBrief}>
                      <div className={styles.riderAvatar}>
                        {o.rider ? (o.rider.img ? <img src={o.rider.img} alt={o.rider.name} /> : o.rider.name[0]) : '⏳'}
                      </div>
                      <div>
                        <div className={styles.riderName}>{o.rider ? o.rider.name : 'กำลังจัดหาไรเดอร์...'}</div>
                        <div className={styles.riderVehicle}>
                          {o.rider && o.rider.vehicle.plate ? `${o.rider.vehicle.plate} • ${o.rider.vehicle.type}` : 'โปรดรอสักครู่'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.etaBadge}>
                      <i className="fa-solid fa-clock" /> {o.step === 5 ? 'ส่งสำเร็จแล้ว' : o.rider ? 'กำลังมา' : 'รอรับงาน'}
                    </div>
                  </div>

                  <div className={styles.jobMiddle}>
                    <div className={styles.orderBrief}>
                      <span className={styles.orderLabel}>Order {o.OdrId}</span>
                      <span className={styles.orderTime}>{o.createdAt}</span>
                    </div>
                    <div className={styles.jobDist}>
                      {o.rider ? `📍 ${o.rider.distance} จากร้านคุณ` : 'ยังไม่มีพิกัดไรเดอร์'}
                    </div>
                  </div>

                  <div className={styles.jobBottom}>
                    <div className={styles.statusSimple}>
                      <div className={o.step === 5 ? styles.statusDotSuccess : styles.statusDotActive} />
                      {STATUS_STEPS[o.step]}
                    </div>
                    <button className={styles.btnTrack}>ติดตามละเอียด <i className="fa-solid fa-chevron-right" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.detailView}>
          <div className={styles.hdrDetail}>
            <button onClick={() => setSelected(null)} className={styles.backBtn}>
              <i className="fa-solid fa-arrow-left" /> กลับไปรายการ
            </button>
            <div className={styles.orderTitleWrap}>
              <h1 className={styles.title}>Order {sel.OdrId}</h1>
              <span className={styles.statusBadgeGlobal}>{STATUS_STEPS[sel.step]}</span>
            </div>
          </div>

          {sel.step === 5 ? (
            <div className={styles.fullPageSuccess} style={{ position: 'relative', marginTop: '-20px', minHeight: '500px' }}>
              <div className={styles.successCard}>
                <div className={styles.checkedCircle}>✓</div>
                <h1 className={styles.successTitle}>ภารกิจเสร็จสมบูรณ์!</h1>
                <p className={styles.successSub}>
                  ออเดอร์ <strong>{sel.OdrId}</strong> จัดส่งถึงมือลูกค้าเรียบร้อยแล้ว<br />
                  ขอบคุณที่ร่วมเป็นส่วนหนึ่งในการส่งต่อความอร่อยครับ
                </p>
                <button className={styles.btnDone} onClick={() => setSelected(null)}>
                  ตกลง / กลับหน้าหลัก
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.detailGrid}>
            <div className={styles.detailMain}>
              {/* Real Map Container */}
              <div className={styles.mapCard}>
                <div className={styles.mapHeader}>
                  <div className={styles.mapTitle}><i className="fa-solid fa-map-location-dot" /> แผนที่การเดินทาง</div>
                  {sel.rider && <div className={styles.distBadge}>{sel.rider.distance}</div>}
                </div>
                <div className={styles.mapMockup}>
                  {!sel.rider && (
                    <div className={styles.mapSearching}>
                      <div className={styles.pulse} />
                      <span>กำลังค้นหาไรเดอร์...</span>
                    </div>
                  )}
                  <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>

              <div className={styles.detailCard}>
                <div className={styles.cardHeaderSide}>
                  <h2 className={styles.cardTitle}>ข้อมูลไรเดอร์</h2>
                  {sel.rider && <div className={styles.rating}><i className="fa-solid fa-star" /> {sel.rider.rating.toFixed(1)}</div>}
                </div>
                {sel.rider ? (
                  <div className={styles.riderFullRow}>
                    <div className={styles.riderAvatarLarge}>
                      <img src={sel.rider.img || "https://i.pravatar.cc/150"} alt="Rider" />
                    </div>
                    <div className={styles.riderDetails}>
                      <div className={styles.personName}>{sel.rider.name}</div>
                      <div className={styles.personPhone}>{sel.rider.phone}</div>
                      <div className={styles.vehicleInfo}>
                        <i className="fa-solid fa-motorcycle" /> {sel.rider.vehicle.type}
                        <span className={styles.plate}>{sel.rider.vehicle.plate}</span>
                      </div>
                    </div>
                    <div className={styles.quickActions}>
                      <button className={styles.actionBtnCall} onClick={() => window.open(`tel:${sel.rider.phone}`)}>
                        <i className="fa-solid fa-phone" /> โทร
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.noRiderBox}>
                    <p>ยังไม่มีไรเดอร์รับงานนี้ ระบบกำลังค้นหาไรเดอร์ที่ใกล้ที่สุด...</p>
                  </div>
                )}
              </div>

              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>รายการอาหาร</h2>
                <div className={styles.itemsList}>
                  <h3>📦 รายการอาหาร</h3>
                  {sel.items.map((item, i) => (
                    <div key={i} className={styles.itemRow}>
                      <div className={styles.itemMain}>
                        {item.img ? (
                          <img src={item.img} className={styles.itemImg} alt={item.name} />
                        ) : (
                          <div className={styles.itemNoImg}>🍴</div>
                        )}
                        <div>
                          <span className={styles.itemName}>{item.name}</span>
                          <span className={styles.itemQty}>x{item.qty}</span>
                        </div>
                      </div>
                      <span className={styles.itemPrice}>{item.price * item.qty} ฿</span>
                    </div>
                  ))}
                  <div className={styles.totalDivider} />
                  <div className={styles.totalRowWrap}>
                    <span>ยอดรวมสุทธิ</span>
                    <span className={styles.totalVal}>{sel.total} ฿</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.detailSidebar}>
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>ลำดับเหตุการณ์</h2>
                <div className={styles.timeline}>
                  {STATUS_STEPS.map((s, i) => {
                    const done = i < sel.step
                    const current = i === sel.step
                    return (
                      <div key={s} className={`${styles.timelineItem} ${done ? styles.tlDone : ''} ${current ? styles.tlCurrent : ''}`}>
                        <div className={styles.tlIndicator}>
                          <div className={styles.tlCircle}>{done ? '✓' : (i + 1)}</div>
                          {i < STATUS_STEPS.length - 1 && <div className={styles.tlLine} />}
                        </div>
                        <div className={styles.tlContent}>
                          <div className={styles.tlLabel}>{s}</div>
                          {current && <div className={styles.tlTime}>กำลังดำเนินการ...</div>}
                          {done && <div className={styles.tlTime}>เรียบร้อยแล้ว</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>ข้อมูลลูกค้า</h2>
                <div className={styles.customerRow}>
                  <div className={styles.customerAvatar}>
                    {sel.customer.image ? (
                      <img src={sel.customer.image} alt="Customer" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div>
                    <div className={styles.personName}>{sel.customer.name}</div>
                    <div className={styles.personPhone}>{sel.customer.phone}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </div>
  )
}

