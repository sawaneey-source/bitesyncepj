'use client'
import styles from './Logo.module.css'

export default function Logo({ size = 'medium' }) {
  const sizeClass = styles[size] || styles.medium
  
  return (
    <div className={`${styles.logo} ${sizeClass}`}>
      <div className={styles.logoMark}>
        <i className="fa-solid fa-leaf" />
      </div>
      <div className={styles.logoText}>
        <span className={styles.bite}>Bite</span>
        <span className={styles.sync}>Sync</span>
      </div>
    </div>
  )
}
