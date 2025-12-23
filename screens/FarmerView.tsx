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
import { useStreakRankings } from '../hooks/useStreakRankings';
import DashboardLayout from '../components/DashboardLayout';
import { AppView, Item, ItemCategory, Booking } from '../types';
import Header from '../components/Header';
import BottomNav, { NavItemConfig } from '../components/BottomNav';
import ItemCard from '../components/ItemCard';
import Button from '../components/Button';
import ConfirmationDialog from '../components/ConfirmationDialog';
import NotificationBell from '../components/NotificationBell';
import { useChat } from '../context/ChatContext';
import { useNotification } from '../context/NotificationContext';
import { GoogleGenAI, Type } from "@google/genai";
import { useToast } from '../context/ToastContext';
import StarRating from '../components/StarRating';
import FarmerMapScreen from './FarmerMapScreen';
import { useLanguage } from '../context/LanguageContext';
import AiSuggestionsModal from './AiSuggestionsModal';
import { useWeather } from '../context/WeatherContext';
import AppSidebar from '../components/AppSidebar';

const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
    ? process.env.API_KEY
    : undefined;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;


interface FarmerViewProps {
    navigate: (view: AppView) => void;
    onSwitchMode?: () => void;
    roleBadge?: string;
    children?: React.ReactNode;
    currentView?: string;
}

const RepeatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5m5-5l-5-5-5 5m5 5l5 5 5-5" />
    </svg>
);

const ChatIcon: React.FC<{ onClick: () => void; unreadCount: number; }> = ({ onClick, unreadCount }) => (
    <button onClick={onClick} className="relative p-2 text-white hover:text-green-100 rounded-full hover:bg-green-600 transition-colors" aria-label="Open Chats">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
        )}
    </button>
);

const RADIUS_LIMITS: Record<string, number> = {
    'Workers': 10,
    'Tractors': 20,
    'Drones': 50,
    'Borewell': 50,
    'Harvesters': 30,
    'default': 20
};

export const FarmerHomeScreen: React.FC<FarmerViewProps> = ({ navigate, roleBadge }) => {
    const { items, loadMoreItems, hasMoreItems, isLoadingItems } = useItem();
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
    const [isExtendedRadius, setIsExtendedRadius] = useState(false);
    const [hasLoggedFailure, setHasLoggedFailure] = useState(false);


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

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | undefined>();
    const [locationError, setLocationError] = useState<string | null>(null);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            },
            (error) => {
                // Fail silently or log a simple warning instead of the full object
                console.warn("Location access denied or timed out. Using default.");
            },
            { timeout: 10000 }
        );
    }

    const popularItems = useMemo(() => {
        const filterByRadius = (item: Item) => {
            if (!userLocation || !item.locationCoords) return true; // Show all if location unknown (or strictly hide? Defaulting to show to match previous behavior for fallback)

            const R = 6371;
            const dLat = (item.locationCoords.lat - userLocation.lat) * Math.PI / 180;
            const dLng = (item.locationCoords.lng - userLocation.lng) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(item.locationCoords.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            const maxRadius = (RADIUS_LIMITS[item.category] || RADIUS_LIMITS['default']) + (isExtendedRadius ? 20 : 0);
            return distance <= maxRadius;
        };

        const nearbyApprovedItems = approvedItems.filter(filterByRadius);

        const bookingCounts = bookings.reduce((acc, booking) => {
            if (booking.itemId) {
                acc[booking.itemId] = (acc[booking.itemId] || 0) + 1;
            }
            return acc;
        }, {} as Record<number, number>);

        const bookedItems = nearbyApprovedItems
            .map(item => ({ ...item, bookings: bookingCounts[item.id] || 0 }))
            .filter(item => item.bookings > 0)
            .sort((a, b) => b.bookings - a.bookings);

        const desiredCount = 6;
        if (bookedItems.length >= desiredCount) {
            return bookedItems.slice(0, desiredCount);
        }

        const popularItemIds = new Set(bookedItems.map(item => item.id));
        const fillerItems = nearbyApprovedItems
            .filter(item => !popularItemIds.has(item.id))
            .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

        const combinedList = [...bookedItems, ...fillerItems];
        return combinedList.slice(0, desiredCount);

    }, [bookings, approvedItems, userLocation, isExtendedRadius]);

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



    const processedItems = useMemo(() => {
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

                const maxRadius = (RADIUS_LIMITS[item.category] || RADIUS_LIMITS['default']) + (isExtendedRadius ? 20 : 0);
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

        // Utilization-based priority sorting:
        // - Verified suppliers (Agent-like status): Bypass utilization cap, always shown at TOP
        // - Non-verified suppliers: Max 80% utilization, 8 hours/day, shown after verified
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Check if owner is verified account
        const isOwnerVerified = (ownerId: string | number): boolean => {
            const owner = allUsers.find(u => String(u.id) === String(ownerId));
            return owner?.isVerifiedAccount === true;
        };

        const getUtilization = (itemId: number | string, ownerId: string | number): number => {
            const itemBookings = bookings.filter(b =>
                String(b.itemId) === String(itemId) &&
                new Date(b.date) >= thirtyDaysAgo &&
                (b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'In Process')
            );
            let bookedHours = 0;
            itemBookings.forEach(b => {
                if (b.startTime && b.endTime) {
                    const [startH, startM] = b.startTime.split(':').map(Number);
                    const [endH, endM] = b.endTime.split(':').map(Number);
                    const hours = (endH + endM / 60) - (startH + startM / 60);
                    if (hours > 0) bookedHours += hours;
                } else {
                    bookedHours += 8;
                }
            });
            // Standard 8 hours/day for calculation base
            const hoursPerDay = 8;
            const AVAILABLE_HOURS_PER_MONTH = 30 * hoursPerDay;
            return Math.min(100, Math.round((bookedHours / AVAILABLE_HOURS_PER_MONTH) * 100));
        };

        // Sort with verified account priority:
        // 1. Verified suppliers (Agents) -> TOP ALWAYS
        // 2. Non-verified suppliers with utilization under 80% -> MIDDLE
        // 3. Non-verified with utilization >= 80% -> BOTTOM (Deprioritized)
        filtered.sort((a, b) => {
            const utilA = getUtilization(a.id, a.ownerId);
            const utilB = getUtilization(b.id, b.ownerId);
            const verifiedA = isOwnerVerified(a.ownerId);
            const verifiedB = isOwnerVerified(b.ownerId);

            // Verified accounts bypass cap (effectively 100% threshold or ignored)
            // Non-verified cap = 80%
            const threshold = 80;

            // Priority levels:
            // 0 = Verified/Agent (Always Top)
            // 1 = Non-verified + under 80% (Middle)
            // 2 = Non-verified + over 80% (Bottom)
            const getPriority = (isVerified: boolean, utilization: number): number => {
                if (isVerified) return 0; // Verified = Agent privileges = TOP
                if (utilization < threshold) return 1; // Non-verified < 80%
                return 2; // Non-verified >= 80%
            };

            const priorityA = getPriority(verifiedA, utilA);
            const priorityB = getPriority(verifiedB, utilB);

            if (priorityA !== priorityB) return priorityA - priorityB;

            // Within same priority, sort by lower utilization first (more available)
            return utilA - utilB;
        });

        return filtered;
    }, [searchQuery, selectedCategory, approvedItems, sortBy, bookings, priceRange, minRating, showAvailableOnly, filterDate, allUsers, userLocation, isExtendedRadius]);

    // Logging logic for out-of-radius failures
    useEffect(() => {
        if (isExtendedRadius && processedItems.length === 0 && !hasLoggedFailure && userLocation) {
            const logFailure = async () => {
                try {
                    setHasLoggedFailure(true);
                    await fetch('/api/failed-searches', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user?.id,
                            location: user?.location || 'Unknown',
                            userLocation,
                            selectedCategory,
                            searchRadius: RADIUS_LIMITS[selectedCategory] ? RADIUS_LIMITS[selectedCategory] + 20 : 40
                        })
                    });
                    console.log('[Search] Failed search logged to backend');
                } catch (error) {
                    console.error('Failed to log search failure:', error);
                }
            };
            logFailure();
        }
    }, [isExtendedRadius, processedItems.length, userLocation, selectedCategory, user?.id, user?.location]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100 && hasMoreItems && !isLoadingItems) {
            loadMoreItems();
        }
    };

    return (
        <div
            className="h-full overflow-y-auto bg-green-50 dark:bg-neutral-900 dark:text-neutral-200"
            onScroll={handleScroll}
        >
            {/* Header with centered title */}
            <div className="sticky top-0 z-10 bg-green-700 border-b border-green-800 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            {t('marketplace')}

                        </h1>
                    </div>
                    {/* Assuming NotificationBell can inherit color or we wrap it in a div that forces white text if it uses currentColor, otherwise we might need to update NotificationBell too */}
                    <div className="text-white hover:text-green-100">
                        <NotificationBell />
                    </div>
                </div>

                {/* Suspension / Blocked Banner */}
                {(user?.userStatus === 'suspended' || user?.userStatus === 'blocked') && (
                    <div className={`${user.userStatus === 'blocked' ? 'bg-red-700' : 'bg-red-500'} text-white p-4 mb-3 rounded-lg flex items-center shadow-lg animate-pulse`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-bold text-lg uppercase">Account {user.userStatus}</p>
                            <p className="text-sm font-medium mb-1">
                                Your account is {user.userStatus} until {user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleString() : 'further notice'}.
                            </p>
                            {user.userStatus === 'blocked' && (
                                <p className="text-xs font-bold underline cursor-pointer" onClick={() => {/* Simple alert or nav to complaint */ alert('Please email admin@agrirent.com to raise a complaint.'); }}>
                                    Contact Admin to Raise a Complaint
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Search bar with icons */}

            </div>

            <div className="px-4 pt-4">
                {/* Inner Search Bar */}
                <div className="flex items-center space-x-2 mb-4">
                    <div className="flex-grow relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-neutral-200 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`p-2.5 border rounded-lg transition-colors relative ${areFiltersActive ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'}`}
                        aria-label="Open filters"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16l-4 2v-6.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        {areFiltersActive && <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}
                    </button>
                </div>
                {/* Horizontal category pills */}
                <div className="flex space-x-2 overflow-x-auto pb-3 mb-4 hide-scrollbar">
                    {itemCategories.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedCategory(type)}
                            className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${selectedCategory === type
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-600'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Popular Near You section */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-3">{t('popularNearYou')}</h2>
                    {popularItems.length > 0 ? (
                        <div ref={popularRef} className="flex space-x-3 overflow-x-auto pb-2 hide-scrollbar">
                            {popularItems.map(item => (
                                <div key={item.id} className="flex-shrink-0 w-44">
                                    <div
                                        onClick={() => navigate({ view: 'ITEM_DETAIL', item })}
                                        className="bg-white dark:bg-neutral-700 rounded-lg overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-600 cursor-pointer hover:shadow-md transition-shadow"
                                    >
                                        <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-600">
                                            <img
                                                src={item.images?.[0] || 'https://via.placeholder.com/200'}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-0 right-0 bg-green-600 text-white px-3 py-1 rounded-bl-lg text-xs font-semibold shadow-md z-1">
                                                {item.category}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mb-1 truncate">{item.name}</h3>
                                            <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-1">₹{Math.min(...item.purposes.map(p => p.price))}/hr</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                {item.avgRating ? `${item.avgRating.toFixed(1)} ★` : 'No reviews yet'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">No popular items in your area yet.</p>
                    )}
                </div>

                {/* Sort By dropdown */}
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{t('allServices')}</h2>
                    <div className="flex items-center space-x-2">
                        <label className="text-sm text-neutral-600 dark:text-neutral-400">{t('sortBy')}:</label>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        >
                            <option value="popularity">{t('popularity')}</option>
                            <option value="rating">{t('rating')}</option>
                            <option value="price-asc">{t('priceAsc')}</option>
                            <option value="price-desc">{t('priceDesc')}</option>
                        </select>
                    </div>
                </div>

                {/* All Services - Vertical list with horizontal cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    {processedItems.length > 0 ? (
                        processedItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => navigate({ view: 'ITEM_DETAIL', item })}
                                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col h-full"
                            >
                                <div className="relative w-full h-48 md:h-40 flex-shrink-0 bg-neutral-100 dark:bg-neutral-700 rounded-xl overflow-hidden mb-4">
                                    <img
                                        src={item.images?.[0] || 'https://via.placeholder.com/140'}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <div className="mb-2">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide ${item.category === 'Tractors' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            item.category === 'JCB' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                item.category === 'Harvesters' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            }`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-1.5 leading-tight truncate" title={item.name}>{item.name}</h3>
                                    <p className="text-lg font-bold text-primary mb-2">₹{Math.min(...item.purposes.map(p => p.price))}/hr</p>
                                    <div className="mt-auto flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                                        {item.avgRating ? (
                                            <>
                                                <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="font-medium text-neutral-700 dark:text-neutral-300">{item.avgRating.toFixed(1)}</span>
                                                <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
                                                <span>{item.reviews?.length || 0} reviews</span>
                                            </>
                                        ) : (
                                            <span>No reviews yet</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 px-4 text-center bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-600">
                            <div className="mb-4 flex justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
                                NO {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : 'service'} available nearby
                            </h3>
                            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                                We couldn't find any listings matching your criteria in the standard search radius.
                            </p>
                            {!isExtendedRadius ? (
                                <Button onClick={() => setIsExtendedRadius(true)}>
                                    See out of radius (+20km)
                                </Button>
                            ) : (
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/30">
                                    <p className="text-orange-700 dark:text-orange-300 font-medium">
                                        No services found even in extended radius. We have notified the Admin and Founder about the high demand in your area!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading Indicator / Load More */}
                    <div className="col-span-full py-6 text-center">
                        {isLoadingItems && (
                            <div className="flex justify-center items-center space-x-2 text-primary animate-pulse">
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm font-medium">Loading items...</span>
                            </div>
                        )}
                        {!isLoadingItems && hasMoreItems && (
                            <button
                                onClick={() => loadMoreItems()}
                                className="text-sm text-primary font-medium hover:bg-green-50 dark:hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors"
                            >
                                Load more results
                            </button>
                        )}
                        {!isLoadingItems && !hasMoreItems && processedItems.length > 0 && (
                            <p className="text-xs text-neutral-400">All items loaded</p>
                        )}
                    </div>
                </div>

            </div>
            {isFilterModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex justify-center items-end" onClick={() => setIsFilterModalOpen(false)}>
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

const FarmerMapView: React.FC<FarmerViewProps> = ({ navigate }) => {
    const { items } = useItem();
    const { bookings } = useBooking();
    const { user, allUsers } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const { t } = useLanguage();
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

    const itemCategories: ('All' | ItemCategory)[] = ['All', ...Object.values(ItemCategory)];

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
        <div className="flex flex-col h-full relative">
            <Header title="Map View">
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="px-4 pt-2 pb-2 flex-shrink-0 z-10 bg-white dark:bg-neutral-900">
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
            {/* Category Filter Chips */}
            <div className="px-4 py-2 overflow-x-auto hide-scrollbar flex-shrink-0 bg-white dark:bg-neutral-900">
                <div className="flex space-x-2">
                    {itemCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            {/* Map container with explicit height - calc(100vh - header - search bar - category chips - bottom nav) */}
            <div className="relative w-full" style={{ height: 'calc(100vh - 230px)', minHeight: '400px' }}>
                <FarmerMapScreen items={processedItems} navigate={navigate} userLocation={userLocation} />
            </div>

            {/* Location warning popup on map */}
            {locationError && (
                <div className="absolute top-20 left-4 right-4 z-20">
                    <div className="p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 text-sm rounded-lg flex items-center justify-between shadow-lg">
                        <span>{locationError}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={retryLocation} className="px-2 py-1 text-xs rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 dark:bg-yellow-800/40 dark:hover:bg-yellow-700">Retry</button>
                            <button aria-label="Dismiss" onClick={() => setLocationError(null)} className="p-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800/40">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Location Permission Popup */}
            {showLocationPopup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
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




const FarmerBookingsScreen: React.FC<FarmerViewProps> = ({ navigate }) => {
    const { user, allUsers } = useAuth();
    const { bookings, cancelBooking, raiseDispute, completeBooking, makeFinalPayment, loadMoreBookings, hasMoreBookings, isLoadingBookings } = useBooking();
    const { items } = useItem();
    const { reviews } = useReview();
    const { getUnreadMessageCount } = useChat();
    const { t } = useLanguage();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;
    const userBookings = bookings.filter(b => b.farmerId === user?.id);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | undefined>();
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
        <div className="min-h-screen bg-green-50 dark:bg-neutral-900 dark:text-neutral-200">
            {/* Header with search and filter icons */}
            {/* Header with search and filter icons */}
            {/* Header with search and filter icons */}
            <Header title={t('myBookings')}>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => navigate({ view: 'PAYMENT_HISTORY' })}
                        className="relative p-2 text-white hover:text-green-100 rounded-full hover:bg-green-600"
                        aria-label={t('paymentHistory')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => navigate({ view: 'BOOKING_HISTORY' })}
                        className="relative p-2 text-white hover:text-green-100 rounded-full hover:bg-green-600"
                        aria-label={t('bookingHistory')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-green-800 text-white' : 'text-white hover:bg-green-600'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button className="p-2 text-white hover:bg-green-600 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L16 11.414V16l-4 2v-6.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                    </button>
                </div>
            </Header>
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
                {(['Upcoming', 'Completed', 'Cancelled'] as const).map((status) => {
                    const getTabColors = () => {
                        if (statusFilter === status) {
                            if (status === 'Upcoming') return 'bg-green-600 text-white shadow-md'; // Changed from blue to green
                            if (status === 'Completed') return 'bg-green-600 text-white shadow-md';
                            if (status === 'Cancelled') return 'bg-red-500 text-white shadow-md';
                        }
                        return 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm';
                    };

                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${getTabColors()}`}
                        >
                            {status}
                        </button>
                    );
                })}
            </div>


            {/* Booking cards */}
            <div className="p-4 space-y-4 pb-24">
                {
                    filteredBookings.length > 0 ? [...filteredBookings].reverse().map(booking => {
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

                                        {/* Distance (if available) */}
                                        {distance && (
                                            <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                </svg>
                                                <span>{distance} km away</span>
                                            </div>
                                        )}

                                        {/* Operator requested note */}
                                        {booking.operatorRequired && (
                                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Operator Requested</p>
                                        )}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="px-3 pb-3 flex justify-end space-x-2">
                                    {booking.status === 'Cancelled' && (
                                        <button
                                            onClick={() => navigate({ view: 'ITEM_DETAIL', item: item! })}
                                            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600"
                                        >
                                            View Details
                                        </button>
                                    )}
                                    {['Searching', 'Pending Confirmation', 'Awaiting Operator', 'Confirmed', 'Arrived'].includes(booking.status) && (
                                        <button
                                            onClick={() => setBookingToCancel(booking)}
                                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                        >
                                            Cancel Booking
                                        </button>
                                    )}
                                    {booking.status === 'Completed' && !hasReview(booking.id) && (
                                        <button
                                            onClick={() => navigate({ view: 'RATE_ITEM', booking })}
                                            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600"
                                        >
                                            View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center py-16">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-neutral-500 dark:text-neutral-400 mb-4">No {statusFilter.toLowerCase()} bookings</p>
                            {statusFilter === 'Upcoming' && (
                                <Button className="px-6 py-2 text-sm" onClick={() => navigate({ view: 'HOME' })}>Browse Equipment</Button>
                            )}
                        </div>
                    )
                }
            </div>

            {hasMoreBookings && (
                <div className="flex justify-center pb-24 top-[-20px] relative">
                    <Button
                        variant="secondary"
                        onClick={() => loadMoreBookings && loadMoreBookings()}
                        disabled={isLoadingBookings}
                        className="!w-auto px-6 shadow-sm border border-neutral-200 dark:border-neutral-600"
                    >
                        {isLoadingBookings ? 'Loading...' : 'Load More History'}
                    </Button>
                </div>
            )}

            {
                bookingToCancel && (
                    <ConfirmationDialog
                        title="Cancel Booking"
                        message="Are you sure you want to cancel this booking?"
                        note="This action cannot be undone."
                        confirmText="Confirm"
                        cancelText="Go Back"
                        onConfirm={handleConfirmCancel}
                        onCancel={() => setBookingToCancel(null)}
                    />
                )
            }
        </div>

    );
}
// [Removed lines 1154-1156]
const ProfileScreen: React.FC<FarmerViewProps> = ({ navigate, onSwitchMode, roleBadge }) => {
    const { user, allUsers, logout } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const { getRankBorderClass } = useStreakRankings(allUsers);

    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;

    const ProfileLink: React.FC<{ label: string, onClick: () => void, icon: React.ReactElement }> = ({ label, onClick, icon }) => (
        <button onClick={onClick} className="w-full p-4 bg-white dark:bg-neutral-800 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
            <div className="flex items-center gap-3">
                <span className="text-green-600 dark:text-green-400">{icon}</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">{label}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
    );

    // Icons for menu items
    const icons = {
        aiChat: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
        aiVoice: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
        aiScan: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        community: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        myAccount: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
        payment: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
        booking: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        settings: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        support: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        privacy: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    };

    return (
        <div className="dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-900 min-h-full">
            <Header title={
                <div className="flex items-center">
                    {t('myProfile')}
                    {roleBadge && (
                        <div className="md:hidden ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm border border-blue-400/30">
                            {roleBadge}
                        </div>
                    )}
                </div>
            }>
                <ChatIcon onClick={() => navigate({ view: 'CONVERSATIONS' })} unreadCount={unreadChatCount} />
                <NotificationBell />
            </Header>
            <div className="p-6">

                {/* Profile Picture with Edit Badge */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className={`w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 overflow-hidden mx-auto ${user ? getRankBorderClass(user.id) : 'border-4 border-green-100 dark:border-green-800'}`}>
                            <img
                                src={user?.profilePicture}
                                alt={user?.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2322c55e'/%3E%3Ctext x='50' y='55' font-size='40' text-anchor='middle' fill='white' font-family='Arial'%3E" + (user?.name?.[0] || 'U') + "%3C/text%3E%3C/svg%3E";
                                    const target = e.currentTarget as HTMLImageElement;
                                    if (target.src !== fallback) target.src = fallback;
                                }}
                            />
                        </div>

                    </div>
                    <h2 className="text-xl font-bold mt-4 text-neutral-800 dark:text-neutral-100">{user?.name || 'farmer'}</h2>
                </div>

                <div className="space-y-4">
                    {/* AI Services Section */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
                        <h3 className="px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800/50">AI Services</h3>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            <ProfileLink label="AI Chat Assistant" onClick={() => navigate({ view: 'AI_ASSISTANT' })} icon={icons.aiChat} />
                            <ProfileLink label="AI Voice Assistant" onClick={() => navigate({ view: 'VOICE_ASSISTANT' })} icon={icons.aiVoice} />
                            <ProfileLink label="AI Crop Scan" onClick={() => navigate({ view: 'AI_SCAN' })} icon={icons.aiScan} />
                        </div>
                    </div>

                    {/* Community Section */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
                        <h3 className="px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800/50">{t('community')}</h3>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            <ProfileLink label={t('communityForum')} onClick={() => navigate({ view: 'COMMUNITY' })} icon={icons.community} />
                        </div>
                    </div>

                    {/* Profile Section */}
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-hidden">
                        <h3 className="px-4 py-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800/50">{t('profile')}</h3>
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            <ProfileLink label={t('myAccount')} onClick={() => navigate({ view: 'MY_ACCOUNT' })} icon={icons.myAccount} />
                            <ProfileLink label={t('paymentHistory')} onClick={() => navigate({ view: 'PAYMENT_HISTORY' })} icon={icons.payment} />
                            <ProfileLink label={t('bookingHistory')} onClick={() => navigate({ view: 'BOOKING_HISTORY' })} icon={icons.booking} />
                            <ProfileLink label={t('settings')} onClick={() => navigate({ view: 'SETTINGS' })} icon={icons.settings} />
                            <ProfileLink label={t('raiseAComplaint')} onClick={() => navigate({ view: 'SUPPORT' })} icon={icons.support} />
                            <ProfileLink label={t('privacyPolicy')} onClick={() => navigate({ view: 'POLICY' })} icon={icons.privacy} />
                        </div>
                    </div>


                    {/* Switch Mode Button */}
                    {onSwitchMode && (
                        <button
                            onClick={onSwitchMode}
                            className="w-full p-4 bg-white dark:bg-neutral-800 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors rounded-xl shadow-sm border border-orange-200 dark:border-orange-900"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-orange-600 dark:text-orange-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </span>
                                <span className="font-medium text-neutral-700 dark:text-neutral-200">
                                    Switch to {roleBadge?.includes('Supplier') ? 'Farmer' : 'Supplier'} View
                                </span>
                                {roleBadge && (
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-semibold px-2 py-0.5 rounded-full border border-blue-400/30 text-xs ml-2">
                                        {roleBadge}
                                    </span>
                                )}
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    )}

                    <Button onClick={() => {
                        if (window.confirm('Are you sure you want to logout?')) {
                            logout();
                        }
                    }} variant="secondary" className="w-full">{t('logout')}</Button>
                </div>
            </div>
        </div >
    );
};

const FarmerView: React.FC<FarmerViewProps> = ({ navigate, onSwitchMode, roleBadge, children, currentView }) => {
    const [activeTab, setActiveTab] = useState<string>('home');
    const { bookings } = useBooking();

    // Sync activeTab with currentView or children status
    useEffect(() => {
        // Map currentView to sidebar activeTab keys
        switch (currentView) {
            case 'HOME':
                // Only reset to 'home' if the current activeTab is NOT a valid dashboard tab
                // This prevents overriding the user's tab selection (e.g. 'profile', 'map') when they are on the Dashboard
                if (!['home', 'map', 'bookings', 'profile', 'newRequest'].includes(activeTab)) {
                    setActiveTab('home');
                }
                break;
            case 'BOOKING_FORM':
                setActiveTab('newRequest'); // Assuming 'newRequest' is the key in Sidebar
                break;
            case 'COMMUNITY':
                setActiveTab('community');
                break;
            case 'PAYMENT_HISTORY':
                setActiveTab('paymentHistory');
                break;
            case 'SETTINGS':
                setActiveTab('settings');
                break;
            case 'SUPPORT':
                setActiveTab('support');
                break;
            case 'BOOKING_HISTORY':
                setActiveTab('bookings');
                break;
            case 'MY_ACCOUNT':
            case 'PERSONAL_DETAILS':
            case 'CHANGE_PASSWORD':
            case 'EDIT_DETAILS':
                setActiveTab('profile');
                break;
            // Add other cases as needed
        }
    }, [currentView]);

    const latestArrivedWithOtp = useMemo(() => {
        const arrived = bookings.filter(b => b.status === 'Arrived' && b.otpCode);
        if (arrived.length === 0) return undefined;
        return arrived.sort((a, b) => {
            const aTime = new Date(a.workStartTime || a.date).getTime();
            const bTime = new Date(b.workStartTime || b.date).getTime();
            return bTime - aTime;
        })[0];
    }, [bookings]);

    // Wrapper to handle tab switching behavior
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        // If we are currently in a child view (e.g. BookingForm) or any view other than HOME
        // and we click a tab that belongs to the Dashboard (Home, Map, Bookings, Profile),
        // we must navigate back to HOME to clear the 'children' prop and show the Dashboard content.
        if (currentView !== 'HOME') {
            navigate({ view: 'HOME' });
        }
    };

    const navItems: NavItemConfig[] = [
        { name: 'home', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { name: 'map', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
        { name: 'newRequest', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>, isCenter: true, onClick: () => navigate({ view: 'BOOKING_FORM' }) },
        { name: 'bookings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
        { name: 'profile', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ];

    const renderContent = () => {
        // If children are present (e.g. we navigated to a specific route that is rendered inside FarmerView),
        // show that INSTEAD of the dashboard tabs.
        if (children) return children;

        switch (activeTab) {
            case 'home': return <FarmerHomeScreen navigate={navigate} activeTab="home" setActiveTab={handleTabChange} onSwitchMode={onSwitchMode} roleBadge={roleBadge} latestArrivedWithOtp={latestArrivedWithOtp} />;
            case 'map': return <FarmerMapView navigate={navigate} onSwitchMode={onSwitchMode} roleBadge={roleBadge} />;
            case 'bookings': return <FarmerBookingsScreen navigate={navigate} onSwitchMode={onSwitchMode} roleBadge={roleBadge} />;
            case 'profile': return <ProfileScreen navigate={navigate} onSwitchMode={onSwitchMode} roleBadge={roleBadge} />;
            default: return <FarmerHomeScreen navigate={navigate} activeTab="home" setActiveTab={handleTabChange} onSwitchMode={onSwitchMode} roleBadge={roleBadge} latestArrivedWithOtp={latestArrivedWithOtp} />;
        }
    };

    const { logout } = useAuth();

    return (
        <div className="flex h-screen overflow-hidden bg-green-50 dark:bg-neutral-900">
            {/* Desktop Sidebar */}
            <AppSidebar
                role="Farmer"
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                navigate={navigate}
                onLogout={logout}
                roleBadge={roleBadge && (
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm border border-blue-400/30 whitespace-nowrap leading-none tracking-wide">
                        {roleBadge}
                    </div>
                )}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Desktop Content - Scrollable */}
                <div className="hidden md:block flex-1 overflow-y-auto min-h-0 pb-10">
                    {children ? children : renderContent()}
                </div>

                {/* Mobile Content - With Bottom Nav (Hidden when AI/Voice Assistant is active) */}
                <div className="md:hidden flex-1 h-full overflow-y-auto">
                    <DashboardLayout
                        activeTab={activeTab}
                        setActiveTab={handleTabChange}
                        navItems={navItems}
                        showBottomNav={currentView !== 'AI_ASSISTANT' && currentView !== 'VOICE_ASSISTANT'}
                    >
                        {/* We use renderContent() here which internally handles 'children' precedence */}
                        {renderContent()}
                    </DashboardLayout>
                </div>
            </div>
        </div>
    );
};

export default FarmerView;