'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function HomeLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('bs_user')
    if (!raw) {
      router.replace('/login')
      return
    }
    try {
      const u = JSON.parse(raw)
      const role = u.role
      if (role === 'restaurant' || role === 'shop') {
        router.replace('/shop')
        return
      }
      if (role === 'rider') {
        router.replace('/rider')
        return
      }
      if (role === 'admin') {
        router.replace('/admin/dashboard')
        return
      }
      // If user is basic user or null role (customer), allow access
      setAuthorized(true)
    } catch {
      router.replace('/login')
    }
  }, [router, pathname])

  if (!authorized) return null;

  return <>{children}</>
}
