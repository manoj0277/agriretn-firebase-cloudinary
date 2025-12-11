
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppView } from '../types';
import Header from '../components/Header';
import BottomNav, { NavItemConfig } from '../components/BottomNav';
import AdminOverviewDashboard from './admin/AdminOverviewDashboard';
import FarmersManagement from './admin/FarmersManagement';
import SuppliersManagement from './admin/SuppliersManagement';
import ManageBookingsScreen from './ManageBookingsScreen';
import ManageSupportTicketsScreen from './ManageSupportTicketsScreen';
import AdminAnalyticsScreen from './AdminAnalyticsScreen';
import FraudDetectionScreen from './FraudDetectionScreen';
import SupplierKycScreen from './SupplierKycScreen';
import AdminItemApprovalScreen from './AdminItemApprovalScreen';
import NotificationManagerScreen from './NotificationManagerScreen';
import AdminVerificationManager from './admin/AdminVerificationManager';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import Button from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../translations';
import { useToast } from '../context/ToastContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface AdminViewProps {
    navigate: (view: AppView) => void;
}

interface HighPriorityAlert {
    id: string;
    type: 'booking_timeout' | 'pending_kyc' | 'pending_item' | 'booking_conflict';
    message: string;
    severity: 'high' | 'medium';
    timestamp: string;
    action?: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ navigate }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAlerts, setShowAlerts] = useState(false);
    const [alerts, setAlerts] = useState<HighPriorityAlert[]>([]);
    const alertRef = useRef<HTMLDivElement>(null);
    const { logout, allUsers } = useAuth();
    const { bookings } = useBooking();
    const { items } = useItem();
    const { t } = useLanguage();
    const { showToast } = useToast();

    // Calculate high-priority alerts
    useEffect(() => {
        const newAlerts: HighPriorityAlert[] = [];

        // 1. Bookings exceeding 6 hours search time
        const pendingBookings = bookings.filter(b =>
            b.status === 'Searching' || b.status === 'Pending'
        );
        pendingBookings.forEach(booking => {
            const createdAt = new Date(booking.createdAt || booking.date);
            const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
            if (hoursElapsed >= 6) {
                newAlerts.push({
                    id: `booking-timeout-${booking.id}`,
                    type: 'booking_timeout',
                    message: `Booking ${booking.id.slice(-8)} waiting ${Math.round(hoursElapsed)}+ hours`,
                    severity: 'high',
                    timestamp: new Date().toISOString(),
                    action: () => setActiveTab('bookings')
                });
            }
        });

        // 2. Pending item approvals
        const pendingItems = items.filter(i => i.status === 'pending');
        if (pendingItems.length > 0) {
            newAlerts.push({
                id: 'pending-items',
                type: 'pending_item',
                message: `${pendingItems.length} item(s) awaiting approval`,
                severity: 'medium',
                timestamp: new Date().toISOString(),
                action: () => setActiveTab('items')
            });
        }

        // 3. Check for pending KYC
        const fetchKycAlerts = async () => {
            try {
                const suppliers = allUsers.filter(u => u.role === 'Supplier');
                let pendingCount = 0;
                for (const s of suppliers.slice(0, 10)) { // Limit to avoid too many requests
                    const res = await fetch(`${API_URL}/kyc/${s.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'Pending') pendingCount++;
                    }
                }
                if (pendingCount > 0) {
                    setAlerts(prev => [...prev.filter(a => a.type !== 'pending_kyc'), {
                        id: 'pending-kyc',
                        type: 'pending_kyc',
                        message: `${pendingCount} KYC submission(s) pending review`,
                        severity: 'medium',
                        timestamp: new Date().toISOString(),
                        action: () => setActiveTab('kyc')
                    }]);
                }
            } catch (e) {
                console.error('Error fetching KYC alerts:', e);
            }
        };
        fetchKycAlerts();

        setAlerts(newAlerts);
    }, [bookings, items, allUsers]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
                setShowAlerts(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const adminNavItems: NavItemConfig[] = [
        {
            name: 'dashboard' as TranslationKey,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        },
        {
            name: 'farmers' as TranslationKey,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125a4 4 0 00-6.44 0A6 6 0 003 20v1z" /></svg>
        },
        {
            name: 'suppliers' as TranslationKey,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        },
        {
            name: 'bookings' as TranslationKey,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        },
        {
            name: 'more' as TranslationKey,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        }
    ];


    const MoreScreen = () => (
        <div className="p-4 space-y-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
                <button onClick={() => setActiveTab('support')} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{t('supportTickets')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setActiveTab('analytics')} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{t('analytics')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setActiveTab('fraud')} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">Fraud Detection</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setActiveTab('kyc')} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">Supplier KYC</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setActiveTab('items')} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">Item Approvals</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => setActiveTab('notification-manager')} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">📢 Notification Manager</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => navigate({ view: 'SETTINGS' })} className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex justify-between items-center">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">{t('settings')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
            <Button onClick={logout} variant="secondary">{t('logout')}</Button>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <AdminOverviewDashboard setActiveTab={setActiveTab as any} />;
            case 'farmers':
                return <FarmersManagement />;
            case 'suppliers':
                return <SuppliersManagement />;
            case 'items':
                return <AdminItemApprovalScreen />;
            case 'bookings':
                return <ManageBookingsScreen />;
            case 'support':
                return <ManageSupportTicketsScreen onBack={() => setActiveTab('more')} />;
            case 'analytics':
                return <AdminAnalyticsScreen />;
            case 'fraud':
                return <FraudDetectionScreen />;
            case 'kyc':
                return <SupplierKycScreen />;
        }
    };

    const headerTitle = useMemo(() => {
        switch (activeTab) {
            case 'support':
                return t('supportTickets');
            case 'analytics':
                return t('platformAnalytics');
            case 'fraud':
                return 'Fraud Detection';
            case 'kyc':
                return 'Supplier KYC';
            default:
                return `${t('admin')} ${t(activeTab as TranslationKey)}`;
        }
    }, [activeTab, t]);

    return (
        <div className="pb-20">
            <Header title={headerTitle}>
                {/* High-Priority Alerts Button */}
                <div className="relative" ref={alertRef}>
                    <button
                        className="relative p-2 text-neutral-700 dark:text-neutral-300 hover:text-primary rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        aria-label="Alerts"
                        onClick={() => setShowAlerts(!showAlerts)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {alerts.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {alerts.length}
                            </span>
                        )}
                    </button>

                    {/* Alert Dropdown */}
                    {showAlerts && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-[9999] max-h-96 overflow-y-auto">
                            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                                <h4 className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    High Priority Alerts
                                </h4>
                            </div>
                            {alerts.length === 0 ? (
                                <div className="p-4 text-center text-neutral-500 dark:text-neutral-400">
                                    <p className="text-sm">✅ No urgent alerts</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    {alerts.map(alert => (
                                        <button
                                            key={alert.id}
                                            onClick={() => {
                                                if (alert.action) alert.action();
                                                setShowAlerts(false);
                                            }}
                                            className="w-full text-left p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${alert.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                                <div>
                                                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{alert.message}</p>
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Click to view</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <NotificationBell />
            </Header>
            {renderContent()}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={adminNavItems} />
        </div>
    );
};
export default AdminView;

