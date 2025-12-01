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

    // Fetch notification stats
    useEffect(() => {
        fetchStats();
    }, []);

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

    return (
        <div className="p-4 max-w-4xl mx-auto">
            {onBack && (
                <button onClick={onBack} className="mb-4 text-primary flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back
                </button>
            )}

            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">📢 Notification Manager</h1>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Sent</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Read</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.read}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Unread</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unread}</p>
                    </div>
                </div>
            )}

            {/* Notification Composer */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 mb-6">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Compose Notification</h2>

                {/* Message Templates */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Quick Templates</label>
                    <div className="flex flex-wrap gap-2">
                        {templates.map((template, idx) => (
                            <button
                                key={idx}
                                onClick={() => setMessage(template.message)}
                                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-600"
                            >
                                {template.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message Input */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Message *</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100"
                        rows={4}
                        placeholder="Enter your notification message..."
                    />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value as NotificationCategory)} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900">
                            <option value="weather">{getCategoryIcon('weather')} Weather</option>
                            <option value="location">{getCategoryIcon('location')} Location</option>
                            <option value="price">{getCategoryIcon('price')} Price</option>
                            <option value="booking">{getCategoryIcon('booking')} Booking</option>
                            <option value="promotional">{getCategoryIcon('promotional')} Promotional</option>
                            <option value="performance">{getCategoryIcon('performance')} Performance</option>
                            <option value="system">{getCategoryIcon('system')} System</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Priority</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as NotificationPriority)} className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>

                {/* Target Audience */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Target Audience</label>

                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={targetAudience.allUsers}
                                onChange={(e) => setTargetAudience({ ...targetAudience, allUsers: e.target.checked })}
                                className="mr-2"
                            />
                            <span className="text-sm">All Users</span>
                        </label>

                        {!targetAudience.allUsers && (
                            <>
                                <div>
                                    <label className="block text-sm mb-1">Districts</label>
                                    <select
                                        multiple
                                        value={targetAudience.districts}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTargetAudience({ ...targetAudience, districts: Array.from(e.target.selectedOptions, option => option.value) })}
                                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900"
                                        size={4}
                                    >
                                        {allDistricts.map(district => (
                                            <option key={district} value={district}>{district}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm mb-1">User Roles</label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={targetAudience.roles.includes('Farmer')}
                                                onChange={(e) => {
                                                    const roles = e.target.checked
                                                        ? [...targetAudience.roles, 'Farmer']
                                                        : targetAudience.roles.filter(r => r !== 'Farmer');
                                                    setTargetAudience({ ...targetAudience, roles });
                                                }}
                                                className="mr-1"
                                            />
                                            <span className="text-sm">Farmers</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={targetAudience.roles.includes('Supplier')}
                                                onChange={(e) => {
                                                    const roles = e.target.checked
                                                        ? [...targetAudience.roles, 'Supplier']
                                                        : targetAudience.roles.filter(r => r !== 'Supplier');
                                                    setTargetAudience({ ...targetAudience, roles });
                                                }}
                                                className="mr-1"
                                            />
                                            <span className="text-sm">Suppliers</span>
                                        </label>
                                    </div>
                                </div>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={targetAudience.newSignups}
                                        onChange={(e) => setTargetAudience({ ...targetAudience, newSignups: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">New Signups Only (last </span>
                                    <input
                                        type="number"
                                        value={targetAudience.newSignupsDays}
                                        onChange={(e) => setTargetAudience({ ...targetAudience, newSignupsDays: parseInt(e.target.value) || 7 })}
                                        className="w-16 mx-1 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-sm"
                                        disabled={!targetAudience.newSignups}
                                    />
                                    <span className="text-sm"> days)</span>
                                </label>
                            </>
                        )}
                    </div>
                </div>

                {/* Delivery Channels */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Delivery Channels</label>
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input type="checkbox" checked className="mr-2" disabled />
                            <span className="text-sm">In-App (Always)</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={channels.includes('push')}
                                onChange={(e) => {
                                    setChannels(e.target.checked ? [...channels, 'push'] : channels.filter(c => c !== 'push'));
                                }}
                                className="mr-2"
                            />
                            <span className="text-sm">📱 Push Notification (FREE - Unlimited)</span>
                        </label>
                    </div>
                </div>

                {/* Schedule */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Schedule (Optional)</label>
                    <input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900"
                    />
                </div>

                {/* Recipient Count */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        📊 Estimated Recipients: <span className="font-bold">{recipientCount}</span> users
                    </p>
                </div>

                {/* Send Button */}
                <Button onClick={handleSend} disabled={sending || !message.trim()} variant="primary">
                    {sending ? 'Sending...' : scheduledFor ? 'Schedule Notification' : 'Send Notification'}
                </Button>
            </div>
        </div>
    );
};

export default NotificationManagerScreen;
