import React from 'react';
import { AppView } from '../types';
import Button from '../components/Button';

interface BookingSuccessScreenProps {
    navigate: (view: AppView) => void;
    isDirectRequest?: boolean;
}

const BookingSuccessScreen: React.FC<BookingSuccessScreenProps> = ({ navigate, isDirectRequest }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-neutral-100">
                Request Sent!
            </h1>
            <p className="text-gray-600 dark:text-neutral-300 mt-2 mb-4">
                {isDirectRequest
                    ? "Your request has been sent to the supplier. You'll be notified upon confirmation."
                    : "Your request has been broadcast to all available suppliers. You'll be notified when one accepts."}
            </p>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-8">
                Payment will be due after the work is completed. You can track your booking status in the 'My Bookings' section.
            </p>
            <Button onClick={() => navigate({ view: 'HOME' })}>Go to Home</Button>
        </div>
    );
};

export default BookingSuccessScreen;
