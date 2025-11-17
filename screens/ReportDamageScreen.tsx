import React, { useState } from 'react';
import { Booking, AppView } from '../types';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useBooking } from '../context/BookingContext';
import Header from '../components/Header';
import Button from '../components/Button';

interface ReportDamageScreenProps {
    booking: Booking;
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const ReportDamageScreen: React.FC<ReportDamageScreenProps> = ({ booking, navigate, goBack }) => {
    const { user } = useAuth();
    const { items } = useItem();
    const { reportDamage } = useBooking();
    const [description, setDescription] = useState('');

    const item = items.find(i => i.id === booking.itemId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            alert('Please provide a description of the damage.');
            return;
        }
        if (!user || !item) return;

        reportDamage({
            bookingId: booking.id,
            itemId: item.id,
            reporterId: user.id,
            description,
        });

        navigate({ view: 'HOME' }); // Navigate to bookings or home
    };

    if (!item) {
        return (
            <div>
                <Header title="Report Damage" onBack={() => navigate({ view: 'HOME' })} />
                <p className="p-4">Item not found.</p>
            </div>
        );
    }

    return (
        <div>
            <Header title="Report Damage" onBack={goBack} />
            <div className="p-6">
                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{item.name}</h2>
                    <p className="text-neutral-700 dark:text-neutral-300">Booking Date: {booking.date}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="description" className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                            Please describe the issue or damage
                        </label>
                        <textarea
                            id="description"
                            rows={6}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g., The tractor's headlight was cracked upon delivery."
                            required
                            className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="bg-yellow-100 text-yellow-800 text-sm p-3 rounded-lg">
                        <p>Submitting this form will send a damage report to the platform administrator for review. They will contact you for further details.</p>
                    </div>
                    <Button type="submit">Submit Report</Button>
                </form>
            </div>
        </div>
    );
};

export default ReportDamageScreen;