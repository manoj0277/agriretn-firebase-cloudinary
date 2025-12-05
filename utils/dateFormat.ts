/**
 * Utility functions for formatting dates and times in a human-readable format
 */

/**
 * Formats an ISO date string to a readable format
 * Example: "2025-12-04T18:30:00.000Z" -> "4 Dec 2025, 6:30 PM"
 */
export const formatDateTime = (isoString: string): string => {
    try {
        const date = new Date(isoString);

        if (isNaN(date.getTime())) {
            return isoString; // Return original if invalid
        }

        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        return `${day} ${month} ${year}, ${time}`;
    } catch (error) {
        return isoString;
    }
};

/**
 * Formats just the date part
 * Example: "2025-12-04T18:30:00.000Z" -> "4 Dec 2025"
 */
export const formatDate = (isoString: string): string => {
    try {
        const date = new Date(isoString);

        if (isNaN(date.getTime())) {
            return isoString;
        }

        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();

        return `${day} ${month} ${year}`;
    } catch (error) {
        return isoString;
    }
};

/**
 * Formats just the time part
 * Example: "2025-12-04T18:30:00.000Z" -> "6:30 PM"
 */
export const formatTime = (isoString: string): string => {
    try {
        const date = new Date(isoString);

        if (isNaN(date.getTime())) {
            return isoString;
        }

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return isoString;
    }
};

/**
 * Formats a relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (Math.abs(diffMins) < 1) return 'just now';
        if (Math.abs(diffMins) < 60) {
            return diffMins > 0
                ? `in ${diffMins} min${diffMins !== 1 ? 's' : ''}`
                : `${Math.abs(diffMins)} min${Math.abs(diffMins) !== 1 ? 's' : ''} ago`;
        }
        if (Math.abs(diffHours) < 24) {
            return diffHours > 0
                ? `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
                : `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
        }
        return diffDays > 0
            ? `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
            : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    } catch (error) {
        return isoString;
    }
};
