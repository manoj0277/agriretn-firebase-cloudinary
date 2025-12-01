// Notification Scheduler Service
// Handles auto-deletion of expired notifications and scheduled notification delivery

import { NotificationService } from './firestore';

/**
 * Delete notifications that have expired (24 hours after being seen)
 */
export async function deleteExpiredNotifications(): Promise<number> {
    try {
        const allNotifications = await NotificationService.getAll();
        const now = new Date();
        let deletedCount = 0;

        for (const notification of allNotifications) {
            if (notification.expiresAt) {
                const expiryDate = new Date(notification.expiresAt);
                if (expiryDate <= now) {
                    await NotificationService.delete(notification.id);
                    deletedCount++;
                    console.log(`[Scheduler] Deleted expired notification ${notification.id}`);
                }
            }
        }

        if (deletedCount > 0) {
            console.log(`[Scheduler] Cleanup complete: ${deletedCount} notifications deleted`);
        }

        return deletedCount;
    } catch (error) {
        console.error('[Scheduler] Error deleting expired notifications:', error);
        return 0;
    }
}

/**
 * Process scheduled notifications that are due to be sent
 */
export async function processScheduledNotifications(): Promise<number> {
    try {
        const allNotifications = await NotificationService.getAll();
        const now = new Date();
        let processedCount = 0;

        for (const notification of allNotifications) {
            if (notification.scheduledFor) {
                const scheduledDate = new Date(notification.scheduledFor);

                // If scheduled time has passed and notification hasn't been sent yet
                if (scheduledDate <= now && !notification.timestamp) {
                    // Update notification to mark it as sent
                    await NotificationService.update(notification.id, {
                        timestamp: now.toISOString(),
                        scheduledFor: undefined // Clear the scheduled flag
                    });
                    processedCount++;
                    console.log(`[Scheduler] Processed scheduled notification ${notification.id}`);
                }
            }
        }

        if (processedCount > 0) {
            console.log(`[Scheduler] Scheduled notifications processed: ${processedCount}`);
        }

        return processedCount;
    } catch (error) {
        console.error('[Scheduler] Error processing scheduled notifications:', error);
        return 0;
    }
}

/**
 * Start the cleanup and scheduling service (runs every hour)
 */
export function startNotificationScheduler(): void {
    console.log('[Scheduler] Starting notification scheduler...');

    // Run immediately on start
    deleteExpiredNotifications();
    processScheduledNotifications();

    // Run every hour (3600000 ms)
    setInterval(async () => {
        await deleteExpiredNotifications();
        await processScheduledNotifications();
    }, 3600000); // 1 hour

    console.log('[Scheduler] Notification scheduler started (runs every hour)');
}
