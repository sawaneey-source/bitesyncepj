import './globals.css'

export const metadata = {
  title: 'BiteSync — เอาใจสัมผัส รวดเร็วและสดใหม่',
  description: 'สั่งอาหารจากร้านโปรดของคุณ ส่งถึงบ้านรวดเร็วทันใจ',
}

import AuthGuard from '@/components/AuthGuard'

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>
        <AuthGuard />
        {children}
      </body>
    </html>
  )
}

