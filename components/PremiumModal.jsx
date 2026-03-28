'use client'
import React, { useEffect, useState } from 'react'
import styles from './PremiumModal.module.css'

export default function PremiumModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  type = 'confirm', // 'confirm', 'alert', 'success', 'warning'
  confirmText = 'ตกลง', 
  cancelText = 'ยกเลิก',
  icon = '💡'
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => setShow(true), 10)
    } else {
      setShow(false)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={`${styles.overlay} ${show ? styles.overlayOn : ''}`} onClick={onClose}>
      <div className={`${styles.modal} ${show ? styles.modalOn : ''}`} onClick={e => e.stopPropagation()}>
        <div className={styles.iconBox}>{icon}</div>
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.actions}>
          {type === 'confirm' && (
            <button className={styles.cancelBtn} onClick={onClose}>
              {cancelText}
            </button>
          )}
          <button className={styles.confirmBtn} onClick={() => {
            onConfirm && onConfirm()
            if (type === 'alert' || type === 'success') onClose()
          }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
