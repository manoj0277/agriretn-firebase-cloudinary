

import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../src/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, sendPasswordResetEmail, ConfirmationResult } from 'firebase/auth';

const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, signup } = useAuth();
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const { t } = useLanguage();

    // Login State
    const [loginRole, setLoginRole] = useState<UserRole>(UserRole.Farmer);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // OTP Login State
    const [isOtpLogin, setIsOtpLogin] = useState(false);
    const [loginPhone, setLoginPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
    const [otpSent, setOtpSent] = useState(false);

    // Signup State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [signupAsRole, setSignupAsRole] = useState<UserRole>(UserRole.Farmer);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOtpLogin) {
            // Standard cleanup: if verifier exists, likely attached to old DOM or invalid. Clear it.
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    // Ignore clear error (e.g. if widget not rendered)
                }
                window.recaptchaVerifier = null;
            }

            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                if (document.getElementById('recaptcha-container')) {
                    try {
                        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                            'size': 'invisible',
                            'callback': () => {
                                // reCAPTCHA solved
                            }
                        });
                    } catch (e) {
                        console.error("Recaptcha init error:", e);
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOtpLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!loginEmail || !loginPassword) {
            setError('Please enter your credentials.');
            return;
        }

        setIsSubmitting(true);
        try {
            const ok = await login(loginEmail, loginPassword, loginRole);
            if (!ok) {
                setError('Invalid credentials or account issue.');
                setIsSubmitting(false);
            }
            // If ok is true, we expect App.tsx to unmount this screen. 
            // We set a failsafe timeout just in case it doesn't.
            setTimeout(() => {
                if (isLogin) setIsSubmitting(false);
            }, 5000);
        } catch (e) {
            setError('An unexpected error occurred.');
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!loginEmail) {
            setError('Please enter your email address to reset password.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, loginEmail);
            setSuccessMsg('Password reset email sent! Check your inbox.');
            setError('');
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Failed to send reset email.');
        }
    };

    const handleSendOtp = async () => {
        if (!loginPhone) {
            setError('Please enter your phone number.');
            return;
        }
        setError('');
        setIsSubmitting(true);

        try {
            // Validate that the phone number is registered
            const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
            const checkResponse = await fetch(`${API_URL}/users/phone?phone=${encodeURIComponent(loginPhone)}`);

            if (!checkResponse.ok) {
                if (checkResponse.status === 404) {
                    throw new Error('Phone number not registered. Please sign up to create an account.');
                } else {
                    throw new Error('Error verifying phone number.');
                }
            }

            const appVerifier = window.recaptchaVerifier;
            const formattedPhone = loginPhone.startsWith('+') ? loginPhone : `+91${loginPhone}`; // Default to India if no code
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setVerificationId(confirmationResult);
            setOtpSent(true);
            setSuccessMsg('OTP sent successfully!');
        } catch (error: any) {
            console.error("OTP Error:", error);
            setError(error.message || 'Failed to send OTP.');
            // Clear verification ID if validation fails so user can retry
            setVerificationId(null);
            setOtpSent(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || !verificationId) return;
        setIsSubmitting(true);
        try {
            await verificationId.confirm(otp);
            // AuthContext onAuthStateChanged will handle the rest (fetching profile, setting user)
            // If user is not found in DB, AuthContext will logout. 
            // We assume OTP login is for existing users.
        } catch (error: any) {
            console.error("Verify Error:", error);
            setError('Invalid OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (isSubmitting) return;
        if (!name || !phone || !password) {
            setError('Please fill required fields.');
            return;
        }
        setIsSubmitting(true);
        const guard = setTimeout(() => {
            setIsSubmitting(false);
            setError('Network issue. Please retry.');
        }, 15000);

        try {
            // Pre-check: Does an account already exist with this phone?
            const phoneCheckResponse = await fetch(`/api/users/phone?phone=${encodeURIComponent(phone)}`);
            if (phoneCheckResponse.ok) {
                // Phone already registered
                clearTimeout(guard);
                setIsSubmitting(false);
                setError('An account already exists with this phone number. Please login instead.');
                setIsLogin(true);
                setLoginEmail(phone);
                return;
            }

            // Pre-check: Does an account already exist with this email?
            if (email) {
                const emailCheckResponse = await fetch(`/api/users/profile?email=${encodeURIComponent(email)}`);
                if (emailCheckResponse.ok) {
                    // Email already registered
                    clearTimeout(guard);
                    setIsSubmitting(false);
                    setError('An account already exists with this email. Please login instead.');
                    setIsLogin(true);
                    setLoginEmail(email);
                    return;
                }
            }

            // Proceed with signup
            const ok = await signup({ name, email, password, phone, role: signupAsRole, userStatus: 'approved' });
            if (!ok) {
                setError('Signup failed. Please try again.');
            }
        } catch (err) {
            console.error('Signup error:', err);
            setError('An error occurred during signup. Please try again.');
        } finally {
            clearTimeout(guard);
            setIsSubmitting(false);
        }
    };

    const EyeOpenIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );

    const EyeClosedIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274 4.057 5.064 7 9.542-7 .847 0 1.67 .127 2.454 .364m-6.082 11.458L3.515 3.515m9.9 9.9l4.243 4.243M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">{t('agrirent')}</h1>
                    <p className="text-gray-600 dark:text-neutral-300 mt-2">{t('modernFarmingPartner')}</p>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg">
                    <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 font-semibold text-center transition-all duration-200 rounded-md ${isLogin ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                        >
                            {t('login')}
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 font-semibold text-center transition-all duration-200 rounded-md ${!isLogin ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}
                    {successMsg && <p className="text-green-500 text-center mb-4 text-sm">{successMsg}</p>}

                    {isLogin ? (
                        <>
                            {isOtpLogin ? (
                                <div className="space-y-6">
                                    {!otpSent ? (
                                        <>
                                            <Input
                                                label="Phone Number"
                                                id="login-phone"
                                                type="tel"
                                                value={loginPhone}
                                                onChange={e => setLoginPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                            />
                                            <div id="recaptcha-container"></div>
                                            <Button onClick={handleSendOtp} className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? 'Sending...' : 'Send OTP'}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Input
                                                label="Enter OTP"
                                                id="otp-input"
                                                type="text"
                                                value={otp}
                                                onChange={e => setOtp(e.target.value)}
                                                placeholder="123456"
                                            />
                                            <Button onClick={handleVerifyOtp} className="w-full" disabled={isSubmitting}>
                                                {isSubmitting ? 'Verifying...' : 'Verify & Login'}
                                            </Button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsOtpLogin(false)}
                                        className="w-full text-center text-sm text-primary hover:underline mt-2"
                                    >
                                        Login with Email
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleLogin} className="space-y-6">
                                    <div className="space-y-4">
                                        <Input
                                            label={t('emailOrPhone')}
                                            id="login-identifier"
                                            type="text"
                                            value={loginEmail}
                                            onChange={e => setLoginEmail(e.target.value)}
                                            placeholder="user@example.com or 9876543210"
                                        />
                                        <div className="relative">
                                            <Input label={t('password')} id="login-password" type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                                            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Toggle password visibility">
                                                {showLoginPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                                            </button>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">Login as</label>
                                            <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setLoginRole(UserRole.Farmer)}
                                                    className={`py-1 font-semibold text-center transition-all duration-200 rounded-md ${loginRole === UserRole.Farmer ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                                                >
                                                    {t('farmer')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setLoginRole(UserRole.Supplier)}
                                                    className={`py-1 font-semibold text-center transition-all duration-200 rounded-md ${loginRole === UserRole.Supplier ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                                                >
                                                    {t('supplier')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? 'Logging in...' : t('login')}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setIsOtpLogin(true)}
                                        className="w-full text-center text-sm text-primary hover:underline mt-4"
                                    >
                                        Login with OTP
                                    </button>
                                </form>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <Input label={t('fullName')} id="name" type="text" value={name} onChange={e => setName(e.target.value)} required />
                            <Input label={t('phoneNumber')} id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                            <Input label={t('email')} id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            <div className="relative">
                                <Input label={t('password')} id="signup-password" type={showSignupPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Toggle password visibility">
                                    {showSignupPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                                </button>
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">Sign Up as</label>
                                <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 text-sm space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => setSignupAsRole(UserRole.Farmer)}
                                        className={`flex-1 py-1 font-semibold text-center transition-all duration-200 rounded-md ${signupAsRole === UserRole.Farmer ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                                    >
                                        {t('farmer')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupAsRole(UserRole.Supplier)}
                                        className={`flex-1 py-1 font-semibold text-center transition-all duration-200 rounded-md ${signupAsRole === UserRole.Supplier ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-neutral-400'}`}
                                    >
                                        {t('supplier')}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? t('processing') : t('createAccount')}</Button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
};

declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}

export default AuthScreen;
