import React, { useState, useMemo } from 'react';
import { AppView, Booking, DamageReport } from '../types';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { formatDateTime, formatDate, formatTime } from '../utils/dateFormat';
import Header from '../components/Header';

const BookingAdminCard: React.FC<{
    booking: Booking,
    farmerName: string,
    supplierName: string,
    itemName: string,
    onClick: () => void,
}> = ({ booking, farmerName, supplierName, itemName, onClick }) => {
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
        <div
            onClick={onClick}
            className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">{itemName}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Booked by: {farmerName}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{booking.date} @ {booking.startTime}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${getStatusClasses(booking.status)}`}>
                    {booking.status}
                </span>
            </div>
        </div>
    );
};

const BookingDetailsModal: React.FC<{
    booking: Booking,
    farmerName: string,
    supplierName: string,
    itemName: string,
    damageReport?: DamageReport,
    onResolveDispute: (id: string) => void,
    onResolveDamage: (id: number) => void,
    onCancel: (id: string) => void,
    onClose: () => void,
}> = ({ booking, farmerName, supplierName, itemName, damageReport, onResolveDispute, onResolveDamage, onCancel, onClose }) => {
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transform transition-all" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-white dark:bg-neutral-800 p-6 border-b border-neutral-100 dark:border-neutral-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{itemName}</h2>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusClasses(booking.status)}`}>
                            {booking.status}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Booked By</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">{farmerName}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Supplier</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">{supplierName}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Date & Time</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">{formatDate(booking.date)}</p>
                            <p className="text-xs text-neutral-500">{booking.startTime}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Duration</p>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">{booking.estimatedDuration ? `${booking.estimatedDuration} hrs` : (booking.endTime || 'N/A')}</p>
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Location</p>
                        <p className="text-sm text-neutral-900 dark:text-white mt-1 flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {booking.location}
                        </p>
                    </div>

                    {/* Price Section */}
                    {booking.finalPrice && (
                        <div className="bg-white dark:bg-neutral-700/50 rounded-xl p-4 flex justify-between items-center border border-neutral-100 dark:border-neutral-700">
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Total Price</span>
                            <span className="text-xl font-bold text-primary">₹{booking.finalPrice.toLocaleString()}</span>
                        </div>
                    )}

                    {/* OTP & Flags */}
                    <div className="flex flex-wrap gap-2">
                        {booking.otpCode && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                OTP: {booking.otpCode}
                            </span>
                        )}
                        {booking.isAgentBooking && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                Agent Booking
                            </span>
                        )}
                        {booking.lateStart && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                Late Start
                            </span>
                        )}
                    </div>

                    {/* Additional Instructions */}
                    {booking.additionalInstructions && (
                        <div className="bg-white dark:bg-neutral-700/30 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700">
                            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Instructions</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">{booking.additionalInstructions}</p>
                        </div>
                    )}

                    {/* Damage Report */}
                    {damageReport && (
                        <div className="p-4 border border-red-200 dark:border-red-800 rounded-xl bg-red-50 dark:bg-red-900/20">
                            <div className="flex items-center mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-bold text-red-700">Damage Reported</p>
                            </div>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 italic mb-3">"{damageReport.description}"</p>
                            {damageReport.status === 'pending' ? (
                                <button onClick={() => { onResolveDamage(damageReport.id); onClose(); }} className="w-full py-2 text-sm bg-white border border-red-200 text-red-700 font-semibold rounded-lg hover:bg-red-50 transition-colors shadow-sm">
                                    Resolve Claim
                                </button>
                            ) : (
                                <div className="flex items-center text-sm text-green-700 font-semibold">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Claim Resolved
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dispute */}
                    {(booking.disputeRaised && !booking.disputeResolved) && (
                        <div className="p-4 border border-orange-200 dark:border-orange-800 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                            <div className="flex items-center mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-bold text-orange-700">Dispute Raised</p>
                            </div>
                            <button onClick={() => { onResolveDispute(booking.id); onClose(); }} className="w-full py-2 text-sm bg-white border border-orange-200 text-orange-700 font-semibold rounded-lg hover:bg-orange-50 transition-colors shadow-sm">
                                Resolve Dispute
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                    <div className="bg-neutral-50 dark:bg-neutral-700/30 p-4 border-t border-neutral-100 dark:border-neutral-700 flex justify-end">
                        <button
                            onClick={() => {
                                if (window.confirm('Admin: Cancel this booking?')) {
                                    onCancel(booking.id);
                                    onClose();
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                        >
                            Cancel Booking
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ManageBookingsScreen: React.FC = () => {
    const { bookings, damageReports, resolveDispute, resolveDamageClaim, cancelBooking } = useBooking();
    const { allUsers } = useAuth();
    const { items } = useItem();
    const [filter, setFilter] = useState<'all' | 'disputed' | Booking['status']>('all');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const getUserName = (id: string) => allUsers.find(u => u.id === id)?.name || 'Unknown';
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
        <div className="dark:text-neutral-200 bg-green-50 dark:bg-neutral-900 min-h-screen">
            <div className="p-4 space-y-3">
                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
                    {(['all', 'disputed', 'Searching', 'Confirmed', 'Completed', 'Cancelled'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full capitalize whitespace-nowrap transition-colors ${filter === status ? 'bg-primary text-white' : 'bg-white border border-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {filteredBookings.map(booking => {
                    const supplierName = booking.supplierId ? getUserName(booking.supplierId) : 'Unknown';
                    return (
                        <BookingAdminCard
                            key={booking.id}
                            booking={booking}
                            farmerName={getUserName(booking.farmerId)}
                            supplierName={supplierName}
                            itemName={getItemName(booking.itemId) || `Request: ${booking.itemCategory}`}
                            onClick={() => setSelectedBooking(booking)}
                        />
                    );
                })}
            </div>

            {/* Modal */}
            {selectedBooking && (
                <BookingDetailsModal
                    booking={selectedBooking}
                    farmerName={getUserName(selectedBooking.farmerId)}
                    supplierName={selectedBooking.supplierId ? getUserName(selectedBooking.supplierId) : 'Unknown'}
                    itemName={getItemName(selectedBooking.itemId) || `Request: ${selectedBooking.itemCategory}`}
                    damageReport={damageReports.find(dr => dr.bookingId === selectedBooking.id)}
                    onResolveDispute={resolveDispute}
                    onResolveDamage={resolveDamageClaim}
                    onCancel={cancelBooking}
                    onClose={() => setSelectedBooking(null)}
                />
            )}
        </div>
    );
};

export default ManageBookingsScreen;