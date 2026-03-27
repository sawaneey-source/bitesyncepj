'use client'
import styles from './Logo.module.css'

export default function Logo({ size = 'medium', theme = 'light' }) {
  const sizeClass = styles[size] || styles.medium
  const themeClass = theme === 'dark' ? styles.dark : styles.light
  
  return (
    <div className={`${styles.logo} ${sizeClass} ${themeClass}`}>
      <div className={styles.logoMark}>
        🍃
      </div>
      <div className={styles.logoText}>
        <span className={styles.bite}>Bite</span>
        <span className={styles.sync}>Sync</span>
      </div>
    </div>
  )
}
