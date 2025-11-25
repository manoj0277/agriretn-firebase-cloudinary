import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import Button from '../components/Button'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

interface Row { id: number; name: string; phone: string; location?: string; kycStatus: string; submittedAt?: string; docs: { type: string; url?: string }[] }

const ManageUsersScreen: React.FC = () => {
  const { allUsers, approveSupplier, suspendUser, updateUser } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [kycMap, setKycMap] = useState<Record<number, { status: string; submittedAt?: string; docs: { type: string; url?: string }[] }>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (supabaseConfigured) {
        try {
          const { data } = await supabase.from('kycsubmissions').select('*')
          const map: Record<number, any> = {}
          ;(data || []).forEach((r: any) => { map[r.userId] = { status: r.status, submittedAt: r.submittedAt, docs: r.docs || [] } })
          setKycMap(map)
        } catch {}
      } else {
        const map: Record<number, any> = {}
        allUsers.filter(u => u.role === 'Supplier').forEach(u => {
          try {
            const status = typeof window !== 'undefined' ? localStorage.getItem(`kycStatus:${u.id}`) : null
            const submittedAt = typeof window !== 'undefined' ? localStorage.getItem(`kycSubmittedAt:${u.id}`) : null
            const docsStr = typeof window !== 'undefined' ? localStorage.getItem(`kycDocs:${u.id}`) : null
            const docs = docsStr ? JSON.parse(docsStr) : []
            if (status || docs.length > 0) {
              map[u.id] = { status: status || 'Pending', submittedAt: submittedAt || undefined, docs }
            }
          } catch {}
        })
        setKycMap(map)
      }
    }
    load()
  }, [allUsers])

  const suppliers = useMemo(() => allUsers.filter(u => u.role === 'Supplier'), [allUsers])
  const rows: Row[] = useMemo(() => suppliers.map(u => ({ id: u.id, name: u.name, phone: u.phone, location: u.location, kycStatus: (kycMap[u.id]?.status || (u.status === 'approved' ? 'Approved' : 'Pending')), submittedAt: kycMap[u.id]?.submittedAt, docs: kycMap[u.id]?.docs || [] })), [suppliers, kycMap])

  const approve = async (userId: number) => {
    try {
      if (supabaseConfigured) {
        await supabase.from('kycsubmissions').update({ status: 'Approved' }).eq('userId', userId)
        await supabase.from('users').update({ status: 'approved' }).eq('id', userId)
      } else {
        const user = allUsers.find(u => u.id === userId)
        if (user) await updateUser({ ...user, status: 'approved' })
        try { if (typeof window !== 'undefined') localStorage.setItem(`kycStatus:${userId}`, 'Approved') } catch {}
      }
      setKycMap(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), status: 'Approved' } }))
      showToast('KYC approved.', 'success')
    } catch {
      showToast('Failed to approve KYC.', 'error')
    }
  }
  const reject = async (userId: number) => {
    try {
      if (supabaseConfigured) {
        await supabase.from('kycSubmissions').update({ status: 'Rejected' }).eq('userId', userId)
        await supabase.from('users').update({ status: 'suspended' }).eq('id', userId)
      } else {
        const user = allUsers.find(u => u.id === userId)
        if (user) await updateUser({ ...user, status: 'suspended' })
        try { if (typeof window !== 'undefined') localStorage.setItem(`kycStatus:${userId}`, 'Rejected') } catch {}
      }
      setKycMap(prev => ({ ...prev, [userId]: { ...(prev[userId] || {}), status: 'Rejected' } }))
      showToast('KYC rejected.', 'warning')
    } catch {
      showToast('Failed to reject KYC.', 'error')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Supplier KYC</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Supplier</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Location</th>
                <th className="p-2">Docs</th>
                <th className="p-2">KYC Status</th>
                <th className="p-2">Submitted</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-neutral-200 dark:border-neutral-700">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.phone}</td>
                  <td className="p-2">{r.location || '-'}</td>
                  <td className="p-2">
                    {r.docs.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {r.docs.map(d => (
                          d.type === 'Aadhaar' || d.type === 'Photo' ? (
                            <img key={d.type} src={d.url} alt={d.type} className="h-12 w-16 object-cover rounded cursor-pointer" onClick={() => setPreviewUrl(d.url || null)} />
                          ) : (
                            <a key={d.type} href={d.url} target="_blank" rel="noreferrer" className="underline mr-2">{d.type}</a>
                          )
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-2">{r.kycStatus}</td>
                  <td className="p-2">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button onClick={() => approve(r.id)} variant="secondary">{t('approve')}</Button>
                      <Button onClick={() => reject(r.id)} variant="secondary">{t('reject')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-2" colSpan={7}>No suppliers</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {previewUrl && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
            <img src={previewUrl} alt="Preview" className="max-h-[80vh] max-w-[90vw] rounded shadow-lg" />
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageUsersScreen