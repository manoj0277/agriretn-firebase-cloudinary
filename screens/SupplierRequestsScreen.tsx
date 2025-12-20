
import React, { useState, useMemo } from 'react';
import { MedalName } from '../components/MedalName';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { AppView, Booking, Item, ItemCategory } from '../types';
import Header from '../components/Header';
import NotificationBell from '../components/NotificationBell';
import Button from '../components/Button';
import Input from '../components/Input';
import { useReview } from '../context/ReviewContext';
import StarRating from '../components/StarRating';
import { useNotification } from '../context/NotificationContext';
import { calculateDistance, openMap } from '../utils/location';

const AcceptJobModal: React.FC<{
    booking: Booking;
    availableItems: Item[];
    onClose: () => void;
    onConfirm: (itemId: number, options?: { operateSelf?: boolean; quantityToProvide?: number }) => void;
}> = ({ booking, availableItems, onClose, onConfirm }) => {
    const [selectedItemId, setSelectedItemId] = useState<number | null>(() => {
        if (booking.itemId && availableItems.some(i => i.id === booking.itemId)) {
            return booking.itemId;
        }
        return availableItems.length > 0 ? availableItems[0].id : null;
    });
    const [quantityToProvide, setQuantityToProvide] = useState(booking.quantity?.toString() || '1');
    const selectedItem = useMemo(() => availableItems.find(i => i.id === selectedItemId), [selectedItemId, availableItems]);

    const machineCategories = [ItemCategory.Tractors, ItemCategory.Harvesters, ItemCategory.JCB, ItemCategory.Borewell];
    const isMachineWithOperator = machineCategories.includes(booking.itemCategory) && booking.operatorRequired;
    const isPendingConfirmation = booking.status === 'Pending Confirmation';

    const handleConfirm = (operateSelf?: boolean) => {
        if (selectedItemId) {
            const options: { operateSelf?: boolean; quantityToProvide?: number } = {};
            if (isMachineWithOperator) options.operateSelf = operateSelf;
            if (booking.quantity) options.quantityToProvide = parseInt(quantityToProvide);
            onConfirm(selectedItemId, options);
        }
    };

    const maxQuantity = useMemo(() => {
        if (!booking.quantity || !selectedItem) return 0;
        return Math.min(booking.quantity, selectedItem.quantityAvailable || 0);
    }, [booking, selectedItem]);

    const isQuantityInvalid = useMemo(() => {
        if (!booking.quantity) return false;
        const numQuantity = parseInt(quantityToProvide);
        return isNaN(numQuantity) || numQuantity <= 0 || numQuantity > maxQuantity;
    }, [quantityToProvide, maxQuantity, booking]);

    const getPriceForPurpose = (item: Item, purpose?: string) => {
        return item.purposes.find(p => p.name === purpose)?.price || 0;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[10001] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-2 text-neutral-800 dark:text-neutral-100">Accept Request</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">Select an item to fulfill this booking request.</p>

                <div className="bg-white dark:bg-neutral-700 p-3 rounded-lg mb-4 text-sm">
                    <div className="space-y-1 text-neutral-700 dark:text-neutral-300">
                        <p><strong className="font-semibold text-neutral-800 dark:text-neutral-100">Category:</strong> {booking.itemCategory}</p>
                        {booking.quantity && <p><strong className="font-semibold text-neutral-800 dark:text-neutral-100">Quantity Needed:</strong> {booking.quantity}</p>}
                        <p><strong className="font-semibold text-neutral-800 dark:text-neutral-100">Date:</strong> {booking.date} from {booking.startTime} - {booking.estimatedDuration ? `${booking.estimatedDuration} hours` : booking.endTime}</p>
                        <p><strong className="font-semibold text-neutral-800 dark:text-neutral-100">Location:</strong> {booking.location}</p>
                        {booking.workPurpose && <p><strong className="font-semibold text-neutral-800 dark:text-neutral-100">Work Purpose:</strong> {booking.workPurpose}</p>}
                        {booking.preferredModel && <p><strong className="font-semibold text-neutral-800 dark:text-neutral-100">Preferred Model:</strong> {booking.preferredModel}</p>}
                    </div>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {availableItems.length > 0 ? (
                        availableItems.map(item => (
                            <label key={item.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedItemId === item.id ? 'border-primary bg-primary/5' : 'border-neutral-200 dark:border-neutral-600'} ${isPendingConfirmation ? 'cursor-default' : ''}`}>
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        name="itemSelection"
                                        checked={selectedItemId === item.id}
                                        onChange={() => setSelectedItemId(item.id)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                                        disabled={isPendingConfirmation}
                                    />
                                    <div className="ml-3">
                                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{item.name}</p>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-300">₹{getPriceForPurpose(item, booking.workPurpose)}/hr</p>
                                    </div>
                                </div>
                                {item.quantityAvailable != null && <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded-full">Qty: {item.quantityAvailable}</span>}
                            </label>
                        ))
                    ) : (
                        <div className="text-center py-4 px-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg">
                            <p className="font-semibold">No Available Items</p>
                            <p className="text-sm mt-1">
                                {availableItems.length === 0
                                    ? "You don't have any items that match this category and work purpose."
                                    : "Your items in this category are currently marked as unavailable or don't match the specific requirements."}
                            </p>
                        </div>
                    )}
                </div>

                {booking.allowMultipleSuppliers && booking.quantity && selectedItem && (
                    <div className="mt-4 border-t dark:border-neutral-600 pt-4">
                        <Input
                            label={`Quantity to Provide (Max: ${maxQuantity})`}
                            type="number"
                            value={quantityToProvide}
                            onChange={e => setQuantityToProvide(e.target.value)}
                            max={maxQuantity}
                            min="1"
                            required
                        />
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    {isMachineWithOperator ? (
                        <>
                            <Button onClick={() => handleConfirm(false)} disabled={!selectedItemId || availableItems.length === 0}>Find Separate Operator</Button>
                            <Button onClick={() => handleConfirm(true)} disabled={!selectedItemId || availableItems.length === 0}>I will Operate</Button>
                        </>
                    ) : (
                        <Button onClick={() => handleConfirm()} disabled={!selectedItemId || availableItems.length === 0 || isQuantityInvalid}>Confirm & Accept</Button>
                    )}
                </div>
            </div>
        </div>
    );
};


export const SupplierRequestsScreen: React.FC = () => {
    const { user, allUsers } = useAuth();
    const { bookings, acceptBookingRequest, rejectBooking } = useBooking();
    const { items } = useItem();
    const { addNotification } = useNotification();
    const [bookingToAccept, setBookingToAccept] = useState<Booking | null>(null);
    const [conflictWarning, setConflictWarning] = useState<{ show: boolean; conflictingBookings: Booking[]; itemId: number; options?: any } | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; } | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    React.useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (error) => console.error("Error getting location:", error)
            );
        }
    }, []);

    const supplierItems = useMemo(() => items.filter(i => i.ownerId === user?.id), [items, user]);

    const availableRequests = useMemo(() => {
        if (!user) return [];
        const supplierItems = items.filter(i => i.ownerId === user.id && i.status === 'approved');

        return bookings.filter(b => {
            // Direct requests for this supplier
            if (b.status === 'Pending Confirmation' && b.supplierId === user.id) return true;

            // Broadcast requests for everyone else.
            if (b.status === 'Searching' && !b.supplierId) {
                // If specific item was requested (even if converted to broadcast), show to owner
                if (b.itemId) {
                    const requestedItem = items.find(i => i.id === b.itemId);
                    if (requestedItem?.ownerId === user.id) return true;
                }

                const hasMatchingItem = supplierItems.some(item =>
                    item.category === b.itemCategory &&
                    item.purposes.some(p => p.name === b.workPurpose)
                );
                return hasMatchingItem;
            }

            // Filter out expired bookings
            const bookingDate = new Date(b.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (bookingDate < today) return false;

            if (bookingDate.getTime() === today.getTime()) {
                const [hours, minutes] = b.startTime.split(':').map(Number);
                const durationInMinutes = (b.estimatedDuration || 1) * 60;
                const bookingEndTime = hours * 60 + minutes + durationInMinutes;

                const currentHours = new Date().getHours();
                const currentMinutes = new Date().getMinutes();
                const currentTime = currentHours * 60 + currentMinutes;

                if (currentTime > bookingEndTime) return false;
            }

            return true; // Show valid requests that passed all checks
        });
    }, [bookings, user, items]);

    const filteredRequests = useMemo(() => {
        if (selectedCategory === 'All') return availableRequests;
        return availableRequests.filter(b => b.itemCategory === selectedCategory);
    }, [availableRequests, selectedCategory]);

    const getFarmerName = (farmerId: string) => allUsers.find(u => u.id === farmerId)?.name || 'Unknown Farmer';
    const getFarmerRole = (farmerId: string) => allUsers.find(u => u.id === farmerId)?.role || 'Farmer';
    const getMachineNameForOpRequest = (itemId?: number) => items.find(i => i.id === itemId)?.name || 'a machine';

    const handleAcceptClick = (booking: Booking) => setBookingToAccept(booking);

    const handleConfirmAccept = async (itemId: number, options?: { operateSelf?: boolean, quantityToProvide?: number }) => {
        if (bookingToAccept && user) {
            // Check for time conflicts with existing bookings
            const conflicts = bookings.filter(b => {
                // Only check confirmed/active bookings for this supplier
                if (b.supplierId !== user.id || ['Cancelled', 'Expired', 'Completed'].includes(b.status)) return false;

                // Check if dates match
                if (b.date !== bookingToAccept.date) return false;

                // Parse times
                const [newStartH, newStartM] = bookingToAccept.startTime.split(':').map(Number);
                const newStart = newStartH * 60 + newStartM;
                const newEnd = newStart + (bookingToAccept.estimatedDuration || 1) * 60;

                const [existingStartH, existingStartM] = b.startTime.split(':').map(Number);
                const existingStart = existingStartH * 60 + existingStartM;
                const existingEnd = existingStart + (b.estimatedDuration || 1) * 60;

                // Check for overlap
                return (newStart < existingEnd && newEnd > existingStart);
            });

            if (conflicts.length > 0) {
                // Show warning modal
                setConflictWarning({ show: true, conflictingBookings: conflicts, itemId, options });
            } else {
                const success = await acceptBookingRequest(bookingToAccept.id, user.id, itemId, options);
                if (success) {
                    setBookingToAccept(null);
                }
            }
        }
    };

    const handleConfirmWithConflict = async () => {
        if (bookingToAccept && user && conflictWarning) {
            const success = await acceptBookingRequest(bookingToAccept.id, user.id, conflictWarning.itemId, conflictWarning.options);

            if (success) {
                // Notify admin
                const conflictDetails = conflictWarning.conflictingBookings.map(b => {
                    const item = items.find(i => i.id === b.itemId);
                    return `${item?.name || 'Item'} at ${b.startTime} on ${b.date}`;
                }).join(', ');

                addNotification({
                    userId: '0',
                    message: `Supplier ${user.name} (ID: ${user.id}) accepted overlapping bookings. Existing: ${conflictDetails}. New: ${bookingToAccept.startTime} on ${bookingToAccept.date}. Please contact them.`,
                    type: 'admin'
                });

                setBookingToAccept(null);
                setConflictWarning(null);
            }
        }
    };

    const itemsForBooking = useMemo(() => {
        if (!bookingToAccept) return [];

        if (bookingToAccept.status === 'Pending Confirmation' || bookingToAccept.itemId) {
            const specificItem = supplierItems.find(item => item.id === bookingToAccept.itemId);
            return specificItem && specificItem.available ? [specificItem] : [];
        }

        const categoryForRequest = bookingToAccept.status === 'Awaiting Operator' ? ItemCategory.Drivers : bookingToAccept.itemCategory;

        return supplierItems.filter(item =>
            item.category === categoryForRequest &&
            item.available &&
            (!bookingToAccept.workPurpose || item.purposes.some(p => p.name === bookingToAccept.workPurpose))
        );
    }, [bookingToAccept, supplierItems]);

    const categories = ['All', ...Object.values(ItemCategory)];

    return (
        <div className="bg-green-50 dark:bg-neutral-900 min-h-screen pb-20">
            {/* Header removed as it's provided by SupplierView */}

            {/* Category Filters - Styled as sub-header */}
            <div className="bg-white dark:bg-neutral-800 sticky top-0 z-10 border-b border-gray-200 dark:border-neutral-700 px-4 py-3">
                <style>{`
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
                <div
                    className="overflow-x-auto flex space-x-2 hide-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-primary text-white'
                                : 'bg-white border border-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {filteredRequests.length > 0 ? (
                    <>
                        {/* Mobile View - Cards */}
                        <div className="md:hidden space-y-4">
                            {[...filteredRequests].reverse().map(booking => {
                                const isOperatorRequest = booking.status === 'Awaiting Operator';
                                const isPendingConfirmation = booking.status === 'Pending Confirmation';

                                const itemForBooking = items.find(i => i.id === booking.itemId);

                                const title = isPendingConfirmation
                                    ? `Request for ${itemForBooking?.name || 'Unknown Item'}`
                                    : isOperatorRequest
                                        ? `Driver for ${getMachineNameForOpRequest(booking.itemId)}`
                                        : `Request for ${booking.itemCategory}`;

                                const tagText = isPendingConfirmation ? 'Direct Request' : isOperatorRequest ? 'Operator Request' : 'Broadcast';
                                const tagColor = isPendingConfirmation ? 'bg-green-100 text-green-800' : isOperatorRequest ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';

                                const farmer = allUsers.find(u => u.id === booking.farmerId);
                                const distance = userLocation && booking.locationCoords
                                    ? calculateDistance(userLocation.lat, userLocation.lng, booking.locationCoords.lat, booking.locationCoords.lng)
                                    : null;

                                // Dynamic Icon Logic
                                const getIcon = () => {
                                    if (booking.itemCategory === ItemCategory.Workers || booking.workPurpose?.toLowerCase().includes('labour')) {
                                        return (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        );
                                    }
                                    if (booking.itemCategory === ItemCategory.Harvesters) {
                                        return (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        ); // Placeholder to ensure I view first for Harvester, using Lightning for power/machine
                                    }
                                    // Default Tractor/Machine
                                    return (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                        </svg>
                                    );
                                };

                                return (
                                    <div key={booking.id} className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100 leading-tight">{title}</h3>
                                                    <div className="flex items-center mt-1 text-neutral-500 dark:text-neutral-400 text-sm">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                        </svg>
                                                        <span className="flex items-center gap-1">
                                                            From: <MedalName userId={booking.farmerId} displayName={getFarmerName(booking.farmerId)} className="font-semibold" />
                                                            <span className="text-xs">({getFarmerRole(booking.farmerId)})</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded ${tagColor}`}>
                                                    {tagText}
                                                </span>
                                            </div>

                                            <div className="space-y-3 mt-4">
                                                <div className="flex items-start">
                                                    <div className="w-6 flex-shrink-0 flex justify-center mt-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-2">
                                                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Date: {booking.date} from {booking.startTime}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start flex-grow">
                                                        <div className="w-6 flex-shrink-0 flex justify-center mt-0.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        </div>
                                                        <div className="ml-2">
                                                            <button
                                                                onClick={() => openMap(booking.location)}
                                                                className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:text-blue-600 hover:underline text-left"
                                                            >
                                                                Location: {booking.location}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {distance && (
                                                        <span className="text-xs text-neutral-500 whitespace-nowrap ml-2">{distance} km away</span>
                                                    )}
                                                </div>

                                                <div className="flex items-start">
                                                    <div className="w-6 flex-shrink-0 flex justify-center mt-0.5">
                                                        {getIcon()}
                                                    </div>
                                                    <div className="ml-2">
                                                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Work Purpose: {booking.workPurpose}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5">
                                                {isPendingConfirmation ? (
                                                    <div className="flex space-x-3">
                                                        <button
                                                            onClick={() => rejectBooking(booking.id)}
                                                            className="flex-1 bg-red-50 text-red-700 font-bold py-3 px-4 rounded-lg hover:bg-red-100 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleAcceptClick(booking)}
                                                            className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-colors shadow-md"
                                                        >
                                                            Accept
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAcceptClick(booking)}
                                                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-colors shadow-md"
                                                    >
                                                        View & Accept
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View - Table */}
                        <div className="hidden md:block overflow-x-auto bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                            <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
                                <thead className="bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-semibold uppercase tracking-wider text-xs border-b border-neutral-200 dark:border-neutral-600">
                                    <tr>
                                        <th className="px-6 py-4">Request Type</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4">Date & Time</th>
                                        <th className="px-6 py-4">Location</th>
                                        <th className="px-6 py-4">Purpose</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                    {[...filteredRequests].reverse().map(booking => {
                                        const isOperatorRequest = booking.status === 'Awaiting Operator';
                                        const isPendingConfirmation = booking.status === 'Pending Confirmation';
                                        const itemForBooking = items.find(i => i.id === booking.itemId);
                                        const title = isPendingConfirmation
                                            ? `Request for ${itemForBooking?.name || 'Unknown Item'}`
                                            : isOperatorRequest
                                                ? `Driver for ${getMachineNameForOpRequest(booking.itemId)}`
                                                : `Request for ${booking.itemCategory}`;
                                        const tagText = isPendingConfirmation ? 'Direct Request' : isOperatorRequest ? 'Operator Request' : 'Broadcast';
                                        const tagColor = isPendingConfirmation ? 'bg-green-100 text-green-800' : isOperatorRequest ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';

                                        const distance = userLocation && booking.locationCoords
                                            ? calculateDistance(userLocation.lat, userLocation.lng, booking.locationCoords.lat, booking.locationCoords.lng)
                                            : null;

                                        return (
                                            <tr key={booking.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${tagColor}`}>
                                                        {tagText}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                                                    <div>{title}</div>
                                                    <div className="mt-1 text-xs text-neutral-500">
                                                        From: <MedalName userId={booking.farmerId} displayName={getFarmerName(booking.farmerId)} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span>{booking.date}</span>
                                                        <span className="text-xs text-neutral-500">{booking.startTime}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <button onClick={() => openMap(booking.location)} className="text-left font-medium hover:text-blue-600 hover:underline truncate max-w-[150px]" title={booking.location}>
                                                            {booking.location}
                                                        </button>
                                                        {distance && <span className="text-xs text-neutral-500">{distance} km away</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {booking.workPurpose}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isPendingConfirmation && (
                                                            <button
                                                                onClick={() => rejectBooking(booking.id)}
                                                                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleAcceptClick(booking)}
                                                            className="px-4 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary-dark shadow-sm"
                                                        >
                                                            {isPendingConfirmation ? 'Accept' : 'View & Accept'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-1">No Requests Found</h3>
                        <p className="text-neutral-500 dark:text-neutral-400">There are no job requests matching your criteria right now.</p>
                    </div>
                )}
            </div>

            {/* Suspension / Blocked Banner */}
            {(user?.userStatus === 'suspended' || user?.userStatus === 'blocked') && (
                <div className={`mx-4 mt-4 ${user.userStatus === 'blocked' ? 'bg-red-700' : 'bg-red-500'} text-white p-4 rounded-lg flex items-center shadow-lg animate-pulse`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="font-bold text-lg uppercase">Account {user.userStatus}</p>
                        <p className="text-sm font-medium mb-1">
                            Your account is {user.userStatus} until {user.suspendedUntil ? new Date(user.suspendedUntil).toLocaleString() : 'further notice'}. You cannot accept new requests.
                        </p>
                        {user.userStatus === 'blocked' && (
                            <p className="text-xs font-bold underline cursor-pointer" onClick={() => {/* Simple alert or nav to complaint */ alert('Please email admin@agrirent.com to raise a complaint.'); }}>
                                Contact Admin to Raise a Complaint
                            </p>
                        )}
                    </div>
                </div>
            )}
            {bookingToAccept && (
                <AcceptJobModal
                    booking={bookingToAccept}
                    availableItems={itemsForBooking}
                    onClose={() => setBookingToAccept(null)}
                    onConfirm={handleConfirmAccept}
                />
            )}

            {conflictWarning && conflictWarning.show && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">⚠️ Booking Conflict Warning</h2>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                            <p className="text-sm text-neutral-800 dark:text-neutral-200 mb-3">
                                You already have the following booking(s) at this time:
                            </p>
                            {conflictWarning.conflictingBookings.map(b => {
                                const item = items.find(i => i.id === b.itemId);
                                return (
                                    <div key={b.id} className="bg-white dark:bg-neutral-700 p-2 rounded mb-2 text-xs">
                                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{item?.name || 'Equipment'}</p>
                                        <p className="text-neutral-600 dark:text-neutral-300">📅 {b.date} at {b.startTime}</p>
                                        <p className="text-neutral-600 dark:text-neutral-300">⏱️ Duration: {b.estimatedDuration || 1} hour(s)</p>
                                    </div>
                                );
                            })}
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-3">
                                Do you still want to confirm this booking?
                            </p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                                Note: Admin will be notified to contact you about managing both bookings.
                            </p>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button variant="secondary" onClick={() => { setConflictWarning(null); setBookingToAccept(null); }}>Cancel</Button>
                            <Button onClick={handleConfirmWithConflict} className="!w-auto !px-4 !py-2 bg-yellow-600 hover:bg-yellow-700">Confirm Anyway</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
