import React from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Button from '../components/Button';
import { AppView } from '../types';

interface VerifiedAccountManagerScreenProps {
    goBack: () => void;
    navigate: (view: AppView) => void;
}

const VerifiedAccountManagerScreen: React.FC<VerifiedAccountManagerScreenProps> = ({ goBack, navigate }) => {
    const { user } = useAuth();

    const isVerified = user?.isVerifiedAccount;
    const purchaseDate = user?.verifiedAccountPurchaseDate ? new Date(user.verifiedAccountPurchaseDate) : null;
    const expiryDate = user?.verifiedAccountExpiryDate ? new Date(user.verifiedAccountExpiryDate) : null;
    const now = new Date();

    // Calculate days remaining
    const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isExpired = expiryDate ? expiryDate < now : true;
    const totalDays = purchaseDate && expiryDate ? Math.ceil((expiryDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)) : 30;
    const progressPercent = totalDays > 0 ? Math.min(100, Math.max(0, ((totalDays - daysRemaining) / totalDays) * 100)) : 0;

    const history = user?.verificationHistory || [];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusBadge = () => {
        if (!isVerified) {
            return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Not Verified</span>;
        }
        if (isExpired) {
            return <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-medium">Expired</span>;
        }
        return <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm font-medium">Active</span>;
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
            <Header title="Verified Account" onBack={goBack} />

            <div className="p-4 space-y-6">
                {/* Status Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-white">Verification Status</h2>
                        {getStatusBadge()}
                    </div>

                    {isVerified && !isExpired ? (
                        <>
                            {/* Days Remaining */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-500 dark:text-neutral-400">Days Remaining</span>
                                    <span className="font-semibold text-neutral-800 dark:text-white">{daysRemaining} days</span>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all ${daysRemaining <= 7 ? 'bg-red-500' : daysRemaining <= 15 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                        style={{ width: `${100 - progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-neutral-500 dark:text-neutral-400">Purchased On</p>
                                    <p className="font-medium text-neutral-800 dark:text-white">
                                        {purchaseDate ? formatDate(purchaseDate.toISOString()) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-neutral-500 dark:text-neutral-400">Expires On</p>
                                    <p className="font-medium text-neutral-800 dark:text-white">
                                        {expiryDate ? formatDate(expiryDate.toISOString()) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Warning if expiring soon */}
                            {daysRemaining <= 7 && (
                                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                                        ⚠️ Your verification expires in {daysRemaining} days. Renew now to maintain priority listing!
                                    </p>
                                </div>
                            )}
                        </>
                    ) : isVerified && isExpired ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">Verification Expired</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                                Your verified account has expired. Renew to regain priority listing and higher visibility.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">Get Verified</h3>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                                Upgrade to a verified account for priority listing, higher visibility, and increased booking rates.
                            </p>
                        </div>
                    )}

                    <Button className="w-full mt-4" onClick={() => alert('Payment integration coming soon!')}>
                        {isVerified && !isExpired ? 'Renew Verification' : 'Get Verified - ₹999/month'}
                    </Button>
                </div>

                {/* Benefits Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">Benefits</h2>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-neutral-600 dark:text-neutral-300 text-sm">Priority listing - Your equipment appears at the top of search results</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-neutral-600 dark:text-neutral-300 text-sm">Verified badge - Build trust with farmers</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-neutral-600 dark:text-neutral-300 text-sm">Extended hours - 9 hours/day availability (vs 8 for non-verified)</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-neutral-600 dark:text-neutral-300 text-sm">Higher utilization cap - Up to 85% (vs 80% for non-verified)</span>
                        </li>
                    </ul>
                </div>

                {/* History Card */}
                {history.length > 0 && (
                    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-4">Purchase History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                        <th className="text-left py-2 text-neutral-500 dark:text-neutral-400 font-medium">Plan</th>
                                        <th className="text-left py-2 text-neutral-500 dark:text-neutral-400 font-medium">Period</th>
                                        <th className="text-right py-2 text-neutral-500 dark:text-neutral-400 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((entry, idx) => (
                                        <tr key={idx} className="border-b border-neutral-100 dark:border-neutral-700/50 last:border-0">
                                            <td className="py-3 text-neutral-800 dark:text-white">{entry.plan}</td>
                                            <td className="py-3 text-neutral-600 dark:text-neutral-300">
                                                {formatDate(entry.purchaseDate)} - {formatDate(entry.expiryDate)}
                                            </td>
                                            <td className="py-3 text-right text-neutral-800 dark:text-white font-medium">₹{entry.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifiedAccountManagerScreen;
