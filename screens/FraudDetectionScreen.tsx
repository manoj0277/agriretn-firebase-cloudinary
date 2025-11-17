import React, { useEffect, useMemo, useState } from 'react'
import { useBooking } from '../context/BookingContext'
import { supabase } from '../lib/supabase'
import { Notification } from '../types'

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
    <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
  </div>
)

const FraudDetectionScreen: React.FC = () => {
  const { bookings } = useBooking()
  const [alerts, setAlerts] = useState<Notification[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('type', 'admin')
      setAlerts((data || []) as any)
    }
    load()
    const ch = supabase
      .channel('fraud-detection')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        if ((payload.new as any)?.type === 'admin') {
          setAlerts(prev => [payload.new as any, ...prev].slice(0, 100))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const metrics = useMemo(() => {
    const rebroadcasts = bookings.filter(b => b.isRebroadcast).length
    const disputes = bookings.filter(b => b.disputeRaised).length
    const delaysComp = bookings.filter(b => (b.discountAmount || 0) > 0).length
    const suspicious = alerts.length
    return { rebroadcasts, disputes, delaysComp, suspicious }
  }, [bookings, alerts])

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
    </div>
  )
}

export default FraudDetectionScreen