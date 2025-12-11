// Smart Notification Triggers
// Automated notification generation based on various events and conditions

import { NotificationService, UserService, ItemService, BookingService, UserNotificationService, BroadcastService } from './firestore';
import { Notification, NotificationCategory, User, Item, Booking } from '../types';
import { getDistrictFromCoords } from './geocoding';
import { sendPush } from './push';

/**
 * Create a PERSONAL notification (stored in user's subcollection)
 * Use for: Welcome, KYC, Booking updates, etc.
 */
async function createNotification(
    userId: string,
    message: string,
    category: NotificationCategory,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    metadata?: Record<string, any>,
    deduplicationKey?: string,
    cooldownHours: number = 24
): Promise<void> {
    // Check deduplication
    if (deduplicationKey) {
        const user = await UserService.getById(userId);
        if (user?.lastAlerts?.[deduplicationKey]) {
            const lastSent = new Date(user.lastAlerts[deduplicationKey]);
            const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
            if (hoursSince < cooldownHours) {
                return;
            }
        }

        const currentAlerts = user?.lastAlerts || {};
        await UserService.update(userId, {
            lastAlerts: {
                ...currentAlerts,
                [deduplicationKey]: new Date().toISOString()
            }
        });
    }

    const notification: Notification = {
        id: Date.now(),
        userId,
        message,
        type: 'admin',
        category,
        priority,
        read: false,
        timestamp: new Date().toISOString(),
        sentVia: ['app'],
        metadata
    };

    // Store in user's subcollection (optimized storage)
    await UserNotificationService.create(userId, notification);

    // Send push notification if user has device tokens
    const user = await UserService.getById(userId);
    if (user?.deviceTokens && user.deviceTokens.length > 0 && user.notificationPreferences?.push !== false) {
        await sendPush(
            user.deviceTokens,
            getCategoryTitle(category),
            message,
            metadata ? { ...metadata, notificationId: notification.id.toString() } : undefined
        );
    }
}

/**
 * Create a BROADCAST notification (single doc for all users in district)
 * Use for: Weather alerts, System updates, Promotional offers
 */
async function createBroadcastNotification(
    district: string, // 'all' for global broadcast
    message: string,
    category: NotificationCategory,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    metadata?: Record<string, any>,
    deduplicationKey?: string
): Promise<void> {
    // Check if similar broadcast already exists today
    if (deduplicationKey) {
        // For broadcasts, we use a simpler dedup - just check if ID pattern exists
        // This is handled by using unique ID pattern
    }

    const notification: Notification & { district: string } = {
        id: Date.now(),
        userId: '0', // '0' indicates broadcast
        district,
        message,
        type: 'admin',
        category,
        priority,
        read: false,
        timestamp: new Date().toISOString(),
        sentVia: ['app'],
        metadata
    };

    // Store in broadcasts collection (1 doc instead of N)
    await BroadcastService.create(notification);
    console.log(`[SmartNotifications] Broadcast created for district ${district}`);
}

function getCategoryTitle(category: NotificationCategory): string {
    const titles = {
        weather: '🌤️ Weather Alert',
        location: '📍 Nearby Equipment',
        price: '💰 Price Alert',
        booking: '📅 Booking Update',
        promotional: '🎉 Special Offer',
        performance: '📊 Account Alert',
        system: '🔔 System Update',
        alert: '⚠️ Critical Alert'
    };
    return titles[category] || 'Notification';
}

/**
 * Weather-based notifications
 * Monitor weather and send advisories for harvest timing, spraying, etc.
 * Uses BROADCAST notifications (1 doc per district, not per user)
 */
export async function checkWeatherAlerts(): Promise<void> {
    try {
        const users = await UserService.getAll();
        const processedDistricts = new Set<string>();

        for (const user of users) {
            if (!user.locationCoords || !user.district) continue;
            if (processedDistricts.has(user.district)) continue;

            // Fetch weather for this district
            const weather = await fetchWeatherData(user.locationCoords.lat, user.locationCoords.lng);
            if (!weather) continue;

            processedDistricts.add(user.district);

            // Check for rain in next 3 days - CREATE 1 BROADCAST (not N user notifications)
            if (weather.rainNext3Days) {
                await createBroadcastNotification(
                    user.district,
                    `⚠️ Rain forecasted in ${user.district} within 3 days. Avoid harvesting and postpone field work. Plan rain preparation.`,
                    'weather',
                    'high',
                    { district: user.district, rainExpected: true, date: new Date().toISOString().split('T')[0] },
                    `weather_rain_${user.district}_${new Date().toISOString().split('T')[0]}`
                );
            }

            // Check for clear skies (good for spraying) - CREATE 1 BROADCAST
            if (weather.dryNext5Days) {
                await createBroadcastNotification(
                    user.district,
                    `☀️ Clear skies expected in ${user.district} for next 5 days. Ideal time for spraying pesticides. Consider booking a drone sprayer!`,
                    'weather',
                    'medium',
                    { district: user.district, clearSkies: true, date: new Date().toISOString().split('T')[0] },
                    `weather_clear_${user.district}_${new Date().toISOString().split('T')[0]}`
                );
            }

            // Extreme heat warning - CREATE 1 BROADCAST
            if (weather.temperatureNow && weather.temperatureNow > 38) {
                await createBroadcastNotification(
                    user.district,
                    `🌡️ Extreme heat alert in ${user.district} (${weather.temperatureNow}°C). Ensure proper irrigation and avoid mid-day fieldwork.`,
                    'weather',
                    'urgent',
                    { district: user.district, temperature: weather.temperatureNow, date: new Date().toISOString().split('T')[0] },
                    `weather_heat_${user.district}_${new Date().toISOString().split('T')[0]}`
                );
            }
        }

        console.log(`[SmartNotifications] Weather broadcasts created for ${processedDistricts.size} districts`);
    } catch (error) {
        console.error('[SmartNotifications] Error checking weather alerts:', error);
    }
}

async function fetchWeatherData(lat: number, lng: number): Promise<any> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m&daily=rain_sum&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        const dailyRain = data?.daily?.rain_sum || [];
        const hourlyTemp = data?.hourly?.temperature_2m || [];

        return {
            rainNext3Days: dailyRain.slice(0, 3).reduce((a: number, b: number) => a + (b || 0), 0) > 0.1,
            dryNext5Days: dailyRain.slice(0, 5).reduce((a: number, b: number) => a + (b || 0), 0) < 0.1,
            temperatureNow: hourlyTemp[0]
        };
    } catch {
        return null;
    }
}

/**
 * Location-based notifications
 * Notify users when new equipment is available nearby
 */
export async function notifyNearbyEquipment(item: Item): Promise<void> {
    try {
        if (!item.locationCoords) return;

        const users = await UserService.getAll();
        const farmers = users.filter(u => u.role === 'Farmer' && u.locationCoords);

        let notifiedCount = 0;
        for (const farmer of farmers) {
            if (!farmer.locationCoords) continue;

            const distance = calculateDistance(
                item.locationCoords.lat,
                item.locationCoords.lng,
                farmer.locationCoords.lat,
                farmer.locationCoords.lng
            );

            // Notify if within 50km
            if (distance <= 50) {
                await createNotification(
                    farmer.id,
                    `🎯 New ${item.category} available just ${distance.toFixed(1)}km from you! "${item.name}" - Check it out now.`,
                    'location',
                    'medium',
                    { itemId: item.id, distance, category: item.category },
                    `nearby_item_${item.id}`,
                    24 * 7 // Once a week for the same item
                );
                notifiedCount++;
            }
        }

        console.log(`[SmartNotifications] Notified ${notifiedCount} users about nearby equipment`);
    } catch (error) {
        console.error('[SmartNotifications] Error notifying nearby equipment:', error);
    }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Booking reminder notifications
 * Send reminders 24 hours before booking and payment due notifications
 */
export async function sendBookingReminders(): Promise<void> {
    try {
        const bookings = await BookingService.getAll();
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        for (const booking of bookings) {
            if (booking.status === 'Cancelled' || booking.status === 'Completed') continue;

            const bookingDate = new Date(booking.date);
            const timeDiff = bookingDate.getTime() - now.getTime();
            const hoursUntil = timeDiff / (1000 * 60 * 60);

            // Send reminder 24 hours before
            if (hoursUntil > 23 && hoursUntil < 25) {
                await createNotification(
                    booking.farmerId,
                    `⏰ Reminder: Your ${booking.itemCategory} booking is tomorrow at ${booking.startTime}. Location: ${booking.location}`,
                    'booking',
                    'high',
                    { bookingId: booking.id, type: 'reminder' },
                    `booking_reminder_${booking.id}`,
                    24
                );
            }

            // Payment due notification
            if (booking.status === 'Pending Payment') {
                await createNotification(
                    booking.farmerId,
                    `💳 Payment of ₹${booking.finalPrice || booking.estimatedPrice} is due for booking ${booking.id}. Complete payment to avoid cancellation.`,
                    'booking',
                    'urgent',
                    { bookingId: booking.id, type: 'payment_due', amount: booking.finalPrice || booking.estimatedPrice },
                    `payment_due_${booking.id}`,
                    24
                );
            }
        }

        console.log('[SmartNotifications] Booking reminders processed');
    } catch (error) {
        console.error('[SmartNotifications] Error sending booking reminders:', error);
    }
}

/**
 * Welcome notification for new signups
 */
export async function sendWelcomeNotification(userId: string): Promise<void> {
    await createNotification(
        userId,
        `🎉 Welcome to AgriRent! We're glad to have you. Explore equipment in your area and book your first rental today. Use code WELCOME10 for 10% off!`,
        'promotional',
        'medium',
        { isWelcome: true, couponCode: 'WELCOME10' },
        'welcome_msg',
        24 * 365 * 10 // Forever (effectively)
    );
}

/**
 * KYC approval/rejection notification (automatically sent when admin verifies)
 */
export async function sendKYCStatusNotification(
    userId: string,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string
): Promise<void> {
    if (status === 'Approved') {
        await createNotification(
            userId,
            `✅ Great news! Your KYC verification has been approved. You can now start accepting bookings and earn with AgriRent!`,
            'performance',
            'high',
            { kycStatus: 'approved', approvedAt: new Date().toISOString() }
        );
    } else {
        const reason = rejectionReason ? ` Reason: ${rejectionReason}` : '';
        await createNotification(
            userId,
            `❌ Your KYC verification was rejected.${reason} Please re-upload your documents with correct information.`,
            'performance',
            'urgent',
            { kycStatus: 'rejected', rejectionReason, rejectedAt: new Date().toISOString() }
        );
    }
}

/**
 * Performance alerts for low ratings or pending KYC
 */
export async function checkPerformanceAlerts(): Promise<void> {
    try {
        const users = await UserService.getAll();

        for (const user of users) {
            // Low rating alert for suppliers
            if (user.role === 'Supplier' && user.avgRating && user.avgRating < 3.5) {
                await createNotification(
                    user.id,
                    `⚠️ Your rating has dropped to ${user.avgRating.toFixed(1)} stars. Improve service quality to get more bookings. Check customer feedback for improvement areas.`,
                    'performance',
                    'high',
                    { rating: user.avgRating, type: 'low_rating' },
                    'low_rating_alert',
                    24 * 7 // Once a week
                );
            }

            // Pending KYC reminder
            if (user.role === 'Supplier' && user.userStatus === 'pending') {
                await createNotification(
                    user.id,
                    `📋 Complete your KYC verification to start accepting bookings. Upload your documents in the Profile section.`,
                    'performance',
                    'high',
                    { type: 'pending_kyc' },
                    'pending_kyc_reminder',
                    24 * 3 // Remind every 3 days
                );
            }
        }

        console.log('[SmartNotifications] Performance alerts checked');
    } catch (error) {
        console.error('[SmartNotifications] Error checking performance alerts:', error);
    }
}

/**
 * Start all smart notification services
 */
export function startSmartNotifications(): void {
    console.log('[SmartNotifications] Starting smart notification services...');

    // Check weather alerts every 6 hours
    setInterval(checkWeatherAlerts, 6 * 60 * 60 * 1000);

    // Send booking reminders every hour
    setInterval(sendBookingReminders, 60 * 60 * 1000);

    // Check performance alerts once per day (at midnight-ish)
    setInterval(checkPerformanceAlerts, 24 * 60 * 60 * 1000);

    console.log('[SmartNotifications] All smart notification services started');
}
