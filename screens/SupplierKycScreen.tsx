import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import { User, KycSubmission, KycDocument, RiskLevel } from '../types'
import { useNotification } from '../context/NotificationContext'

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const SupplierKycScreen: React.FC = () => {
  const { allUsers } = useAuth()
  const { addNotification } = useNotification()
  const [kyc, setKyc] = useState<KycSubmission[]>([])
  const suppliers = useMemo(() => allUsers.filter(u => u.role === 'Supplier'), [allUsers])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL')

  useEffect(() => {
    const load = async () => {
      try {
        const submissions: KycSubmission[] = [];
        for (const u of suppliers) {
          try {
            const res = await fetch(`${API_URL}/kyc/${u.id}`);
            if (res.ok) {
              const data = await res.json();
              submissions.push(data);
            }
          } catch { }
        }
        setKyc(submissions);
      } catch (error) {
        console.error('Failed to load KYC', error);
      }
    }
    load()
  }, [suppliers])

  const rows = useMemo(() => (
    kyc
      .map(k => {
        const u = allUsers.find(x => x.id === k.userId)
        if (!u || u.role !== 'Supplier') return null
        const docs = k.docs || []

        const hasAadhaar = docs.some(d => d.type === 'Aadhaar' && !!d.url)
        const hasPhoto = docs.some(d => d.type === 'PersonalPhoto' && !!d.url)
        const hasRequiredDocs = hasAadhaar && hasPhoto

        return { user: u, kycId: k.id, kycStatus: k.status, submittedAt: k.submittedAt, docs, risk: (k.riskLevel || 'LOW') as RiskLevel, hasRequiredDocs }
      })
      .filter(Boolean) as { user: User; kycId: string; kycStatus: KycSubmission['status']; submittedAt?: string; docs: KycDocument[]; risk: RiskLevel; hasRequiredDocs: boolean }[]
  ), [kyc, allUsers])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'ALL') return rows
    return rows.filter(r => r.kycStatus === statusFilter)
  }, [rows, statusFilter])

  const approve = async (u: User, kycId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/kyc/${kycId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' })
      });

      if (!res.ok) throw new Error('Failed to approve KYC');

      setKyc(prev => {
        const idx = prev.findIndex(k => k.userId === u.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], status: 'Approved' }
        return next
      })

      addNotification({ userId: u.id, message: 'Your KYC has been approved. You can now add items.', type: 'admin' })
      alert(`KYC approved for ${u.name}`);
    } catch (error) {
      console.error('Approve failed', error);
      alert('Failed to approve KYC. Please try again.');
    }
  }

  const reject = async (u: User, kycId: string) => {
    const reason = window.prompt('Enter rejection reason (optional):');

    try {
      const res = await fetch(`${API_URL}/admin/kyc/${kycId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          rejectionReason: reason || 'KYC documents not acceptable'
        })
      });

      if (!res.ok) throw new Error('Failed to reject KYC');

      setKyc(prev => {
        const idx = prev.findIndex(k => k.userId === u.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], status: 'Rejected' }
        return next
      })

      const message = reason
        ? `Your KYC has been rejected. Reason: ${reason}`
        : 'Your KYC has been rejected. Please review and resubmit.';
      addNotification({ userId: u.id, message, type: 'admin' })
      alert(`KYC rejected for ${u.name}`);
    } catch (error) {
      console.error('Reject failed', error);
      alert('Failed to reject KYC. Please try again.');
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h4 className="font-semibold mb-1">Supplier KYC Submissions</h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Review and verify supplier KYC documents. Images are stored in Cloudinary.</p>
        <div className="flex gap-2 mb-3">
          <Button onClick={() => setStatusFilter('ALL')} variant={statusFilter === 'ALL' ? 'primary' : 'secondary'}>All</Button>
          <Button onClick={() => setStatusFilter('Pending')} variant={statusFilter === 'Pending' ? 'primary' : 'secondary'}>Pending</Button>
          <Button onClick={() => setStatusFilter('Approved')} variant={statusFilter === 'Approved' ? 'primary' : 'secondary'}>Approved</Button>
          <Button onClick={() => setStatusFilter('Rejected')} variant={statusFilter === 'Rejected' ? 'primary' : 'secondary'}>Rejected</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-neutral-300 dark:border-neutral-600">
                <th className="p-2">Supplier</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Location</th>
                <th className="p-2">Submitted Docs</th>
                <th className="p-2">KYC Status</th>
                <th className="p-2">Risk</th>
                <th className="p-2">Submitted</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => (
                <tr key={r.user.id} className="border-t border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750">
                  <td className="p-2">{r.user.name}</td>
                  <td className="p-2">{r.user.phone}</td>
                  <td className="p-2">{r.user.location || '-'}</td>
                  <td className="p-2">
                    {r.docs.length > 0 ? (
                      <div className="flex gap-2 flex-wrap items-center">
                        {r.docs.map((d, idx) => (
                          d.type === 'Aadhaar' || d.type === 'PersonalPhoto' ? (
                            <div key={idx} className="relative group">
                              <img
                                src={d.url}
                                alt={d.type}
                                className={`h-14 w-20 object-cover rounded border-2 cursor-pointer hover:scale-105 transition-all ${d.status === 'ReuploadRequested' ? 'border-orange-500 ring-2 ring-orange-300' :
                                  d.status === 'Approved' ? 'border-green-500' :
                                    'border-neutral-300 dark:border-neutral-600 hover:border-blue-500'
                                  }`}
                                onClick={() => setPreviewUrl(d.url || null)}
                                title={`Click to view ${d.type}${d.status === 'ReuploadRequested' ? ' (Re-upload requested)' : ''}`}
                              />
                              <span className={`absolute bottom-0 left-0 right-0 text-white text-[10px] px-1 py-0.5 text-center rounded-b ${d.status === 'ReuploadRequested' ? 'bg-orange-600' :
                                d.status === 'Approved' ? 'bg-green-600' :
                                  'bg-black/70'
                                }`}>
                                {d.type === 'PersonalPhoto' ? 'Photo' : d.type}
                                {d.status === 'ReuploadRequested' && ' 🔄'}
                              </span>
                            </div>
                          ) : (
                            <span key={idx} className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded">
                              {d.type} ({d.status})
                            </span>
                          )
                        ))}
                        {!r.hasRequiredDocs && (
                          <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Docs missing</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">No docs submitted</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.kycStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                      r.kycStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {r.kycStatus}
                    </span>
                  </td>
                  <td className="p-2">{r.risk}</td>
                  <td className="p-2 text-xs">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                  <td className="p-2">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Button
                        onClick={() => approve(r.user, r.kycId)}
                        variant="primary"
                        disabled={!r.hasRequiredDocs || r.kycStatus === 'Approved'}
                        className={`text-xs ${r.kycStatus === 'Approved' ? 'blur-[2px] opacity-50' : ''}`}
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => reject(r.user, r.kycId)}
                        variant="danger"
                        disabled={r.kycStatus === 'Rejected'}
                        className={`text-xs ${r.kycStatus === 'Rejected' ? 'blur-[2px] opacity-50' : ''}`}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td className="p-4 text-center text-neutral-500" colSpan={8}>No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} submissions</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {previewUrl && (
          <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewUrl(null);
                }}
                className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors z-10 group"
                aria-label="Close preview"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="absolute -bottom-6 right-0 text-xs text-white/80 group-hover:text-white">ESC</span>
              </button>

              <img
                src={previewUrl}
                alt="KYC Document - Click to close"
                className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain border-4 border-white/10"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="text-white text-center mt-6 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                <p>Click outside image or press <kbd className="px-2 py-1 bg-white/20 rounded">X</kbd> to close</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupplierKycScreen