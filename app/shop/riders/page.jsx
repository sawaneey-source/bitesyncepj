'use client'
import { useState, useEffect } from 'react'
import styles from './page.module.css'

const STATUS_STEPS = ['Order Received','Preparing Food','Waiting for Rider','Rider Assigned','Picked Up','Delivered']

const MOCK = [
  {
    OdrId: '#1025', customer: 'สมชาย ใจดี', phone: '081-234-5678',
    rider: { 
      name: 'อาร์ม', 
      phone: '096-456-9088', 
      img: 'https://i.pravatar.cc/150?u=arm', 
      distance: '0.3 km away',
      eta: '2 mins',
      vehicle: { plate: '1กข-1234', model: 'Honda Forza 350 (เทา)', type: 'Motorcycle' }
    },
    items: [
      { name: 'Backyard Biscuit Cake', qty: 1, price: 50 },
      { name: 'Our Island Dessert Shot', qty: 1, price: 180 },
      { name: 'Matcha Jelly', qty: 2, price: 75 },
    ],
    total: 310, step: 3,
    img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&q=80',
    createdAt: '14:20'
  },
  {
    OdrId: '#1026', customer: 'สมศรี มีสุข', phone: '082-345-6789',
    rider: { 
      name: 'นิว', 
      phone: '085-678-1234', 
      img: 'https://i.pravatar.cc/150?u=new', 
      distance: '1.2 km away',
      eta: '8 mins',
      vehicle: { plate: 'รย-999', model: 'Yamaha XMAX (ดำ)', type: 'Motorcycle' }
    },
    items: [
      { name: 'เค้กช็อกโกแลต', qty: 2, price: 90 },
      { name: 'ชาไทยเย็น', qty: 1, price: 55 },
    ],
    total: 235, step: 4,
    img: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&q=80',
    createdAt: '14:35'
  },
]

export default function RidersPage() {
  const [orders, setOrders] = useState(MOCK)
  const [selected, setSelected] = useState(null)
  const [toast, setToast] = useState(null)

  // useEffect(() => { fetchActiveJobs() }, [])

  function showToast(msg, type = 'ok') { setToast({ msg, type }); setTimeout(() => setToast(null), 2400) }

  async function fetchActiveJobs() {
    // In real app, we fetch from API. For now, we use MOCK for "Decoration"
    // fetch('http://localhost/bitesync/api/shop/active-jobs.php')...
  }

  const sel = orders.find(o => o.OdrId === selected)

  return (
    <div className={styles.page}>
      {toast && <div className={`${styles.toast} ${toast.type === 'err' ? styles.toastErr : styles.toastOk}`}>✅ {toast.msg}</div>}

      {!selected ? (
        <div className={styles.listView}>
          <div className={styles.hdr}>
            <div>
              <h1 className={styles.title}>การจัดส่งแบบเรียลไทม์</h1>
              <p className={styles.subtitle}>ติดตามสถานะไรเดอร์ที่กำลังมารับออเดอร์จากคุณ 🛵</p>
            </div>
            <button onClick={fetchActiveJobs} className={styles.refreshBtn}>
               <i className="fa-solid fa-rotate" /> รีเฟรช
            </button>
          </div>

          {orders.length === 0 ? (
            <div className={styles.empty}>
              <span>🛵</span>
              <span>ขณะนี้ยังไม่มีไรเดอร์รับงาน</span>
            </div>
          ) : (
            <div className={styles.list}>
              {orders.map(o => (
                <div key={o.OdrId} className={styles.jobCard} onClick={() => setSelected(o.OdrId)}>
                  <div className={styles.jobTop}>
                     <div className={styles.riderBrief}>
                        <div className={styles.riderAvatar}>
                           {o.rider.img ? <img src={o.rider.img} alt={o.rider.name} /> : o.rider.name[0]}
                        </div>
                        <div>
                           <div className={styles.riderName}>{o.rider.name}</div>
                           <div className={styles.riderVehicle}>{o.rider.vehicle.plate} • {o.rider.vehicle.type}</div>
                        </div>
                     </div>
                     <div className={styles.etaBadge}>
                        <i className="fa-solid fa-clock" /> {o.rider.eta}
                     </div>
                  </div>

                  <div className={styles.jobMiddle}>
                     <div className={styles.orderBrief}>
                        <span className={styles.orderLabel}>Order {o.OdrId}</span>
                        <span className={styles.orderTime}>{o.createdAt}</span>
                     </div>
                     <div className={styles.jobDist}>📍 {o.rider.distance} จากร้านคุณ</div>
                  </div>

                  <div className={styles.jobBottom}>
                     <div className={styles.statusSimple}>
                        <div className={styles.statusDotActive} />
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
        /* Detail view - Premium Redesign */
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

          <div className={styles.detailGrid}>
            <div className={styles.detailMain}>
              {/* Mockup Map */}
              <div className={styles.mapCard}>
                 <div className={styles.mapHeader}>
                    <div className={styles.mapTitle}><i className="fa-solid fa-map-location-dot" /> แผนที่การเดินทาง</div>
                    <div className={styles.distBadge}>{sel.rider.distance}</div>
                 </div>
                 <div className={styles.mapMockup}>
                    <div className={styles.mapOverlay}>
                       <div className={styles.mapPointerShop} style={{top: '40%', left: '30%'}}>🏪 ร้านคุณ</div>
                       <div className={styles.mapPointerRider} style={{top: '60%', left: '70%'}}>🛵 {sel.rider.name}</div>
                       <svg className={styles.mapPath} width="100%" height="100%">
                          <path d="M 100 120 Q 150 150 250 180" fill="none" stroke="#2a6129" strokeWidth="3" strokeDasharray="8,8" />
                       </svg>
                    </div>
                 </div>
              </div>

              {/* Rider Detailed Info */}
              <div className={styles.detailCard}>
                <div className={styles.cardHeaderSide}>
                   <h2 className={styles.cardTitle}>ข้อมูลไรเดอร์</h2>
                   <div className={styles.rating}><i className="fa-solid fa-star" /> 4.9 (200+)</div>
                </div>
                <div className={styles.riderFullRow}>
                  <div className={styles.riderAvatarLarge}>
                    <img src={sel.rider.img || "https://i.pravatar.cc/150"} alt="Rider" />
                  </div>
                  <div className={styles.riderDetails}>
                    <div className={styles.personName}>{sel.rider.name}</div>
                    <div className={styles.personPhone}>{sel.rider.phone}</div>
                    <div className={styles.vehicleInfo}>
                       <i className="fa-solid fa-motorcycle" /> {sel.rider.vehicle.model}
                       <span className={styles.plate}>{sel.rider.vehicle.plate}</span>
                    </div>
                  </div>
                  <div className={styles.quickActions}>
                     <button className={styles.actionBtnCall} onClick={() => window.open(`tel:${sel.rider.phone}`)}>
                        <i className="fa-solid fa-phone" /> โทร
                     </button>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>รายการอาหาร</h2>
                <div className={styles.itemsList}>
                  {sel.items.map((item, i) => (
                    <div key={i} className={styles.itemRow}>
                      <div className={styles.itemMain}>
                         <span className={styles.itemName}>{item.name}</span>
                         <span className={styles.itemQty}>x{item.qty}</span>
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
               {/* Order Timeline */}
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

              {/* Customer */}
              <div className={styles.detailCard}>
                <h2 className={styles.cardTitle}>ข้อมูลลูกค้า</h2>
                <div className={styles.customerRow}>
                  <div className={styles.customerIcon}><i className="fa-solid fa-user-tag" /></div>
                  <div>
                    <div className={styles.personName}>{sel.customer}</div>
                    <div className={styles.personPhone}>{sel.phone}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
