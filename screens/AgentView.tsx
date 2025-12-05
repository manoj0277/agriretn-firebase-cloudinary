// REACT NATIVE MIGRATION NOTE:
// The layout of this screen uses HTML elements like `<div>`, `<input>`, and `<select>`.
// In React Native, these would be replaced with native components:
// - `<div>` becomes `<View>` or `<ScrollView>` for scrollable content.
// - `<input>` becomes `<TextInput>`.
// - `<select>` could be implemented with a Picker component or a custom modal.
// - Styling would use the StyleSheet API or a library like `react-native-paper`'s themes.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/location';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { useReview } from '../context/ReviewContext';
import { AppView, Item, ItemCategory, Booking } from '../types';
import Header from '../components/Header';
import BottomNav, { NavItemConfig } from '../components/BottomNav';
import ItemCard from '../components/ItemCard';
import Button from '../components/Button';
import ConfirmationDialog from '../components/ConfirmationDialog';
import NotificationBell from '../components/NotificationBell';
import BulkBookingProcessor from '../components/BulkBookingProcessor';
import { useChat } from '../context/ChatContext';
import { useNotification } from '../context/NotificationContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useToast } from '../context/ToastContext';
import StarRating from '../components/StarRating';
import FarmerMapScreen from './FarmerMapScreen';
import { useLanguage } from '../context/LanguageContext';
import AiSuggestionsModal from './AiSuggestionsModal';
import { useWeather } from '../context/WeatherContext';

const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
    ? process.env.API_KEY
    : undefined;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;


interface AgentViewProps {
    navigate: (view: AppView) => void;
}

const RepeatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5m5-5l-5-5-5 5m5 5l5 5 5-5" />
    </svg>
);

const ChatIcon: React.FC<{ onClick: () => void; unreadCount: number; }> = ({ onClick, unreadCount }) => (
    <button onClick={onClick} className="relative p-2 text-neutral-700 dark:text-neutral-300 hover:text-primary rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700" aria-label="Open Chats">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
        )}
    </button>
);

const AgentHomeScreen: React.FC<AgentViewProps> = ({ navigate }) => {
    const { items } = useItem();
    const { bookings } = useBooking();
    const { user, allUsers } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const { addNotification } = useNotification();
    const { t } = useLanguage();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;
    const { summary } = useWeather();
    const [showRainTip, setShowRainTip] = useState(true);
    const [showDryTip, setShowDryTip] = useState(true);

    // Search and Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
    const [sortBy, setSortBy] = useState('popularity');

    // Advanced Filter State
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [minRating, setMinRating] = useState(0);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [filterDate, setFilterDate] = useState('');


    // Temporary state for the modal
    const [tempPriceRange, setTempPriceRange] = useState(priceRange);
    const [tempMinRating, setTempMinRating] = useState(minRating);
    const [tempShowAvailableOnly, setTempShowAvailableOnly] = useState(showAvailableOnly);
    const [tempFilterDate, setTempFilterDate] = useState(filterDate);


    const itemCategories: ('All' | ItemCategory)[] = ['All', ...Object.values(ItemCategory)];

    useEffect(() => {
        if (isFilterModalOpen) {
            setTempPriceRange(priceRange);
            setTempMinRating(minRating);
            setTempShowAvailableOnly(showAvailableOnly);
            setTempFilterDate(filterDate);
        }
    }, [isFilterModalOpen, priceRange, minRating, showAvailableOnly, filterDate]);

    const handleApplyFilters = () => {
        setPriceRange(tempPriceRange);
        setMinRating(tempMinRating);
        setShowAvailableOnly(tempShowAvailableOnly);
        setFilterDate(tempFilterDate);
        setIsFilterModalOpen(false);
    };

    const handleResetFilters = () => {
        setTempPriceRange({ min: '', max: '' });
        setTempMinRating(0);
        setTempShowAvailableOnly(false);
        setTempFilterDate('');

        setPriceRange({ min: '', max: '' });
        setMinRating(0);
        setShowAvailableOnly(false);
        setFilterDate('');
        setIsFilterModalOpen(false);
    };

    const areFiltersActive = useMemo(() => {
        return priceRange.min !== '' || priceRange.max !== '' || minRating > 0 || showAvailableOnly || filterDate !== '';
    }, [priceRange, minRating, showAvailableOnly, filterDate]);



    const approvedItems = useMemo(() => items.filter(m => m.status === 'approved'), [items]);

    const popularItems = useMemo(() => {
        const bookingCounts = bookings.reduce((acc, booking) => {
            if (booking.itemId) {
                acc[booking.itemId] = (acc[booking.itemId] || 0) + 1;
            }
            return acc;
        }, {} as Record<number, number>);

        const bookedItems = approvedItems
            .map(item => ({ ...item, bookings: bookingCounts[item.id] || 0 }))
            .filter(item => item.bookings > 0)
            .sort((a, b) => b.bookings - a.bookings);

        const desiredCount = 6; // Increased from 5 to 6
        if (bookedItems.length >= desiredCount) {
            return bookedItems.slice(0, desiredCount);
        }

        const popularItemIds = new Set(bookedItems.map(item => item.id));
        const fillerItems = approvedItems
            .filter(item => !popularItemIds.has(item.id))
            .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

        const combinedList = [...bookedItems, ...fillerItems];

        return combinedList.slice(0, desiredCount);

    }, [bookings, approvedItems]);

    // Auto-scroll Popular Near You carousel every 3.5 seconds
    const popularRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = popularRef.current;
        if (!el) return;
        const interval = setInterval(() => {
            const cardWidth = 192; // approx for w-48 + gap
            const maxScrollLeft = el.scrollWidth - el.clientWidth;
            if (el.scrollLeft >= maxScrollLeft - 10) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                el.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
            }
        }, 3500);
        return () => clearInterval(interval);
    }, [popularRef]);

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | undefined>();
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    // Default to Hyderabad if location fails, or handle gracefully
                    // setUserLocation({ lat: 17.3850, lng: 78.4867 }); 
                }
            );
        }
    }, []);

    const processedItems = useMemo(() => {
        const RADIUS_LIMITS: Record<string, number> = {
            'Labour': 10,
            'Tractor': 20,
            'Drone': 50,
            'Borewell': 50,
            'Harvester': 30,
            'default': 20
        };

        let filtered = approvedItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.location.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

            const minItemPrice = Math.min(...item.purposes.map(p => p.price));
            const matchesPrice =
                (!priceRange.min || minItemPrice >= parseFloat(priceRange.min)) &&
                (!priceRange.max || minItemPrice <= parseFloat(priceRange.max));

            const matchesRating = !minRating || (item.avgRating || 0) >= minRating;

            const matchesAvailability = !showAvailableOnly || item.available;

            const isAvailableOnDate = () => {
                if (!filterDate) return true;

                const hasBookingConflict = bookings.some(b =>
                    b.itemId === item.id &&
                    b.date === filterDate &&
                    !['Cancelled', 'Completed', 'Expired'].includes(b.status)
                );
                if (hasBookingConflict) return false;

                const owner = allUsers.find(u => u.id === item.ownerId);
                if (owner?.blockedDates?.includes(filterDate)) {
                    return false;
                }

                return true;
            };

            const matchesDate = isAvailableOnDate();

            // Radius Filtering Logic
            let matchesRadius = true;
            if (userLocation && item.locationCoords) {
                const R = 6371; // Radius of the earth in km
                const dLat = (item.locationCoords.lat - userLocation.lat) * Math.PI / 180;
                const dLng = (item.locationCoords.lng - userLocation.lng) * Math.PI / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(item.locationCoords.lat * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c; // Distance in km

                const maxRadius = RADIUS_LIMITS[item.category] || RADIUS_LIMITS['default'];
                matchesRadius = distance <= maxRadius;
            } else if (!userLocation) {
                // If user location is not available, we might want to show everything or nothing.
                // For now, let's assume we show everything if location is unknown, 
                // OR we could force location. The requirement implies strict filtering.
                // However, without user location, we can't filter.
                // Let's keep it visible but maybe prompt for location?
                // For this implementation, true is safer to avoid empty screens on load.
                matchesRadius = true;
            }

            return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesAvailability && matchesDate && matchesRadius;
        });

        switch (sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => Math.min(...a.purposes.map(p => p.price)) - Math.min(...b.purposes.map(p => p.price)));
                break;
            case 'price-desc':
                filtered.sort((a, b) => Math.min(...b.purposes.map(p => p.price)) - Math.min(...a.purposes.map(p => p.price)));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
                break;
            case 'popularity':
                const bookingCounts = bookings.reduce((acc, booking) => {
                    if (booking.itemId) {
                        acc[booking.itemId] = (acc[booking.itemId] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<number, number>);
                filtered.sort((a, b) => (bookingCounts[b.id] || 0) - (bookingCounts[a.id] || 0));
                break;
        }

        return filtered;
    }, [searchQuery, selectedCategory, approvedItems, sortBy, bookings, priceRange, minRating, showAvailableOnly, filterDate, allUsers, userLocation]);

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('marketplace')}>
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-grow p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    />
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`p-3 border rounded-lg transition-colors relative ${areFiltersActive ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'}`}
                        aria-label="Open filters"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16l-4 2v-6.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        {areFiltersActive && <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>}
                    </button>
                    <button
                        onClick={() => {
                            if (!navigator.geolocation) return;
                            navigator.geolocation.getCurrentPosition(pos => {
                                const { latitude, longitude } = pos.coords;
                                const nearest = processedItems
                                    .filter(i => i.available)
                                    .map(i => {
                                        const la = i.locationCoords?.lat ?? latitude;
                                        const ln = i.locationCoords?.lng ?? longitude;
                                        const dLat = (la - latitude) * Math.PI / 180;
                                        const dLng = (ln - longitude) * Math.PI / 180;
                                        const r = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * Math.PI / 180) * Math.cos(la * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
                                        const dist = 2 * 6371 * Math.asin(Math.sqrt(r));
                                        return { i, dist };
                                    })
                                    .sort((x, y) => x.dist - y.dist)[0]?.i;
                                if (nearest) navigate({ view: 'ITEM_DETAIL', item: nearest });
                            });
                        }}
                        className="p-3 border rounded-full transition-colors bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                        aria-label="Nearest Supplier"
                        title="Nearest Supplier"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a2 2 0 110 4 2 2 0 010-4zm0 4c-2.21 0-4 1.343-4 3v3h8v-3c0-1.657-1.79-3-4-3z" /></svg>
                    </button>
                    <button
                        onClick={() => setIsSuggestionsOpen(true)}
                        aria-label="Smart Suggestions"
                        title="Smart Suggestions"
                        className="p-3 border rounded-full transition-colors bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c3.866 0 7 3.134 7 7 0 2.577-1.429 4.815-3.539 6.002-.26.151-.461.401-.521.693l-.25 1.25A1 1 0 0013.7 19H10.3a1 1 0 01-.97-.73l-.25-1.25a1 1 0 00-.522-.693A6.996 6.996 0 015 10c0-3.866 3.134-7 7-7zM9 21h6" /></svg>
                    </button>
                    <button
                        onClick={() => navigate({ view: 'CROP_CALENDAR' })}
                        aria-label="Crop Calendar"
                        title="Crop Calendar"
                        className="p-3 border rounded-full transition-colors bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </button>
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
                    {itemCategories.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedCategory(type)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors ${selectedCategory === type ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>


                <div className="mb-6">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-3">{t('popularNearYou')}</h2>
                    {popularItems.length > 0 ? (
                        <div ref={popularRef} className="flex space-x-4 overflow-x-auto pb-2 -ml-4 pl-4 hide-scrollbar">
                            {popularItems.map(item => (
                                <div key={item.id} className="w-48 flex-shrink-0">
                                    <ItemCard item={item} onClick={() => navigate({ view: 'ITEM_DETAIL', item })} compact />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-neutral-700 dark:text-neutral-300">No popular items in your area yet.</p>
                    )}
                </div>

                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t('allServices')}</h2>
                    <div className="flex items-center space-x-2">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                            <option value="popularity">{t('sortBy')}: {t('popularity')}</option>
                            <option value="rating">{t('sortBy')}: {t('rating')}</option>
                            <option value="price-asc">{t('priceAsc')}</option>
                            <option value="price-desc">{t('priceDesc')}</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {processedItems.map(item => (
                        <ItemCard key={item.id} item={item} onClick={() => navigate({ view: 'ITEM_DETAIL', item })} />
                    ))}
                </div>

            </div>
            {isFilterModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-end" onClick={() => setIsFilterModalOpen(false)}>
                    <div className="bg-white dark:bg-neutral-800 w-full max-w-lg rounded-t-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Filters</h2>
                            <button onClick={() => setIsFilterModalOpen(false)} className="p-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-6">
                            {/* Date Filter */}
                            <div>
                                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Available on Date</label>
                                <input
                                    type="date"
                                    value={tempFilterDate}
                                    onChange={e => setTempFilterDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full p-2 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                />
                            </div>
                            {/* Price Range */}
                            <div>
                                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Price Range (/hr)</label>
                                <div className="flex items-center space-x-2">
                                    <input type="number" placeholder="Min" value={tempPriceRange.min} onChange={e => setTempPriceRange(p => ({ ...p, min: e.target.value }))} className="w-full p-2 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white" />
                                    <span className="text-neutral-500 dark:text-neutral-400">-</span>
                                    <input type="number" placeholder="Max" value={tempPriceRange.max} onChange={e => setTempPriceRange(p => ({ ...p, max: e.target.value }))} className="w-full p-2 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white" />
                                </div>
                            </div>
                            {/* Rating */}
                            <div>
                                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Minimum Rating</label>
                                <div className="flex justify-between items-center">
                                    <StarRating rating={tempMinRating} onRatingChange={setTempMinRating} isEditable />
                                    {tempMinRating > 0 && <button onClick={() => setTempMinRating(0)} className="text-xs text-neutral-500 dark:text-neutral-400">Clear</button>}
                                </div>
                            </div>
                            {/* Availability */}
                            <div className="flex items-center justify-between">
                                <label htmlFor="available-toggle" className="text-neutral-700 dark:text-neutral-200 font-bold">Show Available Only</label>
                                <button
                                    id="available-toggle"
                                    role="switch"
                                    aria-checked={tempShowAvailableOnly}
                                    onClick={() => setTempShowAvailableOnly(prev => !prev)}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${tempShowAvailableOnly ? 'bg-primary' : 'bg-neutral-200'}`}
                                >
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${tempShowAvailableOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-2 pt-4 border-t dark:border-neutral-700">
                                <Button variant="secondary" onClick={handleResetFilters}>Reset</Button>
                                <Button onClick={handleApplyFilters}>Apply Filters</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isSuggestionsOpen && (
                <AiSuggestionsModal onClose={() => setIsSuggestionsOpen(false)} navigate={navigate} />
            )}
        </div>
    );
};

const AgentMapScreen: React.FC<AgentViewProps> = ({ navigate }) => {
    const { items } = useItem();
    const { bookings } = useBooking();
    const { user, allUsers } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | undefined>();
    const [locationError, setLocationError] = useState<string | null>(null);
    const [showLocationPopup, setShowLocationPopup] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [minRating, setMinRating] = useState(0);
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);
    const [filterDate, setFilterDate] = useState('');

    const [tempPriceRange, setTempPriceRange] = useState(priceRange);
    const [tempMinRating, setTempMinRating] = useState(minRating);
    const [tempShowAvailableOnly, setTempShowAvailableOnly] = useState(showAvailableOnly);
    const [tempFilterDate, setTempFilterDate] = useState(filterDate);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                    setLocationError(null);
                },
                (error) => {
                    let errorMessage = "Could not get your location. Map features will be limited.";
                    switch (error.code) {
                        case 1:
                            errorMessage = "Geolocation permission denied. Please enable location services in your browser settings.";
                            break;
                        case 2:
                            errorMessage = "Location information is unavailable. Please try again later.";
                            break;
                        case 3:
                            errorMessage = "The request to get user location timed out.";
                            break;
                    }
                    setLocationError(errorMessage);
                    setUserLocation({ lat: 17.3850, lng: 78.4867 });
                }
            );
        } else {
            setLocationError("Geolocation is not supported by this browser.");
            setUserLocation({ lat: 17.3850, lng: 78.4867 });
        }
    }, []);

    const retryLocation = () => {
        setShowLocationPopup(true);
    };

    const requestLocationAccess = () => {
        setShowLocationPopup(false);
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                setLocationError(null);
            },
            (error) => {
                let errorMessage = "Could not get your location. Map features will be limited.";
                switch (error.code) {
                    case 1:
                        errorMessage = "Geolocation permission denied. Please enable location services in your browser settings.";
                        break;
                    case 2:
                        errorMessage = "Location information is unavailable. Please try again later.";
                        break;
                    case 3:
                        errorMessage = "The request to get user location timed out.";
                        break;
                }
                setLocationError(errorMessage);
                setUserLocation({ lat: 17.3850, lng: 78.4867 });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const approvedItems = useMemo(() => items.filter(m => m.status === 'approved'), [items]);

    const processedItems = useMemo(() => {
        return approvedItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.location.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
            const minItemPrice = Math.min(...item.purposes.map(p => p.price));
            const matchesPrice = (!priceRange.min || minItemPrice >= parseFloat(priceRange.min)) && (!priceRange.max || minItemPrice <= parseFloat(priceRange.max));
            const matchesRating = !minRating || (item.avgRating || 0) >= minRating;
            const matchesAvailability = !showAvailableOnly || item.available;
            const isAvailableOnDate = () => {
                if (!filterDate) return true;
                if (bookings.some(b => b.itemId === item.id && b.date === filterDate && !['Cancelled', 'Completed', 'Expired'].includes(b.status))) return false;
                const owner = allUsers.find(u => u.id === item.ownerId);
                return !owner?.blockedDates?.includes(filterDate);
            };
            return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesAvailability && isAvailableOnDate();
        });
    }, [searchQuery, selectedCategory, approvedItems, bookings, priceRange, minRating, showAvailableOnly, filterDate, allUsers]);

    return (
        <div className="flex flex-col h-full">
            <Header title="Map View">
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="px-4 pt-2 pb-2">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        placeholder="Filter results on map..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-grow p-3 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    />
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className="p-3 border rounded-lg transition-colors bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300"
                        aria-label="Open filters"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16l-4 2v-6.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                    </button>
                </div>
                {locationError && (
                    <div className="mt-2 p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-sm rounded-lg flex items-center justify-between">
                        <span>{locationError}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={retryLocation} className="px-2 py-1 text-xs rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 dark:bg-yellow-800/40 dark:hover:bg-yellow-700">Retry</button>
                            <button aria-label="Dismiss" onClick={() => setLocationError(null)} className="p-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800/40">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="absolute left-0 right-0 bottom-0" style={{ top: locationError ? '140px' : '100px' }}>
                <FarmerMapScreen items={processedItems} navigate={navigate} userLocation={userLocation} />
            </div>

            {/* Location Permission Popup */}
            {showLocationPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-white mb-2">
                                Enable Location Access
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
                                To show equipment near you, please allow location access. Make sure GPS is enabled on your device.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={requestLocationAccess}
                                    className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                                >
                                    📍 Allow Location Access
                                </button>
                                <button
                                    onClick={() => setShowLocationPopup(false)}
                                    className="w-full py-2 text-neutral-600 dark:text-neutral-400 text-sm hover:text-neutral-800 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFilterModalOpen && (
                // Filter modal JSX would be here, identical to the one in FarmerHomeScreen. It is omitted for brevity but the logic is implied to be present.
                // For this implementation, let's assume filtering on map is a future feature and just show the map.
                // A full implementation would include the filter modal here as well.
                <></>
            )}
        </div>
    );
};




const AgentBookingsScreen: React.FC<AgentViewProps> = ({ navigate }) => {
    const { user, allUsers } = useAuth();
    const { bookings, cancelBooking, raiseDispute, completeBooking, makeFinalPayment } = useBooking();
    const { items } = useItem();
    const { reviews } = useReview();
    const { getUnreadMessageCount } = useChat();
    const { t } = useLanguage();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;
    const userBookings = bookings.filter(b => b.farmerId === user?.id);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | undefined>();
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [statusFilter, setStatusFilter] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (error) => console.error("Error getting location:", error)
            );
        }
    }, []);

    const handleConfirmCancel = () => {
        if (bookingToCancel) {
            cancelBooking(bookingToCancel.id);
        }
        setBookingToCancel(null);
    };

    const hasReview = (bookingId: string) => {
        return reviews.some(review => review.bookingId === bookingId && review.reviewerId === user?.id);
    }
    const getOperatorName = (operatorId?: string) => operatorId ? (allUsers.find(u => u.id === operatorId)?.name || 'Unknown Operator') : 'N/A';

    const getStatusBadgeColor = (status: Booking['status']) => {
        if (status === 'Cancelled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        if (status === 'Searching') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        if (status === 'Completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    };

    const filteredBookings = userBookings.filter(booking => {
        if (statusFilter === 'Upcoming') {
            return ['Searching', 'Pending Confirmation', 'Awaiting Operator', 'Confirmed', 'Arrived', 'In Process'].includes(booking.status);
        } else if (statusFilter === 'Completed') {
            return booking.status === 'Completed' || booking.status === 'Pending Payment';
        } else {
            return booking.status === 'Cancelled' || booking.status === 'Expired';
        }
    });

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('myBookings')}>
                <button
                    onClick={() => navigate({ view: 'PAYMENT_HISTORY' })}
                    className="relative p-2 text-neutral-700 dark:text-neutral-300 hover:text-primary rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    aria-label={t('paymentHistory')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </button>
                <button
                    onClick={() => navigate({ view: 'BOOKING_HISTORY' })}
                    className="relative p-2 text-neutral-700 dark:text-neutral-300 hover:text-primary rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    aria-label={t('bookingHistory')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <button
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-neutral-100 dark:bg-neutral-700 text-primary' : 'text-neutral-600 dark:text-neutral-300'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="p-4 space-y-4 pb-24">
                {/* Search Input */}
                {isSearchOpen && (
                    <div className="mb-3 animate-fade-in">
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-2 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                            autoFocus
                        />
                    </div>
                )}

                {/* Status Filter Tabs */}
                <div className="flex space-x-2 bg-neutral-100 dark:bg-neutral-700 p-1 rounded-lg">
                    {(['Upcoming', 'Completed', 'Cancelled'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${statusFilter === status
                                ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-white shadow-sm'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {filteredBookings.length > 0 ? [...filteredBookings].reverse().map(booking => {
                    const item = items.find(m => m.id === booking.itemId);
                    const supplier = allUsers.find(u => u.id === booking.supplierId);
                    const distance = userLocation && supplier?.locationCoords
                        ? calculateDistance(userLocation.lat, userLocation.lng, supplier.locationCoords.lat, supplier.locationCoords.lng)
                        : null;

                    return (
                        <div key={booking.id} className="bg-white dark:bg-neutral-700 rounded-lg overflow-hidden shadow-sm border border-neutral-200 dark:border-neutral-600">
                            <div className="flex">
                                {/* Equipment image */}
                                <div className="relative w-32 h-32 flex-shrink-0 bg-neutral-100 dark:bg-neutral-600">
                                    <img
                                        src={item?.images?.[0] || 'https://via.placeholder.com/140'}
                                        alt={item?.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Booking details */}
                                <div className="flex-1 p-3">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-base text-neutral-900 dark:text-white">
                                            {item?.name || `${booking.itemCategory}`}
                                        </h3>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStatusBadgeColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-300 mb-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Date: {booking.date}</span>
                                    </div>

                                    {/* Time */}
                                    <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-300 mb-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Time: {booking.startTime} - {booking.endTime}</span>
                                    </div>

                                    {/* Location */}
                                    <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-300 mb-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        </svg>
                                        <span className="truncate">Location: {booking.location}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {(booking.status === 'Confirmed' || booking.status === 'Arrived' || booking.status === 'In Process') && supplier && (
                                            <button
                                                onClick={() => navigate({ view: 'CHAT', chatPartner: supplier, item })}
                                                className="px-3 py-1 bg-primary text-white text-xs rounded-md"
                                            >
                                                Chat
                                            </button>
                                        )}
                                        {booking.status === 'Confirmed' && item?.currentLocation && (
                                            <button
                                                onClick={() => navigate({ view: 'TRACKING', item })}
                                                className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                                            >
                                                Track
                                            </button>
                                        )}
                                        {(['Searching', 'Awaiting Operator', 'Confirmed', 'Pending Confirmation', 'Arrived'].includes(booking.status)) && (
                                            <button
                                                onClick={() => setBookingToCancel(booking)}
                                                className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 text-xs rounded-md"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        {booking.status === 'In Process' && (
                                            <button
                                                onClick={() => { completeBooking(booking.id); navigate({ view: 'PAYMENT', booking, fromCompletion: true }); }}
                                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-md"
                                            >
                                                Complete
                                            </button>
                                        )}
                                        {booking.status === 'Pending Payment' && (
                                            <button
                                                onClick={() => navigate({ view: 'PAYMENT', booking })}
                                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-md animate-pulse"
                                            >
                                                Pay Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-500 dark:text-neutral-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-lg font-medium">No bookings found</p>
                        <p className="text-sm">Check other tabs or book a service</p>
                    </div>
                )}
            </div>

            {bookingToCancel && (
                <ConfirmationDialog
                    title="Cancel Booking"
                    message="Are you sure you want to cancel this booking?"
                    note="This action cannot be undone."
                    confirmText="Confirm"
                    cancelText="Go Back"
                    onConfirm={handleConfirmCancel}
                    onCancel={() => setBookingToCancel(null)}
                />
            )}
        </div>
    );
}

const AgentProfileScreen: React.FC<AgentViewProps> = ({ navigate }) => {
    const { user, logout } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const { t } = useLanguage();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;

    const ProfileLink: React.FC<{ label: string, onClick: () => void, icon?: React.ReactElement }> = ({ label, onClick, icon }) => (
        <button onClick={onClick} className="w-full p-4 bg-white dark:bg-neutral-700 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{label}</span>
            {icon || <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
        </button>
    );

    return (
        <div className="dark:text-neutral-200">
            <Header title={t('myProfile')}>
                <div className="mr-2 inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-xs font-bold shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    AGENT
                </div>
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="p-6 text-center">
                <div className="mb-8">
                    <img
                        src={user?.profilePicture}
                        alt={user?.name}
                        className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center mx-auto text-4xl font-bold object-cover border-4 border-white dark:border-neutral-700 shadow-lg"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                            const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%20Unavailable%3C/text%3E%3C/svg%3E";
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== fallback) target.src = fallback;
                        }}
                    />
                    <h2 className="text-2xl font-bold mt-4 text-neutral-800 dark:text-neutral-100">{user?.name}</h2>
                </div>

                <div className="space-y-3">
                    <div className="bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-600">
                        <h3 className="p-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">AI Services</h3>
                        <ProfileLink label="AI Chat Assistant" onClick={() => navigate({ view: 'AI_ASSISTANT' })} />
                        <ProfileLink label="AI Voice Assistant" onClick={() => navigate({ view: 'VOICE_ASSISTANT' })} />
                        <ProfileLink label="AI Crop Scan" onClick={() => navigate({ view: 'AI_SCAN' })} />
                    </div>

                    <div className="bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-600">
                        <h3 className="p-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">More Services</h3>
                        <ProfileLink label={t('myAccount')} onClick={() => navigate({ view: 'MY_ACCOUNT' })} />
                        <ProfileLink
                            label="Bulk Booking Processor"
                            onClick={() => navigate({ view: 'BULK_BOOKING' })}
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            }
                        />
                        <ProfileLink label={t('communityForum')} onClick={() => navigate({ view: 'COMMUNITY' })} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a3.001 3.001 0 015.688 0M12 12a3 3 0 100-6 3 3 0 000 6z" /></svg>} />
                        <ProfileLink label={t('paymentHistory')} onClick={() => navigate({ view: 'PAYMENT_HISTORY' })} />
                        <ProfileLink label={t('bookingHistory')} onClick={() => navigate({ view: 'BOOKING_HISTORY' })} />
                        <ProfileLink label={t('settings')} onClick={() => navigate({ view: 'SETTINGS' })} />
                        <ProfileLink label={t('raiseAComplaint')} onClick={() => navigate({ view: 'SUPPORT' })} />
                        <ProfileLink label={t('privacyPolicy')} onClick={() => navigate({ view: 'POLICY' })} />
                    </div>

                    <Button onClick={() => {
                        if (window.confirm('Are you sure you want to logout?')) {
                            logout();
                        }
                    }} variant="secondary" className="w-full">{t('logout')}</Button>
                </div>
            </div>
        </div>
    );
};

const AgentBulkBookingScreen: React.FC<AgentViewProps> = ({ navigate }) => {
    const { user } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;

    return (
        <div className="dark:text-neutral-200">
            <Header title="Bulk Booking">
                <button onClick={() => navigate({ view: 'PROFILE' })} className="p-2 text-neutral-700 dark:text-neutral-300 hover:text-primary rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="p-4">
                <BulkBookingProcessor />
            </div>
        </div>
    );
};

const AgentView: React.FC<AgentViewProps> = ({ navigate: parentNavigate }) => {
    const [activeTab, setActiveTab] = useState('home');

    const handleNavigate = (viewObj: AppView) => {
        if (viewObj.view === 'BULK_BOOKING') {
            setActiveTab('bulk_booking');
        } else if (viewObj.view === 'HOME') {
            setActiveTab('home');
        } else if (viewObj.view === 'PROFILE') {
            setActiveTab('profile');
        } else {
            parentNavigate(viewObj);
        }
    };

    const agentNavItems = [
        {
            name: 'home',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        },
        {
            name: 'bookings',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        },
        {
            name: 'book',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
            isCenter: true,
            onClick: () => handleNavigate({ view: 'BOOKING_FORM' })
        },
        {
            name: 'map',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m-6 3l6-3m0 10V4" /></svg>
        },
        {
            name: 'profile',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <AgentHomeScreen navigate={handleNavigate} />;
            case 'bookings':
                return <AgentBookingsScreen navigate={handleNavigate} />;
            case 'map':
                return <AgentMapScreen navigate={handleNavigate} />;
            case 'profile':
                return <AgentProfileScreen navigate={handleNavigate} />;
            case 'bulk_booking':
                return <AgentBulkBookingScreen navigate={handleNavigate} />;
            default:
                return <AgentHomeScreen navigate={handleNavigate} />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-grow overflow-y-auto pb-20">
                {renderContent()}
            </div>
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={agentNavItems} />
        </div>
    );
};

export default AgentView;