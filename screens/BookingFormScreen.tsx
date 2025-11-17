

import React, { useState, useMemo, useEffect } from 'react';
import { Item, AppView, Booking, ItemCategory, WORK_PURPOSES, CATEGORY_WORK_PURPOSES, WorkPurpose, User, UserRole } from '../types';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useLanguage } from '../context/LanguageContext';

interface BookingFormScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
    category?: ItemCategory;
    quantity?: number;
    item?: Item;
    workPurpose?: WorkPurpose;
}

const haversineDistance = (coords1: { lat: number, lng: number }, coords2: { lat: number, lng: number }) => {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371; // Earth radius in km

    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lng - coords1.lng);
    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};


const BookingFormScreen: React.FC<BookingFormScreenProps> = ({ navigate, goBack, category, quantity: initialQuantity, item, workPurpose: initialWorkPurpose }) => {
    const { user, allUsers } = useAuth();
    const { addBooking } = useBooking();
    const { items } = useItem();
    const { t } = useLanguage();
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [estimatedDurationInput, setEstimatedDurationInput] = useState('1');
    const [location, setLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [itemCategory, setItemCategory] = useState<ItemCategory>(item?.category || category || ItemCategory.Tractors);
    const [quantity, setQuantity] = useState(initialQuantity?.toString() || '1');
    const [allowMultipleSuppliers, setAllowMultipleSuppliers] = useState(true);
    const [preferredModel, setPreferredModel] = useState('any');
    const [workPurpose, setWorkPurpose] = useState<WorkPurpose>(item?.purposes[0]?.name || initialWorkPurpose || WORK_PURPOSES[0]);
    
    const [operatorRequired, setOperatorRequired] = useState(false);
    // Payment selection removed; handled after work completion
    
    const isDirectRequest = !!item;
    const [isBroadcastOverride, setIsBroadcastOverride] = useState(false);

    // Payment modal removed


    useEffect(() => {
        if (item) {
            setItemCategory(item.category);
            setWorkPurpose(item.purposes[0]?.name || CATEGORY_WORK_PURPOSES[item.category][0]);
        }
    }, [item]);

    // Update work purpose when category changes
    useEffect(() => {
        if (!isDirectRequest) {
            const categoryPurposes = CATEGORY_WORK_PURPOSES[itemCategory];
            if (categoryPurposes && !categoryPurposes.includes(workPurpose)) {
                setWorkPurpose(categoryPurposes[0]);
            }
        }
    }, [itemCategory, isDirectRequest, workPurpose]);

    const supplier = useMemo(() => {
        if (!isDirectRequest || !item) return null;
        return allUsers.find(u => u.id === item.ownerId);
    }, [isDirectRequest, item, allUsers]);

    const isDateBlocked = useMemo(() => {
        if (!supplier || !date) return false;
        return supplier.blockedDates?.includes(date) ?? false;
    }, [supplier, date]);
    
    const handleWorkPurposeChange = (newPurpose: WorkPurpose) => {
        setWorkPurpose(newPurpose);
        if (isDirectRequest && item) {
            const isOffered = item.purposes.some(p => p.name === newPurpose);
            setIsBroadcastOverride(!isOffered);
        }
    }

    const isQuantityApplicable = useMemo(() => itemCategory === ItemCategory.Workers, [itemCategory]);
    const isOperatorApplicable = useMemo(() => ![ItemCategory.Workers, ItemCategory.Drivers, ItemCategory.Borewell, ItemCategory.Harvesters, ItemCategory.Drones, ItemCategory.JCB].includes(itemCategory), [itemCategory]);
    const isModelApplicable = useMemo(() => [ItemCategory.Tractors, ItemCategory.Harvesters, ItemCategory.JCB, ItemCategory.Borewell, ItemCategory.Drones].includes(itemCategory) && !isDirectRequest, [isDirectRequest, itemCategory]);
    
    const availableModels = useMemo(() => {
        if (!isModelApplicable) return [];
        const modelsFromSuppliers = new Set(items.filter(i => i.category === itemCategory && i.model && i.status === 'approved').map(i => i.model!));
        const defaultModels: { [key in ItemCategory]?: string[] } = {
            [ItemCategory.Tractors]: ['John Deere 5310', 'Mahindra JIVO', 'Swaraj 744 FE', 'New Holland 3630', 'Sonalika DI 750III'],
            [ItemCategory.Harvesters]: ['Claas Dominator', 'John Deere W70', 'Kubota HARVESTKING', 'Preet 987', 'Dasmesh 9100'],
            [ItemCategory.JCB]: ['JCB 3DX', 'JCB 4DX', 'JCB 2DX', 'JCB 1CX'],
            [ItemCategory.Borewell]: ['DR-550 Rig', 'Truck Mounted Rig', 'Tractor Mounted Rig', 'Portable Rig', 'DTH Rig'],
            [ItemCategory.Drones]: ['DJI Agras T40', 'Garuda Kisan Drone', 'IoTechWorld Agribot', 'Marut Drone', 'General Aeronautics Drone'],
        };
        return Array.from(new Set([...(defaultModels[itemCategory] || []), ...modelsFromSuppliers]));
    }, [itemCategory, items, isModelApplicable]);

    useEffect(() => { !isOperatorApplicable && setOperatorRequired(false); }, [isOperatorApplicable]);
    useEffect(() => { initialQuantity && setQuantity(initialQuantity.toString()); }, [initialQuantity]);

    const durationInHours = useMemo(() => {
        const n = parseFloat(estimatedDurationInput);
        return isNaN(n) || n <= 0 ? 0 : n;
    }, [estimatedDurationInput]);
    const billableHours = useMemo(() => Math.max(1, durationInHours), [durationInHours]);
    
    const distanceCharge = useMemo(() => {
        if (!isDirectRequest || !item || !item.locationCoords || !user || !user.locationCoords) return 0;

        const distance = haversineDistance(user.locationCoords, item.locationCoords);
        let serviceRadius = 3; // default 3km
        if (item.category === ItemCategory.Borewell) serviceRadius = 15;
        if (item.category === ItemCategory.Harvesters) serviceRadius = 10;
        
        if (distance > serviceRadius) {
            const extraDistance = distance - serviceRadius;
            return Math.round(extraDistance * 10); // ₹10 per km
        }
        return 0;
    }, [isDirectRequest, item, user]);

    const applicableItems = useMemo(() => {
        return isDirectRequest && !isBroadcastOverride
            ? [item] 
            : items.filter(i => 
                i.category === itemCategory && 
                i.status === 'approved' && 
                i.available &&
                i.purposes.some(p => p.name === workPurpose)
              );
    }, [items, itemCategory, isDirectRequest, item, workPurpose, isBroadcastOverride]);
    
    const priceEstimates = useMemo(() => {
        if (applicableItems.length === 0 || durationInHours <= 0) {
            return { 
                machine: { min: 0, max: 0 }, 
                operator: { min: 0, max: 0 }, 
                platformFee: { min: 0, max: 0 },
                travelCharges: { min: 0, max: 0 },
                additionalCharges: { min: 0, max: 0 },
                total: { min: 0, max: 0 } 
            };
        }
    
        const numQuantity = isQuantityApplicable ? parseInt(quantity) : 1;
    
        const machinePrices = applicableItems.map(i => (i.purposes.find(p => p.name === workPurpose)?.price || 0) * numQuantity * billableHours);
        const operatorPrices = operatorRequired ? applicableItems.map(i => (i.operatorCharge || 0) * billableHours) : [0];
    
        const machineMin = Math.min(...machinePrices);
        const machineMax = Math.max(...machinePrices);
        const operatorMin = Math.min(...operatorPrices);
        const operatorMax = Math.max(...operatorPrices);
        
        // Platform fee: 0% of (machine + operator) cost
        const platformFeeMin = 0;
        const platformFeeMax = 0;
        
        // Travel charges (already calculated as distanceCharge)
        const travelMin = distanceCharge;
        const travelMax = distanceCharge;
        
        // Additional charges (default 0, can be extended for special services)
        const additionalMin = 0;
        const additionalMax = 0;
    
        return {
            machine: { min: machineMin, max: machineMax },
            operator: { min: operatorMin, max: operatorMax },
            platformFee: { min: platformFeeMin, max: platformFeeMax },
            travelCharges: { min: travelMin, max: travelMax },
            additionalCharges: { min: additionalMin, max: additionalMax },
            total: { 
                min: machineMin + operatorMin + platformFeeMin + travelMin + additionalMin, 
                max: machineMax + operatorMax + platformFeeMax + travelMax + additionalMax 
            }
        };
    }, [applicableItems, durationInHours, operatorRequired, isQuantityApplicable, quantity, workPurpose, distanceCharge]);

    const getTodayString = () => new Date().toISOString().split('T')[0];
    const minDate = getTodayString();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !startTime || !location || !itemCategory || !workPurpose || durationInHours <= 0 || isDateBlocked) {
            alert('Please fill all required fields, select an available date, and enter a valid duration.');
            return;
        }
        
        if (user) {
            const isFinalBroadcast = !isDirectRequest || isBroadcastOverride;
            const estimatedPrice = priceEstimates.total.max;
            
            const bookingDetails: Omit<Booking, 'id' | 'advanceAmount' | 'advancePaymentId'> = {
                farmerId: user.id,
                itemCategory: itemCategory,
                itemId: isFinalBroadcast ? undefined : item!.id,
                supplierId: isFinalBroadcast ? undefined : item!.ownerId,
                date,
                startTime,
                location,
                status: isFinalBroadcast ? 'Searching' : 'Pending Confirmation',
                additionalInstructions,
                workPurpose,
                preferredModel: isModelApplicable && preferredModel !== 'any' ? preferredModel : undefined,
                operatorRequired,
                quantity: isQuantityApplicable ? parseInt(quantity) : undefined,
                allowMultipleSuppliers: itemCategory === ItemCategory.Workers && !isDirectRequest ? allowMultipleSuppliers : undefined,
                estimatedPrice,
                estimatedDuration: durationInHours,
                distanceCharge: distanceCharge > 0 ? distanceCharge : undefined,
                // Store detailed price breakdown
                paymentDetails: {
                    farmerAmount: priceEstimates.total.max,
                    supplierAmount: priceEstimates.machine.max + priceEstimates.operator.max,
                    commission: priceEstimates.platformFee.max,
                    totalAmount: priceEstimates.total.max,
                    paymentDate: new Date().toISOString(),
                }
            };
            setIsLoading(true);
            setTimeout(() => {
                addBooking(bookingDetails);
                setIsLoading(false);
                navigate({
                    view: 'BOOKING_SUCCESS',
                    isDirectRequest: !isFinalBroadcast,
                });
            }, 1200);
        }
    };


    const formatRange = (min: number, max: number) => min === max ? `₹${min.toLocaleString()}` : `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
    
    return (
        <div className="dark:text-neutral-200">
            <Header title={isDirectRequest ? t('confirmYourBooking') : t('createBookingRequest')} onBack={goBack} />
            <div className="p-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('serviceCategory')}</label>
                          <select 
                              value={itemCategory} 
                            onChange={e => setItemCategory(e.target.value as ItemCategory)} 
                            required 
                            disabled={isDirectRequest}
                            className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-neutral-100 dark:disabled:bg-gray-800 disabled:text-gray-400"
                        >
                            {Object.values(ItemCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        {isDirectRequest && item && <p className="text-xs text-neutral-500 mt-1">Requesting: <strong>{item.name}</strong> from <strong>{allUsers.find(u=>u.id === item.ownerId)?.name}</strong></p>}
                    </div>

                    {isModelApplicable && (
                         <div>
                            <label htmlFor="preferred-model" className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('preferredModel') || 'Preferred Model (Optional)'}</label>
                            <select id="preferred-model" value={preferredModel} onChange={e => setPreferredModel(e.target.value)} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50">
                                <option value="any">Any Model / No Preference</option>
                                {availableModels.map(model => <option key={model} value={model}>{model}</option>)}
                            </select>
                        </div>
                    )}

                    {isQuantityApplicable && (
                        <>
                            <Input label={t('quantity')} type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" />
                            {itemCategory === ItemCategory.Workers && !isDirectRequest && (
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="multiple-suppliers-checkbox"
                                        checked={allowMultipleSuppliers}
                                        onChange={(e) => setAllowMultipleSuppliers(e.target.checked)}
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="multiple-suppliers-checkbox" className="text-neutral-700 dark:text-neutral-200">
                                        Allow sourcing from multiple suppliers?
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    <Input label={t('selectDate')} type="date" value={date} onChange={e => setDate(e.target.value)} required min={minDate} />
                    {isDateBlocked && (
                        <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg -mt-2 text-center">
                            {t('supplierUnavailableDate')}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Input label={t('startTime')} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                        <div>
                            <Input label={t('hoursRequired')} type="number" value={estimatedDurationInput} onChange={e => setEstimatedDurationInput(e.target.value)} min="0.5" step="0.5" required />
                            <p className="text-xs text-neutral-500 mt-1">{t('minimumBookingHint') || 'Minimum booking: 1 hour'}</p>
                        </div>
                    </div>
                    {durationInHours > 0 && durationInHours < 1 && (
                        <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                            {t('minimumBillingNote') || 'Note: Minimum billing is 1 hour. Pricing will be calculated for 1 hour.'}
                        </div>
                    )}
                    <Input label={t('fieldLocation')} value={location} onChange={e => setLocation(e.target.value)} placeholder={t('enterFarmAddress') || 'Enter your farm address'} required />
                    
                    <div>
                        <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('workPurpose')}</label>
                        <select id="work-purpose" value={workPurpose} onChange={e => handleWorkPurposeChange(e.target.value as WorkPurpose)} required className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50">
                            {(isDirectRequest && item ? item.purposes.map(p => p.name) : CATEGORY_WORK_PURPOSES[itemCategory] || WORK_PURPOSES).map(purpose => {
                                const isOffered = isDirectRequest && item ? item.purposes.some(p => p.name === purpose) : true;
                                return <option key={purpose} value={purpose} className={isOffered ? 'font-bold dark:text-green-300' : ''}>{purpose}{isOffered && isDirectRequest ? ' ✓' : ''}</option>
                            })}
                        </select>
                        {isBroadcastOverride && (
                            <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                                Note: This specific supplier does not offer '{workPurpose}'. Your request will be broadcast to all available suppliers.
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="instructions" className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('additionalInstructions')}</label>
                        <textarea id="instructions" rows={3} value={additionalInstructions} onChange={e => setAdditionalInstructions(e.target.value)} placeholder={t('specificRequirements') || 'e.g., Please call upon arrival.'} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>

                    {isOperatorApplicable && (
                         <div className="border-t pt-4 dark:border-neutral-700">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={operatorRequired} onChange={(e) => setOperatorRequired(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
                                <span className="text-neutral-700 dark:text-neutral-200 font-semibold">{t('operatorRequired')}</span>
                            </label>
                        </div>
                    )}
                    
                    {/* Payment selection removed; payment occurs after work completion */}

                    <div className="border-t pt-4 space-y-2 dark:border-neutral-700">
                        {durationInHours > 0 && priceEstimates.total.max > 0 ? (
                            <>
                                {/* Detailed Price Breakdown */}
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                                        <span>Equipment Cost</span>
                                        <span>{formatRange(priceEstimates.machine.min, priceEstimates.machine.max)}</span>
                                    </div>
                                    {operatorRequired && (
                                        <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                                            <span>Driver/Operator Cost</span>
                                            <span>{formatRange(priceEstimates.operator.min, priceEstimates.operator.max)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                                        <span>Platform Fee (0%)</span>
                                        <span>{formatRange(priceEstimates.platformFee.min, priceEstimates.platformFee.max)}</span>
                                    </div>
                                    {priceEstimates.travelCharges.min > 0 && (
                                        <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                                            <span>Travel Charges (Far from supplier)</span>
                                            <span>+ ₹{priceEstimates.travelCharges.min.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {priceEstimates.additionalCharges.min > 0 && (
                                        <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                                            <span>Additional Charges</span>
                                            <span>{formatRange(priceEstimates.additionalCharges.min, priceEstimates.additionalCharges.max)}</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 mt-2 border-neutral-200 dark:border-neutral-600"></div>
                                </div>
                                
                                <div className="flex justify-between text-lg font-bold text-neutral-800 dark:text-neutral-100">
                                    <span>{t('estTotalPrice')}</span>
                                    <span>{formatRange(priceEstimates.total.min, priceEstimates.total.max)}</span>
                                </div>
                                <div className="text-right text-xs text-neutral-600 dark:text-neutral-400">
                                    {`For approx. ${billableHours} hours`}
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-sm text-neutral-600 dark:text-neutral-400 py-4">
                                {applicableItems.length === 0 ? "No services available for this purpose." : "Please enter a valid duration."}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 space-y-3">
                         <p className="text-xs text-center text-gray-500">
                            {isDirectRequest && !isBroadcastOverride
                                ? "Your request will be sent directly to this item's supplier for confirmation."
                                : "Your request will be sent to all available suppliers. The first to accept will confirm the booking."}
                         </p>
                        <Button type="submit" disabled={isLoading || durationInHours <= 0 || applicableItems.length === 0 || isDateBlocked}>
                            {isLoading ? 'Processing...' : (isDirectRequest ? t('confirmBooking') || 'Confirm Booking' : t('createBookingRequest') || 'Create Booking Request')}
                        </Button>
                    </div>
                </form>
            </div>
            {/* Payment modal removed */}
        </div>
    );
};

export default BookingFormScreen;