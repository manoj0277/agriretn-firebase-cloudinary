import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Booking, DamageReport, Item, ItemCategory } from '../types';
import { useToast } from './ToastContext';
import { useNotification } from './NotificationContext';
import { useItem } from './ItemContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

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
    completeBooking: (bookingId: string) => void;
    makeFinalPayment: (bookingId: string, method?: 'Cash' | 'Online') => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const generateBookingId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array(5).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `AGB-${part1}-${part2}`;
};

const getDurationInHours = (startTime: string, endTime?: string, estimatedDuration?: number): number => {
    // If estimated duration is provided, use it
    if (estimatedDuration) return estimatedDuration;

    // Fallback to old endTime calculation if needed
    if (!startTime || !endTime) return 3; // Default fallback
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return hours > 0 ? hours : 3; // Fallback if invalid
}

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
    const { showToast } = useToast();
    const { addNotification } = useNotification();
    const { items, updateItem } = useItem();

    const supplierRejectCounts: Record<number, { count: number; firstTs: number }> = {};

    useEffect(() => {
        const loadBookings = async () => {
            try {
                const res = await fetch(`${API_URL}/bookings`);
                if (res.ok) {
                    const data = await res.json();
                    setBookings(data);
                }
            } catch {
                showToast('Could not load bookings.', 'error');
            }
        };
        loadBookings();
    }, []);

    useEffect(() => {
        const loadReports = async () => {
            try {
                const res = await fetch(`${API_URL}/damage-reports`);
                if (res.ok) {
                    const data = await res.json();
                    setDamageReports(data);
                }
            } catch { }
        };
        loadReports();
    }, []);

    const addBooking = async (newBookingsData: Omit<Booking, 'id'> | Omit<Booking, 'id'>[]) => {
        const bookingsDataToAdd = Array.isArray(newBookingsData) ? newBookingsData : [newBookingsData];

        const bookingsToAdd: Booking[] = bookingsDataToAdd.map(data => ({
            ...data,
            id: generateBookingId(),
        }));
        try {
            const res = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingsToAdd)
            });
            if (!res.ok) throw new Error('Failed');
            // Optimistic update or refetch? Let's refetch or just add to state
            setBookings(prev => [...bookingsToAdd, ...prev]);
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

    useEffect(() => {
        const t = setInterval(() => {
            const now = new Date();
            const list = bookings.filter(b => b.status === 'Confirmed' && b.startTime && b.date && !b.otpVerified);
            list.forEach(async b => {
                const dt = new Date(b.date);
                const [hh, mm] = (b.startTime || '00:00').split(':');
                dt.setHours(parseInt(hh || '0'), parseInt(mm || '0'), 0, 0);
                const diff = now.getTime() - dt.getTime();
                if (diff > 20 * 60 * 1000) {
                    const comp = Math.round((b.finalPrice || b.estimatedPrice || 0) * 0.05);
                    await fetch(`${API_URL}/bookings/${b.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ discountAmount: comp })
                    });
                    addNotification({ userId: b.farmerId, message: 'Supplier delay detected. Compensation applied.', type: 'booking' });
                    addNotification({ userId: 0, message: `Delay >20m for booking ${b.id}.`, type: 'admin' });
                }
            });
        }, 60000);
        return () => clearInterval(t);
    }, [bookings]);

    const rejectBooking = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || booking.status !== 'Pending Confirmation') {
            showToast("Cannot reject this booking.", "error");
            return;
        }

        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Searching', isRebroadcast: true, supplierId: null, itemId: null })
        });
        showToast("Booking rejected. It is now a broadcast to all suppliers.", "info");
        addNotification({
            userId: booking.farmerId,
            message: `Your direct request was rejected and is now being sent to all suppliers. Prices may vary.`,
            type: 'booking'
        });
        if (booking.supplierId) {
            const sId = booking.supplierId;
            const now = Date.now();
            const rec = supplierRejectCounts[sId];
            if (!rec || now - rec.firstTs > 24 * 60 * 60 * 1000) {
                supplierRejectCounts[sId] = { count: 1, firstTs: now };
            } else {
                rec.count += 1;
                if (rec.count >= 3) {
                    addNotification({ userId: 0, message: `Supplier ${sId} rejected multiple direct requests in 24h.`, type: 'admin' });
                }
            }
        }
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Searching', isRebroadcast: true, supplierId: undefined, itemId: undefined } : b));
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
                    if (updatedItem.quantityAvailable > 0) {
                        updatedItem.available = true;
                    }
                } else {
                    updatedItem.available = true;
                }
                updateItem(updatedItem);
            }
        }

        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelled' })
        });
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
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

        const duration = Math.max(1, getDurationInHours(booking.startTime, undefined, booking.estimatedDuration));
        const surgeMultiplier = (() => {
            const month = new Date(booking.date || new Date().toISOString()).getMonth() + 1;
            let base = 1;
            if ([9, 10, 11].includes(month)) base = 1.25;
            if ([3, 4, 5].includes(month)) base = Math.max(base, 1.15);
            const demand = bookings.filter(b => b.itemCategory === booking.itemCategory && b.status === 'Searching' && b.location === booking.location).length;
            if (demand > 10) base = Math.max(base, 1.4);
            else if (demand > 5) base = Math.max(base, 1.25);
            return base;
        })();
        const machineCategories = [ItemCategory.Tractors, ItemCategory.Harvesters, ItemCategory.JCB, ItemCategory.Borewell];

        // --- Case 1: Driver accepts an 'Awaiting Operator' booking ---
        if (booking.status === 'Awaiting Operator' && item.category === ItemCategory.Drivers) {
            const driverItem = item;
            const machineItem = items.find(i => i.id === booking.itemId);
            const driverPrice = driverItem.purposes[0]?.price || 0;

            fetch(`${API_URL}/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Confirmed', operatorId: supplierId, finalPrice: booking.finalPrice! + (driverPrice * duration) })
            });
            updateItem({ ...driverItem, available: false });

            showToast('Operator job confirmed!', 'success');
            addNotification({ userId: booking.farmerId, message: `An operator has been found for your ${machineItem?.name} booking!`, type: 'booking' });
            if (booking.supplierId) {
                addNotification({ userId: booking.supplierId, message: `A driver has accepted the operator job for booking ${booking.id}.`, type: 'booking' });
            }
            return true;
        }

        // --- Case 2: Specific supplier confirms a 'Pending Confirmation' booking ---
        if (booking.status === 'Pending Confirmation') {
            const purposeDetails = item.purposes.find(p => p.name === booking.workPurpose);
            if (!purposeDetails) {
                showToast('This item does not support the requested work purpose.', 'error');
                return false;
            }
            const finalPrice = Math.round(((purposeDetails.price * duration) + ((booking.operatorRequired && item.operatorCharge) ? (item.operatorCharge * duration) : 0)) * surgeMultiplier);

            fetch(`${API_URL}/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Confirmed', finalPrice })
            });
            updateItem({ ...item, available: false });
            showToast('Direct request confirmed!', 'success');
            addNotification({ userId: booking.farmerId, message: `Your request for ${item.name} has been confirmed!`, type: 'booking' });
            return true;
        }


        // --- Case 3: Standard 'Searching' booking acceptance ---
        if (booking.status === 'Searching') {
            const purposeDetails = item.purposes.find(p => p.name === booking.workPurpose);
            if (!purposeDetails) {
                showToast('The selected item does not support the requested work purpose.', 'error');
                return false;
            }
            const priceForPurpose = purposeDetails.price;

            const isMachineWithOp = machineCategories.includes(item.category) && booking.operatorRequired;

            if (isMachineWithOp && options?.operateSelf === false) {
                const updatedBooking: Booking = {
                    ...booking,
                    status: 'Awaiting Operator',
                    supplierId: supplierId,
                    itemId: itemId,
                    finalPrice: Math.round(priceForPurpose * duration * surgeMultiplier),
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
                finalPrice: Math.round(((priceForPurpose * quantityToConfirm * duration) + ((booking.operatorRequired && item.operatorCharge) ? (item.operatorCharge * duration) : 0)) * surgeMultiplier),
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

            fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([newConfirmedBooking])
            });
            if (isPartial) {
                const remainingBooking: Booking = {
                    ...booking,
                    quantity: booking.quantity! - quantityToConfirm,
                };
                fetch(`${API_URL}/bookings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([remainingBooking])
                });
            }

            addNotification({ userId: booking.farmerId, message: `Your request for ${item.name} has been confirmed!`, type: 'booking' });
            showToast('Job accepted! The farmer has been notified.', 'success');
            return true;
        }

        return false;
    };

    const raiseDispute = (bookingId: string) => {
        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disputeRaised: true })
        });
        showToast('Dispute has been raised. Admin will review it shortly.', 'info');
    };

    const resolveDispute = (bookingId: string) => {
        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disputeResolved: true })
        });
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
            const res = await fetch(`${API_URL}/damage-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReport)
            });
            if (!res.ok) throw new Error('Failed');
            await fetch(`${API_URL}/bookings/${reportData.bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ damageReported: true })
            });
            showToast('Damage report submitted to admin.', 'success');
        } catch {
            showToast('Failed to submit damage report.', 'error');
        }
    };

    const resolveDamageClaim = async (reportId: number) => {
        try {
            const res = await fetch(`${API_URL}/damage-reports/${reportId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'resolved' })
            });
            if (!res.ok) throw new Error('Failed');
            showToast('Damage claim marked as resolved.', 'success');
        } catch {
            showToast('Failed to resolve damage claim.', 'error');
        }
    };

    const generateOtp = (): string => {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    };

    const markAsArrived = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const otp = generateOtp();
        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Arrived', otpCode: otp, otpVerified: false })
        });
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
        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'In Process', otpVerified: true, workStartTime: new Date().toISOString() })
        });
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'In Process', otpVerified: true, workStartTime: new Date().toISOString() } : b));
        showToast('OTP verified. Work has now started.', 'success');
        addNotification({ userId: booking.farmerId, message: `Supplier started work for booking #${bookingId.substring(0, 5)}.`, type: 'booking' });
        if (booking.supplierId) {
            addNotification({ userId: booking.supplierId, message: `OTP verified. You have started work for booking #${bookingId.substring(0, 5)}.`, type: 'booking' });
        }
    };

    const completeBooking = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        // Calculate payment breakdown
        const finalPrice = booking.finalPrice || booking.estimatedPrice || 0;
        const adminCommission = 0; // 0% commission
        const supplierPaymentAmount = finalPrice;

        // Create payment details
        const paymentDetails = {
            farmerAmount: finalPrice,
            supplierAmount: supplierPaymentAmount,
            commission: adminCommission,
            totalAmount: finalPrice,
            paymentDate: new Date().toISOString()
        };

        // If paid in full upfront, mark as completed directly.
        if (booking.advanceAmount && booking.estimatedPrice && booking.advanceAmount === booking.estimatedPrice) {
            fetch(`${API_URL}/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Completed', finalPrice: booking.estimatedPrice, finalPaymentId: booking.advancePaymentId, farmerPaymentAmount: finalPrice, supplierPaymentAmount: supplierPaymentAmount, adminCommission: adminCommission, paymentDetails: paymentDetails })
            });
            showToast('Work completed and already paid in full!', 'success');
            if (booking.supplierId) {
                addNotification({ userId: booking.supplierId, message: `Work for booking #${bookingId.substring(0, 5)} is complete. Payment of ₹${supplierPaymentAmount} will be processed.`, type: 'booking' });
            }
        } else { // Otherwise, move to pending payment
            fetch(`${API_URL}/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Pending Payment', finalPrice: finalPrice, farmerPaymentAmount: finalPrice, supplierPaymentAmount: supplierPaymentAmount, adminCommission: adminCommission, paymentDetails: paymentDetails })
            });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Pending Payment', finalPrice: finalPrice, paymentDetails: paymentDetails } : b));
            showToast('Work marked as completed! Please proceed to final payment.', 'success');
            if (booking.supplierId) {
                addNotification({ userId: booking.supplierId, message: `The farmer has marked booking #${bookingId.substring(0, 5)} as complete. Awaiting final payment of ₹${finalPrice}.`, type: 'booking' });
            }
        }
    };

    const recentPaymentTimestamps: number[] = [];

    const makeFinalPayment = (bookingId: string, method: 'Cash' | 'Online' = 'Cash') => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking || booking.status !== 'Pending Payment') {
            showToast("Cannot make final payment for this booking.", "error");
            return;
        }

        const finalPrice = booking.finalPrice || booking.estimatedPrice || 0;
        const adminCommission = 0; // 0% commission
        const supplierPaymentAmount = finalPrice;

        const paymentDetails = {
            farmerAmount: finalPrice,
            supplierAmount: supplierPaymentAmount,
            commission: adminCommission,
            totalAmount: finalPrice,
            paymentDate: new Date().toISOString(),
            method
        };

        fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Completed', finalPaymentId: method === 'Cash' ? `cash_${Date.now()}` : `final_pay_${Date.now()}`, paymentMethod: method, farmerPaymentAmount: finalPrice, supplierPaymentAmount: supplierPaymentAmount, adminCommission: adminCommission, paymentDetails: paymentDetails })
        });
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Completed', paymentDetails: paymentDetails } : b));
        showToast(method === 'Cash' ? 'Cash payment recorded! Booking completed.' : 'Final payment successful! Your booking is complete.', 'success');
        if (booking.supplierId) {
            addNotification({ userId: booking.supplierId, message: `${method === 'Cash' ? 'Cash' : 'Online'} payment received for booking #${bookingId.substring(0, 5)}. Supplier payout: ₹${supplierPaymentAmount}.`, type: 'booking' });
        }
        const now = Date.now();
        recentPaymentTimestamps.push(now);
        const windowStart = now - 10 * 60 * 1000;
        const recent = recentPaymentTimestamps.filter(ts => ts >= windowStart);
        if (recent.length >= 10) {
            addNotification({ userId: 0, message: 'Payment attempts spike detected in the last 10 minutes.', type: 'admin' });
        }
    };

    const value = useMemo(() => ({ bookings, damageReports, addBooking, cancelBooking, rejectBooking, raiseDispute, resolveDispute, reportDamage, resolveDamageClaim, acceptBookingRequest, markAsArrived, verifyOtpAndStartWork, completeBooking, makeFinalPayment }), [bookings, damageReports, items, updateItem, showToast, addNotification]);

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
