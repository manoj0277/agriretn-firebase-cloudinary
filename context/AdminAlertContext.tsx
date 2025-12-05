import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';

export interface AdminAlert {
    id: string;
    type: 'LATE_BOOKING' | 'UNACCEPTED_REQUEST' | 'HIGH_VALUE_CANCEL' | 'SYSTEM';
    message: string;
    severity: 'critical' | 'warning' | 'info';
    timestamp: string;
    relatedId?: string;
    read: boolean;
}

interface AdminAlertContextType {
    alerts: AdminAlert[];
    addAlert: (alert: Omit<AdminAlert, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    clearAlert: (id: string) => void;
    unreadCount: number;
}

const AdminAlertContext = createContext<AdminAlertContextType | undefined>(undefined);

export const AdminAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alerts, setAlerts] = useState<AdminAlert[]>([]);

    // Load from local storage for persistence (mocking backend for now)
    useEffect(() => {
        const saved = localStorage.getItem('adminAlerts');
        if (saved) {
            try {
                setAlerts(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse admin alerts", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('adminAlerts', JSON.stringify(alerts));
    }, [alerts]);

    const addAlert = (alertData: Omit<AdminAlert, 'id' | 'timestamp' | 'read'>) => {
        const newAlert: AdminAlert = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...alertData,
            timestamp: new Date().toISOString(),
            read: false
        };
        setAlerts(prev => [newAlert, ...prev]);
    };

    const markAsRead = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    };

    const clearAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const unreadCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);

    const value = useMemo(() => ({
        alerts,
        addAlert,
        markAsRead,
        clearAlert,
        unreadCount
    }), [alerts, unreadCount]);

    return (
        <AdminAlertContext.Provider value={value}>
            {children}
        </AdminAlertContext.Provider>
    );
};

export const useAdminAlert = (): AdminAlertContextType => {
    const context = useContext(AdminAlertContext);
    if (context === undefined) {
        throw new Error('useAdminAlert must be used within a AdminAlertProvider');
    }
    return context;
};
