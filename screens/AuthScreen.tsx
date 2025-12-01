

import React, { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';


const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, signup } = useAuth();
    const [error, setError] = useState('');
    const { t } = useLanguage();

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loginAsRole, setLoginAsRole] = useState<UserRole>(UserRole.Farmer);



    // Signup State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [signupAsRole, setSignupAsRole] = useState<UserRole>(UserRole.Farmer);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!loginEmail || !loginPassword) {
            setError('Please enter your credentials.');
            return;
        }
        const ok = await login(loginEmail, loginPassword, loginAsRole);
        if (!ok) {
            setError('Invalid credentials or account issue.');
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
            const ok = await signup({ name, email, password, phone, role: signupAsRole });
            if (!ok) {
                setError('Email or phone already exists. Please login.');
                setIsLogin(true);
                setLoginEmail(email || phone);
            }
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
                            className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${isLogin ? 'bg-primary text-white shadow' : 'text-gray-500 dark:text-neutral-300'}`}
                        >
                            {t('login')}
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${!isLogin ? 'bg-primary text-white shadow' : 'text-gray-500 dark:text-neutral-300'}`}
                        >
                            {t('signup')}
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <Input label={"Email or Phone"} id="login-identifier" type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                                <div className="relative">
                                    <Input label={t('password')} id="login-password" type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Toggle password visibility">
                                        {showLoginPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('loginAs')}</label>
                                <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setLoginAsRole(UserRole.Farmer)}
                                        className={`flex-1 py-1 font-semibold text-center transition-colors duration-300 rounded-md ${loginAsRole === UserRole.Farmer ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-neutral-300'}`}
                                    >
                                        {t('farmer')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoginAsRole(UserRole.Supplier)}
                                        className={`flex-1 py-1 font-semibold text-center transition-colors duration-300 rounded-md ${loginAsRole === UserRole.Supplier ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-neutral-300'}`}
                                    >
                                        {t('supplier')}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit">{t('login')}</Button>
                        </form>
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
                                <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('signupAs')}</label>
                                <div className="flex bg-gray-100 dark:bg-neutral-700 rounded-lg p-1 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setSignupAsRole(UserRole.Farmer)}
                                        className={`flex-1 py-1 font-semibold text-center transition-colors duration-300 rounded-md ${signupAsRole === UserRole.Farmer ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-neutral-300'}`}
                                    >
                                        {t('farmer')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupAsRole(UserRole.Supplier)}
                                        className={`flex-1 py-1 font-semibold text-center transition-colors duration-300 rounded-md ${signupAsRole === UserRole.Supplier ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-neutral-300'}`}
                                    >
                                        {t('supplier')}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('processing') : t('createAccount')}</Button>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AuthScreen;
