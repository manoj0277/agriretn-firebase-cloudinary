import React from 'react';
import { User } from '../types';
import { useStreakRankings } from '../hooks/useStreakRankings';
import { useAuth } from '../context/AuthContext';

interface MedalNameProps {
    userId: string;
    displayName: string;
    className?: string; // Additional classes
    showIcon?: boolean; // Whether to show the medal icon
}

export const MedalName: React.FC<MedalNameProps> = ({ userId, displayName, className = '', showIcon = true }) => {
    const { allUsers } = useAuth();
    const { getRank } = useStreakRankings(allUsers);

    const rank = getRank(userId);

    // Default classes
    let finalClassName = `font-medium ${className}`;
    let icon = null;

    if (rank === 1) {
        // Gold
        finalClassName = `text-yellow-500 font-extrabold ${className}`;
        icon = showIcon ? '🥇' : null;
    } else if (rank === 2) {
        // Silver
        finalClassName = `text-slate-400 font-bold ${className}`;
        icon = showIcon ? '🥈' : null;
    } else if (rank === 3) {
        // Bronze
        finalClassName = `text-amber-700 font-bold ${className}`;
        icon = showIcon ? '🥉' : null;
    }

    return (
        <span className={`${finalClassName} inline-flex items-center gap-1`}>
            {displayName}
            {icon && <span className="text-sm shadow-sm opacity-90">{icon}</span>}
        </span>
    );
};
