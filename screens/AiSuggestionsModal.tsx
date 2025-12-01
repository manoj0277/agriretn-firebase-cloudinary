
import React, { useState, useMemo } from 'react';
import { useItem } from '../context/ItemContext';
import { useBooking } from '../context/BookingContext';
import { useWeather } from '../context/WeatherContext';
import { AppView, Item, ItemCategory } from '../types';
import ItemCard from '../components/ItemCard';
import Button from '../components/Button';

interface AiSuggestionsModalProps {
    onClose: () => void;
    navigate: (view: AppView) => void;
}

const AiSuggestionsModal: React.FC<AiSuggestionsModalProps> = ({ onClose, navigate }) => {
    const { items } = useItem();
    const { bookings } = useBooking();
    const { summary } = useWeather();
    const [cropType, setCropType] = useState('');
    const [fieldSize, setFieldSize] = useState('');
    const [activity, setActivity] = useState('');
    const [recommendations, setRecommendations] = useState<Item[]>([]);

    const approvedItems = useMemo(() => items.filter(i => i.status === 'approved'), [items]);

    const handleGetRecommendations = (e: React.FormEvent) => {
        e.preventDefault();
        let suggested: Item[] = [];
        const activityLower = activity.toLowerCase();
        const cropTypeLower = cropType.toLowerCase();

        // Priority 1: Paddy + Harvest combination
        if (cropTypeLower.includes('paddy') && activityLower.includes('harvest')) {
            suggested = approvedItems.filter(i =>
                i.category === ItemCategory.Harvesters ||
                i.name.toLowerCase().includes('harvester')
            );
            console.log('Paddy + Harvest: Found', suggested.length, 'harvesters');
        }
        // Priority 2: Harvest activity
        else if (activityLower.includes('harvest')) {
            suggested = approvedItems.filter(i =>
                i.category === ItemCategory.Harvesters ||
                i.name.toLowerCase().includes('harvester')
            );
        }
        // Priority 3: Plough/Sow activity
        else if (activityLower.includes('plough') || activityLower.includes('sow')) {
            suggested = approvedItems.filter(i => i.category === ItemCategory.Tractors);
        }
        // Priority 4: Spray activity
        else if (activityLower.includes('spray')) {
            suggested = approvedItems.filter(i =>
                i.category === ItemCategory.Drones || i.category === ItemCategory.Sprayers
            );
        }
        // Priority 5: Plant/Weed activity
        else if (activityLower.includes('plant') || activityLower.includes('weed')) {
            suggested = approvedItems.filter(i => i.category === ItemCategory.Workers);
        }
        // Priority 6: Paddy crop (without specific activity)
        else if (cropTypeLower.includes('paddy')) {
            suggested = approvedItems.filter(i =>
                i.category === ItemCategory.Tractors ||
                i.category === ItemCategory.Harvesters
            );
        }
        // Fallback: Random suggestions
        else {
            suggested = [...approvedItems].sort(() => 0.5 - Math.random()).slice(0, 5);
        }

        // If still no results, show top 3 popular items
        if (suggested.length === 0) {
            suggested = [...approvedItems].slice(0, 3);
        }

        // Apply field size filter for small fields
        if (fieldSize && parseInt(fieldSize) < 10 && suggested.length > 1) {
            const getMinPrice = (item: Item) => item.purposes.length > 0 ? Math.min(...item.purposes.map(p => p.price)) : Infinity;
            suggested = suggested.sort((a, b) => getMinPrice(a) - getMinPrice(b)).slice(0, 3);
        }

        // Boost items user has used before
        const recentBookingItemIds = new Set(
            bookings
                .filter(b => b.status === 'Completed' && b.itemId)
                .slice(-20)
                .map(b => b.itemId as number)
        );
        const boostByHistory = (list: Item[]) => list.sort((a, b) => Number(recentBookingItemIds.has(b.id)) - Number(recentBookingItemIds.has(a.id)));
        suggested = boostByHistory(suggested);

        // Weather consideration: Don't suggest harvesters if rain expected
        if (summary.rainNext3Days) {
            const nonHarvesters = suggested.filter(i => i.category !== ItemCategory.Harvesters);
            if (nonHarvesters.length > 0) {
                suggested = nonHarvesters;
            }
        }

        console.log('Final recommendations:', suggested.length, 'items');
        setRecommendations(suggested.slice(0, 5)); // Limit to top 5
    };

    const handleNavigate = (item: Item) => {
        onClose();
        navigate({ view: 'ITEM_DETAIL', item });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
                <button onClick={onClose} className="absolute top-2 right-2 p-2 text-neutral-500 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">AI-Powered Suggestions</h2>
                <form onSubmit={handleGetRecommendations} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder="Crop Type (e.g., Wheat)" value={cropType} onChange={e => setCropType(e.target.value)} className="w-full p-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100" />
                        <input type="number" placeholder="Field Size (acres)" value={fieldSize} onChange={e => setFieldSize(e.target.value)} className="w-full p-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100" />
                        <input type="text" placeholder="Activity (e.g., Harvest)" value={activity} onChange={e => setActivity(e.target.value)} className="w-full p-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100" />
                    </div>
                    <Button type="submit" className="w-full py-2 text-sm">Get Recommendations</Button>
                </form>
                {recommendations.length > 0 && (
                    <div className="mt-6 max-h-64 overflow-y-auto pr-2">
                        <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-2">Recommended For You:</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {recommendations.map(item => <ItemCard key={item.id} item={item} onClick={() => handleNavigate(item)} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiSuggestionsModal;