



import React, { useEffect, useMemo, useState } from 'react';
import { AppView, Booking, UserRole, ItemCategory, Item, User } from '../types';
import Header from '../components/Header';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { useAuth } from '../context/AuthContext';
import { supabase, supabaseConfigured } from '../../lib/supabase';

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
    const { bookings: ctxBookings } = useBooking();
    const { items: ctxItems } = useItem();
    const { allUsers: ctxUsers } = useAuth();

    const [bookings, setBookings] = useState<Booking[]>(ctxBookings);
    const [items, setItems] = useState<Item[]>(ctxItems);
    const [users, setUsers] = useState<User[]>(ctxUsers);

    useEffect(() => {
        const load = async () => {
            if (!supabaseConfigured) {
                setBookings(ctxBookings);
                setItems(ctxItems);
                setUsers(ctxUsers);
                return;
            }
            try {
                const [{ data: b }, { data: i }, { data: u }] = await Promise.all([
                    supabase.from('bookings').select('*'),
                    supabase.from('items').select('*'),
                    supabase.from('users').select('*'),
                ]);
                setBookings((b || []) as any);
                setItems((i || []) as any);
                setUsers((u || []) as any);
            } catch {
                setBookings(ctxBookings);
                setItems(ctxItems);
                setUsers(ctxUsers);
            }
        };
        load();
    }, [ctxBookings, ctxItems, ctxUsers]);

    const analytics = useMemo(() => {
        const completedBookings = bookings.filter(b => b.status === 'Completed');
        const totalRevenue = completedBookings.reduce((acc, b) => acc + (b.finalPrice || 0), 0);
        
        const bookingCountsByCategory = completedBookings.reduce((acc, b) => {
            acc[b.itemCategory] = (acc[b.itemCategory] || 0) + 1;
            return acc;
        }, {} as Record<ItemCategory, number>);

        const mostBookedCategory = Object.entries(bookingCountsByCategory).sort((a, b) => b[1] - a[1])[0];

        const totalFarmers = users.filter(u => u.role === UserRole.Farmer).length;
        const totalSuppliers = users.filter(u => u.role === UserRole.Supplier).length;

        // Regional Demand: count completed bookings by normalized location (city string or lat/lng bucket)
        const toRegion = (b: Booking) => {
            if (b.location) return b.location.trim();
            const lc = (b as any).locationCoords as { lat: number; lng: number } | undefined;
            if (lc) return `${lc.lat.toFixed(2)},${lc.lng.toFixed(2)}`;
            return 'Unknown';
        };
        const regionalDemand = completedBookings.reduce((acc, b) => {
            const r = toRegion(b);
            acc[r] = (acc[r] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topRegions = Object.entries(regionalDemand).sort((a, b) => b[1] - a[1]).slice(0, 6);

        // Machine Demand: bookings by ItemCategory
        const machineDemand = Object.entries(bookingCountsByCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);

        // Seasonal Analytics: bookings per month
        const byMonth = completedBookings.reduce((acc, b) => {
            const d = new Date(b.date);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            acc[k] = (acc[k] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const seasonalSeries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));

        // Inventory Forecast: simple moving average forecast per category using last 3 months
        const lastMonths = seasonalSeries.slice(-3).map(([, v]) => v);
        const overallForecast = lastMonths.length ? Math.round(lastMonths.reduce((a, b) => a + b, 0) / lastMonths.length) : 0;

        const geoCount = items.reduce((acc, i) => {
            const r = i.location || (i.locationCoords ? `${i.locationCoords.lat.toFixed(2)},${i.locationCoords.lng.toFixed(2)}` : 'Unknown');
            acc[r] = (acc[r] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const geoTop = Object.entries(geoCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

        return {
            totalRevenue,
            totalCompletedBookings: completedBookings.length,
            avgBookingValue: completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0,
            mostBookedCategory: mostBookedCategory ? `${mostBookedCategory[0]} (${mostBookedCategory[1]} bookings)` : 'N/A',
            totalFarmers,
            totalSuppliers,
            totalItems: items.length,
            regionalDemand: topRegions,
            machineDemand,
            seasonalSeries,
            overallForecast,
            geoTop,
        };
    }, [bookings, items, users]);

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

                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-2">Regional Demand Prediction</h3>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-600">
                        {analytics.regionalDemand.map(([region, count]) => (
                            <li key={region} className="flex justify-between py-2">
                                <span className="text-neutral-600 dark:text-neutral-300">{region}</span>
                                <span className="font-semibold">{count} bookings</span>
                            </li>
                        ))}
                        {analytics.regionalDemand.length === 0 && <li className="py-2 text-sm text-neutral-500">No data</li>}
                    </ul>
                </div>

                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-2">Machine Demand</h3>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-600">
                        {analytics.machineDemand.map(([cat, count]) => (
                            <li key={cat} className="flex justify-between py-2">
                                <span className="text-neutral-600 dark:text-neutral-300">{cat}</span>
                                <span className="font-semibold">{count}</span>
                            </li>
                        ))}
                        {analytics.machineDemand.length === 0 && <li className="py-2 text-sm text-neutral-500">No data</li>}
                    </ul>
                </div>

                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-2">Geographical Analytics</h3>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-600">
                        {analytics.geoTop.map(([region, count]) => (
                            <li key={region} className="flex justify-between py-2">
                                <span className="text-neutral-600 dark:text-neutral-300">{region}</span>
                                <span className="font-semibold">{count} items</span>
                            </li>
                        ))}
                        {analytics.geoTop.length === 0 && <li className="py-2 text-sm text-neutral-500">No data</li>}
                    </ul>
                </div>

                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-2">Seasonal Analytics</h3>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-600">
                        {analytics.seasonalSeries.map(([month, count]) => (
                            <li key={month} className="flex justify-between py-2">
                                <span className="text-neutral-600 dark:text-neutral-300">{month}</span>
                                <span className="font-semibold">{count} bookings</span>
                            </li>
                        ))}
                        {analytics.seasonalSeries.length === 0 && <li className="py-2 text-sm text-neutral-500">No data</li>}
                    </ul>
                    <div className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">Inventory Forecast (next month): <span className="font-semibold">{analytics.overallForecast} bookings</span></div>
                </div>

            </div>
        </div>
    );
};

export default AdminAnalyticsScreen;