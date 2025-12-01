import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import { User, KycSubmission, KycDocument, RiskLevel } from '../types'
import { useNotification } from '../context/NotificationContext'

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const SupplierKycScreen: React.FC = () => {
  const { allUsers, updateUser } = useAuth()
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
        const hasPhoto = docs.some(d => d.type === 'Photo' && !!d.url)
        const hasRequiredDocs = hasAadhaar && hasPhoto
        return { user: u, kycStatus: k.status, submittedAt: k.submittedAt, docs, risk: (k.riskLevel || 'LOW') as RiskLevel, hasRequiredDocs }
      })
      .filter(Boolean) as { user: User; kycStatus: KycSubmission['status']; submittedAt?: string; docs: KycDocument[]; risk: RiskLevel; hasRequiredDocs: boolean }[]
  ), [kyc, allUsers])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'ALL') return rows
    return rows.filter(r => r.kycStatus === statusFilter)
  }, [rows, statusFilter])

  const approve = async (u: User) => {
    try {
      const res = await fetch(`${API_URL}/kyc/${u.id}`);
      if (res.ok) {
        const kycData = await res.json();
        const docsApproved = kycData.docs.map((d: any) => ({ ...d, status: 'Approved' }));

        // Update KYC
        await fetch(`${API_URL}/kyc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id, status: 'Approved', docs: docsApproved })
        });

        // Update User Status
        await fetch(`${API_URL}/admin/users/${u.id}/approve`, { method: 'POST' });

        // Update Local State
        setKyc(prev => {
          const idx = prev.findIndex(k => k.userId === u.id)
          if (idx === -1) return prev
          const next = [...prev]
          next[idx] = { ...next[idx], status: 'Approved', docs: docsApproved }
          return next
        })
        addNotification({ userId: u.id, message: 'KYC approved', type: 'admin' })
      }
    } catch (error) {
      console.error('Approve failed', error);
    }
  }

  const reject = async (u: User) => {
    try {
      await fetch(`${API_URL}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, status: 'Rejected' })
      });

      await fetch(`${API_URL}/admin/users/${u.id}/suspend`, { method: 'POST' });

      setKyc(prev => {
        const idx = prev.findIndex(k => k.userId === u.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], status: 'Rejected' }
        return next
      })
      addNotification({ userId: u.id, message: 'KYC rejected', type: 'admin' })
    } catch (error) {
      console.error('Reject failed', error);
    }
  }

  const askReupload = async (u: User, docType: KycDocument['type']) => {
    addNotification({ userId: u.id, message: `Please re-upload ${docType} for KYC.`, type: 'admin' })
  }

  const addNote = async (u: User, note: string) => {
    try {
      const res = await fetch(`${API_URL}/kyc/${u.id}`);
      if (res.ok) {
        const kycData = await res.json();
        const nextNotes = [...(kycData.adminNotes || []), note];

        await fetch(`${API_URL}/kyc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id, adminNotes: nextNotes })
        });

        setKyc(prev => {
          const idx = prev.findIndex(k => k.userId === u.id)
          if (idx === -1) return prev
          const next = [...prev]
          next[idx] = { ...next[idx], adminNotes: nextNotes }
          return next
        })
      }
    } catch { }
  }

  const askReuploadPrompt = async (u: User, docs: KycDocument[]) => {
    const types = (docs && docs.length > 0 ? docs.map(d => d.type) : ['Aadhaar', 'Photo', 'PAN', 'GST', 'MachineProof', 'BankPassbook']) as KycDocument['type'][]
    const input = typeof window !== 'undefined' ? window.prompt(`Enter doc type to re-upload: ${types.join(', ')}`) || '' : ''
    const picked = types.find(t => t.toLowerCase() === input.trim().toLowerCase())
    if (!picked) return
    await askReupload(u, picked)
  }

  const addNotePrompt = async (u: User) => {
    const text = typeof window !== 'undefined' ? window.prompt('Enter admin note') || '' : ''
    const note = text.trim()
    if (!note) return
    await addNote(u, note)
  }

  const triggerFraud = async (u: User, reason: string) => {
    addNotification({ userId: 0, message: `KYC flag: ${u.name} - ${reason}`, type: 'admin' })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h4 className="font-semibold mb-1">Supplier KYC Live Submissions</h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">This ensures the admin sees only actual supplier KYC submissions present in kycSubmissions, aligning the UI with live data and eliminating artificial “Pending” entries.</p>
        <div className="flex gap-2 mb-3">
          <Button onClick={() => setStatusFilter('ALL')} variant={statusFilter === 'ALL' ? 'primary' : 'secondary'}>All</Button>
          <Button onClick={() => setStatusFilter('Pending')} variant={statusFilter === 'Pending' ? 'primary' : 'secondary'}>Pending</Button>
          <Button onClick={() => setStatusFilter('Approved')} variant={statusFilter === 'Approved' ? 'primary' : 'secondary'}>Approved</Button>
          <Button onClick={() => setStatusFilter('Rejected')} variant={statusFilter === 'Rejected' ? 'primary' : 'secondary'}>Rejected</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
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
                <tr key={r.user.id} className="border-t border-neutral-200 dark:border-neutral-700">
                  <td className="p-2">{r.user.name}</td>
                  <td className="p-2">{r.user.phone}</td>
                  <td className="p-2">{r.user.location || (r.submittedAt ? '-' : '-')}</td>
                  <td className="p-2">
                    {r.docs.length > 0 ? (
                      <div className="flex gap-2 flex-wrap items-center">
                        {r.docs.map(d => (
                          d.type === 'Aadhaar' || d.type === 'Photo' ? (
                            <img key={d.type} src={d.url} alt={d.type} className="h-12 w-16 object-cover rounded cursor-pointer" onClick={() => setPreviewUrl(d.url || null)} />
                          ) : (
                            <span key={d.type} className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded">{d.type} ({d.status})</span>
                          )
                        ))}
                        {!r.hasRequiredDocs && (
                          <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Docs missing</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Docs missing</span>
                    )}
                  </td>
                  <td className="p-2">{r.kycStatus}</td>
                  <td className="p-2">{r.risk}</td>
                  <td className="p-2">{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td>
                  <td className="p-2">
                    <div className="flex gap-2 items-center">
                      <Button onClick={() => askReuploadPrompt(r.user, r.docs)} variant="secondary">Ask Re-upload</Button>
                      <Button onClick={() => approve(r.user)} variant="secondary" disabled={!r.hasRequiredDocs}>Approve</Button>
                      <Button onClick={() => reject(r.user)} variant="secondary">Reject</Button>
                      {r.kycStatus === 'Approved' && (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Approved</span>
                      )}
                      {r.kycStatus === 'Rejected' && (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rejected</span>
                      )}
                      <Button onClick={() => addNotePrompt(r.user)} variant="secondary">Add Note</Button>
                      <Button onClick={() => triggerFraud(r.user, 'Mismatched KYC')} variant="secondary">Trigger Fraud Flag</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td className="p-2" colSpan={8}>No submissions</td></tr>
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

export default SupplierKycScreen