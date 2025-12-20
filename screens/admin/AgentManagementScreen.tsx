import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { auth } from '../../src/lib/firebase';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const AgentManagementScreen: React.FC = () => {
    const { user, allUsers, updateUser } = useAuth();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<UserRole | 'All'>('All');
    const [loading, setLoading] = useState(false);

    // Initial check (extra safety)
    if (user?.role !== UserRole.Founder) {
        return (
            <div className="p-8 text-center text-red-600">
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>Only Founders can access this section.</p>
            </div>
        );
    }

    const filteredUsers = allUsers.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.phone.includes(searchQuery) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === 'All' ? true : u.role === filterRole;
        // Don't show the Founder themselves or other Founders to prevent accidents
        const isNotFounder = u.role !== UserRole.Founder;
        return matchesSearch && matchesRole && isNotFounder;
    });

    const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
        if (!confirm(`Are you sure you want to change ${targetUser.name}'s role from ${targetUser.role} to ${newRole}?`)) return;

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/founder/users/${targetUser.id}/role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ role: newRole, requesterId: user.id })
            });

            if (response.ok) {
                showToast(`Role updated to ${newRole}`, 'success');
                updateUser({ ...targetUser, role: newRole });
            } else {
                const err = await response.json();
                throw new Error(err.message || 'Failed to update role');
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to update role.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (targetUser: User, newStatus: User['userStatus']) => {
        if (!confirm(`Are you sure you want to change ${targetUser.name}'s status to ${newStatus}?`)) return;

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/founder/users/${targetUser.id}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ status: newStatus, requesterId: user.id })
            });

            if (response.ok) {
                showToast(`Status updated to ${newStatus}`, 'success');
                updateUser({ ...targetUser, userStatus: newStatus });
            } else {
                const err = await response.json();
                throw new Error(err.message || 'Failed to update status');
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to update status.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (targetUser: User) => {
        if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${targetUser.name}'s account? This cannot be undone.`)) return;
        if (!confirm(`FINAL WARNING: This will remove all their data and access. Proceed?`)) return;

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch(`${API_URL}/founder/users/${targetUser.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (response.ok) {
                showToast(`User ${targetUser.name} deleted successfully`, 'success');
                // Remove from local list by triggering a refresh or manual filter
                // Since updateUser only updates, we might need a deleteUser in context
                // For now, reload is safest to ensure consistency
                window.location.reload();
            } else {
                const err = await response.json();
                throw new Error(err.message || 'Failed to delete user');
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to delete user.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6 bg-gray-50 dark:bg-neutral-900 min-h-screen">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Founder Agent Control</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage user roles, account statuses, and system access.</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 px-4 py-2 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <span className="text-sm font-medium text-neutral-500">Total Users: </span>
                        <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{filteredUsers.length}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-md border border-neutral-200 dark:border-neutral-700 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search by name, email or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <svg className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value as UserRole | 'All')}
                        className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="All">All Roles</option>
                        <option value={UserRole.Farmer}>Farmers</option>
                        <option value={UserRole.Supplier}>Suppliers</option>
                        <option value={UserRole.Agent}>Agents</option>
                        <option value={UserRole.AgentPro}>Agent Pros</option>
                        <option value={UserRole.Admin}>Admins</option>
                    </select>
                </div>

                {/* User List */}
                <div className="grid gap-4">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="bg-white dark:bg-neutral-800 p-5 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

                            {/* User Info */}
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                            {u.name}
                                            {u.isVerifiedAccount && (
                                                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            )}
                                        </h3>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.email} • {u.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${u.role === UserRole.Agent || u.role === UserRole.AgentPro ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                        u.role === UserRole.Admin ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                            'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                                        }`}>
                                        {u.role}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${u.userStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                        u.userStatus === 'suspended' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                            u.userStatus === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        }`}>
                                        {u.userStatus}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-auto">
                                <div className="flex flex-wrap gap-2">
                                    {u.role !== UserRole.Agent && u.role !== UserRole.AgentPro && (
                                        <button
                                            onClick={() => handleRoleChange(u, UserRole.Agent)}
                                            disabled={loading}
                                            className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800 disabled:opacity-50"
                                        >
                                            Promote to Agent
                                        </button>
                                    )}
                                    {(u.role === UserRole.Agent || u.role === UserRole.AgentPro) && (
                                        <button
                                            onClick={() => handleRoleChange(u, UserRole.Farmer)}
                                            disabled={loading}
                                            className="text-xs font-bold px-3 py-1.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Demote to Farmer
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {u.userStatus !== 'approved' && (
                                        <button
                                            onClick={() => handleStatusChange(u, 'approved')}
                                            disabled={loading}
                                            className="text-xs font-bold px-3 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {u.userStatus !== 'suspended' && (
                                        <button
                                            onClick={() => handleStatusChange(u, 'suspended')}
                                            disabled={loading}
                                            className="text-xs font-bold px-3 py-1.5 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            Suspend
                                        </button>
                                    )}
                                    {u.userStatus !== 'blocked' && (
                                        <button
                                            onClick={() => handleStatusChange(u, 'blocked')}
                                            disabled={loading}
                                            className="text-xs font-bold px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            Block
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteUser(u)}
                                        disabled={loading}
                                        className="text-xs font-bold px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AgentManagementScreen;
