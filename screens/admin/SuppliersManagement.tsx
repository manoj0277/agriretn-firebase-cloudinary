import React, { useEffect, useMemo, useState } from 'react'
import DataTable, { Column } from '../../components/admin/DataTable'

import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { useItem } from '../../context/ItemContext'
import { exportToExcel, exportToPdf } from '../../lib/export'
import Button from '../../components/Button'
import { User } from '../../types'
import { useToast } from '../../context/ToastContext'
import { MedalName } from '../../components/MedalName';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const SuppliersManagement: React.FC = () => {
  const { allUsers, suspendUser, reactivateUser } = useAuth()
  const { bookings } = useBooking()
  const { items } = useItem()
  const { showToast } = useToast()
  const [earningsMap, setEarningsMap] = useState<Record<string, number>>({})
  const [utilMap, setUtilMap] = useState<Record<string, number>>({})
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({})
  const [insightUser, setInsightUser] = useState<User | null>(null)
  const [kycMap, setKycMap] = useState<Record<string, string>>({})
  const [statusPopupUser, setStatusPopupUser] = useState<User | null>(null)

  // Show both Suppliers and Farmers in the Suppliers list
  const suppliers = useMemo(() => allUsers.filter(u => u.role === 'Supplier' || u.role === 'Farmer'), [allUsers])

  useEffect(() => {
    const build = async () => {
      const eMap: Record<string, number> = {}
      const uMap: Record<string, number> = {}
      const rMap: Record<string, number> = {}
      const km: Record<string, string> = {}

      // Fetch utilization from API
      try {
        const utilRes = await fetch(`${API_URL}/suppliers/utilization`)
        if (utilRes.ok) {
          const utilData = await utilRes.json()
          utilData.forEach((u: any) => {
            uMap[u.supplierId] = u.avgUtilizationPercent || 0
          })
        }
      } catch (e) {
        console.error('Failed to fetch utilization:', e)
      }

      for (const u of suppliers) {
        const bs = bookings.filter(b => b.supplierId === u.id)
        const total = bs.reduce((acc, b) => acc + (b.finalPrice || 0), 0)
        eMap[u.id] = total
        rMap[u.id] = u.avgRating || 0

        // Fetch KYC status from API
        try {
          const res = await fetch(`${API_URL}/kyc/${u.id}`)
          if (res.ok) {
            const kycData = await res.json()
            km[u.id] = kycData.status || 'Not Submitted'
          } else {
            km[u.id] = 'Not Submitted'
          }
        } catch {
          km[u.id] = 'Not Submitted'
        }
      }

      setEarningsMap(eMap)
      setUtilMap(uMap)
      setRatingMap(rMap)
      setKycMap(km)
    }
    build()
  }, [suppliers, bookings, items])

  const [sortKey, setSortKey] = useState<string>('earnings')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => suppliers.map(u => ({
    name: u.name,
    phone: u.phone,
    location: u.location || '-',
    machines: items.filter(i => i.ownerId === u.id).length,
    bookings: bookings.filter(b => b.supplierId === u.id).length,
    earnings: earningsMap[u.id] || 0,
    utilization: utilMap[u.id] || 0,
    kycStatus: kycMap[u.id] || 'Not Submitted',
    status: u.userStatus || 'approved',
    _user: u
  })), [suppliers, bookings, items, earningsMap, utilMap, ratingMap, kycMap])

  const getKycBadge = (status: string) => {
    const badges: Record<string, string> = {
      'Approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Not Submitted': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    }
    return badges[status] || badges['Not Submitted']
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 cursor-pointer',
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 cursor-pointer',
      'suspended': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 cursor-pointer',
      'blocked': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 cursor-pointer',
    }
    return badges[status] || badges['pending']
  }

  const handleStatusChange = async (user: User, newStatus: 'approved' | 'suspended' | 'blocked') => {
    try {
      if (newStatus === 'suspended') {
        await suspendUser(user.id as any)
        showToast(`${user.name} has been suspended`, 'success')
      } else if (newStatus === 'approved') {
        await reactivateUser(user.id as any)
        showToast(`${user.name} has been approved`, 'success')
      } else if (newStatus === 'blocked') {
        // Call block API
        const res = await fetch(`${API_URL}/admin/users/${user.id}/block`, { method: 'POST' })
        if (res.ok) {
          showToast(`${user.name} has been blocked`, 'success')
        } else {
          showToast('Failed to block user', 'error')
        }
      }
      setStatusPopupUser(null)
    } catch (error) {
      console.error('Status change error:', error)
      showToast('Failed to change status', 'error')
    }
  }

  // ... inside component ...
  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      sort: (a, b) => String(a.name).localeCompare(String(b.name)),
      render: r => <MedalName userId={r._user.id} displayName={r.name} />
    },
    { key: 'phone', header: 'Phone' },
    { key: 'location', header: 'Location', sort: (a, b) => String(a.location).localeCompare(String(b.location)) },
    { key: 'machines', header: 'Machines listed', sort: (a, b) => a.machines - b.machines },
    { key: 'bookings', header: 'Total Bookings Received', sort: (a, b) => a.bookings - b.bookings },
    { key: 'earnings', header: 'Total Earnings', sort: (a, b) => a.earnings - b.earnings, render: r => `₹${r.earnings.toLocaleString()}` },
    {
      key: 'utilization', header: 'Utilization %', sort: (a, b) => a.utilization - b.utilization, render: r => {
        const util = r.utilization || 0
        const badgeClass = util >= 65
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : util >= 30
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{util}%</span>
      }
    },
    {
      key: 'kycStatus', header: 'KYC Status', sort: (a, b) => String(a.kycStatus).localeCompare(String(b.kycStatus)), render: r => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getKycBadge(r.kycStatus)}`}>{r.kycStatus}</span>
      )
    },
    {
      key: 'status', header: 'Status', sort: (a, b) => String(a.status).localeCompare(String(b.status)), render: r => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setStatusPopupUser(r._user); }}
            className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${getStatusBadge(r.status)}`}
          >
            {r.status}
          </button>

        </div>
      )
    },
  ]

  return (
    <div className="p-4">
      <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm">Sort</label>
          <select
            className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
          >
            <option value="earnings">Total Earnings</option>
            <option value="bookings">Total Bookings</option>
            <option value="machines">Machines listed</option>
            <option value="name">Name</option>
            <option value="location">Location</option>
            <option value="status">Status</option>
            <option value="kycStatus">KYC Status</option>
          </select>
          <select
            className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
            value={sortDir}
            onChange={e => setSortDir(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Export Excel"
            className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
            onClick={() => {
              const rowsForExport = rows.map(r => ({
                'Supplier Name': r.name,
                'Phone': r.phone,
                'Location': r.location,
                'Machines listed': r.machines,
                'Total Bookings': r.bookings,
                'Total Earnings': r.earnings,
                'KYC Status': r.kycStatus,
                'Status': r.status,
              }))
              exportToExcel(rowsForExport, 'Suppliers')
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700 dark:text-neutral-200"><path fill="currentColor" d="M5 4h14a2 2 0 012 2v2H3V6a2 2 0 012-2zm-2 6h20v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm5 2l2 3 2-3h2l-3 4 3 4h-2l-2-3-2 3H8l3-4-3-4h2z" /></svg>
          </button>
          <button
            aria-label="Export PDF"
            className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
            onClick={() => {
              const headers = ['Supplier Name', 'Phone', 'Location', 'Machines listed', 'Total Bookings', 'Total Earnings', 'KYC Status', 'Status']
              const rowsForExport = rows.map(r => ({
                'Supplier Name': r.name,
                'Phone': r.phone,
                'Location': r.location,
                'Machines listed': r.machines,
                'Total Bookings': r.bookings,
                'Total Earnings': r.earnings,
                'KYC Status': r.kycStatus,
                'Status': r.status,
              }))
              exportToPdf('Suppliers', headers, rowsForExport)
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700 dark:text-neutral-200"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 2v4h4" /></svg>
          </button>
        </div>
      </div>
      <DataTable
        title="Suppliers"
        data={rows}
        columns={columns}
        defaultSortKey="earnings"
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key, dir) => { setSortKey(key); setSortDir(dir) }}
      />

      {/* Status Change Popup */}
      {statusPopupUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001]" onClick={() => setStatusPopupUser(null)}>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 w-full max-w-sm p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg">Change Status</h4>
              <button onClick={() => setStatusPopupUser(null)} className="text-neutral-500 hover:text-neutral-700">✕</button>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Update status for <strong>{statusPopupUser.name}</strong>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange(statusPopupUser, 'approved')}
                className="w-full py-2 px-4 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Approve
              </button>
              <button
                onClick={() => handleStatusChange(statusPopupUser, 'suspended')}
                className="w-full py-2 px-4 rounded-lg bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Suspend
              </button>
              <button
                onClick={() => handleStatusChange(statusPopupUser, 'blocked')}
                className="w-full py-2 px-4 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {insightUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{insightUser.name} • Insights</h4>
              <button onClick={() => setInsightUser(null)}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500">Earnings</p>
                <p className="text-xl font-bold">₹{(earningsMap[insightUser.id] || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500">Utilization</p>
                <p className="text-xl font-bold">{utilMap[insightUser.id] || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuppliersManagement