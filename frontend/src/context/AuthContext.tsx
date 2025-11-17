import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useToast } from './ToastContext';

const API_URL = 'http://localhost:3001/api';

interface AuthContextType {
    user: User | null;
    allUsers: User[];
    login: (email: string, password: string, role: UserRole) => Promise<boolean>;
    logout: () => void;
    signup: (details: Omit<User, 'id' | 'status'>) => Promise<boolean>;
    approveSupplier: (userId: number) => Promise<void>;
    suspendUser: (userId: number) => Promise<void>;
    reactivateUser: (userId: number) => Promise<void>;
    updateUser: (updatedUser: User) => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${API_URL}/users`);
                if (!response.ok) throw new Error('Failed to fetch users');
                const data = await response.json();
                setAllUsers(data);
            } catch (error) {
                console.error(error);
                showToast('Could not load user data.', 'error');
            }
        };
        fetchUsers();
    }, []);

    const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 showToast(errorData.message || 'Invalid credentials.', 'error');
                return false;
            }
            const foundUser = await response.json();
            
            if (foundUser.status === 'suspended') {
                showToast('Your account is suspended.', 'error');
                return false;
            }
            const sessionRole = foundUser.role === UserRole.Admin ? UserRole.Admin : role;
            const sessionUser = { ...foundUser, role: sessionRole };
            setUser(sessionUser);
            if (foundUser.status === 'pending') {
                showToast('Login successful! Your account is pending admin approval.', 'warning');
            }
            return true;
        } catch (error) {
            showToast('Login failed. Server may be down.', 'error');
            return false;
        }
    };

    const logout = () => {
        setUser(null);
    };

    const signup = async (details: Omit<User, 'id' | 'status'>): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(details),
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 showToast(errorData.message || 'Signup failed.', 'error');
                return false;
            }
            const newUser = await response.json();
            setAllUsers(prev => [...prev, newUser]);
            setUser(newUser);
            
            if (newUser.status === 'pending') {
                showToast('Account created! Your supplier account is now pending admin approval.', 'success');
            } else {
                showToast('Account created successfully!', 'success');
            }
            return true;
        } catch (error) {
            showToast('Signup failed. Server may be down.', 'error');
            return false;
        }
    };

    const adminUserAction = async (userId: number, action: 'approve' | 'suspend' | 'reactivate') => {
        try {
            const response = await fetch(`${API_URL}/admin/users/${userId}/${action}`, { method: 'POST' });
            if (!response.ok) throw new Error(`Failed to ${action} user`);
            const updatedUser = await response.json();
            setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
            showToast(`User ${action}d successfully.`, 'success');
        } catch (error) {
            console.error(error);
            showToast(`Failed to ${action} user.`, 'error');
        }
    };

    const approveSupplier = (userId: number) => adminUserAction(userId, 'approve');
    const suspendUser = (userId: number) => adminUserAction(userId, 'suspend');
    const reactivateUser = (userId: number) => adminUserAction(userId, 'reactivate');
    
    const updateUser = async (updatedUserData: User) => {
        try {
            const response = await fetch(`${API_URL}/users/${updatedUserData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUserData),
            });
            if (!response.ok) throw new Error('Failed to update user');
            const resultUser = await response.json();
            if (user && user.id === resultUser.id) {
                setUser(resultUser);
            }
            setAllUsers(prev => prev.map(u => u.id === resultUser.id ? resultUser : u));
            showToast('Profile updated!', 'success');
        } catch (error) {
            showToast('Failed to update profile.', 'error');
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
        if (!user) {
            showToast('You must be logged in to change your password.', 'error');
            return false;
        }
        try {
            const response = await fetch(`${API_URL}/users/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to update password.', 'error');
                return false;
            }
            
            // Also update password on local user object for consistency
            const updatedUser = { ...user, password: newPassword };
            setUser(updatedUser);
            setAllUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));

            showToast('Password updated successfully!', 'success');
            return true;
        } catch (error) {
            showToast('Server error changing password.', 'error');
            return false;
        }
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