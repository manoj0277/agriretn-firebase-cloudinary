import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';

const NotificationBell: React.FC = () => {
    const { notifications, markAsRead, markAsSeen } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleToggle = () => {
        setIsOpen(prev => !prev);
        if (!isOpen) { // When opening, mark all as seen after delay
            setTimeout(() => {
                notifications.forEach(n => {
                    if (!n.seenAt) {
                        markAsSeen(n.id); // This sets seenAt and expiresAt (+24h)
                    }
                });
            }, 2000);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getTypeClasses = (category?: string) => {
        switch (category) {
            case 'weather': return 'border-blue-500';
            case 'location': return 'border-green-500';
            case 'price': return 'border-yellow-500';
            case 'booking': return 'border-orange-500';
            case 'promotional': return 'border-pink-500';
            case 'performance': return 'border-red-500';
            case 'system': return 'border-purple-500';
            default: return 'border-gray-500';
        }
    };

    const getPriorityBadge = (priority?: string) => {
        if (priority === 'urgent') return '🔴';
        if (priority === 'high') return '🟠';
        return '';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleToggle} className="relative p-2 text-neutral-700 dark:text-neutral-300 hover:text-primary rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-50">
                    <div className="p-3 border-b dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-100">Notifications</div>
                    <div className="max-h-96 overflow-y-auto hide-scrollbar">
                        {notifications.length > 0 ? (
                            [...notifications].reverse().map(n => (
                                <div key={n.id} className={`p-3 border-l-4 ${!n.read ? 'bg-neutral-50 dark:bg-neutral-700/50' : ''} ${getTypeClasses(n.category)}`}>
                                    <div className="flex items-start justify-between">
                                        <p className="text-sm text-neutral-800 dark:text-neutral-100 flex-1">
                                            {getPriorityBadge(n.priority)} {n.message}
                                        </p>
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-right">
                                        {new Date(n.timestamp).toLocaleString()}
                                    </p>
                                    {n.category && (
                                        <span className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 inline-block">
                                            {n.category}
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-neutral-700 dark:text-neutral-300 p-4">No new notifications.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;