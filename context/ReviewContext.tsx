import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Review } from '../types';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';

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
                const { data, error } = await supabase.from('reviews').select('*');
                if (error) throw error;
                setReviews((data || []) as Review[]);
            } catch {
                showToast('Could not load reviews.', 'error');
            }
        };
        load();
    }, []);

    const addReview = async (reviewData: Omit<Review, 'id'>) => {
        try {
            const newReview: Review = { id: Date.now(), ...reviewData } as Review;
            const { error } = await supabase.from('reviews').upsert([newReview]);
            if (error) throw error;
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
