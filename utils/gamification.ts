import { User } from '../types';

/**
 * Tracks daily login for streak system.
 * NOTE: Streak count is ONLY incremented when a supplier completes successful work (handled in backend).
 * This function only updates the last login date and manages guards.
 * 
 * Streak Logic:
 * - Streak increases by 1 when supplier completes a job (handled in backend/index.ts)
 * - Points: +5 for every hour of successful work
 * - Penalty: -50 points for cancellations, late arrivals, disputes
 * - If points go negative, borrow from streak count (100 points = 1 streak)
 * - Every 100 points accumulated = +1 streak
 */
export const calculateStreakUpdates = (user: User): User | null => {
    // Only apply to Suppliers
    if (user.role !== 'Supplier') return null;

    const today = new Date().toISOString().split('T')[0];

    // Initialize if missing
    const currentStreak = user.streak || {
        currentCount: 0,
        lastLoginDate: '',
        guards: 0,
        maxGuards: 5,
        points: 0,
        lastWorkDate: ''
    };

    if (currentStreak.lastLoginDate === today) {
        return null; // Already logged in today, no change
    }

    // Check if streak should be protected by guards (for missed days without work)
    let newGuards = currentStreak.guards;
    const lastLogin = currentStreak.lastLoginDate;

    if (lastLogin) {
        const lastDate = new Date(lastLogin);
        const currDate = new Date(today);
        const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Check for earning a Guard (every 7 days of login)
        // Note: This is separate from streak count
        if (diffDays === 1) {
            // Consecutive login day - check if we should award a guard
            const consecutiveLogins = (currentStreak as any).consecutiveLogins || 0;
            const newConsecutiveLogins = consecutiveLogins + 1;

            if (newConsecutiveLogins % 7 === 0 && newGuards < (currentStreak.maxGuards || 5)) {
                newGuards += 1;
            }

            (currentStreak as any).consecutiveLogins = newConsecutiveLogins;
        } else if (diffDays > 1) {
            // Missed login days - reset consecutive login counter but don't affect streak
            (currentStreak as any).consecutiveLogins = 1;
        }
    } else {
        // First login
        (currentStreak as any).consecutiveLogins = 1;
    }

    const updatedStreak = {
        ...currentStreak,
        // Do NOT increment currentCount here - it only increases on successful work completion
        guards: newGuards,
        lastLoginDate: today
    };

    return {
        ...user,
        streak: updatedStreak
    };
};
