import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Notification } from '../types';
import { supabase } from '../../lib/supabase';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
    markAsRead: (notificationId: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
                setNotifications((data || []) as Notification[]);
            } catch (error) {
            }
        };
        fetchNotifications();
    }, []);

    const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
        const newNotification: Notification = {
            id: Date.now(),
            ...notificationData,
            read: false,
            timestamp: new Date().toISOString()
        };
        await supabase.from('notifications').upsert([newNotification]);
        setNotifications(prev => [newNotification, ...prev]);
    }, []);
    
    const markAsRead = useCallback(async (notificationId: number) => {
        await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
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
