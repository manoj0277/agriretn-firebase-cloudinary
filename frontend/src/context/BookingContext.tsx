import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Booking, DamageReport, Item, ItemCategory } from '../types';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { useToast } from './ToastContext';
import { useNotification } from './NotificationContext';
import { useItem } from './ItemContext';

interface BookingContextType {
    bookings: Booking[];
    damageReports: DamageReport[];
    addBooking: (bookingData: Omit<Booking, 'id'> | Omit<Booking, 'id'>[]) => Promise<void>;
    cancelBooking: (bookingId: string) => void;
    rejectBooking: (bookingId: string) => void;
    raiseDispute: (bookingId: string) => void;
    resolveDispute: (bookingId: string) => void;
    reportDamage: (report: Omit<DamageReport, 'id' | 'status' | 'timestamp'>) => Promise<void>;
    resolveDamageClaim: (reportId: number) => Promise<void>;
    acceptBookingRequest: (bookingId: string, supplierId: number, itemId: number, options?: { operateSelf?: boolean, quantityToProvide?: number }) => boolean;
    markAsArrived: (bookingId: string) => void;
    verifyOtpAndStartWork: (bookingId: string, otp: string) => void;
    completeWork: (bookingId: string) => void;
    makeFinalPayment: (bookingId: string, method?: 'Cash' | 'Online') => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const generateBookingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `AGB-${part1}-${part2}`;
};

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
    const { showToast } = useToast();
    const { addNotification } = useNotification();
    const { items, updateItem } = useItem();

    useEffect(() => {
        if (!supabaseConfigured) return;
        const loadBookings = async () => {
            try {
                const { data, error } = await supabase.from('bookings').select('*');
                if (error) throw error;
                setBookings((data || []) as Booking[]);
            } catch {
                showToast('Could not load bookings.', 'error');
            }
        };
        const loadReports = async () => {
            try {
                const { data } = await supabase.from('damageReports').select('*');
                setDamageReports((data || []) as DamageReport[]);
            } catch {}
        };
        loadBookings();
        loadReports();
        const ch = supabase
            .channel('bookings-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
                const newRec = (payload.new || payload.old) as any as Booking;
                setBookings(prev => {
                    if (payload.eventType === 'DELETE') {
                        return prev.filter(b => b.id !== (newRec as any).id);
                    }
                    const idx = prev.findIndex(b => b.id === (newRec as any).id);
                    const next = [...prev];
                    if (idx >= 0) next[idx] = newRec;
                    else next.unshift(newRec);
                    return next;
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    const addBooking = async (newBookingsData: Omit<Booking, 'id'> | Omit<Booking, 'id'>[]) => {
        const bookingsDataToAdd = Array.isArray(newBookingsData) ? newBookingsData : [newBookingsData];
        
        const bookingsToAdd: Booking[] = bookingsDataToAdd.map(data => ({
            ...data,
            id: generateBookingId(),
        }));
        try {
            const { error } = await supabase.from('bookings').upsert(bookingsToAdd);
            if (error) throw error;
        } catch {
            showToast('Failed to create booking.', 'error');
            return;
        }
        
        const firstBooking = bookingsDataToAdd[0];
        let message = 'Booking created!';
        if (firstBooking.status === 'Searching') {
            message = 'Request sent!';
        } else if (firstBooking.status === 'Pending Confirmation') {
            message = 'Request sent!';
        }
        
        showToast(message, 'success');
    };
    
    const rejectBooking = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || booking.status !== 'Pending Confirmation') {
            showToast("Cannot reject this booking.", "error");
            return;
        }

        supabase.from('bookings').update({ status: 'Searching', isRebroadcast: true, supplierId: undefined, itemId: undefined }).eq('id', bookingId);
        showToast("Booking rejected. It is now a broadcast to all suppliers.", "info");
        addNotification({
            userId: booking.farmerId,
            message: `Your direct request was rejected and is now being sent to all suppliers. Prices may vary.`,
            type: 'booking'
        });
    };

    const cancelBooking = (bookingId: string) => {
        const bookingToCancel = bookings.find(b => b.id === bookingId);
        if (!bookingToCancel) {
            showToast("Booking not found.", "error");
            return;
        }

        if (bookingToCancel.itemId) {
            const itemToRelease = items.find(i => i.id === bookingToCancel!.itemId);
            if (itemToRelease) {
                const updatedItem: Item = { ...itemToRelease };
                if (bookingToCancel.quantity) {
                    updatedItem.quantityAvailable = (itemToRelease.quantityAvailable || 0) + bookingToCancel.quantity;
                     if(updatedItem.quantityAvailable > 0) {
                        updatedItem.available = true;
                     }
                } else {
                    updatedItem.available = true;
                }
                updateItem(updatedItem);
            }
        }

        supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', bookingId);
        showToast('Booking has been cancelled.', 'warning');
    };
    
    const acceptBookingRequest = (bookingId: string, supplierId: number, itemId: number, options?: { operateSelf?: boolean; quantityToProvide?: number }): boolean => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || !['Searching', 'Awaiting Operator', 'Pending Confirmation'].includes(booking.status)) {
            showToast('This job is no longer available.', 'error');
            return false;
        }

        const item = items.find(i => i.id === itemId);
        if (!item || !item.available) {
            showToast('Selected item is not available.', 'error');
            return false;
        }
        
        const machineCategories = [ItemCategory.Tractors, ItemCategory.Harvesters, ItemCategory.JCB, ItemCategory.Borewell];

        // --- Case 1: Driver accepts an 'Awaiting Operator' booking ---
        if (booking.status === 'Awaiting Operator' && item.category === ItemCategory.Drivers) {
            // Price calculation will happen at completion time now.
            supabase.from('bookings').update({ status: 'Confirmed', operatorId: supplierId }).eq('id', bookingId);
            updateItem({ ...item, available: false });
            
            showToast('Operator job confirmed!', 'success');
            const machineItem = items.find(i => i.id === booking.itemId);
            addNotification({ userId: booking.farmerId, message: `An operator has been found for your ${machineItem?.name} booking!`, type: 'booking' });
            if (booking.supplierId) {
                addNotification({ userId: booking.supplierId, message: `A driver has accepted the operator job for booking ${booking.id}.`, type: 'booking' });
            }
            return true;
        }

        // --- Case 2: Specific supplier confirms a 'Pending Confirmation' booking ---
        if (booking.status === 'Pending Confirmation') {
             supabase.from('bookings').update({ status: 'Confirmed' }).eq('id', bookingId);
             updateItem({ ...item, available: false });
             showToast('Direct request confirmed!', 'success');
             addNotification({ userId: booking.farmerId, message: `Your request for ${item.name} has been confirmed!`, type: 'booking' });
             return true;
        }


        // --- Case 3: Standard 'Searching' booking acceptance ---
        if (booking.status === 'Searching') {
            const isMachineWithOp = machineCategories.includes(item.category) && booking.operatorRequired;

            if (isMachineWithOp && options?.operateSelf === false) {
                supabase.from('bookings').update({ status: 'Awaiting Operator', supplierId: supplierId, itemId: itemId }).eq('id', bookingId);
                updateItem({ ...item, available: false });
                showToast('Machine confirmed. Broadcasting request for operator.', 'success');
                addNotification({ userId: booking.farmerId, message: `${item.name} is confirmed for your booking. We are now finding a driver.`, type: 'booking' });
                return true;
            }

            const quantityToConfirm = options?.quantityToProvide || booking.quantity || 1;
            if ((item.quantityAvailable || 0) < quantityToConfirm && booking.quantity) {
                showToast('Selected item does not have enough quantity.', 'error');
                return false;
            }

            const isPartial = booking.allowMultipleSuppliers && booking.quantity && quantityToConfirm < booking.quantity;

            const newConfirmedBooking: Booking = {
                ...booking,
                id: isPartial ? generateBookingId() : booking.id, // Keep ID if not partial
                supplierId,
                itemId,
                status: 'Confirmed',
                quantity: quantityToConfirm,
                operatorId: (isMachineWithOp && options?.operateSelf === true) ? supplierId : undefined,
                allowMultipleSuppliers: false,
            };

            const updatedItem = { ...item };
            if (updatedItem.quantityAvailable != null) {
                updatedItem.quantityAvailable -= quantityToConfirm;
                if (updatedItem.quantityAvailable <= 0) updatedItem.available = false;
            } else {
                updatedItem.available = false;
            }
            updateItem(updatedItem);

            supabase.from('bookings').upsert([newConfirmedBooking]);
            if (isPartial) {
                const remainingBooking: Booking = {
                    ...booking,
                    quantity: booking.quantity! - quantityToConfirm,
                };
                supabase.from('bookings').upsert([remainingBooking]);
            }
            
            addNotification({ userId: booking.farmerId, message: `Your request for ${item.name} has been confirmed!`, type: 'booking' });
            showToast('Job accepted! The farmer has been notified.', 'success');
            return true;
        }

        return false;
    };

    const raiseDispute = (bookingId: string) => {
        supabase.from('bookings').update({ disputeRaised: true }).eq('id', bookingId);
        showToast('Dispute has been raised. Admin will review it shortly.', 'info');
    };

    const resolveDispute = (bookingId: string) => {
         supabase.from('bookings').update({ disputeResolved: true }).eq('id', bookingId);
        showToast('Dispute marked as resolved.', 'success');
    };
    
    const reportDamage = async (reportData: Omit<DamageReport, 'id' | 'status' | 'timestamp'>) => {
        const newReport: DamageReport = {
            id: Date.now(),
            ...reportData,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        try {
            const { error } = await supabase.from('damageReports').upsert([newReport]);
            if (error) throw error;
            await supabase.from('bookings').update({ damageReported: true }).eq('id', String(reportData.bookingId));
            showToast('Damage report submitted to admin.', 'success');
        } catch {
            showToast('Failed to submit damage report.', 'error');
        }
    };

    const resolveDamageClaim = async (reportId: number) => {
        try {
            const { error } = await supabase.from('damageReports').update({ status: 'resolved' }).eq('id', reportId);
            if (error) throw error;
            showToast('Damage claim marked as resolved.', 'success');
        } catch {
            showToast('Failed to resolve damage claim.', 'error');
        }
    };

    const generateOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();

    const markAsArrived = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const otp = generateOtp();
        supabase.from('bookings').update({ status: 'Arrived', otpCode: otp, otpVerified: false }).eq('id', bookingId);
        showToast('Status updated to Arrived.', 'success');
        addNotification({ userId: booking.farmerId, message: `Your service has arrived. Share this OTP with the supplier to start work: ${otp}`, type: 'booking' });
    };

    const verifyOtpAndStartWork = (bookingId: string, otp: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;
        if (booking.status !== 'Arrived' || !booking.otpCode) {
            showToast('Cannot start work yet.', 'error');
            return;
        }
        if (booking.otpCode !== otp) {
            showToast('Invalid OTP. Please try again.', 'error');
            return;
        }
        supabase.from('bookings').update({ status: 'In Process', otpVerified: true, workStartTime: new Date().toISOString() }).eq('id', bookingId);
        showToast('OTP verified. Work has now started.', 'success');
        addNotification({ userId: booking.farmerId, message: `Supplier started work for booking #${bookingId.substring(0, 5)}.`, type: 'booking' });
        if (booking.supplierId) {
            addNotification({ userId: booking.supplierId, message: `OTP verified. You have started work for booking #${bookingId.substring(0, 5)}.`, type: 'booking' });
        }
    };

    const completeWork = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || !booking.workStartTime || booking.status !== 'In Process') {
            showToast("Cannot complete work that hasn't started.", "error");
            return;
        }

        const item = items.find(i => i.id === booking.itemId);
        if (!item) {
            showToast("Could not find item details for price calculation.", "error");
            return;
        }

        const workEndTime = new Date().toISOString();
        const durationMs = new Date(workEndTime).getTime() - new Date(booking.workStartTime).getTime();
        let durationHours: number;

        if (item.category === ItemCategory.Drones) {
            // For drones, round up to the nearest hour, but don't enforce a 1-hour minimum charge.
            // A 0-hour job should still be billed as 1 hour.
            durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
            if (durationHours === 0) {
                durationHours = 1;
            }
        } else {
            // For all other items, round up to the nearest hour with a minimum of 1 hour.
            durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
        }

        const purposeDetails = item.purposes.find(p => p.name === booking.workPurpose);
        const priceForPurpose = purposeDetails?.price || 0;
        
        const operatorPrice = (booking.operatorRequired && item.operatorCharge) ? item.operatorCharge : 0;
        
        const finalPrice = ((priceForPurpose + operatorPrice) * durationHours) + (booking.distanceCharge || 0);

        const adminCommission = 0;
        const supplierPaymentAmount = finalPrice;
        const paymentDetails = {
            farmerAmount: finalPrice,
            supplierAmount: supplierPaymentAmount,
            commission: adminCommission,
            totalAmount: finalPrice,
            paymentDate: new Date().toISOString()
        };

        supabase.from('bookings').update({
            status: 'Pending Payment',
            workEndTime,
            endTime: workEndTime.split('T')[1].substring(0, 5),
            finalPrice,
            farmerPaymentAmount: finalPrice,
            supplierPaymentAmount,
            adminCommission,
            paymentDetails
        }).eq('id', bookingId);
        showToast('Work marked as completed! Awaiting farmer payment.', 'success');
        addNotification({ userId: booking.farmerId, message: `Work for booking #${bookingId.substring(0, 5)} is complete. Please complete the payment of ₹${finalPrice.toLocaleString()}.`, type: 'booking' });
    };

    const makeFinalPayment = (bookingId: string, method: 'Cash' | 'Online' = 'Cash') => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || booking.status !== 'Pending Payment') {
            showToast("Cannot make final payment for this booking.", "error");
            return;
        }
        const finalPrice = booking.finalPrice || booking.estimatedPrice || 0;
        const adminCommission = 0;
        const supplierPaymentAmount = finalPrice;
        const paymentDetails = {
            farmerAmount: finalPrice,
            supplierAmount: supplierPaymentAmount,
            commission: adminCommission,
            totalAmount: finalPrice,
            paymentDate: new Date().toISOString(),
            method
        };

        supabase.from('bookings').update({
            status: 'Completed',
            finalPaymentId: method === 'Cash' ? `cash_${Date.now()}` : `final_pay_${Date.now()}`,
            paymentMethod: method,
            farmerPaymentAmount: finalPrice,
            supplierPaymentAmount,
            adminCommission,
            paymentDetails
        }).eq('id', bookingId);
        showToast(method === 'Cash' ? 'Cash payment recorded! Booking completed.' : 'Final payment successful! Your booking is complete.', 'success');
        if (booking.supplierId) {
            addNotification({ userId: booking.supplierId, message: `${method === 'Cash' ? 'Cash' : 'Online'} payment received for booking #${bookingId.substring(0, 5)}.`, type: 'booking' });
        }
    };

    const value = useMemo(() => ({ bookings, damageReports, addBooking, cancelBooking, rejectBooking, raiseDispute, resolveDispute, reportDamage, resolveDamageClaim, acceptBookingRequest, markAsArrived, verifyOtpAndStartWork, completeWork, makeFinalPayment }), [bookings, damageReports]);

    return (
        <BookingContext.Provider value={value}>
            {children}
        </BookingContext.Provider>
    );
};

export const useBooking = (): BookingContextType => {
    const context = useContext(BookingContext);
    if (context === undefined) {
        throw new Error('useBooking must be used within a BookingProvider');
    }
    return context;
};