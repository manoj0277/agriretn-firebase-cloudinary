import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import { AppView } from '../types'
import { useAuth } from '../context/AuthContext'
import { SupplierKycForm } from './SupplierView'

const SupplierKycFormScreen: React.FC<{ navigate: (view: AppView) => void; goBack: () => void }> = ({ navigate, goBack }) => {
  const { user } = useAuth()
  const [kycStatus, setKycStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    try {
      const status = typeof window !== 'undefined' ? localStorage.getItem(`kycStatus:${user.id}`) : null
      setKycStatus(status)
    } catch {}
  }, [user])

  return (
    <div className="dark:text-neutral-200">
      <Header title="Supplier KYC" onBack={goBack} />
      <div className="p-4">
        {kycStatus === 'Submitted' && (
          <p className="text-xs text-yellow-800 bg-yellow-100 rounded-md p-2 mb-2">KYC submitted. Verification pending.</p>
        )}
        <SupplierKycForm onSubmitted={() => navigate({ view: 'HOME' })} />
      </div>
    </div>
  )
}

export default SupplierKycFormScreen