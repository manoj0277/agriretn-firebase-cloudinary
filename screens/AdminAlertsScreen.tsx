import React, { useMemo, useState } from 'react';
import { useAdminAlert, AdminAlert } from '../context/AdminAlertContext';
import { AppView } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';

interface AdminAlertsScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const AdminAlertsScreen: React.FC<AdminAlertsScreenProps> = ({ navigate, goBack }) => {
    const { alerts, markAsRead, clearAlert } = useAdminAlert();
    const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

    const filteredAlerts = useMemo(() => {
        if (filter === 'all') return alerts;
        return alerts.filter(a => a.severity === filter);
    }, [alerts, filter]);

    const getSeverityColor = (severity: AdminAlert['severity']) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'warning': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleAction = (alert: AdminAlert) => {
        markAsRead(alert.id);
        if (alert.type === 'LATE_BOOKING' || alert.type === 'UNACCEPTED_REQUEST') {
            navigate({ view: 'MANAGE_BOOKINGS' });
        }
    };

    return (
        <div className="dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 min-h-screen">
            <Header title="Admin Alerts" onBack={goBack} />
            <div className="p-4 max-w-4xl mx-auto">
                <div className="flex space-x-2 mb-6">
                    {(['all', 'critical', 'warning', 'info'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${filter === f ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {filteredAlerts.length === 0 ? (
                        <p className="text-center text-neutral-500 py-8">No alerts found.</p>
                    ) : (
                        filteredAlerts.map(alert => (
                            <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${!alert.read ? 'ring-2 ring-primary ring-opacity-50' : ''} transition-all`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-bold uppercase text-xs tracking-wider">{alert.type.replace('_', ' ')}</span>
                                            <span className="text-xs opacity-75">• {new Date(alert.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="font-medium">{alert.message}</p>
                                    </div>
                                    <div className="flex space-x-2 ml-4">
                                        <button
                                            onClick={() => handleAction(alert)}
                                            className="text-sm font-semibold underline hover:opacity-80"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => clearAlert(alert.id)}
                                            className="text-sm opacity-50 hover:opacity-100"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAlertsScreen;
