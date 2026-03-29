'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import Logo from '@/components/Logo'
import { PUBLIC_URL } from '@/utils/api'
import PremiumModal from '@/components/PremiumModal'

// --- PromptPay QR Logic ---
const crc16 = (data) => {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const generatePromptPayPayload = (id, amount) => {
  let target = id.replace(/[^0-9]/g, "");
  let payload = "000201010212"; 
  if (target.length === 10) {
    target = "0066" + target.substring(1);
    payload += "29370016A000000677010111" + "0113" + target;
  } else {
    payload += "29370016A000000677010111" + "02" + target.length.toString().padStart(2, '0') + target;
  }
  payload += "53037645802TH";
  if (amount) {
    const amountStr = parseFloat(amount).toFixed(2);
    payload += "54" + amountStr.length.toString().padStart(2, '0') + amountStr;
  }
  payload += "6304";
  payload += crc16(payload);
  return payload;
};


export default function CheckoutPage() {
  const router  = useRouter()
  const [cart, setCart]       = useState([])
  const [shopLoc, setShopLoc] = useState(null)
  const [deliveryFee, setDeliveryFee] = useState(20)
  const [address, setAddress] = useState('')
  const [noteShop, setNoteShop] = useState('')
  const [step, setStep]       = useState(1) // 1=review, 2=payment QR
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [user, setUser]       = useState(null)
  const [lastOrder, setLastOrder]       = useState(null)
  const [isShopOpen, setIsShopOpen]     = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const [finalTotal, setFinalTotal]     = useState(0)
  
  // Payment states
  const [pmtMethod, setPmtMethod]     = useState('qr') // 'qr' or 'bank'
  const [pmtSettings, setPmtSettings] = useState(null)
  const [verifying, setVerifying]     = useState(false)
  const [slipFile, setSlipFile]       = useState(null)
  const searchParams = useSearchParams()
  const existingOrderIdParam = searchParams.get('id')
  
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

  // Address states
  const [provinces, setProvinces] = useState([])
  const [selProvince, setSelProvince] = useState('')
  const [selAmphure, setSelAmphure] = useState('')
  const [selTambon, setSelTambon] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [houseNo, setHouseNo] = useState('')
  const [village, setVillage] = useState('')
  const [road, setRoad] = useState('')
  const [soi, setSoi] = useState('')
  const [moo, setMoo] = useState('')
  const [adrLat, setAdrLat] = useState(7.0085)
  const [adrLng, setAdrLng] = useState(100.4734)
  const [mapReady, setMapReady] = useState(false)
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    const syncState = () => {
      const u = localStorage.getItem('bs_user')
      if (u) setUser(JSON.parse(u))
      else setUser(null)

      const cartItems = JSON.parse(localStorage.getItem('bs_cart') || '[]')
      setCart(cartItems)
      
      setLastOrder(localStorage.getItem('bs_last_order') || null)
    }

    syncState()
    const interval = setInterval(syncState, 2000)
    window.addEventListener('storage', syncState)

    // Initial data fetch (Address, Shop info, Provinces)
    const initData = async () => {
      const cartItems = JSON.parse(localStorage.getItem('bs_cart') || '[]')
      if (cartItems.length > 0) {
        const sId = cartItems[0].shopId || cartItems[0].ShopId
        fetch(`http://localhost/bitesync/api/shop/profile.php?shopId=${sId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setShopLoc({ lat: parseFloat(data.data.AdrLat), lng: parseFloat(data.data.AdrLng) })
              setIsShopOpen(parseInt(data.data.ShopStatus) === 1)
            }
          })
      }

      const u = localStorage.getItem('bs_user')
      if (u) {
        const userData = JSON.parse(u)
        if (userData.role === 'restaurant' || userData.role === 'shop') {
          router.replace('/shop')
          return
        } else if (userData.role === 'rider') {
          router.replace('/rider')
          return
        } else if (userData.role === 'admin') {
          router.replace('/admin/dashboard')
          return
        }
        
        // 1. Fetch Persistent Default Address from DB (Primary Source)
        fetch(`http://localhost/bitesync/api/customer/address.php?usrId=${userData.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              const a = data.data
              setAdrLat(parseFloat(a.AdrLat))
              setAdrLng(parseFloat(a.AdrLng))
              setHouseNo(a.HouseNo || '')
              setVillage(a.Village || '')
              setRoad(a.Road || '')
              setSoi(a.Soi || '')
              setMoo(a.Moo || '')
              setSelProvince(a.Province || '')
              setSelAmphure(a.District || '')
              setSelTambon(a.SubDistrict || '')
              setZipcode(a.Zipcode || '')
              const full = `${a.HouseNo || ''} ${a.SubDistrict || ''} ${a.District || ''} ${a.Province || ''}`.trim()
              setAddress(full)
              
              if (mapInstanceRef.current && markerRef.current) {
                mapInstanceRef.current.setView([a.AdrLat, a.AdrLng], 16)
                markerRef.current.setLatLng([a.AdrLat, a.AdrLng])
              }
              updateDeliveryFee(a.AdrLat, a.AdrLng)
              initMap(parseFloat(a.AdrLat), parseFloat(a.AdrLng), true)
            } else {
              const saved = localStorage.getItem('bs_address_full')
              if (saved) {
                const s = JSON.parse(saved)
                setSelProvince(s.province || '')
                setSelAmphure(s.amphure || '')
                setSelTambon(s.tambon || '')
                setZipcode(s.zip || '')
                setHouseNo(s.houseNo || '')
                setVillage(s.village || '')
                setRoad(s.road || '')
                setSoi(s.soi || '')
                setMoo(s.moo || '')
                setAddress(s.full || '')
                setAdrLat(s.lat || 7.0085)
                setAdrLng(s.lng || 100.4734)
                initMap(s.lat || 7.0085, s.lng || 100.4734, false)
              } else {
                initMap(7.0085, 100.4734, false, true)
              }
            }
          })
      } else {
        router.replace('/login')
        return
      }

      fetch('http://localhost/bitesync/api/home/thai_address.php')
        .then(res => res.json())
        .then(data => setProvinces(data))
        .catch(err => console.error("Province fetch failed", err))
    }

    initData()

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', syncState)
    }
  }, [router])

  // Fetch payment settings (and platform fee) on mount
  useEffect(() => {
    fetch('http://localhost/bitesync/api/customer/get-settings.php')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPmtSettings(data.data)
      })
      .catch(err => console.error("Settings fetch failed", err))
  }, [])

  // NEW: Live Sync Payment Method to DB
  useEffect(() => {
    if (orderId && step === 2) {
      const syncMethod = async () => {
        try {
          await fetch('http://localhost/bitesync/api/customer/update-payment-method.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, method: pmtMethod })
          });
        } catch (e) {}
      };
      syncMethod();
    }
  }, [pmtMethod, orderId, step]);

  // New Effect for Loading Existing Order from URL
  useEffect(() => {
    if (existingOrderIdParam) {
      loadExistingOrder(existingOrderIdParam)
    }
  }, [existingOrderIdParam])

  async function loadExistingOrder(id) {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost/bitesync/api/customer/orders.php?id=${id}`)
      const d = await res.json()
      if (d.success && d.data) {
        const order = d.data
        if (Number(order.OdrStatus) === 1) { // Only if Unpaid
          setOrderId(order.OdrId)
          if (order.items) setCart(order.items)
          setDeliveryFee(parseFloat(order.OdrDelFee || 0))
          setNoteShop(order.OdrNote || '')
          setAddress(`${order.HouseNo || ''} ${order.SubDistrict || ''} ${order.District || ''} ${order.Province || ''}`.trim())
          
          // Set final total for payment screen if already unpaid
          setFinalTotal(parseFloat(order.OdrGrandTotal || 0))
          setStep(2) // Jump to Payment Page
        } else {
          openModal({
            title: 'ออเดอร์ไม่ถูกต้อง',
            description: 'ออเดอร์นี้ไม่สามารถชำระเงินได้ หรือได้รับการจัดการไปแล้วครับ',
            type: 'alert',
            icon: '⚠️',
            onConfirm: () => router.replace('/profile')
          })
        }
      }
    } catch (e) {
      console.error("Load order error:", e)
    }
    setLoading(false)
  }

  // Reactively update delivery fee
  useEffect(() => {
    if (shopLoc && adrLat && adrLng) {
        updateDeliveryFee(adrLat, adrLng);
    }
  }, [shopLoc, adrLat, adrLng]);

  const reverseGeocode = async (lat, lng) => {
    try {
      // Force fetch if provinces empty (safety-first approach)
      let currentProvinces = provinces;
      if (currentProvinces.length === 0) {
        const res = await fetch('http://localhost/bitesync/api/home/thai_address.php');
        currentProvinces = await res.json();
        setProvinces(currentProvinces);
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`
      );
      const data = await response.json();
      const address = data.address;

      if (address) {
        let matchedProvince = null;
        let matchedAmphure = null;
        let matchedTambon = null;

        // 1. Match Province
        const provName = (address.province || "").replace("จังหวัด", "").trim();
        const province = currentProvinces.find((p) => {
          const localName = (p.name_th || "").replace("จังหวัด", "").trim();
          return localName === provName || localName.includes(provName) || provName.includes(localName);
        });

        if (province) {
          matchedProvince = province.name_th;

          // 2. Match District (Amphure)
          const dTarget = [
            address.amphoe,
            address.district,
            address.county,
            address.city,
            address.town,
            address.municipality
          ].filter(Boolean).map(s => s.replace("อำเภอ", "").trim());

          let amphure = province.amphure.find((a) => {
            const cleanA = a.name_th.replace("อำเภอ", "").trim();
            return dTarget.some(t => t.includes(cleanA) || cleanA.includes(t));
          });

          if (amphure) {
            matchedAmphure = amphure.name_th;

            // 3. Match Sub-district (Tambon)
            const sTarget = [
              address.subdistrict,
              address.tambon,
              address.locality,
              address.suburb,
              address.neighbourhood,
              address.hamlet
            ].filter(Boolean).map(s => s.replace("ตำบล", "").trim());

            const tambon = amphure.tambon.find((t) => {
              const cleanT = t.name.replace("ตำบล", "").trim();
              return sTarget.some(st => st.includes(cleanT) || cleanT.includes(st));
            });

            if (tambon) {
              matchedTambon = tambon.name;
            }
          } else {
            // FALLBACK: Search ALL Tambons in ALL Amphures of this Province
            // This is useful if Nominatim gives us a Tambon name but doesn't give us the Amphure name
            console.log("Amphure match failed. Attempting global Tambon search within province...");
            const allTargets = [...dTarget, 
              address.subdistrict, address.tambon, address.locality, address.suburb, address.neighbourhood, address.hamlet
            ].filter(Boolean).map(s => s.replace("ตำบล", "").replace("อำเภอ", "").trim());

            for (const a of province.amphure) {
              const tMatch = a.tambon.find(t => {
                const cleanT = t.name.replace("ตำบล", "").trim();
                return allTargets.some(target => target.includes(cleanT) || cleanT.includes(target));
              });
              if (tMatch) {
                matchedAmphure = a.name_th;
                matchedTambon = tMatch.name;
                console.log("Global Search Match Found!", { matchedAmphure, matchedTambon });
                break;
              }
            }
          }
        }

        console.log("Auto-filled Address:", { matchedProvince, matchedAmphure, matchedTambon });

        setSelProvince(matchedProvince || "");
        setSelAmphure(matchedAmphure || "");
        setSelTambon(matchedTambon || "");
        setZipcode(
          matchedTambon
            ? province.amphure
                .find((a) => a.name_th === matchedAmphure)
                ?.tambon.find((t) => t.name === matchedTambon)?.zip || ""
            : ""
        );
        
        // Set House, Road, Village (Reset if not found, keep if found)
        const newHouseNo = address.house_number || ''
        const newRoad = address.road || ''
        const newVillage = address.neighbourhood || address.suburb || address.village || ''
        
        setHouseNo(newHouseNo);
        setRoad(newRoad);
        setVillage(newVillage);
        setSoi(''); 
        setMoo('');
        
        updateFullAddress(
            newHouseNo,
            newVillage,
            newRoad,
            '', 
            '', 
            matchedTambon || "",
            matchedAmphure || "",
            matchedProvince || "",
            zipcode
        );
      }
    } catch (e) {
      console.error("Geocoding error:", e);
    }
  };

  // Manual save logic (Wait for user confirmation)

  async function saveAddressToDB() {
    if (!user || adrLat === 7.0085) return // Don't save default Hat Yai start
    try {
      await fetch('http://localhost/bitesync/api/customer/address.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usrId: user.id,
          lat: adrLat,
          lng: adrLng,
          houseNo, village, road,
          subDistrict: selTambon,
          district: selAmphure,
          province: selProvince,
          zipcode
        })
      })
    } catch (e) {
      console.error("Save address error:", e)
    }
  }
  async function forwardGeocode(p, a, t) {
    if (!p || !a || !t) return
    try {
      const query = `${t}, ${a}, ${p}, Thailand`
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setAdrLat(parseFloat(lat).toFixed(7));
        setAdrLng(parseFloat(lon).toFixed(7));
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          markerRef.current.setLatLng([lat, lon]);
        }
        updateDeliveryFee(lat, lon);
      }
    } catch (e) {
      console.error("Forward geocoding error:", e);
    }
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2-lat1) * Math.PI / 180;
    const dLon = (lon2-lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function updateDeliveryFee(lat, lng) {
    if (!shopLoc) return;
    const dist = getDistance(lat, lng, shopLoc.lat, shopLoc.lng);
    const fee = Math.max(20, Math.round(20 + (dist * 5)));
    setDeliveryFee(fee);
  }

  async function initMap(initialLat, initialLng, skipAutoLocate = false, forceAutoLocate = false) {
    if (typeof window === 'undefined') return
    const L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')

    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })

    if (!mapRef.current || mapInstanceRef.current) return

    const startLat = initialLat || adrLat
    const startLng = initialLng || adrLng

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

    const map = L.map(mapRef.current).setView([startLat, startLng], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    const marker = L.marker([startLat, startLng], { draggable: true, icon: createIcon('📍') }).addTo(map)
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      const lat = pos.lat.toFixed(7)
      const lng = pos.lng.toFixed(7)
      setAdrLat(lat)
      setAdrLng(lng)
      reverseGeocode(lat, lng)
      updateDeliveryFee(lat, lng)
    })

    map.on('click', (e) => {
      marker.setLatLng(e.latlng)
      const lat = e.latlng.lat.toFixed(7)
      const lng = e.latlng.lng.toFixed(7)
      setAdrLat(lat)
      setAdrLng(lng)
      reverseGeocode(lat, lng)
      updateDeliveryFee(lat, lng)
    })

    mapInstanceRef.current = map
    markerRef.current = marker
    setMapReady(true)

    // Logic for auto-locating
    if (forceAutoLocate || (startLat === 7.0085 && !skipAutoLocate)) {
        console.log("Triggering auto-location...");
        handleGetCurrentLocation();
    }
  }

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
        openModal({
          title: 'เบราว์เซอร์ไม่รองรับ',
          description: 'เบราว์เซอร์ของคุณไม่รองรับการเข้าถึงตำแหน่ง GPS ครับ',
          type: 'alert',
          icon: '🚫'
        })
        return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = latitude.toFixed(7);
        const lng = longitude.toFixed(7);
        
        setAdrLat(lat);
        setAdrLng(lng);
        
        if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            markerRef.current.setLatLng([lat, lng]);
        }
        
        reverseGeocode(lat, lng);
        updateDeliveryFee(lat, lng);
        setLoading(false);
    }, (err) => {
        console.error("Geolocation error:", err);
        setLoading(false);
        // alert("ไม่สามารถดึงข้อมูลตำแหน่งปัจจุบันได้ กรุณาตรวจสอบการอนุญาตสิทธิ์");
    }, { enableHighAccuracy: true });
  }

  function changeQty(index, delta) {
    const next = [...cart]
    next[index].qty = Math.max(1, Number(next[index].qty) + delta)
    setCart(next)
    localStorage.setItem('bs_cart', JSON.stringify(next))
  }

  function removeItem(index) {
    const next = cart.filter((_, i) => i !== index)
    setCart(next)
    localStorage.setItem('bs_cart', JSON.stringify(next))
  }

  // Address helpers
  const currentPro = provinces.find(p => p.name_th === selProvince)
  const currentAmp = currentPro?.amphure.find(a => a.name_th === selAmphure)
  const currentTam = currentAmp?.tambon.find(t => t.name === selTambon)

  function updateFullAddress(h, v, r, s, m, t, a, p, z) {
    const parts = []
    if (h) parts.push(h)
    if (m) parts.push(`หมู่ ${m}`)
    if (v) parts.push(v)
    if (s) parts.push(`ซอย ${s}`)
    if (r) parts.push(`ถนน ${r}`)
    if (t) parts.push(`ต.${t}`)
    if (a) parts.push(`อ.${a}`)
    if (p) parts.push(`จ.${p}`)
    if (z) parts.push(z)
    
    const full = parts.join(' ').trim()
    setAddress(full)
    localStorage.setItem('bs_address_full', JSON.stringify({ 
      houseNo:h, village:v, road:r, soi:s, moo:m, 
      tambon:t, amphure:a, province:p, zip:z, full 
    }))
  }

  const isAddressValid = selProvince && selAmphure && selTambon && houseNo.trim().length >= 1

  const subtotal = (cart || []).reduce((s, c) => s + Math.round((parseFloat(c.price || 0) * Number(c.qty || 0))), 0)
  const platformFee = parseFloat(pmtSettings?.platform_fee || 0)
  const total = Math.round(subtotal + deliveryFee + platformFee)

  async function placeOrder() {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('bs_user') || '{}')
      const token = localStorage.getItem('bs_token')
      
      // Send structured address record
      // Use values from state (Map Picker)
      const lat = parseFloat(adrLat);
      const lng = parseFloat(adrLng);

      if (saveAsDefault) {
        saveAddressToDB();
      }

      const addressRecord = {
        houseNo: houseNo,
        village: village,
        road: road,
        soi: soi,
        moo: moo,
        tambon: selTambon,
        amphure: selAmphure,
        province: selProvince,
        zip: zipcode,
        lat: lat,
        lng: lng
      }

      const res = await fetch('http://localhost/bitesync/api/customer/orders.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: user.id, 
          items: cart, 
          addressRecord, // Real structured address
          total, 
          deliveryFee,
          noteShop,
          distance: getDistance(adrLat, adrLng, shopLoc.lat, shopLoc.lng).toFixed(2)
        })
      })
      const data = await res.json()
      if (data.success) {
        setOrderId(data.orderId)
        setFinalTotal(total) // LOCK the total before clearing cart
        localStorage.removeItem('bs_cart')
        localStorage.removeItem('bs_order_address')
        localStorage.removeItem('bs_order_note')
        localStorage.setItem('bs_last_order', data.orderId)
        setStep(2)
      } else {
        openModal({
          title: 'สั่งซื้อไม่สำเร็จ',
          description: data.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง',
          type: 'alert',
          icon: '❌'
        })
      }
    } catch {
      // Fallback for demo
      const mockId = `ORD-${Date.now().toString().slice(-6)}`
      setOrderId(mockId)
      setStep(2)
    }
    setLoading(false)
  }

  async function confirmPayment() {
    setLoading(true)
    try {
      const token = localStorage.getItem('bs_token')
      const res = await fetch(`http://localhost/bitesync/api/customer/payment.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, method: 'qr', amount: finalTotal })
      })
      const data = await res.json()
      if (!data.success) {
        openModal({
          title: 'การชำระเงินล้มเหลว',
          description: data.message || 'ไม่สามารถยืนยันการชำระเงินได้ กรุณาตรวจสอบอีกครั้ง',
          type: 'alert',
          icon: '⚠️'
        })
        setLoading(false)
        return
      }
    } catch (e) {
      openModal({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
        type: 'alert',
        icon: '🚫'
      })
      setLoading(false)
      return
    }
    const history = JSON.parse(localStorage.getItem('bs_history') || '[]')
    const newOrder = {
      id: orderId,
      date: new Date().toLocaleString('th-TH'),
      items: [...cart],
      subtotal,
      deliveryFee,
      total,
      // Standard structure
      customer: {
        name: user?.name || 'Customer',
        phone: user?.phone || '08x-xxx-xxxx',
        address: address || 'No address',
        lat: parseFloat(adrLat), 
        lng: parseFloat(adrLng)
      },
      shop: {
        id: cart[0]?.ShopId || cart[0]?.shopId || 1,
        name: cart[0]?.shopName || 'BiteSync Shop',
        lat: 7.0042, lng: 100.4651
      },
      rider: { 
        name: 'Aek (BiteSync)', 
        phone: '096-456-9088', 
        vehicle: 'Honda PCX', 
        plate: 'กข-1234',
        lat: 7.0067, lng: 100.4698
      },
      paymentMethod: 'QR Code / PromptPay',
      status: 'กำลังเตรียมอาหาร',
      currentStep: 1,
      estimatedTime: '20-30 min'
    }
    history.unshift(newOrder)
    localStorage.setItem('bs_history', JSON.stringify(history))

    setLoading(false)
    router.push(`/order-complete?id=${orderId}`)
  }

  async function handleSlipUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setSlipFile(file)
    await verifyPayment(file)
  }

  async function verifyPayment(file) {
    setVerifying(true)
    const fd = new FormData()
    fd.append('orderId', orderId)
    fd.append('method', pmtMethod === 'qr' ? 'PromptPay' : 'BankTransfer')
    fd.append('amount', finalTotal)
    fd.append('slip', file)

    try {
      const res = await fetch('http://localhost/bitesync/api/customer/verify-payment.php', {
        method: 'POST',
        body: fd
      })
      const data = await res.json()
      if (data.success) {
        // Automatically proceed to success page
        router.push(`/order-complete?id=${orderId}`)
      } else {
        openModal({
          title: 'ตรวจสอบสลิปล้มเหลว',
          description: data.message || 'ไม่สามารถยืนยันยอดเงินได้ กรุณาตรวจสอบรูปภาพสลิปอีกครั้งครับ',
          type: 'alert',
          icon: '❌'
        })
      }
    } catch (e) {
      console.error("Verification error:", e)
      openModal({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถติดต่อระบบตรวจสอบได้ กรุณาลองใหม่อีกครั้งครับ',
        type: 'alert',
        icon: '🚫'
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <button onClick={() => (step === 2 && !existingOrderIdParam) ? setStep(1) : router.back()} className={styles.backBtn}>
            <i className="fa-solid fa-arrow-left" /> กลับ
          </button>
          <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <Logo size="small" />
          </div>
          <span className={styles.navTitle} style={{marginRight: 20}}>{step === 1 ? 'Checkout' : 'ชำระเงิน'}</span>
          <div className={styles.navRight}>
            {user ? (
              <div className={styles.userNavWrap}>
                <div className={styles.userAvatarBtn} onClick={() => setShowDropdown(!showDropdown)}>
                  <div className={styles.navAvatarCircle}>
                    {user.image ? (
                      <img 
                        src={`${PUBLIC_URL}${user.image}`} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      (user.name || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <i className={`fa-solid fa-chevron-down ${showDropdown ? styles.rotate : ''}`} />
                </div>
                {showDropdown && (
                  <div className={`${styles.navDropdown} glass`}>
                    <div className={styles.dropdownInfo}>
                      <span className={styles.dropdownName}>{user.name}</span>
                      <span className={styles.dropdownRole}>{user.role || 'ลูกค้าระดับ VIP'}</span>
                    </div>
                    <div className={styles.dropdownDivider} />
                    {user?.role !== 'admin' && (
                      <div className={styles.dropdownItem} onClick={() => router.push('/profile')}>
                        <i className="fa-regular fa-circle-user" /> โปรไฟล์ของฉัน
                      </div>
                    )}
                    {lastOrder && (
                      <div className={styles.dropdownItem} onClick={() => router.push(`/home/track/${lastOrder}`)}>
                        <i className="fa-solid fa-motorcycle" /> ติดตามออเดอร์
                      </div>
                    )}
                    <div className={styles.dropdownItem} onClick={() => router.push('/home')}>
                      <i className="fa-solid fa-utensils" /> สั่งอาหาร
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button onClick={() => {
                      localStorage.removeItem('bs_user');
                      localStorage.removeItem('bs_token');
                      window.location.href = '/';
                    }} className={`${styles.dropdownItem} ${styles.logout}`}>
                      <i className="fa-solid fa-arrow-right-from-bracket" /> ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className={styles.loginBtn}>เข้าสู่ระบบ</button>
            )}
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className={styles.steps}>
        <div className={`${styles.stepItem} ${step >= 1 ? styles.stepOn : ''}`}>
          <div className={styles.stepCircle}>1</div>
          <span>ตรวจสอบ</span>
        </div>
        <div className={`${styles.stepLine} ${step >= 2 ? styles.stepLineOn : ''}`}/>
        <div className={`${styles.stepItem} ${step >= 2 ? styles.stepOn : ''}`}>
          <div className={styles.stepCircle}>2</div>
          <span>ชำระเงิน</span>
        </div>
        <div className={styles.stepLine}/>
        <div className={styles.stepItem}>
          <div className={styles.stepCircle}>3</div>
          <span>สำเร็จ</span>
        </div>
      </div>

      <div className={styles.body}>
        {step === 1 && (
          <div className={styles.layout}>
            <div className={styles.left}>
              {/* Order items */}
              <div className={styles.card}>
                <div className={styles.cardHdr}>
                  <h2 className={styles.cardTitle}>รายการสั่งซื้อ</h2>
                  {cart.length > 0 && (
                    <button 
                      className={styles.addMoreBtn} 
                      onClick={() => router.push(`/home/restaurant/${cart[0].shopId || cart[0].ShopId}`)}
                    >
                      + เลือกอาหารเพิ่ม
                    </button>
                  )}
                </div>
                {cart.length === 0 ? (
                  <div className={styles.emptyCart}>ไม่มีสินค้าในตะกร้า</div>
                ) : cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={styles.orderItem}>
                    <img src={item.img} className={styles.orderImg}/>
                    <div className={styles.orderInfo}>
                      <div className={styles.orderName}>{item.name}</div>
                      {item.addons && item.addons.length > 0 && (
                        <div className={styles.orderAddons}>
                          {(item.addons || []).map(a => `${a.name} x${a.qty || 1}`).join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div className={styles.qtyCtrl}>
                      <button className={styles.qtyBtn} onClick={() => changeQty(idx, -1)}>−</button>
                      <span className={styles.qtyNum}>{item.qty}</span>
                      <button className={styles.qtyBtn} onClick={() => changeQty(idx, 1)}>+</button>
                    </div>

                    <div className={styles.orderPrice}>
                      {Math.round(parseFloat(item.price) * Number(item.qty)).toLocaleString()} ฿
                    </div>
                    
                    <button className={styles.removeBtn} onClick={() => removeItem(idx)}>🗑️</button>
                  </div>
                ))}
              </div>

              {/* Note to shop */}
              <div className={styles.card}>
                <div className={styles.cardHdr}>
                  <h2 className={styles.cardTitle}>📝 โน้ตถึงร้านค้า</h2>
                </div>
                <textarea
                  value={noteShop}
                  onChange={e => setNoteShop(e.target.value)}
                  placeholder="เช่น ไม่เอาเชอร์รี่, ขอซอสพิเศษ, แพ้ถั่ว..."
                  rows={3}
                  maxLength={200}
                  className={styles.noteTextarea}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e0e4e0',
                    fontSize: '14px',
                    fontFamily: 'Sarabun, sans-serif',
                    resize: 'vertical',
                    outline: 'none',
                    background: '#fafdf9',
                    color: '#1a1f1a',
                    transition: 'border-color .2s',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                  {noteShop.length}/200
                </div>
              </div>

              <div className={styles.card}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h2 className={styles.cardTitle}>📍 ที่อยู่จัดส่ง</h2>
                </div>

                {/* Map Picker Section */}
                <div className={styles.mapPickerSection}>
                  <div className={styles.mapPickerHeader}>
                    <p className={styles.mapHint}>ปักหมุดตำแหน่งที่ถูกต้องบนแผนที่ เพื่อความรวดเร็วในการจัดส่ง</p>
                    <button className={styles.gpsBtn} onClick={handleGetCurrentLocation} disabled={loading}>
                      <i className="fa-solid fa-location-crosshairs" /> ดึงตำแหน่งปัจจุบัน
                    </button>
                  </div>
                  
                  <div ref={mapRef} className={styles.checkoutMap} />
                  
                  <div className={styles.coordinateRow}>
                    <div className={styles.coordField}>
                      <label>Latitude</label>
                      <input type="text" name="lat" value={adrLat} readOnly className={styles.coordInp} />
                    </div>
                    <div className={styles.coordField}>
                      <label>Longitude</label>
                      <input type="text" name="lng" value={adrLng} readOnly className={styles.coordInp} />
                    </div>
                  </div>
                </div>
                
                <div className={styles.addrFull}>
                  <label>บ้านเลขที่ / อาคาร</label>
                  <input
                    type="text"
                    value={houseNo}
                    onChange={e => {
                      setHouseNo(e.target.value);
                      updateFullAddress(e.target.value, village, road, soi, moo, selTambon, selAmphure, selProvince, zipcode);
                    }}
                    className={styles.inp}
                    placeholder="เช่น 123/4 หมู่บ้านสุขใจ"
                  />
                </div>

                <div className={styles.addrGrid}>
                  <div className={styles.addrField}>
                    <label>หมู่ที่</label>
                    <input 
                      type="text" 
                      placeholder="เช่น 5" 
                      value={moo} 
                      onChange={e => {
                        setMoo(e.target.value);
                        updateFullAddress(houseNo, village, road, soi, e.target.value, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                  <div className={styles.addrField}>
                    <label>หมู่บ้าน</label>
                    <input 
                      type="text" 
                      placeholder="หมู่บ้าน..." 
                      value={village} 
                      onChange={e => {
                        setVillage(e.target.value);
                        updateFullAddress(houseNo, e.target.value, road, soi, moo, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                </div>

                <div className={styles.addrGrid}>
                  <div className={styles.addrField}>
                    <label>ซอย</label>
                    <input 
                      type="text" 
                      placeholder="ซอย..." 
                      value={soi} 
                      onChange={e => {
                        setSoi(e.target.value);
                        updateFullAddress(houseNo, village, road, e.target.value, moo, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                  <div className={styles.addrField}>
                    <label>ถนน</label>
                    <input 
                      type="text" 
                      placeholder="ถนน..." 
                      value={road} 
                      onChange={e => {
                        setRoad(e.target.value);
                        updateFullAddress(houseNo, village, e.target.value, soi, moo, selTambon, selAmphure, selProvince, zipcode);
                      }}
                      className={styles.sel}
                    />
                  </div>
                </div>

                <div className={styles.addrGrid}>
                  <div className={styles.addrField}>
                    <label>จังหวัด</label>
                    <select 
                      value={selProvince} 
                      onChange={e => {
                        const v = e.target.value;
                        setSelProvince(v); setSelAmphure(''); setSelTambon(''); setZipcode('');
                        updateFullAddress(houseNo, village, road, soi, moo, '', '', v, '');
                      }}
                      className={styles.sel}
                    >
                      <option value="">เลือกจังหวัด</option>
                      {provinces.map(p => <option key={p.name_th} value={p.name_th}>{p.name_th}</option>)}
                    </select>
                  </div>

                  <div className={styles.addrField}>
                    <label>อำเภอ/เขต</label>
                    <select 
                      value={selAmphure} 
                      disabled={!selProvince}
                      onChange={e => {
                        const v = e.target.value;
                        setSelAmphure(v); setSelTambon(''); setZipcode('');
                        updateFullAddress(houseNo, village, road, soi, moo, '', v, selProvince, '');
                      }}
                      className={styles.sel}
                    >
                      <option value="">เลือกอำเภอ</option>
                      {currentPro?.amphure.map(a => <option key={a.name_th} value={a.name_th}>{a.name_th}</option>)}
                    </select>
                  </div>

                  <div className={styles.addrField}>
                    <label>ตำบล/แขวง</label>
                    <select 
                      value={selTambon} 
                      disabled={!selAmphure}
                      onChange={e => {
                        const v = e.target.value;
                        const t = currentAmp?.tambon.find(x => (x.name_th === v || x.name === v));
                        setSelTambon(v);
                        setZipcode(t?.zip_code || t?.zip || '');
                        updateFullAddress(houseNo, village, road, soi, moo, v, selAmphure, selProvince, t?.zip_code || t?.zip || '');
                        // Sync map to the chosen location
                        forwardGeocode(selProvince, selAmphure, v);
                      }}
                      className={styles.sel}
                    >
                      <option value="">เลือกตำบล</option>
                      {currentAmp?.tambon.map(t => <option key={t.name_th || t.name} value={t.name_th || t.name}>{t.name_th || t.name}</option>)}
                    </select>
                  </div>

                  <div className={styles.addrField}>
                    <label>รหัสไปรษณีย์</label>
                    <input type="text" value={zipcode} readOnly className={`${styles.sel} ${styles.readOnly}`} placeholder="Zipcode"/>
                  </div>
                </div>

                {user && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                    <input 
                      type="checkbox" 
                      id="saveDef"
                      checked={saveAsDefault} 
                      onChange={e => setSaveAsDefault(e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="saveDef" style={{ fontSize: '14px', color: '#666', cursor: 'pointer', fontWeight: '500' }}>
                      บันทึกตำแหน่งนี้เป็นที่อยู่เริ่มต้นในโปรไฟล์ของคุณ
                    </label>
                  </div>
                )}

                {address && <div className={styles.addrPreview}><strong>Preview:</strong> {address}</div>}
                
                {noteShop && <div className={styles.noteRow}>📝 {noteShop}</div>}
              </div>
            </div>

            <div className={styles.right}>
              <div className={styles.summaryCard}>
                <h2 className={styles.cardTitle}>สรุปออเดอร์</h2>
                <div className={styles.summaryRow}>
                  <span>ยอดรวม</span>
                  <span>{Math.round(subtotal).toLocaleString()} ฿</span>
                </div>
                {shopLoc && (
                  <div className={styles.summaryRow} style={{fontSize:'12px', color:'#888', marginTop:'-10px', marginBottom:'10px'}}>
                    <span>ระยะทางประมาณ:</span>
                    <span>{getDistance(adrLat, adrLng, shopLoc.lat, shopLoc.lng).toFixed(2)} กม.</span>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <span>ค่าจัดส่ง</span>
                  <span>{deliveryFee.toLocaleString()} ฿</span>
                </div>
                {platformFee > 0 && (
                  <div className={styles.summaryRow}>
                    <span>ค่าบริการระบบ</span>
                    <span>{platformFee.toLocaleString()} ฿</span>
                  </div>
                )}
                <div className={styles.divider}/>
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <span>ทั้งหมด</span><span>{Math.round(total).toLocaleString()} ฿</span>
                </div>
                <button 
                  onClick={placeOrder} 
                  disabled={loading || !isAddressValid || cart.length === 0 || !isShopOpen} 
                  className={styles.payBtn}
                >
                  {loading ? '⏳ กำลังดำเนินการ...' : (
                    !isShopOpen ? '🌙 ขออภัย ร้านปิดให้บริการ' : 
                    (!isAddressValid ? '⚠️ กรุณาใส่ที่อยู่ให้ครบ' : `ยืนยันออเดอร์ — ${Math.round(total).toLocaleString()} ฿`)
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.paymentWrap}>
            <div className={styles.paymentCard}>
              {/* Payment Method Selector */}
              <div className={styles.methodTabs}>
                <button 
                  className={`${styles.mTab} ${pmtMethod === 'qr' ? styles.mTabOn : ''}`}
                  onClick={() => setPmtMethod('qr')}
                >
                  พร้อมเพย์ (QR)
                </button>
                <button 
                  className={`${styles.mTab} ${pmtMethod === 'bank' ? styles.mTabOn : ''}`}
                  onClick={() => setPmtMethod('bank')}
                >
                  โอนเข้าบัญชี
                </button>
              </div>

              <div className={styles.ppLogoContainer}>
                <img 
                  src={pmtMethod === 'qr' 
                    ? "https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png"
                    : "https://cdn-icons-png.flaticon.com/512/2830/2830284.png"
                  } 
                  alt="Payment Method" 
                  className={styles.ppLogo} 
                />
              </div>

              <h2 className={styles.payTitle}>{pmtMethod === 'qr' ? 'สแกนจ่ายทันที' : 'รายละเอียดการโอน'}</h2>
              <div className={styles.orderIdRow}>Order ID: {orderId}</div>
              
              <div className={styles.totalBig}>
                <span>฿</span>{Math.round(finalTotal).toLocaleString()}
              </div>

              {pmtMethod === 'qr' ? (
                <div className={styles.qrWrap}>
                  <div className={styles.qrBox}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(generatePromptPayPayload(pmtSettings?.promptpay_no || '0964569088', finalTotal))}`}
                      alt="Scan to Pay"
                      className={styles.qrSvg}
                    />
                  </div>
                  <p className={styles.qrHint}>สแกน QR เพื่อชำระเงินผ่านแอปธนาคาร</p>
                </div>
              ) : (
                <div className={styles.bankInfoBox}>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLbl}>ธนาคาร:</span>
                    <span className={styles.bankVal}>{pmtSettings?.bank_name || 'SCB'}</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLbl}>เลขที่บัญชี:</span>
                    <span className={styles.bankVal}>{pmtSettings?.bank_acc_no || 'xxx-x-xxxxx-x'}</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLbl}>ชื่อบัญชี:</span>
                    <span className={styles.bankVal}>{pmtSettings?.bank_acc_name || 'BiteSync Co.'}</span>
                  </div>
                </div>
              )}

              {/* Upload & Verify Area */}
              <div className={styles.uploadArea} onClick={() => document.getElementById('slipInp').click()}>
                <input 
                  type="file" 
                  id="slipInp" 
                  hidden 
                  accept="image/*" 
                  onChange={handleSlipUpload}
                  disabled={verifying}
                />
                
                {verifying && (
                  <div className={styles.verifyingOverlay}>
                    <div className={styles.spinner}></div>
                    <span className={styles.verifyTxt}>กำลังตรวจสอบสลิปกับธนาคาร...</span>
                  </div>
                )}
                
                <span className={styles.uploadIcon}>📸</span>
                <div className={styles.uploadTxt}>อัปโหลดสลิปเพื่อยืนยัน</div>
                <div className={styles.uploadSub}>ระบบจะตรวจสอบและพาไปหน้าถัดไปทันที</div>
              </div>
            </div>
          </div>
        )}
      <PremiumModal 
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        icon={modal.icon}
        confirmText={modal.confirmText}
      />
      </div>
    </div>
  )
}

