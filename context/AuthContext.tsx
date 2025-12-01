
import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useToast } from './ToastContext';
import { auth } from '../src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface AuthContextType {
    user: User | null | undefined;
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
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { showToast } = useToast();

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, fetch profile from backend (Firestore)
                try {
                    // Use the new profile endpoint to fetch specific user
                    const response = await fetch(`${API_URL}/users/profile?email=${encodeURIComponent(firebaseUser.email || '')}`);
                    if (response.ok) {
                        const foundUser = await response.json();
                        setUser(foundUser);
                    } else {
                        // User exists in Auth but not in DB? Might be a new signup that hasn't synced yet.
                        console.warn('User in Auth but not in DB yet or fetch failed');
                        // Force logout to prevent infinite loading
                        setUser(null);
                        await signOut(auth);
                    }
                } catch (error) {
                    console.error('Failed to fetch user profile', error);
                    // If backend is down or user missing, force logout to prevent infinite loading
                    setUser(null);
                    await signOut(auth);
                }
            } else {
                setUser(null);
                localStorage.removeItem('agrirent_user');
            }
        });
        return () => unsubscribe();
    }, []);

    // Load all users
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const response = await fetch(`${API_URL}/users`);
                if (response.ok) {
                    const data = await response.json();
                    setAllUsers(data);
                }
            } catch (error) {
                console.error('Failed to load users', error);
            }
        };
        loadUsers();
    }, [user]);

    const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle setting the user
            return true;
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Login failed', 'error');
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Logout failed', 'error');
        }
    };

    const signup = async (details: Omit<User, 'id' | 'status'>): Promise<boolean> => {
        try {
            // 1. Create User in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, details.email, details.password || '');

            // 2. Update Profile (Display Name)
            await updateProfile(userCredential.user, {
                displayName: details.name
            });

            // 3. Create User in Backend (Firestore)
            // We need to send the details to the backend to store in 'users' collection
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...details,
                    firebaseUid: userCredential.user.uid
                })
            });

            if (!response.ok) {
                // If backend creation fails, we might want to delete the auth user?
                // For now, just show error.
                const err = await response.json();
                throw new Error(err.message || 'Failed to create user profile');
            }

            const newUser = await response.json();
            setUser(newUser); // Optimistic update, though onAuthStateChanged will also fire

            if (newUser.status === 'pending') {
                showToast('Account created! Your supplier account is now pending admin approval.', 'success');
            } else {
                showToast('Account created successfully!', 'success');
            }
            return true;
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Email already exists. Please login.', 'error');
            } else {
                showToast(error.message || 'Signup failed', 'error');
            }
            return false;
        }
    };

    const approveSupplier = async (userId: number) => {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/approve`, { method: 'POST' });
            if (response.ok) {
                showToast('Supplier approved!', 'success');
                const updatedUsers = await fetch(`${API_URL}/users`).then(res => res.json());
                setAllUsers(updatedUsers);
            } else {
                throw new Error('Failed');
            }
        } catch {
            showToast('Failed to approve supplier.', 'error');
        }
    };

    const suspendUser = async (userId: number) => {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/suspend`, { method: 'POST' });
            if (response.ok) {
                showToast('User suspended.', 'warning');
                const updatedUsers = await fetch(`${API_URL}/users`).then(res => res.json());
                setAllUsers(updatedUsers);
            } else {
                throw new Error('Failed');
            }
        } catch {
            showToast('Failed to suspend user.', 'error');
        }
    };

    const reactivateUser = async (userId: number) => {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/reactivate`, { method: 'POST' });
            if (response.ok) {
                showToast('User reactivated.', 'success');
                const updatedUsers = await fetch(`${API_URL}/users`).then(res => res.json());
                setAllUsers(updatedUsers);
            } else {
                throw new Error('Failed');
            }
        } catch {
            showToast('Failed to reactivate user.', 'error');
        }
    };

    const updateUser = async (updatedUser: User) => {
        try {
            const response = await fetch(`${API_URL}/users/${updatedUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUser)
            });

            if (response.ok) {
                const saved = await response.json();
                if (user && user.id === saved.id) {
                    setUser(saved);
                }
                setAllUsers(prev => prev.map(u => u.id === saved.id ? saved : u));
                showToast('Profile updated!', 'success');
            } else {
                throw new Error('Failed');
            }
        } catch {
            showToast('Failed to update profile.', 'error');
        }
    };

    const changePassword = (currentPassword: string, newPassword: string): boolean => {
        if (!auth.currentUser) {
            showToast('You must be logged in to change your password.', 'error');
            return false;
        }
        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters long.', 'error');
            return false;
        }

        // Firebase Client SDK change password requires re-authentication usually, 
        // or we can use updatePassword(user, newPassword).
        const user = auth.currentUser;
        if (user && user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            reauthenticateWithCredential(user, credential).then(() => {
                updatePassword(user, newPassword).then(() => {
                    showToast('Password updated successfully!', 'success');
                }).catch((error) => {
                    showToast(error.message || 'Failed to update password.', 'error');
                });
            }).catch((error) => {
                showToast('Incorrect current password.', 'error');
            });
        }

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
