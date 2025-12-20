
import React, { useState, useMemo } from 'react';
import { AppView, User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { useLanguage } from '../context/LanguageContext';

import { MedalName } from '../components/MedalName';

const UserCard: React.FC<{ user: User, onApprove: (id: number) => void, onSuspend: (id: number) => void, onReactivate: (id: number) => void }> = ({ user, onApprove, onSuspend, onReactivate }) => {
    const { t } = useLanguage();
    const getStatusClasses = (userStatus: User['userStatus']) => {
        switch (userStatus) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'suspended': return 'bg-red-100 text-red-800';
            case 'blocked': return 'bg-gray-800 text-white';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                        <MedalName userId={user.id} displayName={user.name} />
                        <span className="text-sm font-normal text-neutral-500">({user.role})</span>
                    </h3>
                    <p className="text-sm text-neutral-700">{user.email}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusClasses(user.userStatus)}`}>
                    {user.userStatus}
                </span>
            </div>
            <div className="text-right mt-4 border-t border-neutral-100 pt-3 flex justify-end space-x-2">
                {user.userStatus === 'pending' && user.role === UserRole.Supplier && (
                    <button onClick={() => onApprove(user.id)} className="text-sm bg-green-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-700">{t('approve')}</button>
                )}
                {user.userStatus === 'approved' && (
                    <button onClick={() => onSuspend(user.id)} className="text-sm bg-yellow-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-yellow-700">{t('suspend')}</button>
                )}
                {user.userStatus === 'suspended' && (
                    <button onClick={() => onReactivate(user.id)} className="text-sm bg-blue-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-blue-700">{t('reactivate')}</button>
                )}
                {user.userStatus !== 'blocked' && (
                    <button onClick={() => {/* TODO: Implement Block */ }} className="text-sm bg-red-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-red-700">Block</button>
                )}
                {user.role === UserRole.Supplier && (
                    <button
                        onClick={async () => {
                            try {
                                const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
                                const res = await fetch(`${apiUrl}/admin/suppliers/${user.id}/toggle-verified`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                                        'Content-Type': 'application/json'
                                    }
                                });
                                if (res.ok) {
                                    alert('Verified status toggled!');
                                    // Ideally, we should reload the users list here or update the local state.
                                    // For now, reload the page.
                                    window.location.reload();
                                } else {
                                    alert('Failed to toggle verified status');
                                }
                            } catch (e) {
                                console.error(e);
                                alert('Error toggling status');
                            }
                        }}
                        className={`text-sm font-semibold py-1 px-3 rounded-md text-white ${user.isVerifiedAccount ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                        {user.isVerifiedAccount ? 'Unverify' : 'Verify Badge'}
                    </button>
                )}
            </div>
        </div>
    );
};

const ManageUsersScreen: React.FC = () => {
    const { allUsers, approveSupplier, suspendUser, reactivateUser } = useAuth();
    const { t } = useLanguage();
    const [filter, setFilter] = useState<'all' | UserRole>('all');

    const filteredUsers = useMemo(() => {
        if (filter === 'all') return allUsers.filter(u => u.role !== UserRole.Admin);
        return allUsers.filter(u => u.role === filter);
    }, [allUsers, filter]);

    return (
        <div className="dark:text-neutral-200 bg-green-50 dark:bg-neutral-900 min-h-screen">
            <div className="p-4">
                <div className="flex space-x-2 mb-4">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 text-sm font-semibold rounded-full capitalize ${filter === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200'}`}
                    >
                        {t('allUsers')}
                    </button>
                    <button
                        onClick={() => setFilter(UserRole.Farmer)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full capitalize ${filter === UserRole.Farmer ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200'}`}
                    >
                        {t('farmers')}
                    </button>
                    <button
                        onClick={() => setFilter(UserRole.Supplier)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full capitalize ${filter === UserRole.Supplier ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200'}`}
                    >
                        {t('suppliers')}
                    </button>
                </div>
                <div className="space-y-3">
                    {filteredUsers.map(user => (
                        <UserCard
                            key={user.id}
                            user={user}
                            onApprove={approveSupplier}
                            onSuspend={suspendUser}
                            onReactivate={reactivateUser}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManageUsersScreen;
