import Navbar from '@/components/Navbar'

export default function LegalLayout({ children }) {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '40px', marginBottom: '40px' }}>
          {children}
        </div>
      </div>
    </>
  )
}
