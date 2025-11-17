

import React from 'react';
import { Item, ItemCategory } from '../types';
import StarRating from './StarRating';

interface ItemCardProps {
    item: Item;
    onClick: () => void;
    compact?: boolean;
}

const CategoryIcon: React.FC<{ category: ItemCategory }> = ({ category }) => {
    const icons: Record<ItemCategory, React.ReactElement> = {
        [ItemCategory.Tractors]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14a4 4 0 10-8 0 4 4 0 008 0zM5 14a4 4 0 10-8 0 4 4 0 008 0zM12 14H6V9h1l2-3h5v5h-2v3z" /></svg>,
        [ItemCategory.Harvesters]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 15l4-4h14v4H3zM4 11V9h16v2H4z" /></svg>,
        [ItemCategory.JCB]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 18l-5-5h18l-5 5H8zM12 3L6 9h12L12 3z" /></svg>,
        [ItemCategory.Workers]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125a4 4 0 00-6.44 0A6 6 0 003 20v1z" /></svg>,
        [ItemCategory.Drones]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
        [ItemCategory.Sprayers]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15v4m0 0v4m0-4h4m-4 0H1m4-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        [ItemCategory.Drivers]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 0v5m0-5c-3.314 0-6 2.686-6 6v2h12v-2c0-3.314-2.686-6-6-6z" /></svg>,
        [ItemCategory.Borewell]: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293h-1.172a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 008.586 13H6" /></svg>,
    };
    return icons[category] || null;
};


const ItemCard: React.FC<ItemCardProps> = ({ item, onClick, compact = false }) => {
    const minPrice = item.purposes.length > 0 ? Math.min(...item.purposes.map(p => p.price)) : 0;

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer overflow-hidden ${compact ? 'hover:translate-y-0.5' : ''}`}
        >
            <div>
                <div className={`w-full ${compact ? 'aspect-[4/3]' : 'aspect-video'} bg-neutral-100 dark:bg-neutral-600`}>
                    <img 
                        src={item.images[0]} 
                        alt={item.name} 
                        className={`w-full h-full object-cover ${compact ? 'brightness-100' : ''}`}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                            const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== fallback) target.src = fallback;
                        }}
                    />
                </div>
                <div className={`${compact ? 'p-2' : 'p-3'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <div className={`flex items-center ${compact ? 'text-[10px]' : 'text-xs'} text-neutral-500 dark:text-neutral-400`}>
                            <CategoryIcon category={item.category} />
                            <span className="ml-1">{item.category}</span>
                        </div>
                         <span className={`px-2 py-0.5 ${compact ? 'text-[10px]' : 'text-xs'} font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.available ? 'Available' : 'Booked'}
                        </span>
                    </div>
                    <h3 className={`font-bold ${compact ? 'text-sm' : 'text-md'} text-neutral-800 dark:text-neutral-100 leading-tight truncate mb-2`}>{item.name}</h3>
                    <div className="flex justify-between items-end">
                        <div>
                            {item.avgRating && item.avgRating > 0 ? (
                                <div className="flex items-center space-x-1">
                                    <StarRating rating={item.avgRating} />
                                    <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-neutral-600 dark:text-neutral-300`}>({item.avgRating.toFixed(1)})</span>
                                </div>
                            ) : (
                                <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-neutral-500 dark:text-neutral-400`}>No reviews yet</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-neutral-600 dark:text-neutral-300`}>from</p>
                            <p className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-primary`}>₹{minPrice}<span className={`${compact ? 'text-[10px]' : 'text-xs'} font-normal text-neutral-500 dark:text-neutral-400`}>/hr</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemCard;