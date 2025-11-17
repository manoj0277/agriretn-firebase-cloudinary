import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { Booking, DamageReport, Item, ItemCategory } from '../types';
import { bookings as mockBookings, damageReports as mockDamageReports } from '../data/mockData';
import { useToast } from './ToastContext';
import { useNotification } from './NotificationContext';
import { useItem } from './ItemContext';

interface BookingContextType {
    bookings: Booking[];
    damageReports: DamageReport[];
    addBooking: (bookingData: Omit<Booking, 'id'> | Omit<Booking, 'id'>[]) => void;
    cancelBooking: (bookingId: string) => void;
    rejectBooking: (bookingId: string) => void;
    raiseDispute: (bookingId: string) => void;
    resolveDispute: (bookingId: string) => void;
    reportDamage: (report: Omit<DamageReport, 'id' | 'status' | 'timestamp'>) => void;
    resolveDamageClaim: (reportId: number) => void;
    acceptBookingRequest: (bookingId: string, supplierId: number, itemId: number, options?: { operateSelf?: boolean, quantityToProvide?: number }) => boolean;
    markAsArrived: (bookingId: string) => void;
    verifyOtpAndStartWork: (bookingId: string, otp: string) => void;
    completeWork: (bookingId: string) => void;
    makeFinalPayment: (bookingId: string) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const generateBookingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `AGB-${part1}-${part2}`;
};

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [bookings, setBookings] = useState<Booking[]>(mockBookings);
    const [damageReports, setDamageReports] = useState<DamageReport[]>(mockDamageReports);
    const { showToast } = useToast();
    const { addNotification } = useNotification();
    const { items, updateItem } = useItem();

    const addBooking = (newBookingsData: Omit<Booking, 'id'> | Omit<Booking, 'id'>[]) => {
        const bookingsDataToAdd = Array.isArray(newBookingsData) ? newBookingsData : [newBookingsData];
        
        const bookingsToAdd: Booking[] = bookingsDataToAdd.map(data => ({
            ...data,
            id: generateBookingId(),
        }));

        setBookings(prevBookings => [
            ...prevBookings,
            ...bookingsToAdd
        ]);
        
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

        const updatedBooking: Booking = {
            ...booking,
            status: 'Searching',
            isRebroadcast: true,
            supplierId: undefined,
            itemId: undefined,
        };

        setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
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

        setBookings(prevBookings =>
            prevBookings.map(b =>
                b.id === bookingId ? { ...b, status: 'Cancelled' } : b
            )
        );
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
            const updatedBooking: Booking = {
                ...booking,
                status: 'Confirmed',
                operatorId: supplierId, // The driver's ID
            };
            
            setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
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
             const updatedBooking: Booking = { ...booking, status: 'Confirmed' };
             setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
             updateItem({ ...item, available: false });
             showToast('Direct request confirmed!', 'success');
             addNotification({ userId: booking.farmerId, message: `Your request for ${item.name} has been confirmed!`, type: 'booking' });
             return true;
        }


        // --- Case 3: Standard 'Searching' booking acceptance ---
        if (booking.status === 'Searching') {
            const isMachineWithOp = machineCategories.includes(item.category) && booking.operatorRequired;

            if (isMachineWithOp && options?.operateSelf === false) {
                 const updatedBooking: Booking = {
                    ...booking,
                    status: 'Awaiting Operator',
                    supplierId: supplierId,
                    itemId: itemId,
                };
                setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
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

            setBookings(prev => {
                const otherBookings = prev.filter(b => b.id !== bookingId);
                const updatedBookings = [...otherBookings, newConfirmedBooking];
                
                if (isPartial) {
                    updatedBookings.push({
                        ...booking,
                        quantity: booking.quantity! - quantityToConfirm,
                    });
                }
                return updatedBookings;
            });
            
            addNotification({ userId: booking.farmerId, message: `Your request for ${item.name} has been confirmed!`, type: 'booking' });
            showToast('Job accepted! The farmer has been notified.', 'success');
            return true;
        }

        return false;
    };

    const raiseDispute = (bookingId: string) => {
        setBookings(prevBookings =>
            prevBookings.map(b =>
                b.id === bookingId ? { ...b, disputeRaised: true } : b
            )
        );
        showToast('Dispute has been raised. Admin will review it shortly.', 'info');
    };

    const resolveDispute = (bookingId: string) => {
         setBookings(prevBookings =>
            prevBookings.map(b =>
                b.id === bookingId ? { ...b, disputeResolved: true } : b
            )
        );
        showToast('Dispute marked as resolved.', 'success');
    };
    
    const reportDamage = (reportData: Omit<DamageReport, 'id' | 'status' | 'timestamp'>) => {
        const newReport: DamageReport = {
            id: Date.now(),
            ...reportData,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        setDamageReports(prev => [...prev, newReport]);
        setBookings(prev => prev.map(b => b.id === reportData.bookingId ? { ...b, damageReported: true } : b));
        showToast('Damage report submitted to admin.', 'success');
    };

    const resolveDamageClaim = (reportId: number) => {
        setDamageReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
        showToast('Damage claim marked as resolved.', 'success');
    };

    const generateOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();

    const markAsArrived = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const otp = generateOtp();
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Arrived', otpCode: otp, otpVerified: false } : b));
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
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'In Process', otpVerified: true, workStartTime: new Date().toISOString() } : b));
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

        const updatedBooking: Booking = {
            ...booking,
            status: 'Pending Payment',
            workEndTime,
            endTime: workEndTime.split('T')[1].substring(0, 5),
            finalPrice,
        };

        setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
        showToast('Work marked as completed! Awaiting farmer payment.', 'success');
        addNotification({ userId: booking.farmerId, message: `Work for booking #${bookingId.substring(0, 5)} is complete. Please complete the payment of ₹${finalPrice.toLocaleString()}.`, type: 'booking' });
    };

    const makeFinalPayment = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || booking.status !== 'Pending Payment') {
            showToast("Cannot make final payment for this booking.", "error");
            return;
        }

        const updatedBooking: Booking = {
            ...booking,
            status: 'Completed',
            finalPaymentId: `final_pay_${Date.now()}`
        };

        setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
        showToast('Final payment successful! Your booking is complete.', 'success');
        if (booking.supplierId) {
            addNotification({ userId: booking.supplierId, message: `Final payment received for booking #${bookingId.substring(0, 5)}.`, type: 'booking' });
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