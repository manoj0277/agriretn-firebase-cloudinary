

import React, { useMemo } from 'react';
import { AppView, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useBooking } from '../context/BookingContext';
import { useSupport } from '../context/SupportContext';
import Header from '../components/Header';
import Button from '../components/Button';
import NotificationBell from '../components/NotificationBell';
import { useLanguage } from '../context/LanguageContext';

interface AdminDashboardProps {
    setActiveTab: (tab: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center space-x-3 shadow-sm">
        <div className="flex-shrink-0 bg-primary/10 dark:bg-primary/20 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{title}</p>
            <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{value}</p>
        </div>
    </div>
);

const ActionItem: React.FC<{ title: string; count: number; onClick: () => void; icon: React.ReactElement; }> = ({ title, count, onClick, icon }) => (
    <button
        onClick={onClick}
        className="w-full text-left p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary dark:hover:border-primary hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors flex items-center justify-between"
    >
        <div className="flex items-center space-x-3">
            {icon}
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">{title}</span>
        </div>
        {count > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {count}
            </span>
        )}
    </button>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ setActiveTab }) => {
    const { user, allUsers } = useAuth();
    const { items } = useItem();
    const { bookings, damageReports } = useBooking();
    const { tickets } = useSupport();
    const { t } = useLanguage();

    const stats = useMemo(() => {
        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const totalRevenue = completedBookings.reduce((acc, b) => acc + (b.finalPrice || 0), 0);

        return {
            totalUsers: allUsers.length - 1, // Exclude admin
            totalItems: items.length,
            completedBookings: completedBookings.length,
            totalRevenue: `₹${totalRevenue.toLocaleString()}`,
        };
    }, [allUsers, items, bookings]);

    const pendingActions = useMemo(() => {
        const pendingDisputes = bookings.filter(b => b.disputeRaised && !b.disputeResolved).length;
        const pendingDamage = damageReports.filter(dr => dr.status === 'pending').length;
        return {
            suppliers: allUsers.filter(u => u.role === UserRole.Supplier && u.status === 'pending').length,
            items: items.filter(i => i.status === 'pending').length,
            tickets: tickets.filter(t => t.status === 'open').length,
            disputes: pendingDisputes + pendingDamage,
        }
    }, [allUsers, items, tickets, bookings, damageReports]);

    return (
        <div className="dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900">
            <div className="p-4 space-y-6">
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t('welcomeAdmin', { name: user?.name || '' })}!</h2>
                    <p className="text-neutral-600 dark:text-neutral-300 mt-1">{t('summary')}</p>
                </div>
                
                {/* Overview Stats */}
                <section>
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-3 px-2">{t('overview')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard title={t('totalRevenue')} value={stats.totalRevenue} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                        <StatCard title={t('totalUsers')} value={stats.totalUsers} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                        <StatCard title={t('listedItems')} value={stats.totalItems} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
                        <StatCard title={t('completedBookings')} value={stats.completedBookings} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} />
                    </div>
                </section>
                
                {/* Pending Actions */}
                <section>
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-3 px-2">{t('pendingActions')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ActionItem title={t('supplierApprovals')} count={pendingActions.suppliers} onClick={() => setActiveTab('Users')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>} />
                        <ActionItem title={t('itemApprovals')} count={pendingActions.items} onClick={() => setActiveTab('Items')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                        <ActionItem title={t('openSupportTickets')} count={pendingActions.tickets} onClick={() => setActiveTab('Support')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                        <ActionItem title={t('disputesAndClaims')} count={pendingActions.disputes} onClick={() => setActiveTab('Bookings')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminDashboard;