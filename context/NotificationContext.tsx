import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { Notification } from '../types';
import { useAuth } from './AuthContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
    markAsRead: (notificationId: number) => void;
    markAsSeen: (notificationId: number) => void;
    deleteNotification: (notificationId: number) => void;
    deleteAllNotifications: () => void;
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
                if (user) {
                    // Use the new MERGED endpoint (personal subcollection + district broadcasts)
                    // This is the OPTIMIZED storage pattern - 1000x reduction for broadcasts
                    const res = await fetch(`${API_URL}/notifications/merged/${user.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Filter out expired notifications
                        const now = new Date();
                        const validNotifications = data.filter((n: Notification) => {
                            // Skip if expired
                            if (n.expiresAt) {
                                return new Date(n.expiresAt) > now;
                            }
                            return true;
                        });
                        setNotifications(validNotifications);
                    }
                } else {
                    // If no user, just get all notifications (for admin/debug)
                    const res = await fetch(`${API_URL}/notifications`);
                    if (res.ok) {
                        const data = await res.json();
                        setNotifications(data);
                    }
                }
            } catch { }
        };
        load();
    }, [user]);

    // Request location permission and get district + mandal
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
                        // Get district + mandal from backend
                        const res = await fetch(`${API_URL}/geocoding/district?lat=${latitude}&lng=${longitude}`);
                        if (res.ok) {
                            const { district, mandal, village, state } = await res.json();
                            setUserDistrict(district);

                            // Update user's district, mandal, and location coords
                            if (user) {
                                await fetch(`${API_URL}/users/${user.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        district,
                                        mandal,
                                        locationCoords: { lat: latitude, lng: longitude }
                                    })
                                });
                            }

                            console.log('[Location] Detected:', { district, mandal, village, state });
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('[Location] Error getting location:', error);
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

    // Auto-update location daily (runs on app open)
    useEffect(() => {
        if (!user) return;

        const LOCATION_UPDATE_KEY = `lastLocationUpdate_${user.id}`;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours

        const checkAndUpdateLocation = async () => {
            const lastUpdate = localStorage.getItem(LOCATION_UPDATE_KEY);
            const now = Date.now();

            // Check if 24 hours have passed since last update
            if (!lastUpdate || (now - parseInt(lastUpdate)) > ONE_DAY_MS) {
                console.log('[Location] Daily location update triggered');
                const success = await requestLocationPermission();
                if (success) {
                    localStorage.setItem(LOCATION_UPDATE_KEY, now.toString());
                    console.log('[Location] Daily location update completed');
                }
            } else {
                const hoursAgo = Math.round((now - parseInt(lastUpdate)) / (60 * 60 * 1000));
                console.log(`[Location] Last updated ${hoursAgo}h ago, skipping refresh`);
            }
        };

        // Run on mount if user has no district OR if 24h passed
        if (!user.district) {
            requestLocationPermission().then(success => {
                if (success) {
                    localStorage.setItem(LOCATION_UPDATE_KEY, Date.now().toString());
                }
            });
        } else {
            setUserDistrict(user.district);
            checkAndUpdateLocation();
        }
    }, [user, requestLocationPermission]);

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

    const deleteNotification = useCallback(async (notificationId: number) => {
        try {
            // Remove user from notification's showTo subcollection
            if (user) {
                await fetch(`${API_URL}/notifications/${notificationId}/show-to/${user.id}`, {
                    method: 'DELETE'
                });
            }
            // Remove from local state
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Error hiding notification:', error);
        }
    }, [user]);

    const deleteAllNotifications = useCallback(async () => {
        try {
            // Delete all notifications for current user
            if (user) {
                await fetch(`${API_URL}/notifications/user/${user.id}`, {
                    method: 'DELETE'
                });
                setNotifications([]);
            }
        } catch (error) {
            console.error('Error deleting all notifications:', error);
        }
    }, [user]);

    const value = useMemo(() => ({
        notifications,
        addNotification,
        markAsRead,
        markAsSeen,
        deleteNotification,
        deleteAllNotifications,
        userDistrict,
        requestLocationPermission
    }), [notifications, addNotification, markAsRead, markAsSeen, deleteNotification, deleteAllNotifications, userDistrict, requestLocationPermission]);

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
