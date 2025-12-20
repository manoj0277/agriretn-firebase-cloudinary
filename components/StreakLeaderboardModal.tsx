import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import { User } from '../types';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FilterType = 'Global' | 'District' | 'Mandal';

import { useStreakRankings } from '../hooks/useStreakRankings';

export const StreakLeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
    const { user, allUsers } = useAuth();
    const { getRankBorderClass } = useStreakRankings(allUsers);
    const [filter, setFilter] = useState<FilterType>('Global');

    // Helper to check if streak is active today (calculated on Read, not Write)
    const isStreakActive = (u: User) => {
        if (!u.streak || u.streak.currentCount <= 0 || !u.streak.lastLoginDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastLogin = new Date(u.streak.lastLoginDate);
        lastLogin.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Active if logged in today (0) or yesterday (1)
        if (diffDays <= 1) return true;

        // Or if they have enough guards to cover the gap
        const missed = diffDays - 1;
        return (u.streak.guards || 0) >= missed;
    };

    const { top50, userRank } = useMemo(() => {
        // 1. Filter by Role & Active Streak
        let candidates = allUsers.filter(u => u.role === 'Supplier' && isStreakActive(u));

        // 2. Apply Location Filters (User must be logged in for these)
        if (user) {
            if (filter === 'District' && user.district) {
                candidates = candidates.filter(u => u.district === user.district);
            } else if (filter === 'Mandal' && user.mandal) {
                candidates = candidates.filter(u => u.mandal === user.mandal);
            }
        }

        // 3. Sort by Streak Count DESC, then Score DESC
        const sorted = candidates.sort((a, b) => {
            const streakA = a.streak?.currentCount || 0;
            const streakB = b.streak?.currentCount || 0;
            if (streakA !== streakB) return streakB - streakA;
            return (b.gamificationScore || 0) - (a.gamificationScore || 0);
        });

        // 4. Find User Rank
        const rank = user ? sorted.findIndex(u => u.id === user.id) + 1 : 0;

        // 5. Slice Top 50
        return {
            top50: sorted.slice(0, 50),
            userRank: rank
        };
    }, [allUsers, filter, user]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-center relative border-b border-neutral-200 dark:border-neutral-700">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full p-1 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    <div className="mb-2 inline-block p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: '#F97316' }} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold">Streak Leaderboard</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Consistency is Key!</p>

                    {/* My Stats Summary */}
                    {user && (
                        <div className="mt-4 flex justify-center divide-x divide-neutral-200 dark:divide-neutral-700 text-sm font-medium">
                            <div className="px-4 flex flex-col items-center">
                                <span className="text-2xl font-bold" style={{ color: '#F97316' }}>{user.streak?.currentCount || 0}</span>
                                <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wide">Streak</span>
                            </div>
                            <div className="px-4 flex flex-col items-center">
                                <span className="text-2xl font-bold text-neutral-900 dark:text-white">#{userRank > 0 ? userRank : '-'}</span>
                                <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wide uppercase">Rank</span>
                            </div>
                            <div className="px-4 flex flex-col items-center">
                                <span className="text-2xl font-bold" style={{ color: '#06b6d4' }}>{user.streak?.guards || 0}/{(user.streak?.maxGuards || 5)}</span>
                                <span className="text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wide">Guards</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="flex p-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
                    {(['Global', 'District', 'Mandal'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${filter === f
                                ? 'bg-white dark:bg-neutral-700 text-orange-600 dark:text-orange-400 shadow-sm'
                                : 'text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-800 p-2 space-y-2">
                    {top50.length === 0 ? (
                        <div className="text-center py-10 text-neutral-500">
                            <p>No active streaks in this area yet.</p>
                            <p className="text-sm">Be the first!</p>
                        </div>
                    ) : (
                        <>
                            {top50.map((u, index) => (
                                <div key={u.id} className={`flex items-center p-3 rounded-xl border ${u.id === user?.id
                                    ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900'
                                    : 'bg-white border-neutral-100 dark:bg-neutral-800 dark:border-neutral-700'
                                    }`}>
                                    {/* Rank */}
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mr-3 ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-800' :
                                                'text-neutral-500'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden mr-3">
                                        <img
                                            src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.name}&background=random`}
                                            alt={u.name}
                                            className={`w-full h-full object-cover ${getRankBorderClass(u.id)}`}
                                        />
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                            {u.id === user?.id ? 'You' : u.name}
                                        </div>
                                        <div className="text-xs text-neutral-500 truncate">
                                            {u.mandal || u.district || 'Unknown Location'}
                                        </div>
                                    </div>

                                    {/* Score/Streak */}
                                    <div className="text-right">
                                        <div className="flex items-center justify-end font-bold" style={{ color: '#F97316' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                            </svg>
                                            {u.streak?.currentCount || 0}
                                        </div>
                                        <div className="text-xs text-neutral-400">
                                            Score: {u.streak?.points || 0}/100
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* If User is NOT in top 50, show Sticky Footer? Or just append? */}
                            {user && userRank > 50 && (
                                <>
                                    <div className="py-2 text-center text-xs text-neutral-400">...</div>
                                    <div className="flex items-center p-3 rounded-xl border bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900 sticky bottom-0 shadow-lg">
                                        <div className="w-8 h-8 flex items-center justify-center rounded-full font-bold mr-3 text-neutral-600 bg-neutral-100">
                                            {userRank}
                                        </div>
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden mr-3">
                                            <img
                                                src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                                alt={user.name}
                                                className={`w-full h-full object-cover ${getRankBorderClass(user.id)}`}
                                            />
                                        </div>
                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                                                You
                                            </div>
                                            <div className="text-xs text-neutral-500 truncate">
                                                {user.mandal || user.district}
                                            </div>
                                        </div>
                                        {/* Score/Streak */}
                                        <div className="text-right">
                                            <div className="flex items-center justify-end font-bold" style={{ color: '#F97316' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                                </svg>
                                                {user.streak?.currentCount || 0}
                                            </div>
                                            <div className="text-xs text-neutral-400">
                                                Score: {user.streak?.points || 0}/100
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
