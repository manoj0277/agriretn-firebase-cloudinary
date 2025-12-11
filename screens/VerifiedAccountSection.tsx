import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VerifiedBadge from '../components/VerifiedBadge';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

interface VerifiedAccountSectionProps {
    onClose?: () => void;
}

/**
 * Verified Account Section - Shows purchase option and benefits for suppliers
 */
const VerifiedAccountSection: React.FC<VerifiedAccountSectionProps> = ({ onClose }) => {
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);

    const isVerified = user?.isVerifiedAccount;

    const handlePurchase = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/suppliers/${user.id}/request-verified`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                const data = await res.json();
                showToast('Verified Account activated successfully! 🎉', 'success');
                // Update local user state
                if (data.user) {
                    updateUser(data.user);
                }
                setShowPurchaseModal(false);
            } else {
                const error = await res.json();
                showToast(error.message || 'Failed to activate verified account', 'error');
            }
        } catch (error) {
            showToast('Error processing request. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const benefits = [
        { icon: '🚀', title: 'Top Visibility', desc: 'Your equipment shows at the TOP of farmer searches' },
        { icon: '✅', title: 'Verified Badge', desc: 'Blue checkmark beside your name builds trust' },
        { icon: '📈', title: 'Higher Utilization Cap', desc: '85% utilization limit vs 65% for regular accounts' },
        { icon: '⭐', title: 'Priority Support', desc: 'Get faster response from customer support' },
        { icon: '💰', title: 'More Bookings', desc: 'Higher visibility = more customers = more revenue' },
    ];

    return (
        <div className="p-4">
            {/* Status Card */}
            <div className={`p-6 rounded-xl border-2 ${isVerified
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-600'
                : 'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700'
                }`}>
                <div className="flex items-center gap-3 mb-4">
                    {isVerified ? (
                        <>
                            <VerifiedBadge size="lg" />
                            <div>
                                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">Verified Account Active</h2>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                    Since {user?.verifiedAccountPurchaseDate ? new Date(user.verifiedAccountPurchaseDate).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Become a Verified Supplier</h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Unlock premium features and boost your bookings</p>
                        </div>
                    )}
                </div>

                {isVerified && (
                    <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 flex items-center gap-2">
                        <span className="text-2xl">🎉</span>
                        <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                            Your equipment is now shown at the TOP of farmer searches!
                        </p>
                    </div>
                )}
            </div>

            {/* Benefits Grid */}
            <div className="mt-6">
                <h3 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">
                    {isVerified ? '✨ Your Premium Benefits' : '💎 What You Get'}
                </h3>
                <div className="grid gap-3">
                    {benefits.map((benefit, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
                        >
                            <span className="text-2xl">{benefit.icon}</span>
                            <div>
                                <h4 className="font-semibold text-neutral-900 dark:text-white">{benefit.title}</h4>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">{benefit.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Purchase Button */}
            {!isVerified && (
                <div className="mt-6">
                    <button
                        onClick={() => setShowPurchaseModal(true)}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        <VerifiedBadge size="md" showTooltip={false} />
                        <span>Get Verified Account</span>
                    </button>
                    <p className="text-center text-xs text-neutral-500 mt-2">
                        ₹999/month • Cancel anytime
                    </p>
                </div>
            )}

            {/* Purchase Modal */}
            {showPurchaseModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPurchaseModal(false)}>
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <VerifiedBadge size="lg" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Confirm Purchase</h3>
                            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                                Activate your Verified Account and start getting more bookings today!
                            </p>
                        </div>

                        <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-neutral-600 dark:text-neutral-300">Verified Account</span>
                                <span className="font-bold text-neutral-900 dark:text-white">₹999/month</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPurchaseModal(false)}
                                className="flex-1 py-3 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={loading}
                                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <>
                                        <span>Confirm</span>
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifiedAccountSection;
