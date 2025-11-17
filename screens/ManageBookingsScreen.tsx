import React, { useState, useMemo } from 'react';
import { AppView, Booking, DamageReport } from '../types';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import Header from '../components/Header';

const BookingAdminCard: React.FC<{ 
    booking: Booking, 
    farmerName: string, 
    itemName: string, 
    damageReport?: DamageReport,
    onResolveDispute: (id: string) => void,
    onResolveDamage: (id: number) => void,
}> = ({ booking, farmerName, itemName, damageReport, onResolveDispute, onResolveDamage }) => {
    const getStatusClasses = (status: Booking['status']) => {
        switch (status) {
            case 'Searching': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'Awaiting Operator': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'Confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Arrived': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
            case 'In Process': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'Expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{itemName}</h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">Booked by: {farmerName}</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{booking.date} @ {booking.startTime} - {booking.estimatedDuration ? `${booking.estimatedDuration} hours` : booking.endTime}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusClasses(booking.status)}`}>
                    {booking.status}
                </span>
            </div>
            
            {damageReport && (
                <div className="mt-4 border-t border-neutral-100 dark:border-neutral-600 pt-3">
                    <p className="text-sm font-bold text-red-600">Damage Reported:</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">"{damageReport.description}"</p>
                    {damageReport.status === 'pending' ? (
                        <div className="text-right mt-2">
                            <button onClick={() => onResolveDamage(damageReport.id)} className="text-sm bg-green-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-700">Resolve Claim</button>
                        </div>
                    ) : (
                         <p className="text-sm text-green-700 font-semibold text-right mt-2">Claim Resolved</p>
                    )}
                </div>
            )}

            {(booking.disputeRaised && !booking.disputeResolved) && (
                 <div className="text-right mt-4 border-t border-neutral-100 dark:border-neutral-600 pt-3 flex justify-end">
                    <button onClick={() => onResolveDispute(booking.id)} className="text-sm bg-blue-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-blue-700">Resolve Dispute</button>
                 </div>
            )}
            {booking.disputeResolved && (
                 <div className="text-right mt-4 border-t border-neutral-100 dark:border-neutral-600 pt-3">
                    <p className="text-sm text-green-700 font-semibold">Dispute Resolved</p>
                 </div>
            )}
            
            {booking.status === 'Completed' && booking.paymentDetails && (
                <div className="mt-4 border-t border-neutral-100 dark:border-neutral-600 pt-3">
                    <p className="text-sm font-bold text-green-600 mb-2">Payment Breakdown:</p>
                    <div className="text-sm space-y-1 text-neutral-700 dark:text-neutral-300">
                        <p><strong>Farmer Payment:</strong> ₹{booking.paymentDetails.farmerAmount.toLocaleString()}</p>
                        <p><strong>Supplier Payment:</strong> ₹{booking.paymentDetails.supplierAmount.toLocaleString()}</p>
                        <p><strong>Admin Commission:</strong> ₹{booking.paymentDetails.commission.toLocaleString()}</p>
                        <p><strong>Payment Date:</strong> {new Date(booking.paymentDetails.paymentDate).toLocaleDateString()}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const ManageBookingsScreen: React.FC = () => {
    const { bookings, damageReports, resolveDispute, resolveDamageClaim } = useBooking();
    const { allUsers } = useAuth();
    const { items } = useItem();
    const [filter, setFilter] = useState<'all' | 'disputed' | Booking['status']>('all');

    const getUserName = (id: number) => allUsers.find(u => u.id === id)?.name || 'Unknown';
    const getItemName = (id?: number) => items.find(m => m.id === id)?.name || 'N/A';
    
    const filteredBookings = useMemo(() => {
        const sorted = [...bookings].reverse();
        if (filter === 'all') return sorted;
        if (filter === 'disputed') {
            return sorted.filter(b => (b.disputeRaised && !b.disputeResolved) || (b.damageReported && damageReports.find(dr => dr.bookingId === b.id)?.status === 'pending'));
        }
        return sorted.filter(b => b.status === filter);
    }, [bookings, filter, damageReports]);

    return (
        <div className="dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
            <div className="p-4 space-y-3">
                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
                    {(['all', 'disputed', 'Searching', 'Confirmed', 'Completed', 'Cancelled'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full capitalize whitespace-nowrap transition-colors ${filter === status ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {filteredBookings.map(booking => {
                    const damageReport = damageReports.find(dr => dr.bookingId === booking.id);
                    return (
                        <BookingAdminCard 
                            key={booking.id}
                            booking={booking}
                            farmerName={getUserName(booking.farmerId)}
                            itemName={getItemName(booking.itemId) || `Request: ${booking.itemCategory}`}
                            damageReport={damageReport}
                            onResolveDispute={resolveDispute}
                            onResolveDamage={resolveDamageClaim}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ManageBookingsScreen;