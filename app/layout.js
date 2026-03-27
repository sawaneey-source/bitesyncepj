import { Prompt, Sarabun } from 'next/font/google'
import './globals.css'

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
})
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sarabun',
  display: 'swap',
})

export const metadata = {
  title: 'BiteSync — เอาใจสัมผัส รวดเร็วและสดใหม่',
  description: 'สั่งอาหารจากร้านโปรดของคุณ ส่งถึงบ้านรวดเร็วทันใจ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${prompt.variable} ${sarabun.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}

