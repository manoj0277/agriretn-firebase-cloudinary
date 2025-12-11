import React, { useEffect, useMemo, useState } from 'react'
import { useBooking } from '../context/BookingContext'
import Button from '../components/Button'
import { Notification, FraudFlag, RiskLevel, UserRole } from '../types'
import { useAuth } from '../context/AuthContext'
import { useSupport } from '../context/SupportContext'
import { useNotification } from '../context/NotificationContext'

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
    <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
  </div>
)

const FraudDetectionScreen: React.FC = () => {
  const { bookings } = useBooking()
  const { allUsers, suspendUser, reactivateUser } = useAuth()
  const { tickets } = useSupport()
  const { addNotification } = useNotification()
  const [alerts, setAlerts] = useState<Notification[]>([])
  const [flags, setFlags] = useState<FraudFlag[]>([])

  const { notifications } = useNotification()

  useEffect(() => {
    const adminAlerts = notifications.filter(n => n.type === 'admin')
    setAlerts(adminAlerts)
  }, [notifications])

  const metrics = useMemo(() => {
    const rebroadcasts = bookings.filter(b => b.isRebroadcast).length
    const disputes = bookings.filter(b => b.disputeRaised).length
    const delaysComp = bookings.filter(b => (b.discountAmount || 0) > 0).length
    const suspicious = alerts.length
    return { rebroadcasts, disputes, delaysComp, suspicious }
  }, [bookings, alerts])

  useEffect(() => {
    const calcRisk = (score: number): RiskLevel => score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW'
    const userFlags: FraudFlag[] = []
    const now = Date.now()
    const cancellationsByUser: Record<number, number> = {}
    const otpFailuresByUser: Record<number, number> = {}
    const instantCancelByUser: Record<number, number> = {}
    const suspiciousTimingByUser: Record<number, number> = {}
    bookings.forEach(b => {
      if (b.status === 'Cancelled') {
        cancellationsByUser[b.farmerId] = (cancellationsByUser[b.farmerId] || 0) + 1
        if (b.finalPaymentId) {
          instantCancelByUser[b.farmerId] = (instantCancelByUser[b.farmerId] || 0) + 1
        }
      }
      if (b.status === 'Arrived' && b.otpVerified === false) {
        otpFailuresByUser[b.farmerId] = (otpFailuresByUser[b.farmerId] || 0) + 1
      }
      const hr = parseInt((b.startTime || '00:00').split(':')[0] || '0')
      if (hr < 5 || hr > 22) {
        suspiciousTimingByUser[b.farmerId] = (suspiciousTimingByUser[b.farmerId] || 0) + 1
      }
    })
    Object.entries(cancellationsByUser).forEach(([uid, count]) => {
      if (count >= 5) {
        const score = Math.min(100, 20 + count * 6)
        userFlags.push({ id: `farmer-cancel-${uid}`, type: 'Farmer', userId: String(uid), reason: 'Frequent cancellations', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
      }
    })
    Object.entries(otpFailuresByUser).forEach(([uid, count]) => {
      if (count >= 3) {
        const score = Math.min(100, 30 + count * 10)
        userFlags.push({ id: `farmer-otp-${uid}`, type: 'Farmer', userId: String(uid), reason: 'Too many OTP failures', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
      }
    })
    Object.entries(instantCancelByUser).forEach(([uid, count]) => {
      if (count >= 2) {
        const score = Math.min(100, 25 + count * 12)
        userFlags.push({ id: `farmer-instant-${uid}`, type: 'Farmer', userId: String(uid), reason: 'Booking and cancelling instantly', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
      }
    })
    Object.entries(suspiciousTimingByUser).forEach(([uid, count]) => {
      if (count >= 3) {
        const score = Math.min(100, 15 + count * 8)
        userFlags.push({ id: `farmer-time-${uid}`, type: 'Farmer', userId: String(uid), reason: 'Suspicious booking timings', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
      }
    })
    const complaintsBySupplier: Record<number, number> = {}
    tickets.forEach(t => { if (t.againstUserId) complaintsBySupplier[t.againstUserId] = (complaintsBySupplier[t.againstUserId] || 0) + 1 })
    Object.entries(complaintsBySupplier).forEach(([uid, count]) => {
      if (count >= 3) {
        const score = Math.min(100, 40 + count * 10)
        userFlags.push({ id: `supplier-complaints-${uid}`, type: 'Supplier', userId: String(uid), reason: 'Complaints > 3', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
      }
    })
    const rejectsBySupplier: Record<number, number> = {}
    bookings.forEach(b => { if (b.supplierId && b.isRebroadcast) rejectsBySupplier[b.supplierId] = (rejectsBySupplier[b.supplierId] || 0) + 1 })
    Object.entries(rejectsBySupplier).forEach(([uid, count]) => {
      if (count >= 5) {
        const score = Math.min(100, 35 + count * 7)
        userFlags.push({ id: `supplier-rejects-${uid}`, type: 'Supplier', userId: String(uid), reason: 'Rejecting too many bookings', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
      }
    })
    const lowUtil: number[] = (() => {
      const counts: Record<number, number> = {}
      bookings.forEach(b => { if (b.itemId) counts[b.itemId] = (counts[b.itemId] || 0) + 1 })
      return Object.entries(counts).filter(([_, c]) => c < 1).map(([id]) => Number(id))
    })()
    allUsers.filter(u => u.role === UserRole.Supplier).forEach(u => {
      const score = lowUtil.length > 0 ? 55 : 0
      if (score > 0) userFlags.push({ id: `supplier-lowutil-${u.id}`, type: 'Supplier', userId: u.id, reason: 'Low machine utilization', score, risk: calcRisk(score), timestamp: new Date(now).toISOString() })
    })
    const multiPhones: Record<string, string[]> = {}
    allUsers.forEach(u => { const key = (u.phone || '').replace(/\D/g, ''); if (!key) return; multiPhones[key] = multiPhones[key] || []; multiPhones[key].push(u.id) })
    Object.entries(multiPhones).forEach(([phone, ids]) => { if (ids.length >= 2) ids.forEach(id => userFlags.push({ id: `multi-acc-${id}`, type: 'Farmer', userId: String(id), reason: 'Multiple accounts same phone', score: 60, risk: 'MEDIUM', timestamp: new Date(now).toISOString() })) })
    setFlags(userFlags)
  }, [bookings, tickets, allUsers])

  const actions = {
    suspend: (userId: number) => suspendUser(userId),
    warn: (userId: number, msg: string) => addNotification({ userId: String(userId), message: msg, type: 'admin' }),
    forceKyc: (userId: number) => reactivateUser(userId),
    safe: (userId: number) => addNotification({ userId: '0', message: `User ${userId} marked safe by admin`, type: 'admin' })
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rebroadcasted Requests" value={metrics.rebroadcasts} />
        <Stat label="Disputes Raised" value={metrics.disputes} />
        <Stat label="Delay Compensation" value={metrics.delaysComp} />
        <Stat label="Admin Alerts" value={metrics.suspicious} />
      </div>
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h4 className="font-semibold mb-2">Live Fraud/Anomaly Alerts</h4>
        <ul className="space-y-2">
          {alerts.slice(0, 50).map(a => (
            <li key={a.id} className="flex justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-200">{a.message}</span>
              <span className="text-neutral-500 dark:text-neutral-400">{new Date(a.timestamp || new Date().toISOString()).toLocaleTimeString()}</span>
            </li>
          ))}
          {alerts.length === 0 && (
            <li className="text-neutral-500 dark:text-neutral-400">No alerts yet</li>
          )}
        </ul>
      </div>
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <h4 className="font-semibold mb-2">Fraud Panel</h4>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {flags.map(f => (
            <li key={f.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{f.type}</span>
                  <span className="text-sm bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded">User #{f.userId}</span>
                </div>
                <div className="text-neutral-600 dark:text-neutral-300 mb-1">{f.reason}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Score: <span className="font-semibold">{f.score}</span></span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${f.risk === 'HIGH' ? 'bg-red-100 text-red-700' : f.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {f.risk} RISK
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => actions.suspend(f.userId!)} variant="secondary" className="text-xs px-3 py-1">Suspend</Button>
                <Button onClick={() => actions.warn(f.userId!, 'Your account shows suspicious activity.')} variant="secondary" className="text-xs px-3 py-1">Warning</Button>
                <Button onClick={() => actions.forceKyc(f.userId!)} variant="secondary" className="text-xs px-3 py-1">Force KYC</Button>
                <Button onClick={() => actions.safe(f.userId!)} variant="secondary" className="text-xs px-3 py-1">Mark Safe</Button>
              </div>
            </li>
          ))}
          {flags.length === 0 && (
            <li className="py-2 text-neutral-500 dark:text-neutral-400">No flagged users</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default FraudDetectionScreen