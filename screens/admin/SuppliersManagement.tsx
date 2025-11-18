import React, { useEffect, useMemo, useState } from 'react'
import DataTable, { Column } from '../../components/admin/DataTable'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { useItem } from '../../context/ItemContext'
import { supabase } from '../../lib/supabase'
import { exportToExcel, exportToPdf } from '../../lib/export'
import { User } from '../../types'

const SuppliersManagement: React.FC = () => {
  const { allUsers } = useAuth()
  const { bookings } = useBooking()
  const { items } = useItem()
  const [earningsMap, setEarningsMap] = useState<Record<number, number>>({})
  const [utilMap, setUtilMap] = useState<Record<number, number>>({})
  const [ratingMap, setRatingMap] = useState<Record<number, number>>({})
  const [insightUser, setInsightUser] = useState<User | null>(null)
  const [kycMap, setKycMap] = useState<Record<number, string>>({})

  const suppliers = useMemo(() => allUsers.filter(u => u.role === 'Supplier'), [allUsers])

  useEffect(() => {
    const build = async () => {
      const eMap: Record<number, number> = {}
      const uMap: Record<number, number> = {}
      const rMap: Record<number, number> = {}
      for (const u of suppliers) {
        const bs = bookings.filter(b => b.supplierId === u.id)
        const total = bs.reduce((acc, b) => acc + (b.finalPrice || 0), 0)
        eMap[u.id] = total
        const myItems = items.filter(i => i.ownerId === u.id)
        const busy = myItems.filter(i => !i.available).length
        uMap[u.id] = myItems.length ? Math.round((busy / myItems.length) * 100) : 0
        rMap[u.id] = u.avgRating || 0
      }
      setEarningsMap(eMap)
      setUtilMap(uMap)
      setRatingMap(rMap)
      const { data: kycData } = await supabase.from('kycSubmissions').select('userId,status')
      const km: Record<number, string> = {}
      suppliers.forEach(u => { km[u.id] = ((kycData || []).find((k: any) => k.userId === u.id)?.status) || '-' })
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
    kycStatus: kycMap[u.id] || '-',
    status: 'approved',
    _user: u
  })), [suppliers, bookings, items, earningsMap, utilMap, ratingMap, kycMap])

  const columns: Column<any>[] = [
    { key: 'name', header: 'Supplier Name', sort: (a, b) => String(a.name).localeCompare(String(b.name)) },
    { key: 'phone', header: 'Phone' },
    { key: 'location', header: 'Location', sort: (a, b) => String(a.location).localeCompare(String(b.location)) },
    { key: 'machines', header: 'Machines listed', sort: (a, b) => a.machines - b.machines },
    { key: 'bookings', header: 'Total Bookings Received', sort: (a, b) => a.bookings - b.bookings },
    { key: 'earnings', header: 'Total Earnings', sort: (a, b) => a.earnings - b.earnings, render: r => `₹${r.earnings.toLocaleString()}` },
    { key: 'kycStatus', header: 'KYC Status', sort: (a, b) => String(a.kycStatus).localeCompare(String(b.kycStatus)) },
    { key: 'status', header: 'Status', sort: (a, b) => String(a.status).localeCompare(String(b.status)) },
  ]

  const suspend = async (userId: number) => { await supabase.from('users').update({ status: 'suspended' }).eq('id', userId) }

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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700 dark:text-neutral-200"><path fill="currentColor" d="M5 4h14a2 2 0 012 2v2H3V6a2 2 0 012-2zm-2 6h20v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm5 2l2 3 2-3h2l-3 4 3 4h-2l-2-3-2 3H8l3-4-3-4h2z"/></svg>
        </button>
        <button
          aria-label="Export PDF"
          className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
          onClick={() => {
            const headers = ['Supplier Name','Phone','Location','Machines listed','Total Bookings','Total Earnings','KYC Status','Status']
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700 dark:text-neutral-200"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 2v4h4"/></svg>
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

      {insightUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{insightUser.name} • Insights</h4>
              <button onClick={() => setInsightUser(null)}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500">Earnings</p>
                <p className="text-xl font-bold">₹{(earningsMap[insightUser.id]||0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500">Utilization</p>
                <p className="text-xl font-bold">{utilMap[insightUser.id]||0}%</p>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-2">Admin Tools</p>
              <div className="flex gap-2">
                <Button onClick={() => suspend(insightUser.id)} variant="secondary">Suspend supplier</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuppliersManagement