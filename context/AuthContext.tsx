
import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useToast } from './ToastContext';
import { calculateStreakUpdates } from '../utils/gamification';
import { auth, db } from '../src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { onSnapshot, collection } from 'firebase/firestore';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

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
    const isSigningUp = React.useRef(false); // Lock to prevent auto-sync race condition during signup

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, fetch profile from backend (Firestore)
                try {
                    console.log('Firebase user authenticated:', firebaseUser.email);

                    // If signing up, delay the profile fetch slightly or skip auto-sync
                    if (isSigningUp.current) {
                        console.log('Signup in progress - pausing listener to allow manual creation...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                    console.log('Fetching user profile from backend...');

                    // Add timeout to prevent indefinite hang
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                    let response;
                    let foundUser = null;

                    // Try email-based lookup first if email exists
                    if (firebaseUser.email) {
                        response = await fetch(`${API_URL}/users/profile?email=${encodeURIComponent(firebaseUser.email)}`, {
                            signal: controller.signal
                        });
                        if (response.ok) {
                            foundUser = await response.json();
                        }
                    }

                    // Fallback to phone-based lookup if email didn't work
                    if (!foundUser && firebaseUser.phoneNumber) {
                        console.log('Email lookup failed or no email, trying phone lookup:', firebaseUser.phoneNumber);
                        const phoneResponse = await fetch(`${API_URL}/users/phone?phone=${encodeURIComponent(firebaseUser.phoneNumber)}`, {
                            signal: controller.signal
                        });
                        if (phoneResponse.ok) {
                            const phoneData = await phoneResponse.json();
                            if (phoneData.exists && phoneData.email) {
                                // Found user by phone, now get full profile
                                const profileResponse = await fetch(`${API_URL}/users/profile?email=${encodeURIComponent(phoneData.email)}`, {
                                    signal: controller.signal
                                });
                                if (profileResponse.ok) {
                                    foundUser = await profileResponse.json();
                                }
                            }
                        }
                    }

                    // Fallback to Firebase UID lookup
                    if (!foundUser && firebaseUser.uid) {
                        console.log('Trying UID-based lookup:', firebaseUser.uid);
                        const uidResponse = await fetch(`${API_URL}/users/${firebaseUser.uid}`, {
                            signal: controller.signal
                        });
                        if (uidResponse.ok) {
                            foundUser = await uidResponse.json();
                        }
                    }

                    clearTimeout(timeoutId);



                    if (foundUser) {
                        console.log('User profile loaded successfully:', foundUser.name, 'Role:', foundUser.role);
                        console.log('Full user object:', foundUser);

                        // --- SESSION ROLE MASQUERADE ---
                        const attemptedRole = sessionStorage.getItem('attemptedRole');
                        let sessionUser = { ...foundUser };

                        // If user selected a specific role (Farmer/Supplier), force the session to use that role
                        // This allows a "Supplier" in DB to login as "Farmer" and see the Farmer Dashboard
                        // BUT if the user is an Admin or Agent in DB, strictly enforce their dashboard.
                        const privilegedRoles: UserRole[] = [UserRole.Admin, UserRole.Agent, UserRole.AgentPro, UserRole.Founder];
                        const isPrivileged = privilegedRoles.includes(foundUser.role);

                        if (!isPrivileged && attemptedRole && (attemptedRole === 'Farmer' || attemptedRole === 'Supplier')) {
                            console.log(`Session Role Override: DB says ${foundUser.role}, User selected ${attemptedRole}. Switching context.`);
                            sessionUser.role = attemptedRole as UserRole;
                        } else if (isPrivileged && attemptedRole) {
                            console.log(`Privileged Role Detected (${foundUser.role}). Ignoring masquerade attempt as ${attemptedRole}.`);
                        }
                        // -------------------------------

                        // Calculate and apply streak updates
                        // We use the sessionUser for calculation so the UI updates correctly,
                        // but we must be careful not to persist the masquerade role.
                        const userWithUpdatedStreak = calculateStreakUpdates(sessionUser);

                        if (userWithUpdatedStreak) {
                            console.log('Applying daily streak update:', userWithUpdatedStreak.streak);
                            setUser(userWithUpdatedStreak); // Optimistic update (with Masquerade Role)

                            // Persist to backend silently
                            // CRITICAL: Restore the ORIGINAL DB role before saving
                            const safeToSave = { ...userWithUpdatedStreak, role: foundUser.role };

                            fetch(`${API_URL}/users/${userWithUpdatedStreak.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(safeToSave)
                            }).catch(e => console.error('Failed to persist streak update:', e));

                            showToast(`Daily Streak: ${userWithUpdatedStreak.streak?.currentCount} days! 🔥`, 'success');
                        } else {
                            setUser(sessionUser);
                        }
                    } else {
                        console.error('User not found in database via any lookup method');

                        // Check lock before Auto-Sync
                        if (isSigningUp.current) {
                            console.log('Signup lock active - Skipping Auto-Sync to prevent race condition.');
                            return;
                        }

                        // User exists in Firebase Auth but not in Database - Auto-sync
                        console.warn('User exists in Auth but not in DB - attempting auto-sync...');

                        try {
                            // Attempt to create user record in database
                            const attemptedRole = sessionStorage.getItem('attemptedRole');
                            const newUserData = {
                                id: firebaseUser.uid,
                                firebaseUid: firebaseUser.uid,
                                email: firebaseUser.email || '',
                                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                                phone: firebaseUser.phoneNumber || '',
                                role: (attemptedRole as UserRole) || UserRole.Farmer,
                                userStatus: 'approved',
                                kycStatus: 'not_submitted',
                            };

                            console.log('Creating missing user record:', newUserData);
                            const createRes = await fetch(`${API_URL}/users`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newUserData),
                            });

                            if (createRes.ok) {
                                const createdUser = await createRes.json();
                                console.log('User record created successfully:', createdUser);
                                setUser(createdUser);
                                showToast('Account synced successfully! Welcome to AgriRent.', 'success');
                                sessionStorage.removeItem('attemptedRole');
                            } else {
                                console.error('Failed to create user record');
                                showToast('Unable to sync account. Please contact support.', 'error');
                                setUser(null);
                                await signOut(auth);
                            }
                        } catch (syncError) {
                            console.error('Auto-sync failed:', syncError);
                            showToast('Account sync failed. Please contact support.', 'error');
                            setUser(null);
                            await signOut(auth);
                        }
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.error('Profile fetch timed out - backend might be slow or unresponsive');
                        showToast('Connection timeout. Backend server might be down.', 'error');
                        setUser(null);
                        await signOut(auth);
                    } else {
                        console.error('Failed to fetch user profile:', error);
                        showToast(`Login failed: Unable to connect to backend (${error.message}).`, 'error');
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
                // Remove spaces/dashes
                let phoneToCheck = identifier.replace(/[\s-]/g, '');

                try {
                    const res = await fetch(`${API_URL}/users/phone?phone=${encodeURIComponent(phoneToCheck)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.exists && data.email && data.email.trim() !== '') {
                            emailToUse = data.email;
                            console.log('Found email for phone:', emailToUse);
                        } else if (data.exists) {
                            // Phone-only account - try using phone-based email format
                            // Firebase accounts may use phone@domain format
                            emailToUse = `${phoneToCheck}@agrirent.local`;
                            console.log('Phone-only account, trying phone-based email:', emailToUse);
                        } else {
                            showToast("Phone number not registered. Please Sign Up.", 'error');
                            return false;
                        }
                    } else {
                        showToast("Phone number not registered. Please Sign Up.", 'error');
                        return false;
                    }
                } catch (err) {
                    console.error("Phone lookup failed", err);
                    showToast("Unable to verify phone number. Please try again.", 'error');
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
            // 0. Pre-check Availability in Backend to avoid Firebase-DB mismatch
            // Check Phone
            if (details.phone) {
                const phoneCheckRes = await fetch(`${API_URL}/users/phone?phone=${encodeURIComponent(details.phone)}`);
                if (phoneCheckRes.ok) {
                    const phoneData = await phoneCheckRes.json();
                    if (phoneData.exists) {
                        showToast('Phone number already registered. Please login.', 'error');
                        return false;
                    }
                }
            }

            // Check Email
            const emailCheckRes = await fetch(`${API_URL}/users/profile?email=${encodeURIComponent(details.email)}`);
            if (emailCheckRes.ok) { // Status 200 means user exists
                showToast('Email address already registered. Please login.', 'error');
                return false;
            }

            // 1. Create User in Firebase Auth
            isSigningUp.current = true; // Lock auto-sync
            const userCredential = await createUserWithEmailAndPassword(auth, details.email, details.password || '');

            // 2. Update Profile (Display Name)
            await updateProfile(userCredential.user, {
                displayName: details.name
            });

            // 3. Create User in Backend (Firestore)
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...details,
                    firebaseUid: userCredential.user.uid
                })
            });

            if (!response.ok) {
                // If backend creation fails, delete the auth user to prevent orphaned accounts
                // BUT only if it wasn't a recovery attempt. Here it's fresh, so we delete.
                try {
                    await userCredential.user.delete();
                } catch (deleteError) {
                    console.error('Failed to cleanup Firebase Auth user after backend failure:', deleteError);
                }
                const err = await response.json();
                throw new Error(err.message || 'Failed to create user profile');
            }

            const newUser = await response.json();
            setUser(newUser);
            showToast('Account created successfully!', 'success');
            return true;

        } catch (error: any) {
            console.error('Signup error:', error);

            // RECOVERY LOGIC for "Half-Created" Accounts
            if (error.code === 'auth/email-already-in-use') {
                try {
                    console.log('User exists in Firebase. Attempting recovery login...');
                    // Attempt to login with the provided password
                    const userCredential = await signInWithEmailAndPassword(auth, details.email, details.password || '');

                    // If login works, check if backend profile exists
                    const profileRes = await fetch(`${API_URL}/users/profile?email=${encodeURIComponent(details.email)}`);

                    if (profileRes.ok) {
                        // Profile exists - they should just login
                        showToast('Account already exists. Please login.', 'info');
                        return false;
                    } else {
                        // Profile MISSING - This is the "stuck" state. Fix it now.
                        console.log('Profile missing for existing Auth user. Completing registration...');
                        const response = await fetch(`${API_URL}/auth/signup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...details,
                                firebaseUid: userCredential.user.uid
                            })
                        });

                        if (response.ok) {
                            const newUser = await response.json();
                            setUser(newUser);
                            showToast('Account recovered and verified successfully!', 'success');
                            return true;
                        } else {
                            throw new Error('Failed to recover user profile');
                        }
                    }
                } catch (recoveryError: any) {
                    console.error('Recovery failed:', recoveryError);
                    if (recoveryError.code === 'auth/wrong-password') {
                        showToast('Email already in use. Please login.', 'error');
                    } else {
                        showToast('Account exists but could not be recovered. Please contact support.', 'error');
                    }
                    return false;
                }
            } else {
                showToast(error.message || 'Signup failed', 'error');
            }
            return false;
        } finally {
            // Delay unlocking to ensure listener has processed the event
            setTimeout(() => {
                isSigningUp.current = false;
            }, 5000);
        }
    };

    const approveSupplier = async (userId: number) => {
        // Optimistic Update: Update UI immediately
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, userStatus: 'approved' } : u));
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/approve`, { method: 'POST' });
            if (response.ok) {
                showToast('Supplier approved!', 'success');
                // No need to re-fetch all users, optimistic update holds true
            } else {
                throw new Error('Failed');
            }
        } catch {
            // Revert on failure
            showToast('Failed to approve supplier.', 'error');
            // Ideally we revert state here, but for simplicity in this optimization phase we'll just show error.
            // A more robust revert would require storing previous state or re-fetching single user.
            const res = await fetch(`${API_URL}/users/${userId}`);
            if (res.ok) {
                const original = await res.json();
                setAllUsers(prev => prev.map(u => u.id === userId ? original : u));
            }
        }
    };

    const suspendUser = async (userId: number) => {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, userStatus: 'suspended' } : u));
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/suspend`, { method: 'POST' });
            if (response.ok) {
                showToast('User suspended.', 'warning');
            } else {
                throw new Error('Failed');
            }
        } catch {
            showToast('Failed to suspend user.', 'error');
            const res = await fetch(`${API_URL}/users/${userId}`);
            if (res.ok) {
                const original = await res.json();
                setAllUsers(prev => prev.map(u => u.id === userId ? original : u));
            }
        }
    };

    const reactivateUser = async (userId: number) => {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, userStatus: 'approved' } : u));
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/reactivate`, { method: 'POST' });
            if (response.ok) {
                showToast('User reactivated.', 'success');
            } else {
                throw new Error('Failed');
            }
        } catch {
            showToast('Failed to reactivate user.', 'error');
            const res = await fetch(`${API_URL}/users/${userId}`);
            if (res.ok) {
                const original = await res.json();
                setAllUsers(prev => prev.map(u => u.id === userId ? original : u));
            }
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
