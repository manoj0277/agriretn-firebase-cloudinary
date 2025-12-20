import { User } from '../types';

/**
 * Calculates the new streak state for a user upon login.
 * Returns the updated User object if changes are needed, or null if no changes.
 */
export const calculateStreakUpdates = (user: User): User | null => {
    // Only apply to Suppliers for now as requested? 
    // "i want to add a streak system in my app for supplier"
    // But checking role might depend on if we want to restrict it. Let's apply generally if field exists or assume caller checks role.
    if (user.role !== 'Supplier') return null;

    const today = new Date().toISOString().split('T')[0];

    // Initialize if missing
    const currentStreak = user.streak || {
        currentCount: 0,
        lastLoginDate: '', // Empty means never logged in before (or legacy)
        guards: 0,
        maxGuards: 5
    };

    if (currentStreak.lastLoginDate === today) {
        return null; // Already logged in today, no change
    }

    let newCount = currentStreak.currentCount;
    let newGuards = currentStreak.guards;
    const lastLogin = currentStreak.lastLoginDate;

    if (!lastLogin) {
        // First ever login with this system
        newCount = 1;
    } else {
        const lastDate = new Date(lastLogin);
        const currDate = new Date(today);
        const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Consecutive day login
            newCount += 1;

            // Check for earning a Guard (every 7 days)
            // We need to know if we crossed a multiple of 7. 
            // Simplest way: if (newCount % 7 === 0) -> Earn Guard.
            // Assumption: continuous streak implies we hit every number.
            if (newCount % 7 === 0 && newGuards < (currentStreak.maxGuards || 5)) {
                newGuards += 1;
            }

        } else if (diffDays > 1) {
            // Missed one or more days
            // Rule: "streak guard protect if not Reset to 0"
            // Rule: "when streak is missed by one day streak guard will protect, one day streak"

            // Interpretations:
            // A) Streak Guard fills the gap. 
            //    If I missed yesterday (diffDays = 2), I use 1 guard. My streak continues as if I didn't miss.
            //    Does the streak count increment for the missed day? Usually no, it just *preserves* the count.
            //    Or does it count as "Active" for that day visually?
            //    Let's assume it *preserves* the count.
            //    So newCount becomes (currentCount + 1) for Today? Or just keeps currentCount? 
            //    Usually "Streak" implies consecutive. If I use a freeze, I keep my 50, and today becomes 51.

            // B) How many guards to consume?
            // If diffDays = 2 (Missed yesterday), need 1 guard.
            // If diffDays = 3 (Missed yesterday and day before), need 2 guards? "streak guard will protect, one day streak".
            // Suggests 1 guard = 1 day protection.

            const missedDays = diffDays - 1;

            if (newGuards >= missedDays) {
                // We have enough guards to cover the gap
                newGuards -= missedDays;
                newCount += 1; // Increment for today
            } else {
                // Not enough guards. Streak breaks.
                // But wait, maybe use all guards to save *some* streak? No, usually binary.
                newCount = 1; // Reset to 1 (for today)
                // Do we keep remaining guards? Usually yes.
            }
        }
    }

    const updatedStreak = {
        ...currentStreak,
        currentCount: newCount,
        guards: newGuards,
        lastLoginDate: today
    };

    return {
        ...user,
        streak: updatedStreak
    };
};
