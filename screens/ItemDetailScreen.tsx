

import React, { useState, useMemo } from 'react';
import { Item, AppView, Review, UserRole, ItemCategory } from '../types';
import { useReview } from '../context/ReviewContext';
import { useItem } from '../context/ItemContext';
import Header from '../components/Header';
import Button from '../components/Button';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';

interface ItemDetailScreenProps {
    item: Item;
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
    const { allUsers } = useAuth();
    const user = allUsers.find(u => u.id === review.reviewerId);
    return (
        <div className="bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
           <div className="flex items-center mb-2 justify-between">
                <div>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">{user?.name || 'Anonymous'}</p>
                    <StarRating rating={review.rating} />
                </div>
           </div>
           <p className="text-neutral-700 dark:text-neutral-300">{review.comment}</p>
        </div>
    );
};

const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({ item, navigate, goBack }) => {
    const { user, allUsers } = useAuth();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { reviews } = useReview();
    const { items } = useItem();

    const supplier = useMemo(() => allUsers.find(u => u.id === item.ownerId), [item.ownerId, allUsers]);
    const minPrice = useMemo(() => item.purposes.length > 0 ? Math.min(...item.purposes.map(p => p.price)) : 0, [item.purposes]);

    const isTopSupplier = useMemo(() => {
        if (!supplier) return false;
        const supplierItems = items.filter(m => m.ownerId === supplier.id);
        const itemIds = supplierItems.map(m => m.id);
        const supplierReviews = reviews.filter(r => r.itemId && itemIds.includes(r.itemId));
        
        if (supplierReviews.length < 2) return false;

        const totalRating = supplierReviews.reduce((acc, r) => acc + r.rating, 0);
        const avgRating = totalRating / supplierReviews.length;
        return avgRating >= 4.5;
    }, [supplier, items, reviews]);


    const itemReviews = useMemo(() => reviews.filter(r => r.itemId === item.id), [reviews, item.id]);
    const averageRating = useMemo(() => {
        if (itemReviews.length === 0) return 0;
        const total = itemReviews.reduce((acc, r) => acc + r.rating, 0);
        return total / itemReviews.length;
    }, [itemReviews]);
    
    const isMachineType = [ItemCategory.Tractors, ItemCategory.Harvesters, ItemCategory.JCB, ItemCategory.Borewell].includes(item.category);

    const handleRequest = () => {
        // Always create a direct request when booking from the item detail screen.
        navigate({ view: 'BOOKING_FORM', item: item });
    };

    return (
        <div className="flex flex-col h-screen dark:text-neutral-200">
            <Header title={item.name} onBack={goBack} />
            <div className="flex-grow overflow-y-auto pb-24 hide-scrollbar">
                <div>
                    <div className="relative">
                        <img 
                            src={item.images[currentImageIndex]} 
                            alt={item.name} 
                            className="w-full h-64 object-cover"
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={(e) => {
                                const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                                const target = e.currentTarget as HTMLImageElement;
                                if (target.src !== fallback) target.src = fallback;
                            }}
                        />
                        {item.images.length > 1 && (
                            <div className="absolute bottom-3 left-3 flex gap-2 z-10">
                                {item.images.slice(0, 2).map((img, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={`w-12 h-12 rounded-md overflow-hidden border-2 shadow-md ${currentImageIndex === index ? 'border-primary' : 'border-white/80'} bg-white/80`}
                                    >
                                        <img
                                            src={img}
                                            alt={`${item.name} thumb ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                            crossOrigin="anonymous"
                                            onError={(e) => {
                                                const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                                                const target = e.currentTarget as HTMLImageElement;
                                                if (target.src !== fallback) target.src = fallback;
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {item.images.length > 2 && (
                        <div className="flex space-x-2 mt-2 p-2 overflow-x-auto hide-scrollbar">
                            {item.images.slice(2).map((img, index) => (
                                <button 
                                    key={index + 2} 
                                    onClick={() => setCurrentImageIndex(index + 2)}
                                    className={`w-16 h-16 rounded-md flex-shrink-0 overflow-hidden border-2 transition-all ${currentImageIndex === index + 2 ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                                >
                                    <img 
                                        src={img} 
                                        alt={`${item.name} thumbnail ${index + 3}`} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                                            const target = e.currentTarget as HTMLImageElement;
                                            if (target.src !== fallback) target.src = fallback;
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{item.name}</h2>
                            <p className="text-md text-neutral-700 dark:text-neutral-300">{item.category}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.available ? 'Available' : 'Booked'}
                        </span>
                    </div>

                     <div className="mt-4 border-t pt-4 dark:border-neutral-700">
                        <p className="text-2xl font-bold text-primary">Starting from ₹{minPrice} <span className="text-lg font-normal text-neutral-900 dark:text-neutral-300">per hour</span></p>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Services & Pricing</h3>
                        <div className="space-y-2 bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                            {item.purposes.map(purpose => (
                                <div key={purpose.name} className="flex justify-between text-sm">
                                    <span className="text-neutral-700 dark:text-neutral-300">{purpose.name}</span>
                                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">₹{purpose.price}/hr</span>
                                </div>
                            ))}
                        </div>
                    </div>


                    <div className="mt-6 bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Description</h3>
                        <p className="text-neutral-700 dark:text-neutral-300">{item.description}</p>
                    </div>
                    
                    {isMachineType && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Specifications</h3>
                            <div className="grid grid-cols-2 gap-4 bg-neutral-100 dark:bg-neutral-700 p-4 rounded-lg text-sm">
                                {item.model && <div><p className="text-neutral-500 dark:text-neutral-400">Model</p><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.model}</p></div>}
                                {item.year && <div><p className="text-neutral-500 dark:text-neutral-400">Year</p><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.year}</p></div>}
                                {item.horsepower && <div><p className="text-neutral-500 dark:text-neutral-400">Horsepower</p><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.horsepower} HP</p></div>}
                                {item.condition && <div><p className="text-neutral-500 dark:text-neutral-400">Condition</p><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.condition}</p></div>}
                                {item.licensePlate && <div><p className="text-neutral-500 dark:text-neutral-400">Number Plate</p><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.licensePlate}</p></div>}
                            </div>
                        </div>
                    )}

                     <div className="mt-6">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Supplier Details</h3>
                        <div className="flex items-center space-x-2">
                             <p className="text-neutral-900 dark:text-neutral-200 font-semibold">{supplier?.name}</p>
                            {isTopSupplier && (
                                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Top Rated
                                </span>
                            )}
                        </div>
                        <p className="text-neutral-900 dark:text-neutral-300">Location: {item.location}</p>
                    </div>

                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Reviews</h3>
                             {averageRating > 0 && (
                                <div className="flex items-center space-x-1">
                                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{averageRating.toFixed(1)}</span>
                                    <span className="text-sm text-neutral-700 dark:text-neutral-300">({itemReviews.length})</span>
                                </div>
                             )}
                        </div>
                        <div className="space-y-3">
                            {itemReviews.length > 0 ? (
                                itemReviews.map(review => <ReviewCard key={review.id} review={review} />)
                            ) : (
                                <p className="text-neutral-700 dark:text-neutral-300 text-sm">No reviews yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {user?.role === UserRole.Farmer && (
                <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
                    <Button 
                        onClick={handleRequest}
                        disabled={!item.available}
                        className={!item.available ? 'bg-neutral-400 hover:bg-neutral-400 cursor-not-allowed' : ''}
                    >
                        {item.available ? 'Request this Service' : 'Currently Unavailable'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ItemDetailScreen;