import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { AppView, Item } from '../types';
import Header from '../components/Header';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface EarningsDetailsScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const EarningsDetailsScreen: React.FC<EarningsDetailsScreenProps> = ({ navigate, goBack }) => {
    const { user } = useAuth();
    const { bookings } = useBooking();
    const { items } = useItem();
    const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');

    const supplierItems = useMemo(() => items.filter(i => i.ownerId === user?.id), [items, user]);
    const supplierItemIds = useMemo(() => supplierItems.map(i => i.id), [supplierItems]);

    // Filter completed bookings for this supplier
    const completedBookings = useMemo(() => {
        return bookings.filter(b =>
            b.itemId &&
            supplierItemIds.includes(b.itemId) &&
            b.status === 'Completed'
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bookings, supplierItemIds]);

    // Financial Metrics
    const metrics = useMemo(() => {
        let total = 0;
        let monthly = 0;
        let weekly = 0;
        let daily = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const todayStr = now.toISOString().split('T')[0];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        completedBookings.forEach(b => {
            const amount = b.supplierPaymentAmount || b.finalPrice || 0;
            const date = new Date(b.date);
            const dateStr = b.date;

            total += amount;

            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                monthly += amount;
            }

            if (date >= oneWeekAgo) {
                weekly += amount;
            }

            if (dateStr === todayStr) {
                daily += amount;
            }
        });

        return { total, monthly, weekly, daily };
    }, [completedBookings]);

    // Chart Data - Revenue Trend
    const trendData = useMemo(() => {
        const data: Record<string, number> = {};
        const days = timeframe === 'weekly' ? 7 : 30;
        const now = new Date();

        // Initialize with 0
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            data[d.toISOString().split('T')[0]] = 0;
        }

        completedBookings.forEach(b => {
            const dateStr = b.date; // Assuming YYYY-MM-DD
            if (data[dateStr] !== undefined) {
                data[dateStr] += b.supplierPaymentAmount || b.finalPrice || 0;
            }
        });

        return Object.entries(data)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, amount]) => ({
                date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                amount
            }));
    }, [completedBookings, timeframe]);

    // Chart Data - Equipment Performance
    const equipmentData = useMemo(() => {
        const data: Record<string, number> = {};

        completedBookings.forEach(b => {
            if (b.itemId) {
                const item = items.find(i => i.id === b.itemId);
                const name = item ? item.name : `Item #${b.itemId}`;
                data[name] = (data[name] || 0) + (b.supplierPaymentAmount || b.finalPrice || 0);
            }
        });

        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [completedBookings, items]);

    // Additional Metrics
    const extraMetrics = useMemo(() => {
        let pending = 0;
        let cancelledLost = 0;
        const categoryMap: Record<string, number> = {};

        bookings.forEach(b => {
            if (b.itemId && supplierItemIds.includes(b.itemId)) {
                if (b.status === 'Pending Payment') {
                    pending += b.supplierPaymentAmount || b.estimatedPrice || 0;
                }
                if (b.status === 'Cancelled') {
                    cancelledLost += b.estimatedPrice || 0;
                }

                // For Best Category
                if (b.status === 'Completed') {
                    const amount = b.supplierPaymentAmount || b.finalPrice || 0;
                    categoryMap[b.itemCategory] = (categoryMap[b.itemCategory] || 0) + amount;
                }
            }
        });

        const totalBookingsCount = completedBookings.length;
        const aov = totalBookingsCount > 0 ? metrics.total / totalBookingsCount : 0;

        let bestCategory = 'N/A';
        let maxRev = 0;
        Object.entries(categoryMap).forEach(([cat, rev]) => {
            if (rev > maxRev) {
                maxRev = rev;
                bestCategory = cat;
            }
        });

        return { pending, cancelledLost, aov, bestCategory };
    }, [bookings, supplierItemIds, metrics.total, completedBookings.length]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="bg-green-50 dark:bg-neutral-900 min-h-screen pb-20">
            <Header title="Earnings Details" onBack={goBack} />

            <div className="p-4 space-y-6 max-w-5xl mx-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">₹{metrics.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">This Month</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{metrics.monthly.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">This Week</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{metrics.weekly.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Today</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">₹{metrics.daily.toLocaleString()}</p>
                    </div>
                </div>

                {/* Extra Insights Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Avg. Order Value</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">₹{Math.round(extraMetrics.aov).toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Pending Payments</p>
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">₹{extraMetrics.pending.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Best Performing</p>
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400 truncate">{extraMetrics.bestCategory}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Lost (Cancelled)</p>
                        <p className="text-lg font-bold text-red-500 dark:text-red-400">₹{extraMetrics.cancelledLost.toLocaleString()}</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Trend */}
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-neutral-800 dark:text-white">Revenue Trend</h3>
                            <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
                                <button
                                    onClick={() => setTimeframe('weekly')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${timeframe === 'weekly' ? 'bg-green-600 text-white shadow-md' : 'text-neutral-500 dark:text-neutral-400 hover:bg-white/50'}`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => setTimeframe('monthly')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${timeframe === 'monthly' ? 'bg-green-600 text-white shadow-md' : 'text-neutral-500 dark:text-neutral-400 hover:bg-white/50'}`}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Equipment Breakdown */}
                    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <h3 className="font-bold text-lg text-neutral-800 dark:text-white mb-6">Revenue by Equipment</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={equipmentData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                        {equipmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Detailed Transactions Table */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                        <h3 className="font-bold text-lg text-neutral-800 dark:text-white">Transaction History</h3>
                    </div>
                    {completedBookings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
                                <thead className="bg-neutral-50 dark:bg-neutral-700/50 text-neutral-900 dark:text-neutral-100 font-semibold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Item</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                    {completedBookings.map((booking) => {
                                        const item = items.find(i => i.id === booking.itemId);
                                        return (
                                            <tr key={booking.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {new Date(booking.date).toLocaleDateString()}
                                                    <div className="text-xs text-neutral-400">{booking.startTime}</div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                                                    {item?.name || booking.itemCategory}
                                                </td>
                                                <td className="px-6 py-4">
                                                    Customer #{booking.farmerId.substring(0, 6)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                        {booking.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-neutral-900 dark:text-white">
                                                    ₹{(booking.supplierPaymentAmount || booking.finalPrice || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-neutral-500">
                            No transactions found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EarningsDetailsScreen;
