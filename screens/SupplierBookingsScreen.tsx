

import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { useReview } from '../context/ReviewContext';
import { AppView, Booking } from '../types';
import Button from '../components/Button';
import StarRating from '../components/StarRating';

interface SupplierViewProps {
    navigate: (view: AppView) => void;
}

const SupplierBookingsScreen: React.FC<SupplierViewProps> = ({ navigate }) => {
    const { user, allUsers } = useAuth();
    const { bookings, markAsArrived, verifyOtpAndStartWork } = useBooking();
    const { items } = useItem();
    const { reviews } = useReview();

    const myBookings = useMemo(() => {
        return bookings.filter(b => b.supplierId === user?.id || b.operatorId === user?.id);
    }, [bookings, user]);

    const getFarmerName = (farmerId: number) => allUsers.find(u => u.id === farmerId)?.name || 'Unknown Farmer';
    const getItem = (itemId?: number) => items.find(i => i.id === itemId);

    const getStatusClasses = (status: Booking['status']) => {
        switch (status) {
            case 'Searching': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'Pending Confirmation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
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
    
    const activeBookings = useMemo(() => myBookings.filter(b => !['Completed', 'Cancelled', 'Expired'].includes(b.status)), [myBookings]);
    const pastBookings = useMemo(() => myBookings.filter(b => ['Completed', 'Cancelled', 'Expired'].includes(b.status)), [myBookings]);

    const renderBookingList = (list: Booking[], title: string) => (
        <div className="mb-6">
            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-2">{title}</h3>
            {list.length > 0 ? [...list].reverse().map(booking => {
                const item = getItem(booking.itemId);
                const farmer = allUsers.find(u => u.id === booking.farmerId);
                const isOperator = booking.operatorId === user?.id && booking.supplierId !== user?.id;
                const hasReview = reviews.some(r => r.bookingId === booking.id && r.reviewerId === user?.id && r.ratedUserId === booking.farmerId);

                return (
                    <div key={booking.id} className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 mb-3">
                        <div className="flex justify-between items-start mb-3">
                             <div>
                                <p className="font-bold text-lg text-neutral-800 dark:text-neutral-100">{item?.name || booking.itemCategory}</p>
                                <p className="text-sm text-neutral-600 dark:text-neutral-300">For: {getFarmerName(booking.farmerId)}</p>
                                {isOperator && <p className="text-xs font-semibold p-1 bg-purple-100 text-purple-800 rounded-md inline-block mt-1">Operator Job</p>}
                             </div>
                             <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusClasses(booking.status)}`}>
                                {booking.status}
                            </span>
                        </div>

                        <div className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                             <p><strong>Date:</strong> {booking.date} from {booking.startTime} - {booking.estimatedDuration ? `${booking.estimatedDuration} hours` : booking.endTime}</p>
                             {booking.status === 'Completed' && booking.paymentDetails ? (
                                 <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mt-2">
                                     <p className="font-semibold text-green-800 dark:text-green-300 mb-1">Payment Breakdown:</p>
                                     <div className="text-xs space-y-1">
                                         <p><strong>Total Amount:</strong> ₹{booking.paymentDetails.farmerAmount.toLocaleString()}</p>
                                         <p><strong>Your Payment:</strong> ₹{booking.paymentDetails.supplierAmount.toLocaleString()}</p>
                                         <p><strong>Admin Commission:</strong> ₹{booking.paymentDetails.commission.toLocaleString()}</p>
                                     </div>
                                 </div>
                             ) : booking.finalPrice && (
                                 <p><strong>Estimated Payout:</strong> ₹{booking.finalPrice.toLocaleString()}</p>
                             )}
                        </div>

                        <div className="text-right mt-4 border-t border-neutral-100 dark:border-neutral-600 pt-3 flex justify-end items-center flex-wrap gap-2">
                             {farmer && (booking.status === 'Confirmed' || booking.status === 'Arrived' || booking.status === 'In Process') && (
                                <button
                                    onClick={() => navigate({ view: 'CHAT', chatPartner: farmer, item })}
                                    className="text-primary hover:text-primary-dark font-semibold text-sm flex items-center space-x-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    <span>Chat with Farmer</span>
                                </button>
                             )}
                            {booking.status === 'Confirmed' && item?.currentLocation && (
                                <button
                                    onClick={() => navigate({ view: 'TRACKING', item })}
                                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                                >
                                    Track Item
                                </button>
                            )}
                            {booking.status === 'Confirmed' && (
                                <Button onClick={() => markAsArrived(booking.id)} className="w-auto px-4 py-1 text-sm">Mark as Arrived</Button>
                            )}
                            {booking.status === 'Arrived' && (
                                <Button
                                    onClick={() => {
                                        const entered = window.prompt('Enter OTP shared by farmer to start work');
                                        if (entered) verifyOtpAndStartWork(booking.id, entered.trim());
                                    }}
                                    className="w-auto px-4 py-1 text-sm"
                                >
                                    Start Work (OTP)
                                </Button>
                            )}
                            {booking.status === 'Pending Payment' && (
                                <Button
                                    onClick={() => navigate({ view: 'PAYMENT', booking })}
                                    className="w-auto px-4 py-1 text-sm animate-pulse"
                                >
                                    Record Cash Payment
                                </Button>
                            )}
                            {booking.status === 'Completed' && !hasReview && farmer && (
                                <button 
                                    onClick={() => navigate({ view: 'RATE_USER', booking })}
                                    className="text-primary hover:text-primary-dark font-semibold text-sm"
                                >
                                    Rate Farmer
                                </button>
                            )}
                             {booking.status === 'Completed' && hasReview && (
                                 <p className="text-sm text-neutral-600 dark:text-neutral-300">Rated</p>
                             )}
                        </div>
                    </div>
                );
            }) : <p className="text-center text-sm text-neutral-500 py-4">No {title.toLowerCase()} yet.</p>}
        </div>
    );
    
    return (
        <div className="p-4 space-y-4">
            {renderBookingList(activeBookings, "Upcoming & Active Bookings")}
            {renderBookingList(pastBookings, "Completed & Past Bookings")}
        </div>
    );
};

export default SupplierBookingsScreen;