
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
import DemandControlScreen from './admin/DemandControlScreen';
import CommunityManagementScreen from './admin/CommunityManagementScreen';
import DemandGapsScreen from './admin/DemandGapsScreen';

import SettingsScreen from './SettingsScreen';
import MyAccountScreen from './MyAccountScreen';

// ... (existing imports)
// ... (existing imports)
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import Button from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../translations';

import { useToast } from '../context/ToastContext';
import AdminSidebar from '../components/AdminSidebar';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface AdminViewProps {
    navigate: (view: AppView) => void;
    children?: React.ReactNode;
    currentView?: string;
}

const AdminView: React.FC<AdminViewProps> = ({ navigate, children, currentView }) => {
    const [activeTab, setActiveTabState] = useState('dashboard');
    const [history, setHistory] = useState<string[]>(['dashboard']); // History stack

    interface HighPriorityAlert {
        id: string;
        type: 'booking_timeout' | 'pending_kyc' | 'pending_item' | 'booking_conflict';
        message: string;
        severity: 'high' | 'medium';
        timestamp: string;
        action?: () => void;
    }

    // Wrapper for setActiveTab to handle history
    const setActiveTab = (tab: string) => {
        if (tab !== activeTab) {
            setHistory(prev => [...prev, tab]);
            setActiveTabState(tab);
        }
    };

    // Sync activeTab with currentView
    useEffect(() => {
        if (typeof currentView === 'string') {
            switch (currentView) {
                case 'PROFILE':
                    setActiveTab('profile');
                    break;
                case 'SETTINGS':
                    setActiveTab('settings');
                    break;
                case 'SUPPORT':
                    setActiveTab('support');
                    break;
                // Add more mappings if App.tsx supports them for Admins
            }
        }
    }, [currentView]);

    // Handle Back Navigation (History Pop)
    const handleBack = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop(); // Remove current
            const prevTab = newHistory[newHistory.length - 1]; // Get previous
            setHistory(newHistory);
            setActiveTabState(prevTab);
        }
    };

    const [showAlerts, setShowAlerts] = useState(false);
    const [alerts, setAlerts] = useState<HighPriorityAlert[]>([]);
    const alertRef = useRef<HTMLDivElement>(null);
    const { user, logout, allUsers } = useAuth();
    const { bookings } = useBooking();
    const { items } = useItem();
    const { t } = useLanguage();
    const { showToast } = useToast();

    // ... (useEffect for alerts remains same)

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
        { name: 'dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
        { name: 'farmers', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { name: 'suppliers', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
        { name: 'bookings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
        { name: 'more', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> },
    ];


    const MoreScreen = () => (
        <div className="p-4 grid grid-cols-2 gap-4 pb-24">
            <button onClick={() => setActiveTab('items')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Item Approvals</span>
            </button>
            <button onClick={() => setActiveTab('kyc')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Supplier KYC</span>
            </button>
            <button onClick={() => setActiveTab('support')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Support Tickets</span>
            </button>
            <button onClick={() => setActiveTab('analytics')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0a2 2 0 012-2z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Analytics</span>
            </button>
            <button onClick={() => setActiveTab('demand-control')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Demand & Pricing</span>
            </button>
            <button onClick={() => setActiveTab('fraud')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Fraud Detection</span>
            </button>
            <button onClick={() => setActiveTab('notification-manager')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Notifications</span>
            </button>
            <button onClick={() => setActiveTab('community-moderation')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Community Moderation</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Settings</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">My Account</span>
            </button>
            <button onClick={() => setActiveTab('demand-gaps')} className="p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 text-center">Demand Gaps</span>
            </button>
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
                return <ManageSupportTicketsScreen onBack={handleBack} />;
            case 'analytics':
                return <AdminAnalyticsScreen />;
            case 'fraud':
                return <FraudDetectionScreen />;
            case 'kyc':
                return <SupplierKycScreen />;
            case 'demand-control':
                return <DemandControlScreen />;

            case 'notification-manager':
                return <NotificationManagerScreen onBack={history.length > 1 ? handleBack : undefined} />;
            case 'more':
                return <MoreScreen />;
            case 'community-moderation':
                return <CommunityManagementScreen />;
            case 'settings':
                return <SettingsScreen navigate={navigate} goBack={handleBack} hideHeader={true} />;
            case 'profile':
                return <MyAccountScreen goBack={handleBack} navigate={navigate} />;
            case 'demand-gaps':
                return <DemandGapsScreen />;
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
            case 'demand-control':
                return 'Demand & Price Control';
            case 'community-moderation':
                return 'Community Moderation';
            case 'profile':
                return 'My Account';

            default:
                return `${t('admin')} ${t(activeTab as TranslationKey)}`;
        }
    }, [activeTab, t]);

    return (
        <div className="h-screen flex bg-green-50 dark:bg-neutral-900 overflow-hidden">
            {/* Desktop Sidebar */}
            <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header title={headerTitle} onBack={history.length > 1 ? handleBack : undefined}>
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

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                    {children ? children : renderContent()}
                </div>

                {/* Mobile Bottom Nav */}
                <div className="md:hidden">
                    <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={adminNavItems} />
                </div>
            </div>
        </div>
    );
};
export default AdminView;

