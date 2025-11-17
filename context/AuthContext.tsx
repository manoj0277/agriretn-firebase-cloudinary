

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface AuthContextType {
    user: User | null;
    allUsers: User[];
    login: (email: string, password: string, role: UserRole) => Promise<boolean>;
    logout: () => void;
    signup: (details: Omit<User, 'id' | 'status'>) => Promise<boolean>;
    approveSupplier: (userId: number) => void;
    suspendUser: (userId: number) => void;
    reactivateUser: (userId: number) => void;
    updateUser: (updatedUser: User) => void;
    changePassword: (currentPassword: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { showToast } = useToast();

    const uidToInt = (uid: string): number => {
        let hash = 0;
        for (let i = 0; i < uid.length; i++) {
            hash = ((hash << 5) - hash) + uid.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    };

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), ms);
            p.then(v => { clearTimeout(timer); resolve(v); }).catch(e => { clearTimeout(timer); reject(e); });
        });
    };

    const tryInsertUser = async (data: User): Promise<boolean> => {
        for (let i = 0; i < 3; i++) {
            const { error } = await withTimeout(supabase.from('users').insert([data], { ignoreDuplicates: true }), 8000);
            if (!error) return true;
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
        }
        return false;
    };

    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                return;
            }
            if (!session || !session.user) {
                return;
            }
            try {
                const emailLower = (session.user.email || '').toLowerCase();
                const { data: rows } = await supabase.from('users').select('*').eq('email', emailLower).limit(1);
                if (!rows || rows.length === 0) {
                    const minimal: User = {
                        id: uidToInt(session.user.id),
                        name: emailLower || 'User',
                        email: emailLower,
                        phone: '',
                        role: UserRole.Farmer,
                        status: 'approved',
                    };
                    await supabase.from('users').insert([minimal], { ignoreDuplicates: true });
                    setUser(minimal);
                    return;
                }
                const data = rows[0] as Partial<User> & { role?: UserRole; status?: 'approved' | 'pending' | 'suspended' };
                const sessionUser: User = {
                    id: (data as any).id ?? uidToInt(session.user.id),
                    name: data.name ?? (emailLower || 'User'),
                    email: emailLower,
                    phone: (data as any).phone ?? '',
                    role: data.role ?? UserRole.Farmer,
                    status: data.status ?? 'approved',
                };
                setUser(sessionUser);
            } catch {}
        });
        return () => { listener.subscription.unsubscribe(); };
    }, []);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const { data: rows } = await supabase.from('users').select('*');
                if (rows) setAllUsers(rows as User[]);
            } catch {}
        };
        loadUsers();
    }, []);

    const login = async (identifier: string, password: string, role: UserRole): Promise<boolean> => {
        const trimmedId = identifier.trim();
        const isEmail = trimmedId.includes('@');
        let emailToUse = trimmedId;
        try {
            const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
            const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                showToast('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error');
                return false;
            }
            if (!isEmail) {
                const phoneDigits = trimmedId.replace(/[^0-9]/g, '');
                const resp = await fetch(`${API_URL}/auth/email-by-phone/${phoneDigits}`);
                if (!resp.ok) {
                    showToast('No account found for this phone number.', 'error');
                    return false;
                }
                const json = await resp.json();
                emailToUse = (json.email || '').toLowerCase();
                if (!emailToUse) {
                    showToast('Account missing email. Please contact support.', 'error');
                    return false;
                }
            }
            const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse.toLowerCase(), password: password.trim() });
            if (error) {
                throw error;
            }
            const uid = data.user?.id || '';
            const { data: rows } = await supabase.from('users').select('*').eq('email', emailToUse.toLowerCase()).limit(1);
            if (!rows || rows.length === 0) {
                const created: User = { id: uidToInt(uid), name: emailToUse, email: emailToUse.toLowerCase(), phone: '', role: role, status: 'approved' };
                await tryInsertUser(created);
                setUser(created);
                showToast('Logged in successfully!', 'success');
                return true;
            }
            const rec = rows[0] as Partial<User> & { role?: UserRole; status?: 'approved' | 'pending' | 'suspended' };
            if (rec.status === 'suspended') {
                showToast('Your account is suspended.', 'error');
                await supabase.auth.signOut();
                return false;
            }
            const sessionRole = rec.role === UserRole.Admin ? UserRole.Admin : (rec.role ?? role);
            const sessionUser: User = { id: rec.id ?? uidToInt(uid), name: rec.name ?? emailToUse, email: emailToUse.toLowerCase(), phone: (rec as any).phone ?? '', role: sessionRole, status: rec.status ?? 'approved' };
            setUser(sessionUser);
            showToast('Logged in successfully!', 'success');
            return true;
        } catch (err: any) {
            const code = err?.message as string | undefined;
            if (code && code.toLowerCase().includes('invalid')) {
                showToast('Incorrect password.', 'error');
            } else if (code && code.toLowerCase().includes('not found')) {
                showToast('No account found for these credentials.', 'error');
            } else if (code && code.toLowerCase().includes('network')) {
                showToast('Network issue. Please check connection and retry.', 'error');
            } else {
                showToast('Invalid credentials or network issue.', 'error');
            }
            return false;
        }
    };

    

    const logout = () => {
        supabase.auth.signOut();
        setUser(null);
    };

    const signup = async (details: Omit<User, 'id' | 'status'>): Promise<boolean> => {
        try {
            const emailLower = (details.email || '').toLowerCase().trim();
            const phoneDigits = (details.phone || '').replace(/[^0-9]/g, '');
            if (!phoneDigits) {
                showToast('Phone number is required.', 'error');
                return false;
            }
            if (!emailLower) {
                showToast('Email is required for signup.', 'error');
                return false;
            }
            const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
            const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
            if (!SUPABASE_URL || !SUPABASE_KEY) {
                showToast('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', 'error');
                return false;
            }
            const { data: existingByPhone } = await withTimeout(
                supabase.from('users').select('id').eq('phone', phoneDigits).limit(1),
                8000
            );
            if (existingByPhone && existingByPhone.length > 0) {
                showToast('Email or phone already exists. Please login.', 'error');
                return false;
            }

            const emailToUse = emailLower;
            const { data: cred, error } = await withTimeout(supabase.auth.signUp({ email: emailToUse, password: details.password ?? '', options: { data: { full_name: details.name, phone: phoneDigits } } }), 12000);
            if (error) throw error;
            const uid = cred.user?.id || `${Date.now()}`;
            const newUser: User = {
                id: uidToInt(uid),
                name: details.name,
                email: emailToUse,
                phone: phoneDigits,
                role: details.role,
                status: details.role === UserRole.Supplier ? 'pending' : 'approved',
            };
            const saved = await tryInsertUser(newUser);
            if (!saved) {
                showToast('Could not save your profile right now. Continuing sign in.', 'error');
            }
            try {
                const { error: signInErr } = await withTimeout(supabase.auth.signInWithPassword({ email: emailToUse, password: details.password ?? '' }), 10000);
                if (signInErr) {
                    const msg = (signInErr.message || '').toLowerCase();
                    if (msg.includes('confirm') && msg.includes('email')) {
                        showToast('Please confirm your email. Check your inbox.', 'warning');
                    }
                }
            } catch {}
            setUser(newUser);
            if (newUser.status === 'pending') {
                showToast('Account created! Your supplier account is now pending admin approval.', 'success');
            } else {
                showToast('Account created successfully!', 'success');
            }
            return true;
        } catch (err: any) {
            const code = err?.message as string | undefined;
            if (code && code.toLowerCase().includes('already')) {
                showToast('Email or phone already exists. Please login.', 'error');
                return false;
            } else if (code && code.toLowerCase().includes('invalid')) {
                showToast('Please enter a valid email address.', 'error');
                return false;
            } else if (code && code.toLowerCase().includes('password')) {
                showToast('Password should be at least 6 characters.', 'error');
                return false;
            } else if (err && err.message === 'timeout') {
                showToast('Network issue while creating account. Please try again.', 'error');
                return false;
            } else {
                showToast('Failed to create account. Please retry.', 'error');
                return false;
            }
        }
    };

    const approveSupplier = async (userId: number) => {
        try {
            const { error } = await supabase.from('users').update({ status: 'approved' }).eq('id', userId);
            if (error) throw error;
            showToast('Supplier approved!', 'success');
        } catch {
            showToast('Failed to approve supplier.', 'error');
        }
    };

    const suspendUser = async (userId: number) => {
        try {
            const { error } = await supabase.from('users').update({ status: 'suspended' }).eq('id', userId);
            if (error) throw error;
            showToast('User suspended.', 'warning');
        } catch {
            showToast('Failed to suspend user.', 'error');
        }
    };

    const reactivateUser = async (userId: number) => {
        try {
            const { error } = await supabase.from('users').update({ status: 'approved' }).eq('id', userId);
            if (error) throw error;
            showToast('User reactivated.', 'success');
        } catch {
            showToast('Failed to reactivate user.', 'error');
        }
    };
    
    const updateUser = async (updatedUser: User) => {
        try {
            const { error } = await supabase.from('users').update({ ...updatedUser }).eq('id', updatedUser.id);
            if (error) throw error;
            try { await supabase.auth.updateUser({ data: { full_name: updatedUser.name, phone: updatedUser.phone } }); } catch {}
            if (user && user.id === updatedUser.id) {
                setUser(updatedUser);
            }
            showToast('Profile updated!', 'success');
        } catch {
            showToast('Failed to update profile.', 'error');
        }
    };

    const changePassword = (currentPassword: string, newPassword: string): boolean => {
        if (!user) {
            showToast('You must be logged in to change your password.', 'error');
            return false;
        }
        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters long.', 'error');
            return false;
        }
        supabase.auth.updateUser({ password: newPassword })
            .then(({ error }) => {
                if (!error) {
                    showToast('Password updated successfully!', 'success');
                } else {
                    showToast('Failed to update password. Please try again.', 'error');
                }
            })
            .catch(() => {
                showToast('Failed to update password. Please try again.', 'error');
            });
        return true;
    };


    const value = useMemo(() => ({ user, allUsers, login, logout, signup, approveSupplier, suspendUser, reactivateUser, updateUser, changePassword }), [user, allUsers]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
