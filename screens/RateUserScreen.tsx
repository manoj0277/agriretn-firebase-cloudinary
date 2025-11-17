
import React, { useState } from 'react';
import { Booking, AppView, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useReview } from '../context/ReviewContext';
import Header from '../components/Header';
import Button from '../components/Button';
import StarRating from '../components/StarRating';

interface RateUserScreenProps {
    booking: Booking;
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const RateUserScreen: React.FC<RateUserScreenProps> = ({ booking, navigate, goBack }) => {
    const { user, allUsers } = useAuth();
    const { addReview } = useReview();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const farmer = allUsers.find(u => u.id === booking.farmerId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            alert('Please select a rating.');
            return;
        }
        if (!user || !farmer) return;

        addReview({
            reviewerId: user.id,
            ratedUserId: farmer.id,
            bookingId: booking.id,
            rating,
            comment
        });

        navigate({ view: 'HOME' });
    };

    if (!farmer) {
        return (
            <div className="dark:text-neutral-200">
                <Header title="Rate Farmer" onBack={goBack} />
                <p className="p-4">Farmer not found for this booking.</p>
            </div>
        );
    }

    return (
        <div className="dark:text-neutral-200">
            <Header title="Rate Farmer" onBack={goBack} />
            <div className="p-6">
                <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 mb-6">
                    <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{farmer.name}</h2>
                    <p className="text-neutral-700 dark:text-neutral-300">Booking Date: {booking.date}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Your Rating</label>
                        <StarRating rating={rating} onRatingChange={setRating} isEditable />
                    </div>
                    <div>
                        <label htmlFor="comment" className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                            Write your review
                        </label>
                        <textarea
                            id="comment"
                            rows={5}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder={`Tell us about your experience with ${farmer.name}...`}
                            className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <Button type="submit">Submit Review</Button>
                </form>
            </div>
        </div>
    );
};

export default RateUserScreen;
