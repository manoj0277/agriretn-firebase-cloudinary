

import React, { useState } from 'react';
import { AppView } from '../types';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';

interface PaymentHistoryScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const PaymentHistoryScreen: React.FC<PaymentHistoryScreenProps> = ({ navigate, goBack }) => {
    const { user } = useAuth();
    const { bookings } = useBooking();
    const { items } = useItem();
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

    const paymentHistory = bookings
        .filter(b => b.farmerId === user?.id && b.status !== 'Cancelled' && b.advanceAmount && b.advanceAmount > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="dark:text-neutral-200">
            <Header title="Payment History" onBack={goBack} />
            <div className="p-4 space-y-4">
                {paymentHistory.length > 0 ? (
                    paymentHistory.map(booking => {
                        const item = items.find(i => i.id === booking.itemId);
                        const isExpanded = expandedBookingId === booking.id;
                        const isPaidInFull = booking.advanceAmount && booking.estimatedPrice && booking.advanceAmount >= booking.estimatedPrice;
                        const isCompleted = booking.status === 'Completed';

                        const totalPaid = isCompleted ? booking.finalPrice : booking.advanceAmount;

                        return (
                            <div key={booking.id} className="bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm overflow-hidden">
                                <div 
                                    className="flex justify-between items-start p-4 cursor-pointer"
                                    onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-3 rounded-full ${isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'}`}>
                                            {isCompleted ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{item?.name || booking.itemCategory}</h3>
                                            <p className="text-sm text-neutral-600 dark:text-neutral-300">{booking.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center space-x-2">
                                        <div>
                                            <p className="font-bold text-lg text-neutral-800 dark:text-neutral-100">₹{totalPaid?.toLocaleString()}</p>
                                            <p className={`text-xs font-semibold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                                                {isCompleted ? 'Paid in Full' : 'Advance Paid'}
                                            </p>
                                        </div>
                                        <div className={`transform transition-transform duration-200 text-neutral-400 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="p-4 border-t bg-neutral-50 dark:bg-neutral-800 space-y-2 dark:border-neutral-600">
                                        <h4 className="font-bold text-neutral-800 dark:text-neutral-100">Payment Breakdown</h4>
                                        
                                        {isPaidInFull && isCompleted ? (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600 dark:text-neutral-300">Full Payment (Upfront):</span> 
                                                <strong className="dark:text-neutral-100">₹{booking.advanceAmount?.toLocaleString()}</strong>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-neutral-600 dark:text-neutral-300">Advance Paid:</span> 
                                                    <strong className="dark:text-neutral-100">₹{booking.advanceAmount?.toLocaleString()}</strong>
                                                </div>
                                                {isCompleted ? (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-neutral-600 dark:text-neutral-300">Final Payment:</span> 
                                                        <strong className="dark:text-neutral-100">₹{(booking.finalPrice! - booking.advanceAmount!).toLocaleString()}</strong>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-neutral-600 dark:text-neutral-300">Remaining Due:</span> 
                                                        <strong className="dark:text-neutral-100">₹{(booking.estimatedPrice! - booking.advanceAmount!).toLocaleString()}</strong>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {booking.distanceCharge && booking.distanceCharge > 0 && (
                                             <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600 dark:text-neutral-300">Distance Surcharge:</span> 
                                                <strong className="dark:text-neutral-100">₹{booking.distanceCharge.toLocaleString()}</strong>
                                            </div>
                                        )}


                                        <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold dark:border-neutral-700">
                                            <span className="text-neutral-800 dark:text-neutral-100">{isCompleted ? 'Total Paid:' : 'Total Est. Price:'}</span> 
                                            <strong className="dark:text-neutral-100">₹{(isCompleted ? booking.finalPrice : booking.estimatedPrice)?.toLocaleString()}</strong>
                                        </div>

                                        <div className="mt-3 border-t dark:border-neutral-700 pt-2 text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                                            {isPaidInFull || (isCompleted && booking.advanceAmount === booking.finalPrice) ? (
                                                <p>Transaction ID: {booking.advancePaymentId || 'N/A'}</p>
                                            ) : (
                                                <>
                                                    <p>Advance TXN ID: {booking.advancePaymentId || 'N/A'}</p>
                                                    {isCompleted && <p>Final TXN ID: {booking.finalPaymentId || 'N/A'}</p>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16">
                        <p className="text-neutral-700 dark:text-neutral-300">No payment history found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentHistoryScreen;