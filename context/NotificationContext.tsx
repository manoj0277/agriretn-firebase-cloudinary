import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Notification } from '../types';
import { useAuth } from './AuthContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
    markAsRead: (notificationId: number) => void;
    markAsSeen: (notificationId: number) => void;
    userDistrict: string | null;
    requestLocationPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userDistrict, setUserDistrict] = useState<string | null>(null);
    const { user } = useAuth();

    // Load notifications on mount
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/notifications`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter out expired notifications
                    const now = new Date();
                    const validNotifications = data.filter((n: Notification) => {
                        if (n.expiresAt) {
                            return new Date(n.expiresAt) > now;
                        }
                        return true;
                    });
                    setNotifications(validNotifications);
                }
            } catch { }
        };
        load();
    }, []);

    // Request location permission and get district
    const requestLocationPermission = useCallback(async (): Promise<boolean> => {
        if (!navigator.geolocation) {
            console.log('[Location] Geolocation not supported');
            return false;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    try {
                        // Get district from backend
                        const res = await fetch(`${API_URL}/geocoding/district?lat=${latitude}&lng=${longitude}`);
                        if (res.ok) {
                            const { district } = await res.json();
                            setUserDistrict(district);

                            // Update user's district and location coords
                            if (user) {
                                await fetch(`${API_URL}/users/${user.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        district,
                                        locationCoords: { lat: latitude, lng: longitude }
                                    })
                                });
                            }

                            console.log('[Location] District detected:', district);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('[Location] Error getting district:', error);
                        resolve(false);
                    }
                },
                (error) => {
                    console.log('[Location] Permission denied or error:', error);
                    resolve(false);
                }
            );
        });
    }, [user]);

    // Auto-request location on mount
    useEffect(() => {
        if (user && !user.district) {
            requestLocationPermission();
        }
        if (user?.district) {
            setUserDistrict(user.district);
        }
    }, [user]);

    const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
        const newNotification: Notification = {
            id: Date.now(),
            ...notificationData,
            read: false,
            timestamp: new Date().toISOString()
        };

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

    const markAsSeen = useCallback(async (notificationId: number) => {
        try {
            // Backend sets seenAt and expiresAt (+24h)
            const res = await fetch(`${API_URL}/notifications/${notificationId}/seen`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                const updatedNotification = await res.json();
                setNotifications(prev => prev.map(n =>
                    n.id === notificationId ? updatedNotification : n
                ));
            }
        } catch { }
    }, []);

    const value = useMemo(() => ({
        notifications,
        addNotification,
        markAsRead,
        markAsSeen,
        userDistrict,
        requestLocationPermission
    }), [notifications, addNotification, markAsRead, markAsSeen, userDistrict, requestLocationPermission]);

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
