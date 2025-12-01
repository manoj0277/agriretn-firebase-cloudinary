// Smart Notification Triggers
// Automated notification generation based on various events and conditions

import { NotificationService, UserService, ItemService, BookingService } from './firestore';
import { Notification, NotificationCategory, User, Item, Booking } from '../types';
import { getDistrictFromCoords } from './geocoding';
import { sendPush } from './push';

/**
 * Create and send a smart notification
 */
async function createNotification(
    userId: number,
    message: string,
    category: NotificationCategory,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    metadata?: Record<string, any>
): Promise<void> {
    const notification: Notification = {
        id: Date.now(),
        userId,
        message,
        type: 'admin', // Default type
        category,
        priority,
        read: false,
        timestamp: new Date().toISOString(),
        sentVia: ['app'],
        metadata
    };

    await NotificationService.create(notification);

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

function getCategoryTitle(category: NotificationCategory): string {
    const titles = {
        weather: '🌤️ Weather Alert',
        location: '📍 Nearby Equipment',
        price: '💰 Price Alert',
        booking: '📅 Booking Update',
        promotional: '🎉 Special Offer',
        performance: '📊 Account Alert',
        system: '🔔 System Update'
    };
    return titles[category] || 'Notification';
}

/**
 * Weather-based notifications
 * Monitor weather and send advisories for harvest timing, spraying, etc.
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

            // Get all users in this district
            const districtUsers = users.filter(u => u.district === user.district && u.role === 'Farmer');

            // Check for rain in next 3 days
            if (weather.rainNext3Days) {
                for (const districtUser of districtUsers) {
                    await createNotification(
                        districtUser.id,
                        `⚠️ Rain forecasted in ${user.district} within 3 days. Avoid harvesting and postpone field work. Plan rain preparation.`,
                        'weather',
                        'high',
                        { district: user.district, rainExpected: true }
                    );
                }
            }

            // Check for clear skies (good for spraying)
            if (weather.dryNext5Days) {
                for (const districtUser of districtUsers) {
                    await createNotification(
                        districtUser.id,
                        `☀️ Clear skies expected in ${user.district} for next 5 days. Ideal time for spraying pesticides. Consider booking a drone sprayer!`,
                        'weather',
                        'medium',
                        { district: user.district, clearSkies: true }
                    );
                }
            }

            // Extreme heat warning
            if (weather.temperatureNow && weather.temperatureNow > 38) {
                for (const districtUser of districtUsers) {
                    await createNotification(
                        districtUser.id,
                        `🌡️ Extreme heat alert in ${user.district} (${weather.temperatureNow}°C). Ensure proper irrigation and avoid mid-day fieldwork.`,
                        'weather',
                        'urgent',
                        { district: user.district, temperature: weather.temperatureNow }
                    );
                }
            }
        }

        console.log(`[SmartNotifications] Weather alerts checked for ${processedDistricts.size} districts`);
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
                    { itemId: item.id, distance, category: item.category }
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
                    { bookingId: booking.id, type: 'reminder' }
                );
            }

            // Payment due notification
            if (booking.status === 'Pending Payment') {
                await createNotification(
                    booking.farmerId,
                    `💳 Payment of ₹${booking.finalPrice || booking.estimatedPrice} is due for booking ${booking.id}. Complete payment to avoid cancellation.`,
                    'booking',
                    'urgent',
                    { bookingId: booking.id, type: 'payment_due', amount: booking.finalPrice || booking.estimatedPrice }
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
export async function sendWelcomeNotification(userId: number): Promise<void> {
    await createNotification(
        userId,
        `🎉 Welcome to AgriRent! We're glad to have you. Explore equipment in your area and book your first rental today. Use code WELCOME10 for 10% off!`,
        'promotional',
        'medium',
        { isWelcome: true, couponCode: 'WELCOME10' }
    );
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
                    { rating: user.avgRating, type: 'low_rating' }
                );
            }

            // Pending KYC reminder
            if (user.role === 'Supplier' && user.status === 'pending') {
                await createNotification(
                    user.id,
                    `📋 Complete your KYC verification to start accepting bookings. Upload your documents in the Profile section.`,
                    'performance',
                    'high',
                    { type: 'pending_kyc' }
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
