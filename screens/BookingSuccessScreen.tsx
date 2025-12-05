
import React from 'react';
import { AppView } from '../types';
import Button from '../components/Button';

interface BookingSuccessScreenProps {
    navigate: (view: AppView) => void;
    isDirectRequest?: boolean;
    paymentType?: 'now' | 'later';
}

const BookingSuccessScreen: React.FC<BookingSuccessScreenProps> = ({ navigate, isDirectRequest, paymentType }) => {
    const isPaidNow = paymentType === 'now';

    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            {/* Animated Success Icon */}
            <div className="relative mb-8">
                {/* Pulsing rings */}
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>

                {/* Green circle with shadow */}
                <div className="relative w-40 h-40 bg-primary rounded-full flex items-center justify-center shadow-2xl animate-scale-in border-4 border-primary/20">
                    {/* White checkmark */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-neutral-100">
                {isPaidNow ? 'Booking Fully Paid!' : 'Request Sent!'}
            </h1>
            <p className="text-gray-600 dark:text-neutral-300 mt-2 mb-4">
                {isDirectRequest
                    ? "Your request has been sent to the supplier. You'll be notified upon confirmation."
                    : "Your request has been broadcast to all available suppliers. You'll be notified when one accepts."}
            </p>
            <div className="flex items-center justify-center space-x-2 bg-neutral-100 dark:bg-neutral-700 py-2 px-4 rounded-full mb-8">
                {isPaidNow ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                )}
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {isPaidNow
                        ? "Fully Paid • No further action needed"
                        : "Payment due after work completion"}
                </span>
            </div>
            <button
                onClick={() => navigate({ view: 'HOME' })}
                className="bg-primary text-white font-semibold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors text-sm"
            >
                Go to Home
            </button>
        </div>
    );
};

export default BookingSuccessScreen;
