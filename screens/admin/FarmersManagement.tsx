import React, { useEffect, useMemo, useState } from 'react'
import DataTable, { Column } from '../../components/admin/DataTable'
import { useAuth } from '../../context/AuthContext'
import { useBooking } from '../../context/BookingContext'
import { supabase } from '../../lib/supabase'
import { exportToExcel, exportToPdf } from '../../lib/export'
import { User } from '../../types'

const FarmersManagement: React.FC = () => {
  const { allUsers } = useAuth()
  const { bookings } = useBooking()
  const [complaintsMap, setComplaintsMap] = useState<Record<number, number>>({})
  const [paymentsMap, setPaymentsMap] = useState<Record<number, { total: number }>>({})
  const [lastLoginMap, setLastLoginMap] = useState<Record<number, string>>({})
  const [favoriteMap, setFavoriteMap] = useState<Record<number, string>>({})
  const [sortKey, setSortKey] = useState<string>('totalSpent')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [kycMap, setKycMap] = useState<Record<number, string>>({})

  const farmers = useMemo(() => allUsers.filter(u => u.role === 'Farmer'), [allUsers])

  useEffect(() => {
    const buildMaps = async () => {
      const cMap: Record<number, number> = {}
      const pMap: Record<number, { total: number }> = {}
      const lMap: Record<number, string> = {}
      const fMap: Record<number, string> = {}

      const { data: payments } = await supabase.from('payments').select('*')
      const { data: chats } = await supabase.from('chatMessages').select('*')
      const { data: tickets } = await supabase.from('supportTickets').select('*')
      const { data: kycData } = await supabase.from('kycSubmissions').select('userId,status')

      for (const u of farmers) {
        const bs = bookings.filter(b => b.farmerId === u.id)
        const totals = bs.reduce((acc, b) => acc + (b.finalPrice || 0), 0)
        pMap[u.id] = { total: totals }
        cMap[u.id] = (tickets || []).filter((t: any) => t.userId === u.id).length
        const fav = (() => {
          const freq = new Map<string, number>()
          bs.forEach(b => { const name = b.workPurpose || String(b.itemCategory); freq.set(name, (freq.get(name) || 0) + 1) })
          let max = 0, favKey = ''
          freq.forEach((v, k) => { if (v > max) { max = v; favKey = k } })
          return favKey
        })()
        fMap[u.id] = fav
        const lastChatTs = (chats || []).filter((c: any) => c.senderId === u.id || c.receiverId === u.id).map((c: any) => c.timestamp).sort().pop()
        if (lastChatTs) lMap[u.id] = lastChatTs
      }

      setPaymentsMap(pMap)
      setComplaintsMap(cMap)
      setLastLoginMap(lMap)
      setFavoriteMap(fMap)
      const km: Record<number, string> = {}
      farmers.forEach(u => { km[u.id] = ((kycData || []).find((k: any) => k.userId === u.id)?.status) || (u.status === 'approved' ? 'Approved' : 'Pending') })
      setKycMap(km)
    }
    buildMaps()
  }, [farmers, bookings])

  const rows = useMemo(() => {
    return farmers.map(u => {
      const bs = bookings.filter(b => b.farmerId === u.id)
      const totalSpent = paymentsMap[u.id]?.total || 0
      const cancels = bs.filter(b => b.status === 'Cancelled').length
      const avg = bs.length ? Math.round((totalSpent / bs.length) * 100) / 100 : 0
      return {
        name: u.name,
        phone: u.phone,
        location: u.location || '-',
        totalBookings: bs.length,
        totalSpent,
        kycStatus: kycMap[u.id] || '-',
        status: u.status,
        _user: u
      }
    })
  }, [farmers, bookings, paymentsMap, favoriteMap, lastLoginMap, kycMap])

  const columns: Column<any>[] = [
    { key: 'name', header: 'Farmer Name', sort: (a, b) => String(a.name).localeCompare(String(b.name)) },
    { key: 'phone', header: 'Phone' },
    { key: 'location', header: 'Location', sort: (a, b) => String(a.location).localeCompare(String(b.location)) },
    { key: 'totalBookings', header: 'Total Bookings', sort: (a, b) => a.totalBookings - b.totalBookings },
    { key: 'totalSpent', header: 'Total Amount Spent', sort: (a, b) => a.totalSpent - b.totalSpent, render: r => `₹${r.totalSpent.toLocaleString()}` },
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
            <option value="totalSpent">Total Amount Spent</option>
            <option value="totalBookings">Total Bookings</option>
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
              'Farmer Name': r.name,
              'Phone': r.phone,
              'Location': r.location,
              'Total Bookings': r.totalBookings,
              'Total Amount Spent': r.totalSpent,
              'KYC Status': r.kycStatus,
              'Status': r.status,
            }))
            exportToExcel(rowsForExport, 'Farmers')
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700 dark:text-neutral-200"><path fill="currentColor" d="M5 4h14a2 2 0 012 2v2H3V6a2 2 0 012-2zm-2 6h20v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm5 2l2 3 2-3h2l-3 4 3 4h-2l-2-3-2 3H8l3-4-3-4h2z"/></svg>
        </button>
        <button
          aria-label="Export PDF"
          className="p-2 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700"
          onClick={() => {
            const headers = ['Farmer Name','Phone','Location','Total Bookings','Total Amount Spent','KYC Status','Status']
            const rowsForExport = rows.map(r => ({
              'Farmer Name': r.name,
              'Phone': r.phone,
              'Location': r.location,
              'Total Bookings': r.totalBookings,
              'Total Amount Spent': r.totalSpent,
              'KYC Status': r.kycStatus,
              'Status': r.status,
            }))
            exportToPdf('Farmers', headers, rowsForExport)
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 text-neutral-700 dark:text-neutral-200"><path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 2v4h4"/></svg>
        </button>
        </div>
      </div>
      <DataTable
        title="Farmers"
        data={rows}
        columns={columns}
        defaultSortKey="totalSpent"
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key, dir) => { setSortKey(key); setSortDir(dir) }}
      />
    </div>
  )
}

export default FarmersManagement
