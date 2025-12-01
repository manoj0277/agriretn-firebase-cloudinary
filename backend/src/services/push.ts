// Push Notification Service using Firebase Cloud Messaging (FCM)
import { messaging } from '../firebase';

/**
 * Send push notification to specific device tokens
 */
export async function sendPush(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<{ success: number; failed: number }> {
    if (!deviceTokens || deviceTokens.length === 0) {
        console.log('[Push] No device tokens provided');
        return { success: 0, failed: 0 };
    }

    try {
        const messagingInstance = messaging();
        let successCount = 0;
        let failureCount = 0;

        // Send to each token individually since sendMulticast might not be available
        for (const token of deviceTokens) {
            try {
                await messagingInstance.send({
                    token,
                    notification: {
                        title,
                        body
                    },
                    data: data || {}
                });
                successCount++;
            } catch (error) {
                console.error(`[Push] Failed to send to token:`, error);
                failureCount++;
            }
        }

        console.log(`[Push] Sent to ${successCount}/${deviceTokens.length} devices`);

        return {
            success: successCount,
            failed: failureCount
        };
    } catch (error) {
        console.error('[Push] Error sending push notification:', error);
        return { success: 0, failed: deviceTokens.length };
    }
}

/**
 * Send push notification to a topic (for broadcast)
 */
export async function sendPushToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<boolean> {
    try {
        const message = {
            notification: {
                title,
                body
            },
            data: data || {},
            topic
        };

        const response = await messaging().send(message);
        console.log(`[Push] Sent to topic "${topic}". Message ID: ${response}`);
        return true;
    } catch (error) {
        console.error(`[Push] Error sending to topic "${topic}":`, error);
        return false;
    }
}

/**
 * Subscribe device tokens to a topic
 */
export async function subscribeToTopic(deviceTokens: string[], topic: string): Promise<boolean> {
    try {
        const response = await messaging().subscribeToTopic(deviceTokens, topic);
        console.log(`[Push] Subscribed ${response.successCount} devices to topic "${topic}"`);
        return response.successCount > 0;
    } catch (error) {
        console.error(`[Push] Error subscribing to topic "${topic}":`, error);
        return false;
    }
}

/**
 * Unsubscribe device tokens from a topic
 */
export async function unsubscribeFromTopic(deviceTokens: string[], topic: string): Promise<boolean> {
    try {
        const response = await messaging().unsubscribeFromTopic(deviceTokens, topic);
        console.log(`[Push] Unsubscribed ${response.successCount} devices from topic "${topic}"`);
        return response.successCount > 0;
    } catch (error) {
        console.error(`[Push] Error unsubscribing from topic "${topic}":`, error);
        return false;
    }
}

/**
 * Categories for topic subscriptions
 */
export const NOTIFICATION_TOPICS = {
    WEATHER: 'weather_alerts',
    PRICE: 'price_alerts',
    PROMOTIONAL: 'promotional',
    SYSTEM: 'system_updates',
    ALL: 'all_notifications'
};
