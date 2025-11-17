
import React, { useState, useMemo } from 'react';
import { useItem } from '../context/ItemContext';
import { AppView, Item, ItemCategory } from '../types';
import ItemCard from '../components/ItemCard';
import Button from '../components/Button';

interface AiSuggestionsModalProps {
    onClose: () => void;
    navigate: (view: AppView) => void;
}

const AiSuggestionsModal: React.FC<AiSuggestionsModalProps> = ({ onClose, navigate }) => {
    const { items } = useItem();
    const [cropType, setCropType] = useState('');
    const [fieldSize, setFieldSize] = useState('');
    const [activity, setActivity] = useState('');
    const [recommendations, setRecommendations] = useState<Item[]>([]);

    const approvedItems = useMemo(() => items.filter(i => i.status === 'approved'), [items]);

    const handleGetRecommendations = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple recommendation logic
        let suggested: Item[] = [];
        const activityLower = activity.toLowerCase();

        if (activityLower.includes('harvest')) {
            suggested = approvedItems.filter(i => i.name.toLowerCase().includes('harvester'));
        } else if (activityLower.includes('plough') || activityLower.includes('sow')) {
            suggested = approvedItems.filter(i => i.category === ItemCategory.Tractors);
        } else if (activityLower.includes('spray')) {
            suggested = approvedItems.filter(i => i.category === ItemCategory.Drones || i.category === ItemCategory.Sprayers);
        } else if (activityLower.includes('plant') || activityLower.includes('weed')) {
             suggested = approvedItems.filter(i => i.category === ItemCategory.Workers);
        } else {
            // Generic fallback if no activity matches
            suggested = [...approvedItems].sort(() => 0.5 - Math.random()).slice(0, 3);
        }
        
        // Filter further by size if provided
        if (fieldSize && parseInt(fieldSize) < 10 && suggested.length > 1) {
             // suggest smaller/cheaper items for smaller fields
             const getMinPrice = (item: Item) => item.purposes.length > 0 ? Math.min(...item.purposes.map(p => p.price)) : Infinity;
             suggested = suggested.sort((a,b) => getMinPrice(a) - getMinPrice(b)).slice(0, 2);
        }
        setRecommendations(suggested);
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