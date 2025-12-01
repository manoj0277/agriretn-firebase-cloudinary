

import React, { useState, useMemo } from 'react';
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
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../translations';
import { useToast } from '../context/ToastContext';


interface AdminViewProps {
    navigate: (view: AppView) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ navigate }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { logout } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();

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
                return <AdminOverviewDashboard />;
            case 'farmers':
                return <FarmersManagement />;
            case 'suppliers':
                return <SuppliersManagement />;
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
            case 'more':
                return <MoreScreen />;
            default:
                return <AdminOverviewDashboard />;
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
                <NotificationBell />
            </Header>
            {renderContent()}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={adminNavItems} />
        </div>
    );
};
export default AdminView;
