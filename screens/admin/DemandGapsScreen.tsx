import React, { useState, useEffect } from 'react';
import { auth as firebaseAuth } from '../../src/lib/firebase';

const DemandGapsScreen: React.FC = () => {
    const [failedSearches, setFailedSearches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFailedSearches();
    }, []);

    const fetchFailedSearches = async () => {
        try {
            setLoading(true);
            const token = await firebaseAuth.currentUser?.getIdToken();
            const response = await fetch('/api/admin/failed-searches', {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (response.ok) {
                const data = await response.json();
                setFailedSearches(data);
            }
        } catch (error) {
            console.error('Error fetching failed searches:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-green-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h1 className="text-2xl font-bold">Future Addon Radius</h1>
                </div>
                <p className="text-green-100 text-sm">
                    Track areas where farmers searched for equipment but found nothing. Use this data to onboard suppliers in high-demand zones.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Gaps</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{failedSearches.length}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">This Week</p>
                    <p className="text-2xl font-bold text-primary">
                        {failedSearches.filter(s => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return new Date(s.timestamp) > weekAgo;
                        }).length}
                    </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Top Category</p>
                    <p className="text-lg font-bold text-orange-600">
                        {failedSearches.length > 0
                            ? Object.entries(failedSearches.reduce((acc, s) => {
                                acc[s.selectedCategory] = (acc[s.selectedCategory] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                            : 'N/A'}
                    </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Status</p>
                    <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Tracking
                    </p>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-neutral-900 dark:text-white">Demand Gap Records</h2>
                    <button
                        onClick={fetchFailedSearches}
                        className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-neutral-500">Loading demand gaps...</p>
                    </div>
                ) : failedSearches.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-900">
                                    <th className="py-3 px-4">Location</th>
                                    <th className="py-3 px-4">Required Service</th>
                                    <th className="py-3 px-4">Date & Time</th>
                                    <th className="py-3 px-4">Farmer ID</th>
                                    <th className="py-3 px-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {failedSearches
                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                    .map((search, i) => (
                                        <tr key={i} className="text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                                            <td className="py-4 px-4 font-medium text-neutral-900 dark:text-neutral-100">{search.location}</td>
                                            <td className="py-4 px-4">
                                                <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2.5 py-1 rounded-full text-xs font-bold">
                                                    {search.selectedCategory}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-neutral-600 dark:text-neutral-400">
                                                {new Date(search.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-4 font-mono text-xs text-neutral-500">{search.userId}</td>
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-red-600 dark:text-red-400 font-bold flex items-center justify-end gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                                    Gap Found
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-16 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-neutral-500 font-medium">No demand gaps reported yet</p>
                        <p className="text-neutral-400 text-sm">Service coverage is good across all areas!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemandGapsScreen;
