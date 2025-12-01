import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Review } from '../types';
import { useToast } from './ToastContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface ReviewContextType {
    reviews: Review[];
    addReview: (review: Omit<Review, 'id'>) => void;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/reviews`);
                if (res.ok) {
                    const data = await res.json();
                    setReviews(data);
                }
            } catch {
                showToast('Could not load reviews.', 'error');
            }
        };
        load();
    }, [showToast]);

    const addReview = async (reviewData: Omit<Review, 'id'>) => {
        try {
            const newReview: Review = { id: Date.now(), ...reviewData } as Review;
            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReview)
            });
            if (!res.ok) throw new Error('Failed');
            setReviews(prev => [...prev, newReview]);
            showToast('Review submitted successfully!', 'success');
        } catch {
            showToast('Failed to submit review.', 'error');
        }
    };

    const value = useMemo(() => ({ reviews, addReview }), [reviews]);

    return (
        <ReviewContext.Provider value={value}>
            {children}
        </ReviewContext.Provider>
    );
};

export const useReview = (): ReviewContextType => {
    const context = useContext(ReviewContext);
    if (context === undefined) {
        throw new Error('useReview must be used within a ReviewProvider');
    }
    return context;
};
