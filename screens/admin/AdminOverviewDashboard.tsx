import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useItem } from '../../context/ItemContext'
import { useBooking } from '../../context/BookingContext'
import { UserRole, ItemCategory } from '../../types'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-gray-200 dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700" style={{ overflow: 'hidden' }}>
    <p className="text-xs text-neutral-500 dark:text-neutral-400" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
  </div>
)

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

const AdminOverviewDashboard: React.FC = () => {
  const { allUsers } = useAuth()
  const { items } = useItem()
  const { bookings } = useBooking()
  const [payments, setPayments] = useState<any[]>([])
  const [activity, setActivity] = useState<{ type: string; text: string; ts: string }[]>([])

  useEffect(() => {
    // TODO: Replace with actual payment API when ready
    setPayments([])
    // Real-time updates will be added later
  }, [])

  const totals = useMemo(() => {
    const farmers = allUsers.filter(u => u.role === UserRole.Farmer).length
    const suppliers = allUsers.filter(u => u.role === UserRole.Supplier).length
    const totalBookings = bookings.length
    const cancelled = bookings.filter(b => b.status === 'Cancelled').length
    const revenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0)
    const machines = items.length
    const complaints = activity.filter(a => a.type === 'Support').length
    const activeUsersCutoff = Date.now() - 15 * 60 * 1000
    const activeUsers = allUsers.filter(u => (u.blockedDates?.length ?? 0) >= 0 && u.location).filter(() => true).length // placeholder
    return { farmers, suppliers, totalBookings, revenue, machines, complaints, cancelled, activeUsers }
  }, [allUsers, bookings, payments, items, activity])

  const dailyBookings = useMemo(() => {
    const map = new Map<string, number>()
    bookings.forEach(b => {
      if (b.date) {
        const d = b.date;
        map.set(d, (map.get(d) || 0) + 1)
      }
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => (a || '').localeCompare(b || ''))
      .map(([date, count]) => ({ date, count }))
  }, [bookings])

  const farmerVsSupplierGrowth = useMemo(() => {
    const mapF = new Map<string, number>()
    const mapS = new Map<string, number>()
    allUsers.filter(u => u.role !== UserRole.Admin).forEach(u => {
      const key = '2025' // placeholder if no registration date
      if (u.role === UserRole.Farmer) mapF.set(key, (mapF.get(key) || 0) + 1)
      else mapS.set(key, (mapS.get(key) || 0) + 1)
    })
    return [{ period: '2025', farmers: mapF.get('2025') || 0, suppliers: mapS.get('2025') || 0 }]
  }, [allUsers])

  const demandByCategory = useMemo(() => {
    const map = new Map<ItemCategory, number>()
    bookings.forEach(b => map.set(b.itemCategory, (map.get(b.itemCategory) || 0) + 1))
    return Array.from(map.entries()).map(([cat, cnt]) => ({ name: cat, value: cnt }))
  }, [bookings])

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>()
    payments.forEach(p => { const d = (p.date || '').slice(0, 10); map.set(d, (map.get(d) || 0) + (p.amount || 0)) })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))
  }, [payments])

  // Safety check for data
  if (!allUsers || !bookings || !items) {
    console.warn('AdminOverviewDashboard: Missing data context', { allUsers, bookings, items })
    return <div className="p-4">Loading dashboard data...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Farmers" value={totals.farmers} />
        <Stat label="Total Suppliers" value={totals.suppliers} />
        <Stat label="Total Bookings" value={totals.totalBookings} />
        <Stat label="Total Revenue" value={`₹${totals.revenue.toLocaleString()}`} />
        <Stat label="Active Users" value={totals.activeUsers} />
        <Stat label="Total Machines" value={totals.machines} />
        <Stat label="Complaints/Tickets" value={totals.complaints} />
        <Stat label="Cancelled Bookings" value={totals.cancelled} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        <div className="bg-gray-200 dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-semibold mb-2">Daily bookings trend</h4>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-semibold mb-2">Farmer vs Supplier growth</h4>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={farmerVsSupplierGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="farmers" fill="#22c55e" />
                <Bar dataKey="suppliers" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-semibold mb-2">Machine demand by category</h4>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={demandByCategory} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                  {demandByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h4 className="font-semibold mb-2">Revenue chart</h4>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h4 className="font-semibold mb-2">Live Activity</h4>
        <ul className="space-y-2">
          {activity.slice(0, 20).map((a, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-200">{a.text}</span>
              <span className="text-neutral-500 dark:text-neutral-400">{new Date(a.ts).toLocaleTimeString()}</span>
            </li>
          ))}
          {activity.length === 0 && (
            <li className="text-neutral-500 dark:text-neutral-400">No activity yet</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default AdminOverviewDashboard