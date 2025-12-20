import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import Header from '../components/Header';
import { AppView, Booking } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface BookingHistoryScreenProps {
  navigate: (view: AppView) => void;
  goBack: () => void;
}

const BookingHistoryScreen: React.FC<BookingHistoryScreenProps> = ({ navigate, goBack }) => {
  const { user } = useAuth();
  const { bookings, cancelBooking } = useBooking();
  const { items } = useItem();
  const { t } = useLanguage();

  const isSupplier = user?.role === 'Supplier';
  const history = bookings.filter(b => (
    isSupplier ? (b.supplierId === user?.id || b.operatorId === user?.id) : (b.farmerId === user?.id)
  ) && b.status !== 'Cancelled');

  const getDuration = (b: Booking): number => {
    if (b.workStartTime && b.workEndTime) {
      const start = new Date(b.workStartTime).getTime();
      const end = new Date(b.workEndTime).getTime();
      const hrs = (end - start) / (1000 * 60 * 60);
      return Math.max(1, Math.round(hrs));
    }
    if (b.estimatedDuration) return b.estimatedDuration;
    return 0;
  };

  return (
    <div className="dark:text-neutral-200 bg-green-50 dark:bg-neutral-900 min-h-screen">
      <Header title={t('bookingHistory')} onBack={goBack} />
      <div className="p-4 space-y-4">
        {history.length === 0 ? (
          <p className="text-neutral-700 dark:text-neutral-300">No past bookings found.</p>
        ) : (
          [...history].reverse().map(b => {
            const item = items.find(i => i.id === b.itemId);
            const duration = getDuration(b);
            return (
              <div key={b.id} className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{item?.name || b.itemCategory}</h3>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{b.date}</p>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">Location: {b.location}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">ID: {b.id}</p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 text-neutral-800">{b.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Start: {b.startTime} • Duration: {duration} hr(s)</div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Total: ₹{(b.finalPrice ?? b.estimatedPrice ?? 0).toLocaleString()}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Method: {b.paymentMethod || 'Cash'}</div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Advance: ₹{(b.advanceAmount || 0).toLocaleString()}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Advance TXN: {b.advancePaymentId || 'N/A'}</div>
                  <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Final TXN: {b.finalPaymentId || 'N/A'}</div>
                </div>
                {b.paymentDetails && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Farmer Paid: ₹{b.paymentDetails.farmerAmount.toLocaleString()}</div>
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">Supplier Payout: ₹{(b.paymentDetails.supplierAmount || 0).toLocaleString()}</div>
                  </div>
                )}
                <div className="mt-3 text-right text-sm font-bold">
                  <span>Total: ₹{(b.finalPrice ?? b.estimatedPrice ?? 0).toLocaleString()}</span>
                </div>

                {
                  (b.status === 'Confirmed' || b.status === 'Arrived') && (
                    <div className="mt-3 border-t border-neutral-100 dark:border-neutral-600 pt-2 flex justify-between items-center">
                      {(b as any).lateStart ? <p className="text-xs text-red-600 font-semibold">Supplier is late (&gt;30m).</p> : <span></span>}
                      <button
                        onClick={() => {
                          if (window.confirm('Do you want to cancel this booking?')) {
                            cancelBooking(b.id);
                          }
                        }}
                        className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded hover:bg-red-100 transition-colors"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )
                }
              </div>
            );
          })
        )}
      </div>
    </div >
  );
};

export default BookingHistoryScreen;