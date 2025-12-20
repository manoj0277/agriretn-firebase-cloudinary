import { useMemo } from 'react';
import { User } from '../types';

/**
 * Hook to calculate user rankings based on their streak within their Mandal.
 * Returns a function to get the rank (1, 2, 3) or null for a specific user.
 */
export const useStreakRankings = (allUsers: User[]) => {
    const rankMap = useMemo(() => {
        const map = new Map<string, number>();
        const usersByMandal: Record<string, User[]> = {};

        // 1. Group users by Mandal
        allUsers.forEach(user => {
            // Use 'Unknown' if mandal is not set, or fallback to location if feasible.
            // Assuming location might contain "Mandal, District" pattern or just use 'Unknown' to group basics.
            // Ideally, we strictly use the 'mandal' field.
            const mandal = user.mandal || 'Unknown';

            if (!usersByMandal[mandal]) {
                usersByMandal[mandal] = [];
            }
            usersByMandal[mandal].push(user);
        });

        // 2. Sort and Assign Ranks within each Mandal
        Object.keys(usersByMandal).forEach(mandal => {
            const group = usersByMandal[mandal];

            // Sort by streak count descending
            // Handle undefined streak by defaulting to 0
            group.sort((a, b) => {
                const streakA = a.streak?.currentCount || 0;
                const streakB = b.streak?.currentCount || 0;
                return streakB - streakA;
            });

            // assign ranks 1, 2, 3
            // Note: If ties exist, they get different ranks based on sort order (could refine to shared rank if needed)
            // For now, strict 1, 2, 3 based on array index.
            group.forEach((user, index) => {
                if (index < 3) {
                    // Rank is index + 1
                    map.set(user.id, index + 1);
                }
            });
        });

        return map;
    }, [allUsers]);

    const getRank = (userId: string): number | null => {
        return rankMap.get(userId) || null;
    };

    const getRankBorderClass = (userId: string) => {
        const rank = getRank(userId);
        if (rank === 1) return 'border-4 border-yellow-500 shadow-lg rounded-full';
        if (rank === 2) return 'border-4 border-slate-400 shadow-md rounded-full';
        if (rank === 3) return 'border-4 border-amber-700 shadow-md rounded-full';
        return 'border border-neutral-200 dark:border-neutral-700 rounded-full';
    };

    return { getRank, getRankBorderClass };
};
