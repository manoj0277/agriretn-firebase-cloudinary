import React, { useState, useEffect } from 'react';
import { NotificationCategory, NotificationPriority, User } from '../types';
import Button from '../components/Button';
import { useLanguage } from '../context/LanguageContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface NotificationManagerProps {
    onBack?: () => void;
}

const NotificationManagerScreen: React.FC<NotificationManagerProps> = ({ onBack }) => {
    const { t } = useLanguage();
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<NotificationCategory>('system');
    const [priority, setPriority] = useState<NotificationPriority>('medium');
    const [targetAudience, setTargetAudience] = useState({
        allUsers: true,
        districts: [] as string[],
        userIds: [] as number[],
        roles: [] as string[],
        newSignups: false,
        newSignupsDays: 7
    });
    const [channels, setChannels] = useState<string[]>(['app']);
    const [scheduledFor, setScheduledFor] = useState('');
    const [recipientCount, setRecipientCount] = useState(0);
    const [allDistricts, setAllDistricts] = useState<string[]>([]);
    const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [sending, setSending] = useState(false);
    // NEW: Broadcast mode for storage-optimized district notifications
    const [useBroadcast, setUseBroadcast] = useState(false);
    const [broadcastDistrict, setBroadcastDistrict] = useState<string>('all');
    const [broadcastExpiresInDays, setBroadcastExpiresInDays] = useState(7);

    // Fetch notification stats
    useEffect(() => {
        fetchStats();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/notifications/history`);
            if (res.ok) {
                const data = await res.json();
                setNotificationHistory(data);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/notifications/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    // Fetch all users to get unique districts
    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                const res = await fetch(`${API_URL}/users`);
                if (res.ok) {
                    const users: User[] = await res.json();
                    const districts = Array.from(new Set(users.map(u => u.district).filter(Boolean))) as string[];
                    setAllDistricts(districts);
                }
            } catch (error) {
                console.error('Error fetching districts:', error);
            }
        };
        fetchDistricts();
    }, []);

    // Preview recipient count
    useEffect(() => {
        const preview = async () => {
            try {
                const res = await fetch(`${API_URL}/admin/notifications/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetAudience })
                });
                if (res.ok) {
                    const data = await res.json();
                    setRecipientCount(data.recipientCount);
                }
            } catch (error) {
                console.error('Error previewing recipients:', error);
            }
        };
        preview();
    }, [targetAudience]);

    const handleSend = async () => {
        if (!message.trim()) {
            alert('Please enter a message');
            return;
        }

        setSending(true);
        try {
            // NEW: Use broadcast endpoint for storage-optimized district notifications
            if (useBroadcast) {
                const expiresAt = new Date(Date.now() + broadcastExpiresInDays * 24 * 60 * 60 * 1000).toISOString();
                const res = await fetch(`${API_URL}/admin/broadcasts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        category,
                        priority,
                        district: broadcastDistrict,
                        expiresAt
                    })
                });

                if (res.ok) {
                    alert(`✅ Broadcast sent to district: ${broadcastDistrict === 'all' ? 'All Districts' : broadcastDistrict}`);
                    setMessage('');
                    fetchStats();
                } else {
                    alert('❌ Failed to send broadcast');
                }
            } else {
                // Original per-user notification logic
                const res = await fetch(`${API_URL}/admin/notifications/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        category,
                        priority,
                        targetAudience,
                        channels,
                        scheduledFor: scheduledFor || undefined
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    alert(`✅ Notification sent to ${data.recipientCount} users!`);
                    setMessage('');
                    setScheduledFor('');
                    fetchStats();
                } else {
                    alert('❌ Failed to send notification');
                }
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            alert('❌ Error sending notification');
        } finally {
            setSending(false);
        }
    };

    const getCategoryIcon = (cat: NotificationCategory) => {
        const icons = {
            weather: '🌤️',
            location: '📍',
            price: '💰',
            booking: '📅',
            promotional: '🎉',
            performance: '📊',
            system: '🔔'
        };
        return icons[cat] || '🔔';
    };

    const templates = [
        { name: 'Weather Alert', message: '⚠️ Rain forecasted in your area within 3 days. Postpone fieldwork and prepare for rain.' },
        { name: 'New Equipment', message: '🎯 New {{category}} available near you! Check it out now.' },
        { name: 'Price Discount', message: '💰 Special offer: Get 20% off on all equipment bookings this week!' },
        { name: 'Booking Reminder', message: '⏰ Reminder: Your booking is tomorrow. Please be ready!' },
        { name: 'Welcome Message', message: '🎉 Welcome to AgriRent! Use code WELCOME10 for 10% off your first booking.' },
        { name: 'KYC Pending', message: '📋 Complete your KYC verification to start accepting bookings.' },
        { name: 'System Update', message: '🔔 New feature available: AI Crop Calendar! Check it out in the app.' }
    ];

    // State for Batch View
    const [viewMode, setViewMode] = useState<'batches' | 'list'>('batches');
    const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

    // Compute Batch Counts from History
    const batchCounts = notificationHistory.reduce((acc: any, curr: any) => {
        const cat = curr.category || 'system';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    const handleBatchClick = (category: string) => {
        setSelectedBatch(category);
        setViewMode('list');
    };

    const handleBackToBatches = () => {
        setSelectedBatch(null);
        setViewMode('batches');
    };

    const filteredHistory = selectedBatch
        ? notificationHistory.filter((n: any) => n.category === selectedBatch)
        : notificationHistory;

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 text-primary flex items-center hover:underline">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Admin
                </button>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
                    📢 Notification Manager
                </h1>
            </div>

            {/* Stats Overview - Always Visible */}
            {stats && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Total Sent</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800">
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Read</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.read}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-xl border border-yellow-100 dark:border-yellow-800">
                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Unread</p>
                        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.unread}</p>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Composer (Always Visible for Quick Access) */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm sticky top-6">
                        <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-4 border-b border-neutral-100 dark:border-neutral-700 pb-3">
                            ✨ Compose New
                        </h2>

                        {/* Templates */}
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-neutral-500 uppercase mb-2">Quick Templates</label>
                            <div className="flex flex-wrap gap-2">
                                {templates.map((template, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setMessage(template.message)}
                                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm active:scale-95"
                                    >
                                        {template.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    rows={4}
                                    placeholder="Type your notification here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                                        className="w-full px-2 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-sm"
                                    >
                                        <option value="weather">🌤️ Weather</option>
                                        <option value="location">📍 Location</option>
                                        <option value="price">💰 Price</option>
                                        <option value="booking">📅 Booking</option>
                                        <option value="promotional">🎉 Promo</option>
                                        <option value="system">🔔 System</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                                        className="w-full px-2 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-sm"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Broadcast Toggle */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useBroadcast}
                                        onChange={(e) => setUseBroadcast(e.target.checked)}
                                        className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">📡 Broadcast Mode</span>
                                </label>
                                {useBroadcast && (
                                    <div className="mt-3 space-y-2 animate-fade-in">
                                        <select
                                            value={broadcastDistrict}
                                            onChange={(e) => setBroadcastDistrict(e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-neutral-900"
                                        >
                                            <option value="all">🌍 All Districts</option>
                                            {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Send Button */}
                            <Button onClick={handleSend} disabled={sending || !message.trim()} variant="primary" className="w-full py-2.5 shadow-lg shadow-primary/20">
                                {sending ? '🚀 Sending...' : 'Send Notification'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Viewer (Batches or List) */}
                <div className="lg:col-span-2">
                    {/* BATCH VIEW */}
                    {viewMode === 'batches' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Browse by Category</h2>
                                <button onClick={fetchHistory} className="text-sm text-primary hover:bg-primary/5 px-2 py-1 rounded">↻ Refresh</button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {['weather', 'location', 'price', 'booking', 'promotional', 'system'].map((cat) => {
                                    const count = batchCounts[cat] || 0;
                                    return (
                                        <div
                                            key={cat}
                                            onClick={() => handleBatchClick(cat)}
                                            className="group bg-white dark:bg-neutral-800 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all duration-200"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-2xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-200">
                                                    {getCategoryIcon(cat as NotificationCategory)}
                                                </span>
                                                <span className="bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold px-2 py-1 rounded-full">
                                                    {count}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 capitalize mb-1">
                                                {cat}
                                            </h3>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-primary transition-colors">
                                                View notifications →
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* LIST VIEW */}
                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
                                <h3 className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                                    {selectedBatch && (
                                        <button
                                            onClick={handleBackToBatches}
                                            className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-pink-500"
                                            title="Back"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                    {selectedBatch ? `${selectedBatch.charAt(0).toUpperCase() + selectedBatch.slice(1)} Notifications` : 'All Notifications'}
                                </h3>
                                <span className="text-xs font-medium text-neutral-500 bg-white dark:bg-neutral-700 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600">
                                    {filteredHistory.length} items
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800">
                                            <th className="px-6 py-3 font-semibold text-neutral-700 dark:text-neutral-300 w-1/2">Message</th>
                                            <th className="px-6 py-3 font-semibold text-neutral-700 dark:text-neutral-300">Sent Via</th>
                                            <th className="px-6 py-3 font-semibold text-neutral-700 dark:text-neutral-300">Date</th>
                                            <th className="px-6 py-3 font-semibold text-neutral-700 dark:text-neutral-300">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {filteredHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-neutral-400 italic">
                                                    No notifications found in this category.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistory.map((notif: any) => (
                                                <tr key={notif.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="text-neutral-800 dark:text-neutral-200 whitespace-normal break-words leading-relaxed">
                                                            {notif.message}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600">
                                                            {notif.sentVia?.join(', ') || 'app'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-neutral-500 text-xs">
                                                        {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${notif.read
                                                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'}`}>
                                                            {notif.read ? 'Read' : 'Unread'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationManagerScreen;
