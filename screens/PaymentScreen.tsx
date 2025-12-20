import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Button from '../components/Button';
import { AppView, Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useBooking } from '../context/BookingContext';
import { useToast } from '../context/ToastContext';

interface PaymentScreenProps {
    booking: Booking;
    goBack: () => void;
    navigate: (view: AppView) => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ booking, goBack, navigate }) => {
    const { user, allUsers } = useAuth();
    const { items } = useItem();
    const { makeFinalPayment } = useBooking();
    const { showToast } = useToast();
    const [selectedMethod, setSelectedMethod] = useState<'Cash' | 'Online'>('Cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const item = useMemo(() => items.find(i => i.id === booking.itemId), [items, booking.itemId]);
    const farmer = useMemo(() => allUsers.find(u => u.id === booking.farmerId), [allUsers, booking.farmerId]);
    const supplier = useMemo(() => booking.supplierId ? allUsers.find(u => u.id === booking.supplierId) : undefined, [allUsers, booking.supplierId]);

    const isFarmer = user?.id === booking.farmerId;

    const breakdown = useMemo(() => {
        const total = booking.paymentDetails?.totalAmount ?? booking.finalPrice ?? booking.estimatedPrice ?? 0;
        const commission = booking.paymentDetails?.commission ?? 0; // 0% platform fee
        const supplierAmount = booking.paymentDetails?.supplierAmount ?? total;
        const farmerAmount = booking.paymentDetails?.farmerAmount ?? total;
        return { total, commission, supplierAmount, farmerAmount };
    }, [booking]);

    const handleConfirmCash = async () => {
        setIsSubmitting(true);
        // Simulate processing and then record cash payment
        setTimeout(() => {
            makeFinalPayment(booking.id, 'Cash');
            setIsSubmitting(false);
            showToast('Cash payment recorded successfully.', 'success');
            navigate({ view: 'HOME' });
        }, 800);
    };

    return (
        <div className="flex flex-col h-screen bg-green-50 dark:bg-neutral-900">
            <Header title={isFarmer ? 'Complete Payment' : 'Payment Details'} onBack={goBack} />

            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">Booking Summary</h2>
                    <p className="font-semibold">{item?.name || booking.itemCategory}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{booking.date}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Start: {booking.startTime} • Duration: {booking.estimatedDuration ? `${booking.estimatedDuration} hours` : 'N/A'}</p>
                    {farmer && supplier && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Farmer: {farmer.name} • Supplier: {supplier.name}</p>
                    )}
                </div>

                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">Payment Breakdown</h2>
                    <div className="space-y-1 text-sm">
                        <p><strong>Total Amount:</strong> ₹{breakdown.total.toLocaleString()}</p>
                        <p><strong>Supplier Payment:</strong> ₹{breakdown.supplierAmount.toLocaleString()}</p>
                        <p><strong>Admin Commission:</strong> ₹{breakdown.commission.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-lg mb-3 text-neutral-900 dark:text-neutral-50">Select Payment Method</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            className={`py-3 rounded-lg border-2 font-semibold ${selectedMethod === 'Cash' ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200'}`}
                            onClick={() => setSelectedMethod('Cash')}
                        >
                            Cash
                        </button>
                        <button
                            className={`py-3 rounded-lg border-2 font-semibold cursor-not-allowed opacity-60 ${selectedMethod === 'Online' ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200'}`}
                            disabled
                            onClick={() => setSelectedMethod('Online')}
                        >
                            Online (Disabled)
                        </button>
                    </div>

                    {isFarmer ? (
                        <div className="mt-4">
                            <Button onClick={handleConfirmCash} disabled={isSubmitting}>
                                {isSubmitting ? 'Processing…' : `Confirm Cash Payment ₹${breakdown.total.toLocaleString()}`}
                            </Button>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Online payments are coming soon.</p>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <Button onClick={handleConfirmCash} disabled={isSubmitting}>
                                {isSubmitting ? 'Recording…' : `Mark Cash Received ₹${breakdown.total.toLocaleString()}`}
                            </Button>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Suppliers can record cash once received.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentScreen;