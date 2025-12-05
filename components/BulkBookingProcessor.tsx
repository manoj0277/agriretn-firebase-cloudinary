import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface BulkBookingProcessorProps {
    className?: string;
}

const BulkBookingProcessor: React.FC<BulkBookingProcessorProps> = ({ className = '' }) => {
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [sheetsUrl, setSheetsUrl] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [results, setResults] = useState<any>(null);

    // Initialize URL from backend .env
    React.useEffect(() => {
        const fetchUrlFromBackend = async () => {
            try {
                const response = await fetch(`${API_URL}/config/google-sheets-url`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        setSheetsUrl(data.url);
                        // Save to user profile if we have one
                        if (user && !user.googleSheetsUrl) {
                            updateUser({ ...user, googleSheetsUrl: data.url });
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch Google Sheets URL from backend:', error);
            }
        };

        // Priority order: user profile > backend .env
        if (user?.googleSheetsUrl) {
            setSheetsUrl(user.googleSheetsUrl);
        } else {
            fetchUrlFromBackend();
        }
    }, [user]);

    const processBulkBookings = async () => {
        if (!sheetsUrl) {
            showToast('Please set your Google Sheets URL first', 'error');
            setShowUrlInput(true);
            return;
        }

        if (!user) {
            showToast('You must be logged in', 'error');
            return;
        }

        setIsProcessing(true);
        setResults(null);

        try {
            const response = await fetch(`${API_URL}/agent/bulk-bookings/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetsUrl,
                    agentId: user.id,
                    agentName: user.name
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process bulk bookings');
            }

            const data = await response.json();
            setResults(data.results);

            if (data.results.failed === 0) {
                showToast(`✅ Successfully processed all ${data.results.successful} bookings!`, 'success');
            } else {
                showToast(
                    `Processed ${data.results.successful} bookings. ${data.results.failed} failed.`,
                    'warning'
                );
            }
        } catch (error: any) {
            console.error('Bulk booking error:', error);
            showToast(error.message || 'Failed to process bulk bookings', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const saveUrl = async () => {
        if (!user) return;

        try {
            // Save to backend profile
            await updateUser({ ...user, googleSheetsUrl: sheetsUrl });
            // Also save to local storage as backup
            localStorage.setItem('bulkBookingSheetsUrl', sheetsUrl);
            setShowUrlInput(false);
            // Toast is handled by updateUser
        } catch (error) {
            console.error('Error saving URL:', error);
            showToast('Failed to save URL', 'error');
        }
    };

    return (
        <div className={`bg-white dark:bg-neutral-800 rounded-lg p-4 shadow ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    📊 Bulk Booking Processor
                </h3>
                <button
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-sm text-primary hover:underline"
                >
                    {showUrlInput ? 'Cancel' : 'Configure'}
                </button>
            </div>

            {showUrlInput && (
                <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-700 rounded">
                    <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                        Google Sheets Web App URL:
                    </label>
                    <input
                        type="url"
                        value={sheetsUrl}
                        onChange={(e) => setSheetsUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="w-full p-2 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white mb-2"
                    />
                    <Button onClick={saveUrl} variant="secondary" className="w-full">
                        Save URL
                    </Button>
                </div>
            )}

            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                Process pending bookings from your Google Sheet. Make sure the sheet has rows with Status = "PENDING".
            </p>

            <Button
                onClick={processBulkBookings}
                disabled={isProcessing || !sheetsUrl}
                className="w-auto px-6"
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                    </span>
                ) : (
                    '🚀 Process Bulk Bookings'
                )}
            </Button>

            {results && (
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600">
                    <div className="mb-3">
                        <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100 mb-2">Processing Results</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                        <div className="p-3 bg-white dark:bg-neutral-800 rounded text-center">
                            <p className="text-neutral-600 dark:text-neutral-400">Total</p>
                            <p className="text-2xl font-bold text-neutral-800 dark:text-white">{results.total}</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded text-center">
                            <p className="text-green-700 dark:text-green-400">Successful</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{results.successful}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-center">
                            <p className="text-red-700 dark:text-red-400">Failed</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{results.failed}</p>
                        </div>
                    </div>

                    {/* Successful Bookings */}
                    {results.successful > 0 && (
                        <details className="mb-3" open={results.successful > 0 && results.successful <= 5}>
                            <summary className="cursor-pointer text-sm font-bold text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 mb-2">
                                ✅ View successful bookings ({results.successful})
                            </summary>
                            <div className="mt-2 max-h-64 overflow-y-auto space-y-2 text-xs">
                                {results.details
                                    .filter((r: any) => r.success)
                                    .map((r: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><span className="font-semibold">Booking ID:</span> {r.bookingId || 'N/A'}</div>
                                                <div><span className="font-semibold">Row:</span> {r.rowNumber}</div>
                                                <div><span className="font-semibold">Farmer:</span> {r.farmerName || 'N/A'}</div>
                                                <div><span className="font-semibold">Phone:</span> {r.phone || 'N/A'}</div>
                                                <div><span className="font-semibold">Item:</span> {r.itemCategory || 'N/A'}</div>
                                                <div><span className="font-semibold">Location:</span> {r.location || 'N/A'}</div>
                                                <div className="col-span-2"><span className="font-semibold">Date/Time:</span> {r.date} {r.startTime || ''}</div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </details>
                    )}

                    {/* Failed Bookings */}
                    {results.failed > 0 && (
                        <details className="mt-3" open={results.failed > 0}>
                            <summary className="cursor-pointer text-sm font-bold text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mb-2">
                                ❌ View failed bookings ({results.failed})
                            </summary>
                            <div className="mt-2 max-h-64 overflow-y-auto space-y-2 text-xs">
                                {results.details
                                    .filter((r: any) => !r.success)
                                    .map((r: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div><span className="font-semibold">Row:</span> {r.rowNumber}</div>
                                                <div><span className="font-semibold">Phone:</span> {r.phone || 'N/A'}</div>
                                                <div><span className="font-semibold">Farmer:</span> {r.farmerName || 'N/A'}</div>
                                                <div><span className="font-semibold">Item:</span> {r.itemCategory || 'N/A'}</div>
                                            </div>
                                            <div className="text-red-700 dark:text-red-300 font-semibold">
                                                Error: {r.error}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </details>
                    )}
                </div>
            )}

            {!sheetsUrl && (
                <p className="mt-3 text-xs text-orange-600 dark:text-orange-400">
                    ⚠️ No Google Sheets URL configured. Click "Configure" to set it up.
                </p>
            )}
        </div>
    );
};

export default BulkBookingProcessor;
