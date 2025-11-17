import React, { useState, useMemo } from 'react';
import { AppView, Booking } from '../types';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useBooking } from '../context/BookingContext';
import Button from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

interface PaymentScreenProps {
    booking: Booking;
    goBack: () => void;
    navigate: (view: AppView) => void;
    fromCompletion?: boolean;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ booking, goBack, navigate, fromCompletion }) => {
    const { user, allUsers } = useAuth();
    const { items } = useItem();
    const { makeFinalPayment } = useBooking();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [selectedMethod, setSelectedMethod] = useState<'Cash' | 'UPI'>('Cash');
    const [isPaying, setIsPaying] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState<boolean>(!!fromCompletion);

    const item = useMemo(() => items.find(i => i.id === booking.itemId), [items, booking.itemId]);
    const farmer = useMemo(() => allUsers.find(u => u.id === booking.farmerId), [allUsers, booking.farmerId]);
    const supplier = useMemo(() => booking.supplierId ? allUsers.find(u => u.id === booking.supplierId) : undefined, [allUsers, booking.supplierId]);

    const isFarmer = user?.id === booking.farmerId;

    const costDetails = useMemo(() => {
        const subtotal = booking.finalPrice || booking.estimatedPrice || 0;
        const platformFee = 0; // Platform fee set to 0% for now
        const grandTotal = subtotal + platformFee;

        return { subtotal, platformFee, grandTotal };

    }, [booking]);

    const handlePayment = () => {
        if (selectedMethod === 'UPI') {
            showToast('UPI payments are temporarily disabled. Please pay in cash.', 'error');
            return;
        }
        setIsPaying(true);
        // In a real app, you would integrate a payment gateway here.
        // For this simulation, we'll just use a timeout.
        setTimeout(() => {
            makeFinalPayment(booking.id);
            setIsPaying(false);
            showToast('Payment successful! Booking completed.', 'success');
            navigate({ view: 'HOME' }); // Go home after payment
            navigate({ view: 'RATE_ITEM', booking }); // Then prompt for a review
        }, 2000);
    };

    const getWorkDuration = (start: string, end: string) => {
        const durationMs = new Date(end).getTime() - new Date(start).getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const DetailRow: React.FC<{ label: string, value: string | number, isTotal?: boolean }> = ({ label, value, isTotal = false }) => (
        <div className={`flex justify-between items-center py-2 ${isTotal ? 'font-bold text-lg' : 'text-sm'}`}>
            <span className={isTotal ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-300'}>{label}</span>
            <span className={isTotal ? 'text-primary' : 'font-semibold text-neutral-800 dark:text-neutral-100'}>
                {typeof value === 'number' ? `₹${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
            </span>
        </div>
    );
    
    return (
        <div className="flex flex-col h-screen">
            <Header title={isFarmer ? t('completePayment') : t('paymentDetails')} onBack={goBack} />
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                {showSummaryModal && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-[90%] max-w-md border border-neutral-200 dark:border-neutral-700">
                            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                                <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-50">{t('paymentDetails')}</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('bookingSummary')}</p>
                                <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                                    <p><strong>Booking:</strong> #{booking.id.slice(0, 6)}</p>
                                    <p><strong>Item:</strong> {item?.name || booking.itemCategory}</p>
                                    {supplier && <p><strong>Supplier:</strong> {supplier.name}</p>}
                                    <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                                    <p><strong>Time:</strong> {booking.startTime} - {booking.endTime}</p>
                                </div>
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    <div className="flex justify-between py-2">
                                        <span className="text-neutral-600 dark:text-neutral-300">{isFarmer ? t('totalToPay') : t('totalToReceive')}</span>
                                        <span className="font-bold text-primary">₹{(isFarmer ? costDetails.grandTotal : costDetails.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {isFarmer && (
                                        <div className="flex justify-between py-2">
                                            <span className="text-neutral-600 dark:text-neutral-300">{t('platformFee')}</span>
                                            <span className="font-semibold">₹{costDetails.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Select Payment Method</p>
                                    <div className="flex gap-2 mt-2">
                                        <button 
                                            onClick={() => setSelectedMethod('Cash')}
                                            className={`flex-1 py-2 rounded-lg border-2 ${selectedMethod === 'Cash' ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 dark:border-neutral-600'}`}
                                        >
                                            Cash
                                        </button>
                                        <button 
                                            onClick={() => setSelectedMethod('UPI')}
                                            disabled
                                            className={`flex-1 py-2 rounded-lg border-2 cursor-not-allowed opacity-60 border-neutral-200 dark:border-neutral-600`}
                                        >
                                            UPI (Disabled)
                                        </button>
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">UPI will be available soon. Please pay by cash for now.</p>
                                </div>
                            </div>
                            <div className="p-4 flex gap-2 justify-end border-t border-neutral-200 dark:border-neutral-700">
                                <Button variant="secondary" onClick={() => setShowSummaryModal(false)}>{t('cancel')}</Button>
                                <Button onClick={() => setShowSummaryModal(false)}>{t('proceedToPayment')}</Button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">{t('bookingSummary')}</h2>
                    <p><strong>{item?.name || booking.itemCategory}</strong></p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {booking.startTime} - {booking.endTime}
                        {booking.workStartTime && booking.workEndTime && (
                            <span className="font-semibold text-primary"> ({getWorkDuration(booking.workStartTime, booking.workEndTime)})</span>
                        )}
                    </p>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">{t('costBreakdown')}</h2>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        <DetailRow label={isFarmer ? t('totalToPay') : t('totalToReceive')} value={costDetails.subtotal} />
                        {isFarmer && <DetailRow label={t('platformFee')} value={costDetails.platformFee} />}
                    </div>
                     <div className="border-t border-neutral-200 dark:border-neutral-600 mt-2 pt-2">
                        <DetailRow label={isFarmer ? t('grandTotal') : t('totalToReceive')} value={isFarmer ? costDetails.grandTotal : costDetails.subtotal} isTotal />
                    </div>
                </div>

                {isFarmer ? (
                    <div className="space-y-4">
                        <div>
                            <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">{t('selectPaymentMethod')}</h2>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => setSelectedMethod('Cash')} 
                                    className={`flex-1 py-3 text-sm font-semibold rounded-lg border-2 transition-all ${selectedMethod === 'Cash' ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'}`}
                                >
                                    Cash
                                </button>
                                <button 
                                    onClick={() => setSelectedMethod('UPI')} 
                                    disabled 
                                    className={`flex-1 py-3 text-sm font-semibold rounded-lg border-2 transition-all cursor-not-allowed opacity-60 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200`}
                                >
                                    UPI (Disabled)
                                </button>
                            </div>
                        </div>
                        <Button onClick={handlePayment} disabled={isPaying}>
                            {isPaying ? t('processing') : `${t('confirmAndPay')} ₹${costDetails.grandTotal.toFixed(2)}`}
                        </Button>
                    </div>
                ) : (
                     <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <p className="font-semibold text-blue-800 dark:text-blue-200">{t('awaitingPaymentFrom', { name: farmer?.name || 'the farmer' })}</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PaymentScreen;