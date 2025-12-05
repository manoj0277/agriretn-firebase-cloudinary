
import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useToast } from './ToastContext';
import { auth } from '../src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface AuthContextType {
    user: User | null | undefined;
    allUsers: User[];
    login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
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
                    console.log('Firebase user authenticated:', firebaseUser.email);
                    console.log('Fetching user profile from backend...');

                    // Add timeout to prevent indefinite hang
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                    const response = await fetch(`${API_URL}/users/profile?email=${encodeURIComponent(firebaseUser.email || '')}`, {
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const foundUser = await response.json();
                        console.log('User profile loaded successfully:', foundUser.name, 'Role:', foundUser.role);
                        console.log('Full user object:', foundUser);

                        // Auto-detect and use the actual role from Firebase/Firestore
                        // No need to validate against selected role - just log them in with their actual role
                        console.log('Setting user state with:', foundUser);
                        setUser(foundUser);
                    } else {
                        console.error('Backend returned non-OK status:', response.status);
                        const errorText = await response.text();
                        console.error('Error response:', errorText);

                        // User exists in Auth but not in DB? Might be a new signup that hasn't synced yet.
                        console.warn('User in Auth but not in DB yet or fetch failed');
                        // Don't show error toast here - could be a new signup still syncing
                        setUser(null);
                        await signOut(auth);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.error('Profile fetch timed out - backend might be slow or unresponsive');
                        showToast('Connection timeout. Please check if backend server is running and try again.', 'error');
                        setUser(null);
                        await signOut(auth);
                    } else {
                        console.error('Failed to fetch user profile:', error);
                        // Don't show error for network errors during normal login flow
                        setUser(null);
                        await signOut(auth);
                    }
                }
            } else {
                console.log('No Firebase user, setting user to null');
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, [showToast]);

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


    const login = async (identifier: string, password: string, role?: UserRole): Promise<boolean> => {
        try {
            console.log('Login attempt with identifier:', identifier, 'role:', role);
            let emailToUse = identifier;

            // Check if identifier is a phone number (digits only, length > 6)
            const isPhone = /^\d{7,}$/.test(identifier.replace(/\D/g, ''));

            if (isPhone) {
                console.log('Identifier is phone number, fetching email...');
                // Fetch email associated with this phone
                const response = await fetch(`${API_URL}/users/phone?phone=${encodeURIComponent(identifier)}`);
                if (response.ok) {
                    const user = await response.json();
                    if (user && user.email) {
                        emailToUse = user.email;
                        console.log('Found email for phone:', emailToUse);
                    } else {
                        showToast('Phone number not registered. Please create an account.', 'error');
                        return false;
                    }
                } else {
                    showToast('Phone number not registered. Please create an account.', 'error');
                    return false;
                }
            }

            console.log('Attempting Firebase sign in with email:', emailToUse);

            // Store the attempted role to validate after profile is loaded
            if (role) {
                sessionStorage.setItem('attemptedRole', role);
            }

            await signInWithEmailAndPassword(auth, emailToUse, password);
            console.log('Firebase sign in successful, waiting for onAuthStateChanged...');
            // onAuthStateChanged will handle setting the user and validating role
            return true;
        } catch (error: any) {
            console.error('Login error:', error);

            // Provide specific error messages based on Firebase error codes
            sessionStorage.removeItem('attemptedRole'); // Clear attempted role on error

            if (error.code === 'auth/invalid-email') {
                showToast('Invalid email format. Please check and try again.', 'error');
            } else if (error.code === 'auth/user-not-found') {
                showToast('Account not found. Please create an account first.', 'error');
            } else if (error.code === 'auth/wrong-password') {
                showToast('Invalid password. Please try again.', 'error');
            } else if (error.code === 'auth/invalid-credential') {
                // This error can mean either wrong email or wrong password
                // Check if email format is valid to give better message
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(identifier) && !/^\d{7,}$/.test(identifier.replace(/\D/g, ''))) {
                    showToast('Invalid email or phone number format.', 'error');
                } else {
                    showToast('Invalid email/phone or password. Please check your credentials.', 'error');
                }
            } else if (error.code === 'auth/user-disabled') {
                showToast('This account has been suspended. Please contact support.', 'error');
            } else if (error.code === 'auth/too-many-requests') {
                showToast('Too many failed login attempts. Please try again later.', 'error');
            } else if (error.code === 'auth/network-request-failed') {
                showToast('Network error. Please check your internet connection.', 'error');
            } else if (error.message === 'Phone number not registered.') {
                // Already handled above, but keep for completeness
                showToast('Phone number not registered. Please create an account.', 'error');
            } else {
                // Generic fallback
                showToast(error.message || 'Login failed. Please try again.', 'error');
            }

            return false;
        }
    };

    const logout = async () => {
        try {
            // Clear user state immediately for instant UI update
            setUser(null);
            // Clear any stored session data
            sessionStorage.removeItem('attemptedRole');
            localStorage.removeItem('agrirent-current-view');
            // Sign out from Firebase
            await signOut(auth);
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error(error);
            // Still clear user state even if sign out fails
            setUser(null);
            showToast('Logout failed', 'error');
        }
    };

    const signup = async (details: Omit<User, 'id' | 'userStatus'>): Promise<boolean> => {
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

            if (newUser.userStatus === 'pending') {
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
