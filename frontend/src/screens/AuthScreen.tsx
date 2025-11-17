import React, { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';

const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { login, signup } = useAuth();
    const { t } = useLanguage();
    const [error, setError] = useState('');

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
    // Supplier-specific signup fields
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [address, setAddress] = useState('');
    const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await login(loginEmail, loginPassword, loginAsRole);
        if (!success) {
            setError('Invalid credentials or account issue.');
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (isSubmitting) return;
        // Validate mandatory fields
        if (!name || !phone || !password) {
            setError('Please fill all required fields.');
            return;
        }

        // For Suppliers, enforce additional requirements
        if (signupAsRole === UserRole.Supplier) {
            if (!aadhaarNumber || !address || !aadhaarImage || !profileImage) {
                setError('Please provide Aadhaar number, address, Aadhaar image and personal photo.');
                return;
            }
        }

        const payload: any = { name, email, password, phone, role: signupAsRole };
        if (signupAsRole === UserRole.Supplier) {
            payload.aadhaarNumber = aadhaarNumber;
            payload.address = address;
            payload.aadhaarImage = aadhaarImage;
            payload.profilePicture = profileImage;
        }

        setIsSubmitting(true);
        try {
            const success = await signup(payload);
            if (!success) {
                // Error toast is shown by the context
            }
        } finally {
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">{t('agrirent')}</h1>
                    <p className="text-neutral-600 dark:text-neutral-300 mt-2">{t('modernFarmingPartner')}</p>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg">
                    <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${isLogin ? 'bg-primary text-white shadow' : 'text-neutral-500 dark:text-neutral-300'}`}
                        >
                            {t('login')}
                        </button>
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${!isLogin ? 'bg-primary text-white shadow' : 'text-neutral-500 dark:text-neutral-300'}`}
                        >
                            {t('signup')}
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input label={t('email')} id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" required />
                            <div className="relative">
                                <Input label={t('password')} id="login-password" type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" aria-label="Toggle password visibility">
                                    {showLoginPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                                </button>
                            </div>
                             <div>
                                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('loginAs')}</label>
                                <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setLoginAsRole(UserRole.Farmer)}
                                        className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${loginAsRole === UserRole.Farmer ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 dark:text-neutral-300'}`}
                                    >
                                        {t('farmer')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoginAsRole(UserRole.Supplier)}
                                        className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${loginAsRole === UserRole.Supplier ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 dark:text-neutral-300'}`}
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
                            <Input label={t('email')} id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                            <div className="relative">
                                <Input label={t('password')} id="signup-password" type={showSignupPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" aria-label="Toggle password visibility">
                                    {showSignupPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                                </button>
                            </div>
                            <Input label={t('phoneNumber')} id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                            {signupAsRole === UserRole.Supplier && (
                                <div className="space-y-4">
                                    <Input label={t('aadhaarNumber')} id="aadhaar-number" type="text" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} required />
                                    <Input label={t('address')} id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} required />
                                    <div>
                                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('aadhaarImage')}</label>
                                        <input
                                            id="aadhaar-image"
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const validTypes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
                                                if (!file.type.startsWith('image/') || (validTypes.length && !validTypes.includes(file.type))) {
                                                    setError('Please upload a valid image file (.jpg, .jpeg, .png, .gif, .webp).');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => setAadhaarImage(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                            className="w-full text-sm"
                                            required
                                        />
                                        {aadhaarImage && <p className="text-xs text-green-600 mt-1">{t('fileSelected')}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('personalPhoto')}</label>
                                        <input
                                            id="profile-image"
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const validTypes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
                                                if (!file.type.startsWith('image/') || (validTypes.length && !validTypes.includes(file.type))) {
                                                    setError('Please upload a valid image file (.jpg, .jpeg, .png, .gif, .webp).');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onloadend = () => setProfileImage(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                            className="w-full text-sm"
                                            required
                                        />
                                        {profileImage && <p className="text-xs text-green-600 mt-1">{t('fileSelected')}</p>}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('signupAs')}</label>
                                <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setSignupAsRole(UserRole.Farmer)}
                                        className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${signupAsRole === UserRole.Farmer ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 dark:text-neutral-300'}`}
                                    >
                                        {t('farmer')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupAsRole(UserRole.Supplier)}
                                        className={`flex-1 py-2 font-semibold text-center transition-colors duration-300 rounded-md ${signupAsRole === UserRole.Supplier ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 dark:text-neutral-300'}`}
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
