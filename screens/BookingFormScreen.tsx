

import React, { useState, useMemo, useEffect } from 'react';
import { Item, AppView, Booking, ItemCategory, WORK_PURPOSES, CATEGORY_WORK_PURPOSES, WORKER_PURPOSE_IMAGES, HARVESTER_PURPOSE_IMAGES, TRACTOR_PURPOSE_IMAGES, WorkPurpose, User, UserRole } from '../types';
import { calculateDynamicPrice, PricingRule } from '../utils/pricing';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/lib/firebase';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useLanguage } from '../context/LanguageContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    const { addBooking, bookings } = useBooking();
    const { items } = useItem();
    const { t } = useLanguage();
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [estimatedDurationInput, setEstimatedDurationInput] = useState('1');
    const [location, setLocation] = useState('');
    const [locationDetails, setLocationDetails] = useState<{ district?: string, mandal?: string, city?: string }>({});
    const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
    const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [searchSuggestions, setSearchSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [itemCategory, setItemCategory] = useState<ItemCategory>(item?.category || category || ItemCategory.Tractors);
    const [quantity, setQuantity] = useState(initialQuantity?.toString() || '1');
    const [acres, setAcres] = useState('1');
    const [allowMultipleSuppliers, setAllowMultipleSuppliers] = useState(true);
    const [preferredModel, setPreferredModel] = useState('any');
    const [workPurpose, setWorkPurpose] = useState<WorkPurpose>(item?.purposes[0]?.name || initialWorkPurpose || WORK_PURPOSES[0]);
    const [crop, setCrop] = useState(''); // New state for Crop
    const [workPurposeDetails, setWorkPurposeDetails] = useState(''); // New state for Others details
    const [showWorkerPurposeModal, setShowWorkerPurposeModal] = useState(false); // Modal for worker purpose selection
    const [showHarvesterPurposeModal, setShowHarvesterPurposeModal] = useState(false); // Modal for harvester purpose selection
    const [showTractorPurposeModal, setShowTractorPurposeModal] = useState(false); // Modal for tractor purpose selection

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
        // Use field location (locationCoords) from booking form, not user profile location
        if (!isDirectRequest || !item || !item.locationCoords || !locationCoords) return 0;

        const distance = haversineDistance(locationCoords, item.locationCoords);
        let serviceRadius = 3; // default 3km
        if (item.category === ItemCategory.Borewell) serviceRadius = 15;
        if (item.category === ItemCategory.Harvesters) serviceRadius = 10;

        if (distance > serviceRadius) {
            const extraDistance = distance - serviceRadius;
            return Math.round(extraDistance * 10); // ₹10 per km
        }
        return 0;
    }, [isDirectRequest, item, locationCoords]);

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

        // Apply Dynamic Pricing Logic
        const calculateWithSurge = (basePrice: number, purposeItem: Item) => {
            const { finalPrice } = calculateDynamicPrice(basePrice, purposeItem, locationDetails, pricingRules);
            return finalPrice * numQuantity * billableHours;
        };

        const machinePrices = applicableItems.map(i => {
            const purpose = i.purposes.find(p => p.name === workPurpose);
            return purpose ? calculateWithSurge(purpose.price, i) : 0;
        });

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

    // Fetch Pricing Rules
    useEffect(() => {
        const fetchPricingRules = async () => {
            try {
                const q = query(collection(db, 'pricing_rules'), where('isActive', '==', true));
                const snapshot = await getDocs(q);
                const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingRule));
                setPricingRules(rules);
            } catch (error) {
                console.error("Error fetching pricing rules:", error);
            }
        };
        fetchPricingRules();
    }, []);

    // Reverse geocoding function using Nominatim
    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en',
                    }
                }
            );
            if (response.ok) {
                const data = await response.json();
                const address = data.address;

                // Store location details for pricing
                setLocationDetails({
                    district: address.state_district || address.district,
                    mandal: address.county || address.town || address.city, // Mandal often maps to county/town in Nominatim
                    city: address.city || address.town || address.village
                });

                // Build a readable address from village/suburb/city
                const parts = [
                    address.village || address.suburb || address.neighbourhood,
                    address.city || address.town || address.county,
                    address.state_district || address.state
                ].filter(Boolean);
                return parts.join(', ') || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    };

    // Forward geocoding function to search for places
    const searchLocation = async (query: string) => {
        if (query.length < 3) {
            setSearchSuggestions([]);
            return;
        }
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=10&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (response.ok) {
                const data = await response.json();

                // Prioritize results: Karimnagar > Telangana > India
                const sortedData = data.sort((a: any, b: any) => {
                    const aText = (a.display_name || '').toLowerCase();
                    const bText = (b.display_name || '').toLowerCase();

                    const score = (text: string) => {
                        if (text.includes('karimnagar')) return 3;
                        if (text.includes('telangana')) return 2;
                        if (text.includes('india')) return 1;
                        return 0;
                    };

                    return score(bText) - score(aText);
                });

                setSearchSuggestions(sortedData);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error('Location search failed:', error);
        }
    };

    const selectSuggestion = (suggestion: { display_name: string; lat: string; lon: string }) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        setLocationCoords({ lat, lng });
        // Extract shorter name from display_name
        const parts = suggestion.display_name.split(', ');
        const shortName = parts.slice(0, 3).join(', ');
        setLocation(shortName);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        // Important: Fetch details for pricing
        reverseGeocode(lat, lng);
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        // Show the location permission modal first
        setShowLocationModal(true);
    };

    const requestLocation = () => {
        setShowLocationModal(false);
        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocationCoords({ lat: latitude, lng: longitude });
                const address = await reverseGeocode(latitude, longitude);
                setLocation(address);
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    alert('Location permission denied. Please enable location access in your device settings and try again.');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    alert('Unable to determine your location. Please ensure GPS is enabled or enter location manually.');
                } else if (error.code === error.TIMEOUT) {
                    alert('Location request timed out. Please try again.');
                } else {
                    alert('Unable to retrieve your location');
                }
                console.error(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    const LocationMarker = () => {
        const map = useMapEvents({
            async click(e) {
                setLocationCoords(e.latlng);
                const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
                setLocation(address);
            },
        });

        useEffect(() => {
            if (locationCoords) {
                map.flyTo(locationCoords, map.getZoom());
            }
        }, [locationCoords, map]);

        return locationCoords ? <Marker position={locationCoords} /> : null;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !startTime || !location || !itemCategory || !workPurpose || durationInHours <= 0 || isDateBlocked) {
            alert('Please fill all required fields, select an available date, and enter a valid duration.');
            return;
        }

        // Validate Working Hours for Labour (Workers)
        // Skip for Agent/AgentPro farmers (managed by founder, can book anytime)
        if (itemCategory === ItemCategory.Workers && user?.role !== 'Agent' && user?.role !== 'AgentPro') {
            const [startH, startM] = startTime.split(':').map(Number);
            const startDecimal = startH + startM / 60;
            const endDecimal = startDecimal + durationInHours;

            // Working hours: 6 AM (6.0) to 7 PM (19.0)
            if (startDecimal < 6 || endDecimal > 19) {
                alert('Labour works only between 6:00 AM and 7:00 PM. Please adjust your start time or duration.');
                return;
            }
        }

        if (user) {
            // Check for existing unconfirmed bookings for the same equipment (only for direct requests)
            if (isDirectRequest && item && !isBroadcastOverride) {
                const existingUnconfirmedBooking = bookings.find(b =>
                    b.farmerId === user.id &&
                    b.itemId === item.id &&
                    ['Searching', 'Pending Confirmation', 'Awaiting Operator'].includes(b.status)
                );

                if (existingUnconfirmedBooking) {
                    alert(`You already have a pending booking for this equipment (${item.name}). Please wait for confirmation before booking again.\n\nBooking ID: ${existingUnconfirmedBooking.id}\nStatus: ${existingUnconfirmedBooking.status}`);
                    return;
                }
            }

            const isFinalBroadcast = !isDirectRequest || isBroadcastOverride;

            if (!isFinalBroadcast && (!item?.id || !item?.ownerId)) {
                console.error("Critical Error: Direct request missing item ID or Owner ID");
                alert("System Error: Item data is incomplete. Please contact support.");
                return;
            }

            const estimatedPrice = priceEstimates.total.max;

            const bookingDetails: Omit<Booking, 'id' | 'advanceAmount' | 'advancePaymentId'> = {
                farmerId: user.id,
                itemCategory: itemCategory,
                itemId: item?.id, // Always preserve item ID if available
                supplierId: isFinalBroadcast ? undefined : item!.ownerId,
                date,
                startTime,
                location,
                locationCoords,
                status: isFinalBroadcast ? 'Searching' : 'Pending Confirmation',
                additionalInstructions,
                workPurpose,
                preferredModel: isModelApplicable && preferredModel !== 'any' ? preferredModel : undefined,
                operatorRequired,
                quantity: isQuantityApplicable ? parseInt(quantity) : undefined,
                acres: parseFloat(acres) || undefined,
                allowMultipleSuppliers: itemCategory === ItemCategory.Workers && !isDirectRequest ? allowMultipleSuppliers : undefined,
                crop: itemCategory === ItemCategory.Workers ? crop : undefined, // Include crop
                workPurposeDetails: itemCategory === ItemCategory.Workers && workPurpose === 'Others' ? workPurposeDetails : undefined, // Include details
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
        <div className="dark:text-neutral-200 bg-green-50 dark:bg-neutral-900 min-h-screen pb-32 relative z-0">
            <Header title={isDirectRequest ? t('confirmYourBooking') : t('createBookingRequest')} onBack={goBack} />
            <div className="p-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {/* ... form content ... */}
                    {/* (This replacement targets the container padding and the map wrapper below) */}

                    {/* ... (skipping lines to map wrapper) ... */}

                    {/* Service Category Section - Fixed Wrapper */}
                    <div>
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
                            {isDirectRequest && item && <p className="text-xs text-neutral-500 mt-1">Requesting: <strong>{item.name}</strong> from <strong>{allUsers.find(u => u.id === item.ownerId)?.name}</strong></p>}
                        </div>

                        {/* Work Purpose Section */}
                        <div className="mt-4">
                            <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('workPurpose')}</label>
                            {(itemCategory === ItemCategory.Workers || itemCategory === ItemCategory.Harvesters || itemCategory === ItemCategory.Tractors) && !isDirectRequest ? (
                                // Click-to-open modal for Workers, Harvesters, and Tractors
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (itemCategory === ItemCategory.Workers) setShowWorkerPurposeModal(true);
                                        else if (itemCategory === ItemCategory.Harvesters) setShowHarvesterPurposeModal(true);
                                        else if (itemCategory === ItemCategory.Tractors) setShowTractorPurposeModal(true);
                                    }}
                                    className="w-full text-left shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50 hover:border-primary transition-colors flex items-center justify-between"
                                >
                                    <span>{workPurpose || 'Select ' + (itemCategory === ItemCategory.Workers ? 'Work Type' : itemCategory === ItemCategory.Harvesters ? 'Harvester Type' : 'Work Purpose')}</span>
                                    <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            ) : (
                                // Standard dropdown for other categories
                                <select id="work-purpose" value={workPurpose} onChange={e => handleWorkPurposeChange(e.target.value as WorkPurpose)} required className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    {(isDirectRequest && item ? item.purposes.map(p => p.name) : CATEGORY_WORK_PURPOSES[itemCategory] || WORK_PURPOSES).map(purpose => {
                                        const isOffered = isDirectRequest && item ? item.purposes.some(p => p.name === purpose) : true;
                                        return <option key={purpose} value={purpose} className={isOffered ? 'font-bold dark:text-green-300' : ''}>{purpose}{isOffered && isDirectRequest ? ' ✓' : ''}</option>
                                    })}
                                </select>
                            )}
                            {isBroadcastOverride && (
                                <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                                    Note: This specific supplier does not offer '{workPurpose}'. Your request will be broadcast to all available suppliers.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* New Fields for Workers */}
                    {itemCategory === ItemCategory.Workers && (
                        <div className="space-y-4">
                            {workPurpose === 'Others' && (
                                <div className="animate-fade-in">
                                    <label htmlFor="work-details" className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">Specify Work Details *</label>
                                    <Input
                                        id="work-details"
                                        value={workPurposeDetails}
                                        onChange={e => setWorkPurposeDetails(e.target.value)}
                                        placeholder="e.g. Clearing bushes, specialized pruning..."
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="crop" className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">Which Crop? *</label>
                                <Input
                                    id="crop"
                                    value={crop}
                                    onChange={e => setCrop(e.target.value)}
                                    placeholder="e.g. Cotton, Chillies, Paddy..."
                                    required
                                />
                            </div>
                        </div>
                    )}

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



                    <div>
                        <label htmlFor="acres" className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">How many acres?</label>
                        <Input id="acres" type="number" value={acres} onChange={e => setAcres(e.target.value)} min="0.1" step="0.1" placeholder="e.g. 2.5" />
                    </div>

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
                    {itemCategory === ItemCategory.Workers && (
                        <div className="mt-1 p-2 bg-orange-100 text-orange-800 text-xs rounded-md border border-orange-200">
                            Note: Labour working hours are strictly <strong>6:00 AM to 7:00 PM</strong>.
                        </div>
                    )}
                    {durationInHours > 0 && durationInHours < 1 && (
                        <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                            {t('minimumBillingNote') || 'Note: Minimum billing is 1 hour. Pricing will be calculated for 1 hour.'}
                        </div>
                    )}


                    <div className="space-y-2">
                        <div className="relative">
                            <label className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">{t('fieldLocation')} *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        searchLocation(e.target.value);
                                    }}
                                    onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                                    placeholder={t('enterFarmAddress') || 'Search village/town name...'}
                                    required
                                    className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 pr-12 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <button
                                    type="button"
                                    onClick={handleUseCurrentLocation}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-dark"
                                    title="Use Current Location"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Search Suggestions Dropdown */}
                            {showSuggestions && searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-neutral-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
                                    {searchSuggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => selectSuggestion(suggestion)}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-primary/10 dark:hover:bg-primary/20 text-neutral-800 dark:text-white border-b border-neutral-100 dark:border-gray-600 last:border-0"
                                        >
                                            📍 {suggestion.display_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-64 w-full rounded-lg overflow-hidden border border-neutral-300 dark:border-gray-600 relative z-0">
                            <MapContainer
                                center={locationCoords || { lat: 17.3850, lng: 78.4867 }}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <LocationMarker />
                            </MapContainer>
                        </div>
                        <p className="text-xs text-neutral-500">Tap on the map to pin exact location.</p>
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
                                {priceEstimates.total.max > 0 && (() => {
                                    // Check for active surge - simplified check for UI feedback
                                    // ideally we'd get this from the calculation, but this works for display
                                    const district = locationDetails.district?.trim().toLowerCase() || '';
                                    const mandal = locationDetails.mandal?.trim().toLowerCase() || locationDetails.city?.trim().toLowerCase() || '';
                                    const activeRule = pricingRules.find(r =>
                                        r.isActive &&
                                        ((r.district.toLowerCase() === district && r.mandal.toLowerCase() === mandal) ||
                                            (r.district.toLowerCase() === district && r.mandal === 'ALL') ||
                                            (r.district === 'ALL' && r.mandal === 'ALL')) &&
                                        (!r.category || r.category === itemCategory) &&
                                        r.multiplier > 1
                                    );

                                    if (activeRule) {
                                        return (
                                            <div className="mb-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-2 flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                                        {activeRule.seasonName || 'High Demand'} Pricing
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-200 dark:bg-orange-800 px-1.5 py-0.5 rounded">
                                                    {activeRule.multiplier}x
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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

            {/* Location Permission Modal */}
            {showLocationModal && (
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
                                Select Your Location
                            </h3>
                            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
                                Choose how you want to set your field location:
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={requestLocation}
                                    className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                                >
                                    📍 Use GPS Location
                                </button>
                                <button
                                    onClick={() => setShowLocationModal(false)}
                                    className="w-full py-3 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-lg font-semibold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                >
                                    🔍 Search Village Name
                                </button>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                                    💡 Tip: Type your village name in the field or tap on the map to pin exact location
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Loading Indicator */}
            {isLocating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10001 }}>
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 text-center shadow-xl">
                        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-neutral-700 dark:text-neutral-200 font-medium">Detecting your location...</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Please wait</p>
                    </div>
                </div>
            )}

            {/* Worker Purpose Selection Modal */}
            {showWorkerPurposeModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 10001 }} onClick={() => setShowWorkerPurposeModal(false)}>
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-white">Select Work Type</h3>
                            <button onClick={() => setShowWorkerPurposeModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
                                <svg className="w-6 h-6 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORY_WORK_PURPOSES[ItemCategory.Workers].map(purpose => {
                                const hasImage = WORKER_PURPOSE_IMAGES[purpose];
                                const isSelected = workPurpose === purpose;
                                return (
                                    <button
                                        key={purpose}
                                        type="button"
                                        onClick={() => {
                                            handleWorkPurposeChange(purpose as WorkPurpose);
                                            setShowWorkerPurposeModal(false);
                                        }}
                                        className={`relative overflow-hidden rounded-xl transition-all ${isSelected
                                            ? 'ring-4 ring-primary shadow-lg'
                                            : 'ring-2 ring-neutral-200 dark:ring-neutral-600 hover:ring-primary'
                                            }`}
                                    >
                                        {hasImage ? (
                                            <div className="relative h-28">
                                                <img
                                                    src={hasImage}
                                                    alt={purpose}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                                    <p className="text-white font-bold text-xs text-center drop-shadow-lg">{purpose}</p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-1.5 right-1.5 bg-primary text-white rounded-full p-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className={`h-28 flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
                                                }`}>
                                                <div className="text-center px-2">
                                                    <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <p className="font-bold text-xs">{purpose}</p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-1.5 right-1.5 bg-white text-primary rounded-full p-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Harvester Purpose Selection Modal */}
            {showHarvesterPurposeModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 10001 }} onClick={() => setShowHarvesterPurposeModal(false)}>
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-white">Select Harvester Type</h3>
                            <button onClick={() => setShowHarvesterPurposeModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
                                <svg className="w-6 h-6 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {CATEGORY_WORK_PURPOSES[ItemCategory.Harvesters].map(purpose => {
                                const hasImage = HARVESTER_PURPOSE_IMAGES[purpose];
                                const isSelected = workPurpose === purpose;
                                return (
                                    <button
                                        key={purpose}
                                        type="button"
                                        onClick={() => {
                                            handleWorkPurposeChange(purpose as WorkPurpose);
                                            setShowHarvesterPurposeModal(false);
                                        }}
                                        className={`relative overflow-hidden rounded-xl transition-all ${isSelected
                                            ? 'ring-4 ring-primary shadow-lg'
                                            : 'ring-2 ring-neutral-200 dark:ring-neutral-600 hover:ring-primary'
                                            }`}
                                    >
                                        {hasImage ? (
                                            <div className="relative h-32">
                                                <img
                                                    src={hasImage}
                                                    alt={purpose}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <p className="text-white font-bold text-sm text-center drop-shadow-lg">{purpose}</p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1.5">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Tractor Purpose Selection Modal */}
            {showTractorPurposeModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 10001 }} onClick={() => setShowTractorPurposeModal(false)}>
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-white">Select Work Purpose</h3>
                            <button onClick={() => setShowTractorPurposeModal(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full">
                                <svg className="w-6 h-6 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORY_WORK_PURPOSES[ItemCategory.Tractors].map(purpose => {
                                const hasImage = TRACTOR_PURPOSE_IMAGES[purpose];
                                const isSelected = workPurpose === purpose;
                                return (
                                    <button
                                        key={purpose}
                                        type="button"
                                        onClick={() => {
                                            handleWorkPurposeChange(purpose as WorkPurpose);
                                            setShowTractorPurposeModal(false);
                                        }}
                                        className={`relative overflow-hidden rounded-xl transition-all ${isSelected
                                            ? 'ring-4 ring-primary shadow-lg'
                                            : 'ring-2 ring-neutral-200 dark:ring-neutral-600 hover:ring-primary'
                                            }`}
                                    >
                                        {hasImage ? (
                                            <div className="relative h-28">
                                                <img
                                                    src={hasImage}
                                                    alt={purpose}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                                    <p className="text-white font-bold text-xs text-center drop-shadow-lg">{purpose}</p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative h-28 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                                                <p className="text-neutral-700 dark:text-neutral-300 font-semibold text-sm px-2 text-center">{purpose}</p>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingFormScreen;