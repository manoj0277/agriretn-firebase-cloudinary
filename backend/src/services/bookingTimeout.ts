import { BookingService, UserService, NotificationService } from './firestore';
import { Booking, Notification } from '../types';

/**
 * Check for bookings that have been in "Searching" status for more than 6 hours
 * and send notifications to farmers and admins
 */
export async function checkBookingTimeouts(): Promise<void> {
    try {
        console.log('[Timeout Checker] Running booking timeout check...');

        const now = new Date();
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

        // Get all bookings
        const allBookings = await BookingService.getAll();

        // Filter for bookings in "Searching" status that haven't been notified yet
        const timeoutBookings = allBookings.filter(b => {
            if (b.status !== 'Searching' || b.searchTimeoutNotified) {
                return false;
            }

            // Use createdAt if available, otherwise fall back to date
            const bookingCreatedAt = new Date(b.createdAt || b.date);
            return bookingCreatedAt < sixHoursAgo;
        });

        console.log(`[Timeout Checker] Found ${timeoutBookings.length} timeout bookings`);

        // Process each timeout booking
        for (const booking of timeoutBookings) {
            await notifyFarmerOfTimeout(booking);
            await notifyAdminOfTimeout(booking);

            // Mark as notified
            await BookingService.update(booking.id, { searchTimeoutNotified: true });
            console.log(`[Timeout Checker] Processed booking ${booking.id}`);
        }

        console.log('[Timeout Checker] Timeout check complete');
    } catch (error) {
        console.error('[Timeout Checker] Error checking booking timeouts:', error);
    }
}

/**
 * Notify farmer that their booking has been searching for 6+ hours
 */
async function notifyFarmerOfTimeout(booking: Booking): Promise<void> {
    const notification: Notification = {
        id: Date.now() + Math.random(),
        userId: booking.farmerId,
        message: `Your ${booking.itemCategory} booking at ${booking.location} has been searching for over 6 hours. Suppliers are busy - please be patience. You can expand the search radius to find more suppliers.`,
        type: 'booking',
        category: 'booking',
        priority: 'high',
        read: false,
        timestamp: new Date().toISOString()
    };

    await NotificationService.create(notification);
}

/**
 * Notify admin that a booking has been searching for 6+ hours
 */
async function notifyAdminOfTimeout(booking: Booking): Promise<void> {
    // Get all admin users
    const allUsers = await UserService.getAll();
    const admins = allUsers.filter(u => u.role === 'Admin');

    for (const admin of admins) {
        const notification: Notification = {
            id: Date.now() + Math.random(),
            userId: admin.id,
            message: `⚠️ Booking ${booking.id} (${booking.itemCategory} at ${booking.location}) has been searching for over 6 hours. Consider manually allotting to a trusted supplier.`,
            type: 'admin',
            category: 'booking',
            priority: 'urgent',
            read: false,
            timestamp: new Date().toISOString()
        };

        await NotificationService.create(notification);
    }
}

/**
 * Get the search duration in hours for a booking
 */
export function getSearchDurationHours(booking: Booking): number {
    const created = new Date(booking.createdAt || booking.date);
    const now = new Date();
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    return hours;
}

/**
 * Check for bookings that have passed their start time and auto-cancel if no supplier
 * Sends 3 escalating alerts to admin before cancellation
 */
export async function checkExpiredBookings(): Promise<void> {
    try {
        console.log('[Expiry Checker] Running booking expiry check...');

        const now = new Date();
        const allBookings = await BookingService.getAll();

        // Filter for bookings in "Searching" status
        const searchingBookings = allBookings.filter(b => b.status === 'Searching');

        for (const booking of searchingBookings) {
            // Parse booking date and start time
            const bookingDateTime = parseBookingDateTime(booking.date, booking.startTime);
            if (!bookingDateTime) continue;

            const timeUntilStart = bookingDateTime.getTime() - now.getTime();
            const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);

            const alertCount = booking.adminAlertCount || 0;
            const lastAlertTime = booking.lastAdminAlertTime ? new Date(booking.lastAdminAlertTime) : null;

            // Send alerts at: 2 hours before, 1 hour before, and at start time
            if (hoursUntilStart <= 2 && hoursUntilStart > 1 && alertCount === 0) {
                // First alert: 2 hours before
                await sendAdminUrgentAlert(booking, 1, '2 hours');
                await BookingService.update(booking.id, {
                    adminAlertCount: 1,
                    lastAdminAlertTime: now.toISOString()
                });
            } else if (hoursUntilStart <= 1 && hoursUntilStart > 0 && alertCount === 1) {
                // Second alert: 1 hour before
                await sendAdminUrgentAlert(booking, 2, '1 hour');
                await BookingService.update(booking.id, {
                    adminAlertCount: 2,
                    lastAdminAlertTime: now.toISOString()
                });
            } else if (hoursUntilStart <= 0 && hoursUntilStart > -0.25 && alertCount === 2) {
                // Third alert: At start time (final warning)
                await sendAdminUrgentAlert(booking, 3, 'NOW - booking will be auto-cancelled in 15 minutes');
                await BookingService.update(booking.id, {
                    adminAlertCount: 3,
                    lastAdminAlertTime: now.toISOString()
                });
            } else if (hoursUntilStart <= -0.25 && alertCount >= 3) {
                // Auto-cancel: 15 minutes after start time
                await autoCancelBooking(booking);
            }
        }

        console.log('[Expiry Checker] Expiry check complete');
    } catch (error) {
        console.error('[Expiry Checker] Error checking booking expiry:', error);
    }
}

/**
 * Parse booking date and time into a Date object
 */
function parseBookingDateTime(date: string, startTime: string): Date | null {
    try {
        // Assuming date format: YYYY-MM-DD and time format: HH:MM
        const [hours, minutes] = startTime.split(':');
        const bookingDate = new Date(date);
        bookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return bookingDate;
    } catch (error) {
        console.error('Error parsing booking date/time:', error);
        return null;
    }
}

/**
 * Send escalating urgent alerts to admin
 */
async function sendAdminUrgentAlert(booking: Booking, alertNumber: number, timeInfo: string): Promise<void> {
    const allUsers = await UserService.getAll();
    const admins = allUsers.filter(u => u.role === 'Admin');

    for (const admin of admins) {
        const notification: Notification = {
            id: Date.now() + Math.random(),
            userId: admin.id,
            message: `🚨 ALERT ${alertNumber}/3: Booking ${booking.id} (${booking.itemCategory} at ${booking.location}) starts in ${timeInfo}! Still no supplier. Please manually allot a trusted supplier immediately to prevent auto-cancellation!`,
            type: 'admin',
            category: 'booking',
            priority: 'urgent',
            read: false,
            timestamp: new Date().toISOString()
        };

        await NotificationService.create(notification);
    }

    console.log(`[Expiry Checker] Sent admin alert ${alertNumber}/3 for booking ${booking.id}`);
}

/**
 * Auto-cancel a booking and notify farmer/agent
 */
async function autoCancelBooking(booking: Booking): Promise<void> {
    // Update booking status to Cancelled
    await BookingService.update(booking.id, { status: 'Cancelled' });

    // Notify farmer
    const farmerNotification: Notification = {
        id: Date.now() + Math.random(),
        userId: booking.farmerId,
        message: `No bookings accepted by suppliers, your booking request has been cancelled! (Booking ID: ${booking.id}, ${booking.itemCategory} at ${booking.location} on ${booking.date})`,
        type: 'booking',
        category: 'booking',
        priority: 'high',
        read: false,
        timestamp: new Date().toISOString()
    };
    await NotificationService.create(farmerNotification);

    // If booked by agent, notify agent too
    if (booking.bookedByAgentId) {
        const agentNotification: Notification = {
            id: Date.now() + Math.random() + 1,
            userId: booking.bookedByAgentId,
            message: `No bookings accepted by suppliers, booking request for farmer has been canceled! (Booking ID: ${booking.id}, ${booking.itemCategory} at ${booking.location} on ${booking.date})`,
            type: 'booking',
            category: 'booking',
            priority: 'high',
            read: false,
            timestamp: new Date().toISOString()
        };
        await NotificationService.create(agentNotification);
    }

    console.log(`[Expiry Checker] Auto-cancelled booking ${booking.id} - start time passed without supplier`);
}

/**
 * Check for bookings that are past their end time + 24 hours and mark them as Completed
 * This ensures items become "Available" again
 */
export async function checkAutoCompleteBookings(): Promise<void> {
    try {
        console.log('[Auto Complete] Running booking auto-complete check...');
        const now = new Date();
        const allBookings = await BookingService.getAll();

        // Filter for active bookings
        const activeBookings = allBookings.filter(b =>
            ['Confirmed', 'Arrived', 'In Process'].includes(b.status)
        );

        for (const booking of activeBookings) {
            // Determine end time
            let endTime: Date | null = null;

            if (booking.endTime && booking.date) {
                // Parse date + endTime
                try {
                    const [h, m] = booking.endTime.split(':').map(Number);
                    endTime = new Date(booking.date);
                    endTime.setHours(h, m, 0, 0);
                } catch (e) { console.error('Error parsing end time', e); }
            } else if (booking.startTime && booking.estimatedDuration && booking.date) {
                // Calculate from start + duration
                try {
                    const [h, m] = booking.startTime.split(':').map(Number);
                    endTime = new Date(booking.date);
                    endTime.setHours(h + booking.estimatedDuration, m, 0, 0);
                } catch (e) { console.error('Error calculating end time', e); }
            }

            if (!endTime) continue;

            // Check if 24 hours have passed since end time
            const hoursSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60);

            if (hoursSinceEnd >= 24) {
                await BookingService.update(booking.id, { status: 'Completed' });

                // Notify
                await NotificationService.create({
                    id: Date.now() + Math.random(),
                    userId: booking.farmerId,
                    message: `Your booking for ${booking.itemCategory} has been auto-completed after 24 hours.`,
                    type: 'booking',
                    category: 'booking',
                    priority: 'medium',
                    read: false,
                    timestamp: new Date().toISOString()
                });

                if (booking.supplierId) {
                    await NotificationService.create({
                        id: Date.now() + Math.random() + 1,
                        userId: booking.supplierId,
                        message: `Booking for ${booking.itemCategory} has been auto-completed after 24 hours. payment should be settled.`,
                        type: 'booking',
                        category: 'booking',
                        priority: 'medium',
                        read: false,
                        timestamp: new Date().toISOString()
                    });
                }

                console.log(`[Auto Complete] Auto-completed booking ${booking.id}`);
            }
        }
    } catch (error) {
        console.error('[Auto Complete] Error:', error);
    }
}

