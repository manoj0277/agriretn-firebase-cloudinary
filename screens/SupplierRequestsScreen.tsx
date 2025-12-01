
import React, { useState, useMemo } from 'react';
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-2 text-neutral-800 dark:text-neutral-100">Accept Job Request</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">Select an item to fulfill this booking request.</p>

                <div className="bg-neutral-50 dark:bg-neutral-700 p-3 rounded-lg mb-4 text-sm">
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
                            <p className="text-sm">You have no available items that match this specific request.</p>
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

            return false;
        });
    }, [bookings, user, items]);

    const getFarmerName = (farmerId: number) => allUsers.find(u => u.id === farmerId)?.name || 'Unknown Farmer';
    const getMachineNameForOpRequest = (itemId?: number) => items.find(i => i.id === itemId)?.name || 'a machine';

    const handleAcceptClick = (booking: Booking) => setBookingToAccept(booking);

    const handleConfirmAccept = (itemId: number, options?: { operateSelf?: boolean, quantityToProvide?: number }) => {
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
                acceptBookingRequest(bookingToAccept.id, user.id, itemId, options);
                setBookingToAccept(null);
            }
        }
    };

    const handleConfirmWithConflict = () => {
        if (bookingToAccept && user && conflictWarning) {
            acceptBookingRequest(bookingToAccept.id, user.id, conflictWarning.itemId, conflictWarning.options);

            // Notify admin
            const conflictDetails = conflictWarning.conflictingBookings.map(b => {
                const item = items.find(i => i.id === b.itemId);
                return `${item?.name || 'Item'} at ${b.startTime} on ${b.date}`;
            }).join(', ');

            addNotification({
                userId: 0,
                message: `Supplier ${user.name} (ID: ${user.id}) accepted overlapping bookings. Existing: ${conflictDetails}. New: ${bookingToAccept.startTime} on ${bookingToAccept.date}. Please contact them.`,
                type: 'admin'
            });

            setBookingToAccept(null);
            setConflictWarning(null);
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

    return (
        <div>
            <div className="p-4 space-y-3">
                {availableRequests.length > 0 ? (
                    [...availableRequests].reverse().map(booking => {
                        const isOperatorRequest = booking.status === 'Awaiting Operator';
                        const isPendingConfirmation = booking.status === 'Pending Confirmation';

                        const itemForBooking = items.find(i => i.id === booking.itemId);

                        const title = isPendingConfirmation
                            ? `Direct Request: ${itemForBooking?.name || 'Unknown Item'}`
                            : isOperatorRequest
                                ? `Driver for ${getMachineNameForOpRequest(booking.itemId)}`
                                : `Request for ${booking.itemCategory}`;

                        const tagText = isPendingConfirmation ? 'Direct Request' : isOperatorRequest ? 'Operator Request' : 'Broadcast';
                        const tagColor = isPendingConfirmation ? 'bg-green-100 text-green-800' : isOperatorRequest ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';

                        return (
                            <div key={booking.id} className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">{title}</h3>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-300">From: {getFarmerName(booking.farmerId)}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${tagColor}`}>
                                        {tagText}
                                    </span>
                                </div>
                                <div className="mt-3 border-t dark:border-neutral-600 pt-3 space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                                    <p><strong>Date:</strong> {booking.date} from {booking.startTime} - {booking.estimatedDuration ? `${booking.estimatedDuration} hours` : booking.endTime}</p>
                                    {booking.quantity && !isOperatorRequest && <p><strong>Quantity:</strong> {booking.quantity}</p>}
                                    <p><strong>Location:</strong> {booking.location}</p>
                                    {booking.workPurpose && <p><strong>Work Purpose:</strong> {booking.workPurpose}</p>}
                                    {booking.preferredModel && <p><strong>Preferred Model:</strong> {booking.preferredModel}</p>}
                                    {booking.operatorRequired && !isOperatorRequest && <p className="text-blue-600 dark:text-blue-400 font-semibold">Operator Required</p>}
                                    {booking.additionalInstructions && <p className="p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md mt-1"><strong>Instructions:</strong> <em>{booking.additionalInstructions}</em></p>}
                                </div>
                                <div className="mt-4 border-t dark:border-neutral-600 pt-3 flex justify-end space-x-2">
                                    {isPendingConfirmation && (
                                        <Button variant="secondary" className="w-auto px-6 bg-red-600/10 text-red-700 hover:bg-red-600/20" onClick={() => rejectBooking(booking.id)}>
                                            Reject
                                        </Button>
                                    )}
                                    <Button className="w-auto px-6" onClick={() => handleAcceptClick(booking)}>
                                        {isPendingConfirmation ? 'Accept' : 'View & Accept'}
                                    </Button>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center py-16">
                        <p className="text-neutral-700 dark:text-neutral-300">No available job requests right now.</p>
                    </div>
                )}
            </div>

            {bookingToAccept && (
                <AcceptJobModal
                    booking={bookingToAccept}
                    availableItems={itemsForBooking}
                    onClose={() => setBookingToAccept(null)}
                    onConfirm={handleConfirmAccept}
                />
            )}

            {conflictWarning && conflictWarning.show && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
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
