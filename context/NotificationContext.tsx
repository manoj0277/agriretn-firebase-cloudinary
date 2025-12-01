import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Notification } from '../types';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
    markAsRead: (notificationId: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/notifications`);
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch { }
        };
        load();
    }, []);

    const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
        const newNotification: Notification = { id: Date.now(), ...notificationData, read: false, timestamp: new Date().toISOString() };
        try {
            await fetch(`${API_URL}/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newNotification)
            });
            setNotifications(prev => [newNotification, ...prev]);
        } catch { }
    }, []);

    const markAsRead = useCallback(async (notificationId: number) => {
        try {
            await fetch(`${API_URL}/notifications/${notificationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read: true })
            });
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
        } catch { }
    }, []);

    const value = useMemo(() => ({ notifications, addNotification, markAsRead }), [notifications, addNotification, markAsRead]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
