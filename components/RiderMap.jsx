'use client'
import { useEffect, useRef, useState } from 'react'

export default function RiderMap({ riderLoc, shopLoc, custLoc, step }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const riderMarkerRef = useRef(null)
  const routePolylineRef = useRef(null)
  const [L, setL] = useState(null)

  useEffect(() => {
    import('leaflet').then((Leaflet) => {
      import('leaflet/dist/leaflet.css').then(() => {
        setL(Leaflet.default)
      })
    })
  }, [])

  // Defensive check for NaN/Invalid coordinates
  const isValid = (loc) => loc && typeof loc.lat === 'number' && !isNaN(loc.lat) && typeof loc.lng === 'number' && !isNaN(loc.lng)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !L) return
    
    let centerLat = 7.0067, centerLng = 100.4698 // Default center (Songkhla/Hat Yai)
    
    if (step === 0 && isValid(shopLoc)) {
      centerLat = shopLoc.lat; centerLng = shopLoc.lng;
    } else if (isValid(custLoc)) {
      centerLat = custLoc.lat; centerLng = custLoc.lng;
    }

    const map = L.map(mapRef.current).setView([centerLat, centerLng], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    const createIcon = (emoji, iconUrl = null, size = 42) => {
      const content = iconUrl 
        ? `<img src="${iconUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);" />`
        : `<span style="font-size: ${size}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); text-shadow: 0 0 4px white, 0 0 10px white; display: flex;">${emoji}</span>`;
      return L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">${content}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
      });
    };

    // Shop Marker
    if (isValid(shopLoc)) {
      const m = L.marker([shopLoc.lat, shopLoc.lng], { icon: createIcon('🏪', shopLoc.logo) })
                 .addTo(map).bindPopup(`<b>ร้านค้า: ${shopLoc.name}</b>`);
      m.setZIndexOffset(100);
    }

    // Customer Marker
    if (isValid(custLoc)) {
      const m = L.marker([custLoc.lat, custLoc.lng], { icon: createIcon('📍') })
                 .addTo(map).bindPopup(`<b>ลูกค้า: ${custLoc.name}</b>`);
      m.setZIndexOffset(50);
    }

    // Rider Marker
    if (isValid(riderLoc)) {
      riderMarkerRef.current = L.marker([riderLoc.lat, riderLoc.lng], { icon: createIcon('🛵', null, 48) })
                 .addTo(map).bindPopup(`<b>ตำแหน่งของคุณ</b>`);
      riderMarkerRef.current.setZIndexOffset(1000); // 🛵 Always on top
    }

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [L])

  // Update Rider Position
  useEffect(() => {
    if (riderMarkerRef.current && isValid(riderLoc)) {
      riderMarkerRef.current.setLatLng([riderLoc.lat, riderLoc.lng])
    }
  }, [riderLoc.lat, riderLoc.lng])

  // Update Center when step changes
  useEffect(() => {
    if (mapInstanceRef.current) {
        let center = [7.0067, 100.4698]
        if (step === 0 && isValid(shopLoc)) center = [shopLoc.lat, shopLoc.lng]
        else if (isValid(custLoc)) center = [custLoc.lat, custLoc.lng]
        mapInstanceRef.current.panTo(center)
    }
  }, [step])

  // Update Route Polyline (Road following)
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return

    const getRoute = async () => {
      // Step 0: Rider to Shop, Step 1: Rider to Customer (actually Shop to Customer, but for Rider UI, Rider to Customer is better)
      const start = { lat: riderLoc.lat, lng: riderLoc.lng }
      const end = step === 0 ? { lat: shopLoc.lat, lng: shopLoc.lng } : { lat: custLoc.lat, lng: custLoc.lng }

      if (!isValid(start) || !isValid(end)) return

      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`)
        const data = await res.json()
        
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]) // [lat, lng]
          
          if (routePolylineRef.current) {
            mapInstanceRef.current.removeLayer(routePolylineRef.current)
          }

          routePolylineRef.current = L.polyline(coordinates, {
            color: '#00b14f',
            weight: 6,
            opacity: 0.6,
            lineJoin: 'round',
            dashArray: '1, 10' // Dotty line for a path look or keep solid
          }).addTo(mapInstanceRef.current)
          
          // No dashArray for OSRM, use solid for "Road"
          routePolylineRef.current.setStyle({ dashArray: null, color: '#00833a' })
        }
      } catch (e) {
        console.error("Routing error:", e)
      }
    }

    getRoute()
  }, [riderLoc.lat, riderLoc.lng, shopLoc.lat, shopLoc.lng, custLoc.lat, custLoc.lng, step, L])

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} />
}
