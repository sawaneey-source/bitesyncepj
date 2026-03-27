import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request, { params }) {
  const filePath = params.path ? params.path.join('/') : ''
  const fullPath = path.join(process.cwd(), 'public', 'uploads', 'profiles', filePath)

  if (!fs.existsSync(fullPath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = path.extname(fullPath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  const contentType = mimeTypes[ext] || 'application/octet-stream'
  const fileBuffer = fs.readFileSync(fullPath)

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}

