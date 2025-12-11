import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Header from '../../components/Header';
import { AppView, User } from '../../types';

interface AdminVerificationManagerProps {
    goBack: () => void;
    navigate: (view: AppView) => void;
}

const AdminVerificationManager: React.FC<AdminVerificationManagerProps> = ({ goBack }) => {
    const { allUsers, updateUser } = useAuth();
    const { showToast } = useToast();

    const suppliers = useMemo(() =>
        allUsers.filter(u => u.role === 'Supplier').sort((a, b) => {
            // Sort verified first, then by expiry
            if (a.isVerifiedAccount && !b.isVerifiedAccount) return -1;
            if (!a.isVerifiedAccount && b.isVerifiedAccount) return 1;
            return 0;
        }), [allUsers]);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const getDaysRemaining = (expiryDate?: string) => {
        if (!expiryDate) return null;
        const expiry = new Date(expiryDate);
        const now = new Date();
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(0, days);
    };

    const getStatusBadge = (user: User) => {
        if (!user.isVerifiedAccount) {
            return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Not Verified</span>;
        }
        const days = getDaysRemaining(user.verifiedAccountExpiryDate);
        if (days === null || days <= 0) {
            return <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs">Expired</span>;
        }
        if (days <= 7) {
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs">Expiring ({days}d)</span>;
        }
        return <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">Active ({days}d)</span>;
    };

    const toggleVerification = async (user: User) => {
        const isGranting = !user.isVerifiedAccount;
        const confirmMsg = isGranting
            ? `Grant 30-day verification to ${user.name}?`
            : `Revoke verification from ${user.name}?`;

        if (!confirm(confirmMsg)) return;

        try {
            const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
            const res = await fetch(`${API_URL}/suppliers/${user.id}/toggle-verification`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                const updatedUser = await res.json();
                updateUser(updatedUser);
                showToast(isGranting ? 'Verification granted!' : 'Verification revoked', 'success');
            } else {
                throw new Error('Failed to toggle verification');
            }
        } catch (error) {
            showToast('Error updating verification status', 'error');
        }
    };

    const verifiedCount = suppliers.filter(s => s.isVerifiedAccount).length;
    const expiringCount = suppliers.filter(s => {
        const days = getDaysRemaining(s.verifiedAccountExpiryDate);
        return s.isVerifiedAccount && days !== null && days <= 7;
    }).length;

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
            <Header title="Verified Accounts" onBack={goBack} />

            {/* Stats */}
            <div className="p-4 grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{verifiedCount}</p>
                    <p className="text-xs text-neutral-500">Active</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{expiringCount}</p>
                    <p className="text-xs text-neutral-500">Expiring Soon</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-neutral-600">{suppliers.length - verifiedCount}</p>
                    <p className="text-xs text-neutral-500">Not Verified</p>
                </div>
            </div>

            {/* Supplier List */}
            <div className="p-4 space-y-3">
                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">All Suppliers</h2>

                {suppliers.map(supplier => (
                    <div key={supplier.id} className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                    {supplier.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-neutral-800 dark:text-white">{supplier.name}</h3>
                                    <p className="text-xs text-neutral-500">{supplier.phone}</p>
                                </div>
                            </div>
                            {getStatusBadge(supplier)}
                        </div>

                        {supplier.isVerifiedAccount && (
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-2">
                                <div>
                                    <p className="text-xs text-neutral-400">Purchased</p>
                                    <p className="font-medium text-neutral-700 dark:text-neutral-200">
                                        {formatDate(supplier.verifiedAccountPurchaseDate)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-400">Expires</p>
                                    <p className="font-medium text-neutral-700 dark:text-neutral-200">
                                        {formatDate(supplier.verifiedAccountExpiryDate)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* History */}
                        {supplier.verificationHistory && supplier.verificationHistory.length > 0 && (
                            <details className="mb-3">
                                <summary className="text-xs text-primary cursor-pointer">
                                    View History ({supplier.verificationHistory.length} purchases)
                                </summary>
                                <div className="mt-2 space-y-1">
                                    {supplier.verificationHistory.map((entry, idx) => (
                                        <div key={idx} className="text-xs bg-neutral-50 dark:bg-neutral-700/30 p-2 rounded flex justify-between">
                                            <span>{entry.plan}</span>
                                            <span className="text-neutral-500">
                                                {formatDate(entry.purchaseDate)} - {formatDate(entry.expiryDate)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}

                        <button
                            onClick={() => toggleVerification(supplier)}
                            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${supplier.isVerifiedAccount
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                }`}
                        >
                            {supplier.isVerifiedAccount ? 'Revoke Verification' : 'Grant 30-Day Verification'}
                        </button>
                    </div>
                ))}

                {suppliers.length === 0 && (
                    <p className="text-center text-neutral-500 py-8">No suppliers found</p>
                )}
            </div>
        </div>
    );
};

export default AdminVerificationManager;
