import React, { useMemo } from 'react';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import { useAuth } from '../context/AuthContext';
import { Booking, Item } from '../types';
import Button from './Button';

export const RequestQueuePanel: React.FC = () => {
    const { bookings, acceptBookingRequest, rejectBooking } = useBooking();
    const { user } = useAuth();
    const { items } = useItem();

    // Filter for requests specifically targeting this supplier
    const pendingRequests = useMemo(() => {
        if (!user) return [];
        return bookings.filter(b =>
            b.supplierId === user.id &&
            b.status === 'Pending Confirmation'
        );
    }, [bookings, user]);

    const handleAccept = async (booking: Booking) => {
        if (!user || !booking.itemId) return;
        await acceptBookingRequest(booking.id, user.id, booking.itemId);
    };

    if (!user) return null;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden mb-6">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">Request Queue</h3>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{pendingRequests.length}</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {pendingRequests.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                        No pending requests.
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {pendingRequests.map(req => {
                            const item = items.find(i => i.id === req.itemId);
                            return (
                                <div key={req.id} className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-neutral-800 dark:text-neutral-200 text-sm truncate pr-2">
                                            {item?.name || req.itemCategory}
                                        </div>
                                        <div className="text-xs text-neutral-500 whitespace-nowrap">{req.date}</div>
                                    </div>
                                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                                        {req.location} • {req.startTime}
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleAccept(req); }}
                                            className="w-full text-xs py-1"
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => { e.stopPropagation(); rejectBooking(req.id); }}
                                            className="w-full text-xs py-1"
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export const EquipmentStatusPanel: React.FC = () => {
    const { items } = useItem();
    const { user } = useAuth();
    const { bookings } = useBooking();

    const myEquipment = useMemo(() => {
        if (!user) return [];
        return items.filter(i => i.ownerId === user.id);
    }, [items, user]);

    const getStatus = (item: Item) => {
        // Check if currently configured as available
        if (!item.available) return 'In Maintenance'; // Or just Unavailable

        // Check if currently in a booking (In Process)
        // This logic mimics "Active/Working" - strictly speaking we'd check time, but status is a good proxy
        const activeBooking = bookings.find(b =>
            b.itemId === item.id &&
            b.status === 'In Process'
        );

        if (activeBooking) return 'Active';

        return 'Idle';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'Idle': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
            case 'In Maintenance': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-neutral-100 text-neutral-700';
        }
    };

    if (!user) return null;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 flex items-center justify-between">
                    <span>Equipment Status</span>
                    <button className="text-neutral-400 hover:text-primary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </h3>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {myEquipment.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                        No equipment listed.
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {myEquipment.map(item => {
                            const status = getStatus(item);
                            return (
                                <div key={item.id} className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 dark:border-neutral-600">
                                            <img src={item.images[0] || 'https://via.placeholder.com/40'} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="truncate pr-2">
                                            <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate" title={item.name}>{item.name}</div>
                                            <div className="text-xs text-neutral-500 truncate">{item.category}</div>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${getStatusColor(status)}`}>
                                        {status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
