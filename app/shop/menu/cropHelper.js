/**
 * Helper to create a cropped image from the crop area.
 */
export const getCroppedImg = async (imageSrc, pixelCrop) => {
  let url = imageSrc
  let isBlobCreated = false

  // For remote URLs, fetch as blob first to avoid tainted canvas
  if (!imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
    try {
      const response = await fetch(imageSrc, { mode: 'cors' })
      if (!response.ok) throw new Error('Network response was not ok')
      const blob = await response.blob()
      url = URL.createObjectURL(blob)
      isBlobCreated = true
    } catch (err) {
      console.warn('getCroppedImg: Failed to fetch as blob, using direct URL.', err)
    }
  }

  const image = await createImage(url).catch(() => {
    throw new Error('ไม่สามารถโหลดไฟล์รูปภาพได้ (Image Load Error)')
  })
  
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการประมวลผลรูปภาพ (Canvas Context Error)')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  try {
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )
  } catch (err) {
    throw new Error('ไม่ได้รับอนุญาตให้เข้าถึงรูปภาพ (CORS/Tainted Canvas Error)')
  }

  const result = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('ไม่สามารถแปลงรูปภาพได้ (toBlob failure)'))
        else resolve(blob)
      }, 'image/jpeg')
    } catch (err) {
      reject(new Error('เบราว์เซอร์บล็อกการส่งออกรูปภาพ (toBlob error/Tainted)'))
    }
  })

  // Clean up the temporary blob URL if we created one
  if (isBlobCreated) URL.revokeObjectURL(url)

  return result
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => {
      console.error('getCroppedImg: Image load error', error, 'URL:', url)
      reject(error)
    })
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      image.crossOrigin = 'anonymous'
    }
    image.src = url
  })
