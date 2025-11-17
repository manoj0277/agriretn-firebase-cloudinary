

import React, { useMemo } from 'react';
import { AppView, Booking, UserRole, ItemCategory } from '../types';
import Header from '../components/Header';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { useAuth } from '../context/AuthContext';

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactElement }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 flex items-center space-x-4">
        <div className="bg-primary/10 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{title}</p>
            <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{value}</p>
        </div>
    </div>
);

const AdminAnalyticsScreen: React.FC = () => {
    const { bookings } = useBooking();
    const { items } = useItem();
    const { allUsers } = useAuth();

    const analytics = useMemo(() => {
        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const totalRevenue = completedBookings.reduce((acc, b) => acc + (b.finalPrice || 0), 0);
        
        const bookingCountsByCategory = completedBookings.reduce((acc, b) => {
            acc[b.itemCategory] = (acc[b.itemCategory] || 0) + 1;
            return acc;
        }, {} as Record<ItemCategory, number>);

        const mostBookedCategory = Object.entries(bookingCountsByCategory).sort((a, b) => b[1] - a[1])[0];

        const totalFarmers = allUsers.filter(u => u.role === UserRole.Farmer).length;
        const totalSuppliers = allUsers.filter(u => u.role === UserRole.Supplier).length;

        return {
            totalRevenue,
            totalCompletedBookings: completedBookings.length,
            avgBookingValue: completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0,
            mostBookedCategory: mostBookedCategory ? `${mostBookedCategory[0]} (${mostBookedCategory[1]} bookings)` : 'N/A',
            totalFarmers,
            totalSuppliers,
            totalItems: items.length,
        };
    }, [bookings, items, allUsers]);

    return (
        <div className="dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
            <div className="p-4 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard 
                        title="Total Revenue" 
                        value={`₹${analytics.totalRevenue.toLocaleString()}`} 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                    />
                    <StatCard 
                        title="Avg. Booking Value" 
                        value={`₹${analytics.avgBookingValue.toFixed(2)}`}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    />
                     <StatCard 
                        title="Total Farmers" 
                        value={analytics.totalFarmers}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                    />
                     <StatCard 
                        title="Total Suppliers" 
                        value={analytics.totalSuppliers}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    />
                </div>

                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-2">Key Metrics</h3>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-600">
                        <li className="flex justify-between py-2"><span className="text-neutral-600 dark:text-neutral-300">Total Completed Bookings:</span> <span className="font-semibold">{analytics.totalCompletedBookings}</span></li>
                        <li className="flex justify-between py-2"><span className="text-neutral-600 dark:text-neutral-300">Total Listed Items:</span> <span className="font-semibold">{analytics.totalItems}</span></li>
                        <li className="flex justify-between py-2"><span className="text-neutral-600 dark:text-neutral-300">Most Booked Category:</span> <span className="font-semibold">{analytics.mostBookedCategory}</span></li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default AdminAnalyticsScreen;