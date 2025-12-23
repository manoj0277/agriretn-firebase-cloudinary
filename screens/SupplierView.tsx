
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import DashboardLayout from '../components/DashboardLayout';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useItem } from '../context/ItemContext';
import { useBooking } from '../context/BookingContext';
import { useReview } from '../context/ReviewContext';
import { Item, ItemCategory, Booking, AppView, WorkPurpose, WORK_PURPOSES, CATEGORY_WORK_PURPOSES, WORKER_PURPOSE_IMAGES, HARVESTER_PURPOSE_IMAGES, TRACTOR_PURPOSE_IMAGES } from '../types';
import Header from '../components/Header';
import Button from '../components/Button';
import Input from '../components/Input';
import ConfirmationDialog from '../components/ConfirmationDialog';
import NotificationBell from '../components/NotificationBell';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import BottomNav, { NavItemConfig } from '../components/BottomNav';
import { SupplierRequestsScreen } from './SupplierRequestsScreen';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import SupplierBookingsScreen from './SupplierBookingsScreen';
import SupplierScheduleScreen from './SupplierScheduleScreen';
import { uploadImage } from '../src/lib/upload';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { useLanguage } from '../context/LanguageContext';


const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
    ? process.env.API_KEY
    : undefined;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

import VerifiedBadge from '../components/VerifiedBadge';
import AppSidebar from '../components/AppSidebar';
import { RequestQueuePanel, EquipmentStatusPanel } from '../components/SupplierWidgets';



interface SupplierViewProps {
    navigate: (view: AppView) => void;
    onSwitchMode?: () => void;
    roleBadge?: string;
    currentView?: string; // Add currentView
    children?: React.ReactNode;
}

import { StreakLeaderboardModal } from '../components/StreakLeaderboardModal';

const HEAVY_MACHINERY_CATEGORIES = [ItemCategory.Tractors, ItemCategory.Harvesters, ItemCategory.JCB, ItemCategory.Borewell];
const EQUIPMENT_CATEGORIES = [ItemCategory.Drones, ItemCategory.Sprayers];

// Price ranges per hour (₹) based on Telangana/Karimnagar market rates (2024)
// These are standard ranges that all suppliers must follow
const PRICE_RANGES: Record<ItemCategory, { min: number; max: number; label: string }> = {
    [ItemCategory.Workers]: { min: 50, max: 150, label: 'Farm Workers' },
    [ItemCategory.Tractors]: { min: 300, max: 600, label: 'Tractors' },
    [ItemCategory.Harvesters]: { min: 500, max: 1000, label: 'Harvesters' },
    [ItemCategory.Drones]: { min: 1500, max: 4000, label: 'Agricultural Drones' },
    [ItemCategory.Sprayers]: { min: 200, max: 500, label: 'Sprayers' },
    [ItemCategory.JCB]: { min: 800, max: 1500, label: 'JCB/Excavators' },
    [ItemCategory.Borewell]: { min: 400, max: 800, label: 'Borewell Services' },
    [ItemCategory.Drivers]: { min: 100, max: 300, label: 'Drivers' },
};

// Helper component to handle map click events
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

const AddItemScreen: React.FC<{ itemToEdit: Item | null, onBack: () => void }> = ({ itemToEdit, onBack }) => {
    const { user } = useAuth();
    const { updateUser } = useAuth();
    const { addItem, updateItem } = useItem();
    const { showToast } = useToast();
    const { bookings } = useBooking();
    const { items } = useItem();
    const { language } = useLanguage();

    const languageNames: Record<string, string> = {
        'en': 'English',
        'hi': 'Hindi',
        'te': 'Telugu'
    };
    const languageName = languageNames[language] || 'English';

    const [name, setName] = useState('');
    const [purposes, setPurposes] = useState<{ name: WorkPurpose, price: string }[]>([{ name: WORK_PURPOSES[0], price: '' }]);
    const [category, setCategory] = useState<ItemCategory>(itemToEdit?.category || ItemCategory.Tractors);
    const [location, setLocation] = useState('');
    const [itemGeo, setItemGeo] = useState<{ lat: number; lng: number } | null>(null);
    const [itemMapCenter, setItemMapCenter] = useState<[number, number]>([17.3850, 78.4867]);
    const itemMapRef = useRef<any>(null);
    const [description, setDescription] = useState('');
    const [operatorCharge, setOperatorCharge] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [quantityAvailable, setQuantityAvailable] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female'>('Male');
    const [model, setModel] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [year, setYear] = useState('');
    const [horsepower, setHorsepower] = useState('');
    const [condition, setCondition] = useState<'New' | 'Good' | 'Fair'>('Good');
    const [priceSuggestion, setPriceSuggestion] = useState('');
    const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);
    const [autoPriceOptimization, setAutoPriceOptimization] = useState(false);
    const [showKyc, setShowKyc] = useState(false);
    const [aadharImageUrl, setAadharImageUrl] = useState('');
    const [personalPhotoUrl, setPersonalPhotoUrl] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLocationSearching, setIsLocationSearching] = useState(false);
    const [locationError, setLocationError] = useState('');

    // Ref for debounce timeout
    const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isWorker = useMemo(() => category === ItemCategory.Workers, [category]);
    const isHeavyMachinery = useMemo(() => HEAVY_MACHINERY_CATEGORIES.includes(category), [category]);
    const isEquipment = useMemo(() => EQUIPMENT_CATEGORIES.includes(category), [category]);

    useEffect(() => {
        const resetForm = () => {
            setName('');
            setPurposes([{ name: WORK_PURPOSES[0], price: '' }]);
            setCategory(ItemCategory.Tractors);
            setLocation('');
            setDescription('');
            setOperatorCharge('');
            setImagePreview(null);
            setQuantityAvailable('');
            setGender('Male');
            setModel('');
            setLicensePlate('');
            setYear('');
            setHorsepower('');
            setCondition('Good');
        };

        if (itemToEdit) {
            setName(itemToEdit.name);
            setPurposes(itemToEdit.purposes.map(p => ({ name: p.name, price: p.price.toString() })));
            setCategory(itemToEdit.category);
            setLocation(itemToEdit.location);
            if (itemToEdit.locationCoords) {
                setItemGeo(itemToEdit.locationCoords);
                setItemMapCenter([itemToEdit.locationCoords.lat, itemToEdit.locationCoords.lng]);
            }
            setDescription(itemToEdit.description);
            setOperatorCharge(itemToEdit.operatorCharge?.toString() || '');
            if (itemToEdit.images && itemToEdit.images.length > 0) setImagePreview(itemToEdit.images[0]);
            setQuantityAvailable(itemToEdit.quantityAvailable?.toString() || '');
            setGender(itemToEdit.gender || 'Male');
            setModel(itemToEdit.model || '');
            setLicensePlate(itemToEdit.licensePlate || '');
            setYear(itemToEdit.year?.toString() || '');
            setHorsepower(itemToEdit.horsepower?.toString() || '');
            setCondition(itemToEdit.condition || 'Good');
            setAutoPriceOptimization(!!itemToEdit.autoPriceOptimization);
        } else {
            resetForm();
        }
        setShowKyc(false);
    }, [itemToEdit]);

    useEffect(() => {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            setCurrentLocation({ lat: latitude, lng: longitude });
        });
    }, []);

    // Fixed Operator Charge Logic
    useEffect(() => {
        if (category === ItemCategory.Harvesters) {
            setOperatorCharge('200');
        } else {
            setOperatorCharge('100');
        }
    }, [category]);

    const handleKycFileSelect = (type: 'aadhar' | 'personal') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const url = reader.result as string;
            if (type === 'aadhar') setAadharImageUrl(url);
            else setPersonalPhotoUrl(url);
        };
        reader.readAsDataURL(file);
    };

    const handleKycSave = async () => {
        if (!user) return;
        await updateUser({
            ...user,
            aadharImageUrl,
            personalPhotoUrl,
            phone: supplierPhone || user.phone,
            email: supplierEmail || user.email,
        });
        setShowKyc(false);
    };

    const handleSuggestPrice = async (purposeName: WorkPurpose) => {
        if (!ai) {
            showToast("AI service is not configured.", "error");
            return;
        }
        setIsSuggestingPrice(true);
        setPriceSuggestion('');

        try {
            const relevantBookings = bookings.filter(b =>
                b.itemCategory === category &&
                b.status === 'Completed' &&
                b.workPurpose === purposeName &&
                b.finalPrice
            );

            const itemPrices = items.filter(i =>
                i.category === category
            ).flatMap(i => i.purposes.filter(p => p.name === purposeName)).map(p => p.price);

            if (relevantBookings.length < 2 && itemPrices.length < 2) {
                setPriceSuggestion('Not enough market data for a reliable suggestion.');
                return;
            }

            const prompt = `
                As a market analysis expert for an agricultural equipment rental platform called AgriRent, suggest a competitive hourly price for a supplier.
                - Item Category: ${category}
- Work Purpose: ${purposeName}
- Supplier's Location: ${location || 'not specified'}
    - Recent booking prices for similar items(price per hour): ${itemPrices.join(', ')}
                
                Based on this data, provide a suggested price range and a very brief justification.
    IMPORTANT: Respond with the suggested range and justification in ${languageName} language only.
                Respond with ONLY the suggested range and justification.For example: 'Suggested range: ₹1500 - ₹1800. This is competitive for your area.'
                If there is not enough data, just say 'Not enough data for a suggestion.'(Translate this phrase to ${languageName} if responding in that language).
`;

            // Helper for retrying on 503
            const generateWithRetry = async (maxRetries = 3) => {
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        return await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            config: {
                                safetySettings: [
                                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                ],
                            },
                        });
                    } catch (err: any) {
                        const isOverloaded = err?.message?.includes('503') || err?.message?.includes('overloaded');
                        if (isOverloaded && i < maxRetries - 1) {
                            console.warn(`Gemini 503 / Overloaded.Retrying in ${(i + 1) * 1000}ms...`);
                            await new Promise(r => setTimeout(r, (i + 1) * 1000));
                            continue;
                        }
                        throw err;
                    }
                }
                throw new Error("Failed after 3 retries");
            };

            const result = await generateWithRetry();

            let suggestionText = "";
            try {
                const r = result as any;
                if (typeof r.text === 'function') {
                    suggestionText = r.text();
                } else if (r.text) {
                    suggestionText = r.text;
                }
            } catch (textErr) {
                if ((result as any).text) {
                    suggestionText = String((result as any).text);
                }
            }

            if (suggestionText) {
                setPriceSuggestion(suggestionText);
            } else {
                setPriceSuggestion('Could not generate a suggestion.');
            }

        } catch (error: any) {
            console.error("Error generating price suggestion:", error);
            setPriceSuggestion("Error: " + (error.message || "Failed to generate suggestion."));
        } finally {
            setIsSuggestingPrice(false);
        }
    };


    const handlePurposeChange = (index: number, key: string, value: string) => {
        const updated = [...purposes];
        updated[index] = { ...updated[index], [key]: value };
        setPurposes(updated);
    };

    const addPurpose = () => {
        const availablePurposes = CATEGORY_WORK_PURPOSES[category] || WORK_PURPOSES;
        const usedPurposes = new Set(purposes.map(p => p.name));
        const nextPurpose = availablePurposes.find(p => !usedPurposes.has(p));
        if (nextPurpose) {
            setPurposes([...purposes, { name: nextPurpose, price: '' }]);
        } else {
            showToast("All available work purposes have been added.", "info");
        }
    };

    const removePurpose = (index: number) => {
        if (purposes.length > 1) {
            setPurposes(purposes.filter((_, i) => i !== index));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;
        if (files.length > 3) {
            showToast('Please upload up to 3 images only.', 'error');
        }
        const limited = files.slice(0, 3);
        const readers = limited.map((file: File) => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        }));
        Promise.all(readers).then(urls => {
            setImagePreviews(urls);
            setImagePreview(urls[0] || null);
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isSubmitting) return;
        setIsSubmitting(true);

        // When editing, allow using existing images if no new images were uploaded
        const hasImages = imagePreviews.length > 0 || (itemToEdit && itemToEdit.images && itemToEdit.images.length > 0);
        if (!hasImages && category !== ItemCategory.Workers) {
            showToast('Please upload an image for the item.', 'error');
            return;
        }

        const validPurposes = purposes.filter(p => p.price && parseFloat(p.price) > 0);
        if (validPurposes.length === 0) {
            showToast('Please add at least one work purpose with a valid price.', 'error');
            return;
        }
        if (!itemGeo) {
            showToast('Please select a location on the map.', 'error');
            return;
        }

        // Upload images if they are base64
        const uploadedImages: string[] = [];
        try {
            if (imagePreviews.length > 0) {
                showToast('Uploading images...', 'info');
                for (const preview of imagePreviews) {
                    if (preview.startsWith('data:')) {
                        const res = await fetch(preview);
                        const blob = await res.blob();
                        const file = new File([blob], "image.jpg", { type: blob.type });
                        const url = await uploadImage(file);
                        uploadedImages.push(url);
                    } else {
                        uploadedImages.push(preview);
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Failed to upload images', 'error');
            return;
        }

        const defaultImages = {
            Male: 'https://images.unsplash.com/photo-1591181825852-f4a45a6c3a81?q=80&w=800&auto=format&fit=crop',
            Female: 'https://images.unsplash.com/photo-1601758123926-4cf339f4c278?q=80&w=800&auto=format&fit=crop'
        };
        // Use uploaded images, or preserve existing images when editing, or fallback
        const itemImages = category === ItemCategory.Workers
            ? [defaultImages[gender]]
            : (uploadedImages.length > 0
                ? uploadedImages
                : (itemToEdit?.images && itemToEdit.images.length > 0
                    ? itemToEdit.images
                    : ['https://res.cloudinary.com/demo/image/upload/v1/samples/placeholder']));

        const itemData: Omit<Item, 'id'> = {
            name,
            category,
            purposes: validPurposes.map(p => ({ name: p.name, price: parseFloat(p.price) })),
            images: itemImages,
            ownerId: user.id,
            location,
            locationCoords: itemGeo || undefined,
            description,
            available: itemToEdit ? itemToEdit.available : true,
            status: 'pending' as const,
            operatorCharge: operatorCharge ? parseFloat(operatorCharge) : undefined,
            quantityAvailable: isWorker && quantityAvailable ? parseInt(quantityAvailable) : undefined,
            model: isHeavyMachinery || isEquipment ? model : undefined,
            licensePlate: isHeavyMachinery ? licensePlate : undefined,
            year: isHeavyMachinery && year ? parseInt(year) : undefined,
            horsepower: isHeavyMachinery && horsepower ? parseInt(horsepower) : undefined,
            condition: isHeavyMachinery || isEquipment ? condition : undefined,
            gender: isWorker ? gender : undefined,
            autoPriceOptimization
        };

        if (itemToEdit) {
            // When re-uploading, clear the re-upload request flag
            const wasReuploadRequested = (itemToEdit as any).reuploadRequested;
            updateItem({
                ...itemToEdit,
                ...itemData,
                reuploadRequested: false // Clear the flag
            });
            if (wasReuploadRequested) {
                showToast('Item re-uploaded successfully! Waiting for admin approval.', 'success');
            }
        } else {
            addItem(itemData as Omit<Item, 'id'>);
            showToast('Item submitted for approval!', 'success');
        }
        // Note: isSubmitting stays true to prevent re-submission even if onBack fails
        onBack();
    };

    const fetchAddress = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();
            if (data && data.address) {
                const parts = [];

                // Prioritize more specific locations first
                if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
                else if (data.address.suburb) parts.push(data.address.suburb);
                else if (data.address.village) parts.push(data.address.village);
                else if (data.address.town) parts.push(data.address.town);
                else if (data.address.city) parts.push(data.address.city);

                // Add district/county for context
                if (data.address.county && !parts.includes(data.address.county)) parts.push(data.address.county);
                else if (data.address.state_district && !parts.includes(data.address.state_district)) parts.push(data.address.state_district);

                // Add state if very few parts
                if (parts.length < 2 && data.address.state) parts.push(data.address.state);

                const addressStr = parts.length > 0 ? parts.join(', ') : (data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                setLocation(addressStr);
            } else {
                setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
        } catch (error) {
            console.error("Error fetching address:", error);
            setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    };

    // Forward geocoding: address to coordinates
    const geocodeAddress = async (address: string) => {
        if (!address || address.trim().length < 3) return;

        setIsLocationSearching(true);
        setLocationError('');

        try {
            // Use Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=in&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
                const item = data[0];
                const newLat = parseFloat(item.lat);
                const newLng = parseFloat(item.lon);

                setItemGeo({ lat: newLat, lng: newLng });
                setItemMapCenter([newLat, newLng]);
                if (itemMapRef.current) {
                    itemMapRef.current.setView([newLat, newLng], 13);
                }
            } else {
                setLocationError('Location not found on map.');
            }
        } catch (error) {
            console.error('Error geocoding address:', error);
            setLocationError('Error finding location.');
        } finally {
            setIsLocationSearching(false);
        }
    };

    // Search for location suggestions
    const searchLocation = async (query: string) => {
        if (!query || query.trim().length < 3) {
            setLocationSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLocationSearching(true);
        try {
            // Use Nominatim API for better village-level search and country filtering
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=10&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();

            if (data && Array.isArray(data)) {
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

                // Adapt Nominatim format to match what selectSuggestion expects
                const adaptedSuggestions = sortedData.map((item: any) => ({
                    display_name: item.display_name,
                    lat: item.lat,
                    lon: item.lon,
                    address: item.address // Keep address details if needed
                }));
                setLocationSuggestions(adaptedSuggestions);
                setShowSuggestions(true);
            } else {
                setLocationSuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Error searching location:', error);
            setLocationSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLocationSearching(false);
        }
    };

    const selectSuggestion = (suggestion: any) => {
        const lat = parseFloat(suggestion.lat);
        const lon = parseFloat(suggestion.lon || suggestion.lng); // Handle both

        // Pin map
        setItemGeo({ lat, lng: lon });
        setItemMapCenter([lat, lon]);
        if (itemMapRef.current) itemMapRef.current.setView([lat, lon], 13);

        // Set short name
        const parts = suggestion.display_name.split(', ');
        const shortName = parts.slice(0, 3).join(', ');
        setLocation(shortName);

        // Clear suggestions
        setLocationSuggestions([]);
        setShowSuggestions(false);

        // Clear timeouts
        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };

    return (
        <div className="dark:text-neutral-200">
            <Header title={itemToEdit ? 'Edit Item' : 'Add Item'} onBack={onBack} />

            <form className="space-y-6" onSubmit={handleSave}>
                {category !== ItemCategory.Workers && (
                    <div>
                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                            Item Image (Max 3) <span className="text-red-600">*</span>
                        </label>
                        {imagePreviews.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative h-24 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                        <img src={preview} alt={`Item ${index + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newPreviews = imagePreviews.filter((_, i) => i !== index);
                                                setImagePreviews(newPreviews);
                                                if (newPreviews.length === 0) setImagePreview(null);
                                                else setImagePreview(newPreviews[0]);
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 w-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 text-neutral-500 mb-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={() => document.getElementById('item-images')?.click()}>
                                <svg className="w-10 h-10 mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm font-medium">Click to upload photos</span>
                            </div>
                        )}
                        <input
                            id="item-images"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                            required={!itemToEdit && imagePreviews.length === 0}
                        />
                        <div className="flex items-start mt-2">
                            <div className="flex-shrink-0">
                                <svg className="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-2 w-full">
                                <p className="text-sm text-gray-500">
                                    Please upload <span className="font-bold text-gray-700 dark:text-gray-300">clear images</span> of your vehicle/equipment from different angles (Front, Side, Back).
                                    Good quality images increase your chances of getting bookings.
                                </p>
                                <p className="text-xs text-gray-500 mt-1">JPEG, JPG, PNG, WEBP (max 3)</p>
                            </div>
                        </div>
                    </div>
                )}
                <Input label="Item Name (e.g., Tractor, Rotavator, Seed Planter)" value={name} onChange={e => setName(e.target.value)} required />

                <div>
                    <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Select Item Location on Map <span className="text-red-600">*</span></label>
                    <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-600 shadow-sm">
                        <MapContainer center={itemMapCenter} zoom={12} scrollWheelZoom={true} style={{ height: '240px', width: '100%' }}>
                            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapClickHandler onMapClick={(lat, lng) => {
                                setItemGeo({ lat, lng });
                                fetchAddress(lat, lng);
                            }} />
                            {currentLocation && (
                                <Marker
                                    position={[currentLocation.lat, currentLocation.lng]}
                                    icon={new L.DivIcon({
                                        html: '<div class="w-4 h-4 rounded-full bg-green-600 ring-2 ring-white"></div>',
                                        className: '',
                                        iconSize: [16, 16],
                                        iconAnchor: [8, 8],
                                    })}
                                />
                            )}
                            {itemGeo && (
                                <Marker
                                    position={[itemGeo.lat, itemGeo.lng]}
                                    icon={L.icon({
                                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                                        iconSize: [25, 41],
                                        iconAnchor: [12, 41],
                                        popupAnchor: [1, -34],
                                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                                        shadowSize: [41, 41]
                                    })}
                                    draggable
                                    eventHandlers={{
                                        dragend: (e: any) => {
                                            const latlng = e.target.getLatLng();
                                            setItemGeo({ lat: latlng.lat, lng: latlng.lng });
                                            fetchAddress(latlng.lat, latlng.lng);
                                        }
                                    }}
                                />
                            )}
                        </MapContainer>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Tap the map or drag the pin to set the exact location.
                    </p>
                    {itemGeo && <p className="text-xs text-primary font-medium mt-1">Selected Location: {itemGeo.lat.toFixed(4)}, {itemGeo.lng.toFixed(4)}</p>}
                </div>

                {/* Location Address Field */}
                <div>
                    <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                        Location Address <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                        <div className="flex gap-2">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => {
                                        const newLocation = e.target.value;
                                        setLocation(newLocation);

                                        // Clear previous timeouts
                                        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
                                        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

                                        // Search suggestions (500ms)
                                        searchTimeoutRef.current = setTimeout(() => searchLocation(newLocation), 500);
                                    }}
                                    onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                                    placeholder="Enter location (e.g., Village, Mandal)"
                                    required
                                    className="w-full pl-4 pr-12 py-3 border border-neutral-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 bg-white dark:bg-gray-700 text-neutral-800 dark:text-white"
                                />

                                {/* Search Suggestions Dropdown */}
                                {showSuggestions && locationSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-neutral-200 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
                                        {locationSuggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => selectSuggestion(suggestion)}
                                                className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-neutral-800 dark:text-white border-b border-neutral-100 dark:border-gray-600 last:border-0 flex items-center gap-2"
                                            >
                                                <span className="text-green-600">📍</span> {suggestion.display_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => geocodeAddress(location)}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold whitespace-nowrap shadow-sm"
                                disabled={isLocationSearching}
                            >
                                {isLocationSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                    </div>
                    {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Farmers will see this address for your equipment.
                    </p>
                </div>

                <div>
                    <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Category</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value as ItemCategory)}
                            className="appearance-none shadow-sm border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 pr-10 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-shadow"
                        >
                            {Object.values(ItemCategory).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Work Purposes Section */}
                <div className="space-y-4 p-5 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">Price Configuration</h3>
                        {priceSuggestion && (
                            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                                <span>💡 {priceSuggestion}</span>
                                <button onClick={() => setPriceSuggestion('')} type="button" className="text-blue-500 hover:text-blue-700 font-bold">&times;</button>
                            </div>
                        )}
                    </div>

                    {purposes.map((p, index) => (
                        <div key={index} className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm transition-shadow hover:shadow-md">
                            <div className="flex items-start gap-3">
                                {/* Image Thumbnail Logic - Helper function or inline check */}
                                <div className="hidden sm:block flex-shrink-0 mt-1">
                                    {(category === ItemCategory.Workers || category === ItemCategory.Harvesters || category === ItemCategory.Tractors) ? (
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden">
                                            {(category === ItemCategory.Workers && WORKER_PURPOSE_IMAGES[p.name]) ||
                                                (category === ItemCategory.Harvesters && HARVESTER_PURPOSE_IMAGES[p.name]) ||
                                                (category === ItemCategory.Tractors && TRACTOR_PURPOSE_IMAGES[p.name]) ? (
                                                <img
                                                    src={
                                                        (category === ItemCategory.Workers && WORKER_PURPOSE_IMAGES[p.name]) ||
                                                        (category === ItemCategory.Harvesters && HARVESTER_PURPOSE_IMAGES[p.name]) ||
                                                        (category === ItemCategory.Tractors && TRACTOR_PURPOSE_IMAGES[p.name])
                                                    }
                                                    alt={p.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex-grow space-y-3">
                                    {/* Price Range Hint - shown above the row */}
                                    <div className="px-2 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                                        <p className="text-xs text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
                                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span>Standard Price Range: <strong>₹{PRICE_RANGES[category]?.min || 100} - ₹{PRICE_RANGES[category]?.max || 1000}/hr</strong></span>
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Work Purpose</label>
                                            <div className="relative">
                                                <select
                                                    value={p.name}
                                                    onChange={(e) => handlePurposeChange(index, 'name', e.target.value)}
                                                    className="w-full appearance-none shadow-sm border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg py-2.5 pl-3 pr-8 text-neutral-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                                >
                                                    {(CATEGORY_WORK_PURPOSES[category] || WORK_PURPOSES).map(wp => (
                                                        <option key={wp} value={wp} disabled={purposes.some((purpose, i) => i !== index && purpose.name === wp)}>
                                                            {wp}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Price per Hour (₹)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    placeholder={`${PRICE_RANGES[category]?.min || 100} - ${PRICE_RANGES[category]?.max || 1000}`}
                                                    value={p.price}
                                                    onChange={(e) => handlePurposeChange(index, 'price', e.target.value)}
                                                    min={PRICE_RANGES[category]?.min || 100}
                                                    max={PRICE_RANGES[category]?.max || 1000}
                                                    className="w-full shadow-sm appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg py-2.5 px-3 text-neutral-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 font-semibold"
                                                    required
                                                />
                                                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">₹/hr</span>
                                            </div>
                                            {p.price && (Number(p.price) < (PRICE_RANGES[category]?.min || 0) || Number(p.price) > (PRICE_RANGES[category]?.max || Infinity)) && (
                                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    Price must be between ₹{PRICE_RANGES[category]?.min} - ₹{PRICE_RANGES[category]?.max}/hr
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <button type="button" onClick={() => handleSuggestPrice(p.name)} disabled={isSuggestingPrice} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors font-medium">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            AI Suggest Price
                                        </button>
                                        <button type="button" onClick={() => removePurpose(index)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50" disabled={purposes.length <= 1}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addPurpose}
                        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-500 transition-colors font-semibold flex items-center justify-center gap-2"
                        disabled={purposes.length >= (CATEGORY_WORK_PURPOSES[category] || WORK_PURPOSES).length}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        Add Another Purpose
                    </button>
                </div>

                {isWorker && (
                    <div>
                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Gender</label>
                        <div className="relative">
                            <select value={gender} onChange={e => setGender(e.target.value as 'Male' | 'Female')} className="appearance-none shadow-sm border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 pr-10 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500/50">
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">A default image will be assigned based on gender.</p>
                    </div>
                )}

                <div>
                    <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        required
                        className="shadow-sm appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        placeholder="Describe your item's condition, features, or any specific terms..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isHeavyMachinery && (
                        <>
                            <Input label="Machine Model" value={model} onChange={e => setModel(e.target.value)} required />
                            <Input label="Number Plate" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} required />
                            <Input label="Year of Manufacture" type="number" value={year} onChange={e => setYear(e.target.value)} required />
                            <Input label="Horsepower (HP)" type="number" value={horsepower} onChange={e => setHorsepower(e.target.value)} required />
                        </>
                    )}
                    {isEquipment && (
                        <Input label="Equipment Model" value={model} onChange={e => setModel(e.target.value)} required />
                    )}
                </div>

                {(isHeavyMachinery || isEquipment) && (
                    <div>
                        <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Condition</label>
                        <div className="relative">
                            <select value={condition} onChange={e => setCondition(e.target.value as 'New' | 'Good' | 'Fair')} className="appearance-none shadow-sm border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 pr-10 text-neutral-800 dark:text-white leading-tight focus:outline-none focus:ring-2 focus:ring-green-500/50">
                                <option value="New">New</option>
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                    </div>
                )}

                <Input
                    label={`Operator Charge per hour (₹) - Fixed Rate`}
                    type="number"
                    value={operatorCharge}
                    onChange={() => { }} // Read-only
                    disabled={true}
                    className="bg-gray-100 dark:bg-neutral-800 cursor-not-allowed opacity-70"
                />

                <div className="flex items-center justify-between p-5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-neutral-700/50">
                    <div>
                        <p className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                            Auto Price Optimization
                            <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">New</span>
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-[250px]">
                            Automatically adjust prices based on real-time demand and seasonality.
                        </p>
                    </div>
                    {/* FIXED: Toggle Visibility */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={autoPriceOptimization}
                        onClick={() => setAutoPriceOptimization(prev => !prev)}
                        className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${autoPriceOptimization ? 'bg-green-600 border-2 border-green-600' : 'bg-gray-200 border-2 border-gray-300'}`}
                    >
                        <span className="sr-only">Toggle Auto Price Optimization</span>
                        <span
                            className={`inline-block w-6 h-6 transform bg-white rounded-full shadow transition-transform ${autoPriceOptimization ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                    </button>
                </div>

                {isWorker && (
                    <Input label="Available Quantity" type="number" value={quantityAvailable} onChange={e => setQuantityAvailable(e.target.value)} placeholder="e.g., 10" required min="0" />
                )}

                <div className="flex justify-center pt-6 pb-20 md:pb-0">
                    <Button
                        type="submit"
                        className="w-full md:w-auto px-10 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                Submitting...
                            </span>
                        ) : (
                            itemToEdit ? 'Save Changes' : 'Submit Item'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const SupplierListingsScreen: React.FC<{ onAddItem: () => void, onEditItem: (m: Item) => void, kycStatus?: string | null, openKycForm?: () => void }> = ({ onAddItem, onEditItem, kycStatus, openKycForm }) => {
    const { user } = useAuth();
    const { items, deleteItem, updateItem } = useItem();
    const { bookings } = useBooking();
    const myItems = items.filter(m => m.ownerId === user?.id);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'reupload'>('all');

    // Filter items based on status
    const filteredItems = useMemo(() => {
        return myItems.filter(item => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'approved') return item.status === 'approved';
            if (statusFilter === 'pending') return item.status === 'pending' && !(item as any).reuploadRequested;
            if (statusFilter === 'reupload') return (item as any).reuploadRequested || item.status === 'rejected';
            return true;
        });
    }, [myItems, statusFilter]);

    // Count items by status
    const statusCounts = useMemo(() => ({
        all: myItems.length,
        approved: myItems.filter(i => i.status === 'approved').length,
        pending: myItems.filter(i => i.status === 'pending' && !(i as any).reuploadRequested).length,
        reupload: myItems.filter(i => (i as any).reuploadRequested || i.status === 'rejected').length,
    }), [myItems]);

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            deleteItem(itemToDelete.id);
        }
        setItemToDelete(null);
    }

    const handleAddItemClick = () => {
        onAddItem();
    };

    const getStatusClasses = (status: Item['status']) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const optimizePrices = (item: Item) => {
        const seasonBoost = (() => {
            const m = new Date().getMonth() + 1
            if ([9, 10, 11].includes(m)) return 1.15
            if ([3, 4, 5].includes(m)) return 1.1
            return 1
        })()
        const demandBoost = (() => {
            const count = bookings.filter(b => b.itemId === item.id && ['Confirmed', 'Completed', 'Pending Payment', 'Arrived', 'In Process'].includes(b.status)).length
            if (count > 10) return 1.2
            if (count > 5) return 1.1
            return 1
        })()
        const competitorAvg = (() => {
            const peers = items.filter(i => i.category === item.category && i.location === item.location && i.id !== item.id)
            const prices = peers.flatMap(p => p.purposes.map(x => x.price))
            if (prices.length === 0) return undefined
            return prices.reduce((a, b) => a + b, 0) / prices.length
        })()
        const updatedPurposes = item.purposes.map(p => {
            const base = p.price
            const adjusted = Math.round(base * seasonBoost * demandBoost)
            if (competitorAvg && adjusted < competitorAvg * 0.9) return { ...p, price: Math.round(competitorAvg * 0.95) }
            return { ...p, price: adjusted }
        })
        updateItem({ ...item, purposes: updatedPurposes })
    }

    return (
        <div className="dark:text-neutral-200">
            <div className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    {/* Status Filters - Compact Icons */}
                    <div className="flex space-x-2 bg-gray-100 dark:bg-neutral-700 p-1.5 rounded-lg">
                        <style>{`
                            .hide-scrollbar::-webkit-scrollbar { display: none; }
                        `}</style>
                        {[
                            { id: 'all', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>, label: 'All' },
                            { id: 'pending', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Pending' },
                            { id: 'approved', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Approved' },
                            { id: 'reupload', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>, label: 'Re-upload' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setStatusFilter(item.id as any)}
                                title={item.label}
                                className={`relative p-2 rounded-md transition-all ${statusFilter === item.id
                                    ? 'bg-white dark:bg-neutral-600 text-primary shadow-sm ring-1 ring-black/5'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-600/50'
                                    }`}
                            >
                                {item.icon}
                                {statusCounts[item.id as keyof typeof statusCounts] > 0 && (
                                    <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${statusFilter === item.id ? 'bg-primary text-white' : 'bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'}`}>
                                        {statusCounts[item.id as keyof typeof statusCounts]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col items-end">
                        <button onClick={handleAddItemClick} disabled={!(kycStatus === 'Pending' || kycStatus === 'Submitted' || kycStatus === 'Approved')} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Item
                        </button>
                        {(!kycStatus || kycStatus === 'Rejected') && (
                            <button onClick={openKycForm} className="mt-2 text-xs text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full font-medium">⚠️ Complete KYC to add items</button>
                        )}
                    </div>
                </div>

                {/* Re-upload Alert */}
                {myItems.some(i => (i as any).reuploadRequested) && (
                    <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <h3 className="font-bold text-orange-800 dark:text-orange-200 text-lg">Action Required</h3>
                        </div>
                        <p className="text-sm text-orange-700 dark:text-orange-300 ml-9">Admin has requested you to re-upload some items. Please check below and update the required items.</p>
                    </div>
                )}

                <div className="space-y-6">
                    {filteredItems.length > 0 ? (
                        [...filteredItems]
                            .sort((a, b) => {
                                // Re-upload requested items first
                                const aReupload = (a as any).reuploadRequested || a.status === 'rejected' ? 1 : 0;
                                const bReupload = (b as any).reuploadRequested || b.status === 'rejected' ? 1 : 0;
                                return bReupload - aReupload;
                            })
                            .map(item => {
                                const minPrice = Math.min(...item.purposes.map(p => p.price));
                                const isReuploadRequested = (item as any).reuploadRequested;
                                return (
                                    <div key={item.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                        {/* Card Header with Image and Details */}
                                        <div className="flex gap-5 p-5">
                                            {/* Item Image */}
                                            <div className="flex-shrink-0">
                                                {item.images && item.images[0] ? (
                                                    <img
                                                        src={item.images[0]}
                                                        alt={item.name}
                                                        className="w-24 h-24 object-cover rounded-xl border border-neutral-200 dark:border-neutral-600 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                                                        <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Item Details */}
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white truncate">{item.name || '--'}</h3>
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                                            <span className="text-neutral-500">Starting from</span> <span className="font-bold text-neutral-800 dark:text-neutral-200">₹{minPrice}/hr</span>
                                                        </p>
                                                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600">
                                                            {item.category}
                                                        </span>
                                                    </div>
                                                    <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full ${getStatusClasses(item.status)}`}>
                                                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                    </span>
                                                </div>

                                                {/* Re-upload Badge */}
                                                {isReuploadRequested && (
                                                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2.5 py-1 rounded-full font-medium">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                        Re-upload Requested
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons - Left aligned with equal width */}
                                        <div className="px-5 pb-5 pt-3 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-800/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-3 flex-1">
                                                    <button
                                                        onClick={() => onEditItem(item)}
                                                        className={`font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white ${isReuploadRequested || item.status === 'rejected' ? 'animate-pulse ring-2 ring-green-300 ring-offset-2' : ''
                                                            }`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            {isReuploadRequested || item.status === 'rejected' ? (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                            ) : (
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            )}
                                                        </svg>
                                                        {isReuploadRequested || item.status === 'rejected' ? 'Fix Issue' : 'Edit'}
                                                    </button>
                                                    <button
                                                        onClick={() => optimizePrices(item)}
                                                        className="bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center justify-center gap-1.5"
                                                    >
                                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                        </svg>
                                                        Optimize
                                                    </button>
                                                    <button
                                                        onClick={() => setItemToDelete(item)}
                                                        className="text-red-600 hover:bg-red-50 font-semibold py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <span className={`ml-3 text-xs font-bold px-3 py-1.5 rounded-full border ${item.autoPriceOptimization ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                    {item.autoPriceOptimization ? '✓ Auto-Opt Active' : 'Auto-Opt Off'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                    ) : (
                        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="text-neutral-600 dark:text-neutral-400 font-medium">You haven't added any items yet.</p>
                            <button onClick={handleAddItemClick} disabled={!(kycStatus === 'Pending' || kycStatus === 'Submitted' || kycStatus === 'Approved')} className="mt-3 text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline">
                                Add your first item
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {itemToDelete && (
                <ConfirmationDialog
                    title="Delete Item"
                    message={`Are you sure you want to delete "${itemToDelete.name}"?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setItemToDelete(null)}
                />
            )}
        </div>
    )
}

export const SupplierKycInlineForm: React.FC<{ onSubmitted: () => void }> = ({ onSubmitted }) => {
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [address, setAddress] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aadhaarPreview, setAadhaarPreview] = useState<string>('');
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [panPreview, setPanPreview] = useState<string>('');
    const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [panFile, setPanFile] = useState<File | null>(null);
    const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
    const [center, setCenter] = useState<[number, number]>([17.3850, 78.4867]);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        if (user) {
            setFullName(user.name || '');
            setPhone(user.phone || '');
            setLocation((user as any).location || '');
            setAddress((user as any).address || '');
        }
    }, [user]);

    const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const onAadhaarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = await readFileAsDataUrl(file);
        setAadhaarPreview(url);
        setAadhaarFile(file);
    };

    const onPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = await readFileAsDataUrl(file);
        setPhotoPreview(url);
        setPhotoFile(file);
    };

    const onPanSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = await readFileAsDataUrl(file);
        setPanPreview(url);
        setPanFile(file);
    };

    const itemIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    const [kycStatus, setKycStatus] = useState<string | null>(null);
    const [kycDocs, setKycDocs] = useState<any[]>([]);

    useEffect(() => {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            setGeo({ lat: latitude, lng: longitude });
            setCenter([latitude, longitude]);
            if (mapRef.current) mapRef.current.setView([latitude, longitude], 14);
        });
    }, []);

    // Fetch existing KYC data
    useEffect(() => {
        if (!user) return;
        const fetchKyc = async () => {
            try {
                const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
                const res = await fetch(`${apiUrl}/kyc/${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setKycStatus(data.status);
                    setKycDocs(data.docs || []);

                    // Pre-fill form
                    if (data.fullName) setFullName(data.fullName);
                    if (data.phone) setPhone(data.phone);
                    if (data.address) setAddress(data.address);

                    // Pre-fill documents
                    const aadhaar = data.docs?.find((d: any) => d.type === 'Aadhaar');
                    if (aadhaar) {
                        setAadhaarPreview(aadhaar.url);
                        setAadhaarNumber(aadhaar.number || '');
                    }

                    const photo = data.docs?.find((d: any) => d.type === 'PersonalPhoto');
                    if (photo) {
                        setPhotoPreview(photo.url);
                    }

                    const pan = data.docs?.find((d: any) => d.type === 'PAN');
                    if (pan) {
                        setPanPreview(pan.url);
                        setPanNumber(pan.number || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching KYC:', error);
            }
        };
        fetchKyc();
    }, [user]);

    const getDocStatus = (type: string) => {
        const doc = kycDocs.find(d => d.type === type);
        return doc?.status;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        try {
            showToast('Uploading KYC documents...', 'info');
            let aadhaarUrl = '';
            let photoUrl = '';
            let panUrl = '';

            // Upload images to Cloudinary or use existing
            if (aadhaarFile) {
                console.log('Uploading Aadhaar image...');
                aadhaarUrl = await uploadImage(aadhaarFile);
            } else if (aadhaarPreview && !aadhaarPreview.startsWith('data:')) {
                aadhaarUrl = aadhaarPreview; // Use existing URL
            }

            if (photoFile) {
                console.log('Uploading personal photo...');
                photoUrl = await uploadImage(photoFile);
            } else if (photoPreview && !photoPreview.startsWith('data:')) {
                photoUrl = photoPreview;
            }

            if (panFile) {
                console.log('Uploading PAN image...');
                panUrl = await uploadImage(panFile);
            } else if (panPreview && !panPreview.startsWith('data:')) {
                panUrl = panPreview;
            }

            // Submit KYC data to backend
            const kycPayload = {
                userId: user.id,
                fullName,
                phone,
                address,
                location,
                aadhaarNumber,
                aadhaarUrl,
                photoUrl,
                panNumber: panNumber || undefined,
                panUrl: panUrl || undefined
            };

            console.log('Submitting KYC data:', kycPayload);
            const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
            const response = await fetch(`${apiUrl}/kyc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(kycPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit KYC');
            }

            const result = await response.json();
            console.log('KYC submission successful:', result);

            // Update user with phone if changed
            if (phone !== user.phone) {
                await updateUser({ ...user, phone });
            }

            showToast('KYC submitted successfully. Verification pending.', 'success');
            onSubmitted();
        } catch (error: any) {
            console.error('KYC submission error:', error);
            showToast(error.message || 'Failed to submit KYC. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = Boolean(
        aadhaarPreview && photoPreview && geo && fullName && phone && address && aadhaarNumber
    );


    const renderStatusBadge = (type: string) => {
        const status = getDocStatus(type);
        if (!status) return null;

        if (status === 'Approved') {
            return <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Verified</span>;
        }
        if (status === 'ReuploadRequested') {
            return <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full animate-pulse">Re-upload Required</span>;
        }
        if (status === 'Rejected') {
            return <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Rejected</span>;
        }
        return <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Pending</span>;
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            {kycStatus === 'Approved' && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h3 className="font-semibold text-green-800 dark:text-green-200">KYC Verified Successfully! ✓</h3>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">Your KYC has been approved by our admin team. You can now add and list items.</p>
                </div>
            )}
            <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} required />
            <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} required />
            <div>
                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Select Location on Map <span className="text-red-600">*</span></label>
                <div className="rounded overflow-hidden border border-neutral-200 dark:border-neutral-600">
                    <MapContainer center={center} zoom={12} scrollWheelZoom={true} style={{ height: '220px', width: '100%' }}>
                        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapClickHandler onMapClick={(lat, lng) => {
                            setGeo({ lat, lng });
                            setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                        }} />
                        {geo && (
                            <Marker
                                position={[geo.lat, geo.lng]}
                                icon={itemIcon}
                                draggable
                                eventHandlers={{
                                    dragend: (e: any) => {
                                        const latlng = e.target.getLatLng();
                                        setGeo({ lat: latlng.lat, lng: latlng.lng });
                                        setLocation(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
                                    }
                                }}
                            />
                        )}
                    </MapContainer>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Drag the pin or tap the map to set location.</p>
                {geo && <p className="text-xs text-neutral-600 dark:text-neutral-400">Selected: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</p>}
            </div>
            <div>
                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                    Aadhaar Image <span className="text-red-600">*</span>
                    {renderStatusBadge('Aadhaar')}
                </label>
                {aadhaarPreview && <img src={aadhaarPreview} alt="Aadhaar" className="h-24 w-32 object-cover rounded-md mb-2" />}
                <input type="file" accept="image/*" capture="environment" onChange={onAadhaarSelect} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-2 px-3 text-neutral-800 dark:text-white" />
            </div>
            <Input label="Aadhaar Number" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} required />
            <div>
                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                    Live Photo <span className="text-red-600">*</span>
                    {renderStatusBadge('PersonalPhoto')}
                </label>
                {photoPreview && <img src={photoPreview} alt="Live" className="h-24 w-24 object-cover rounded-full mb-2" />}
                <input type="file" accept="image/*" capture="user" onChange={onPhotoSelect} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-2 px-3 text-neutral-800 dark:text-white" />
            </div>
            <div>
                <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                    PAN (Optional)
                    {renderStatusBadge('PAN')}
                </label>
                {panPreview && <img src={panPreview} alt="PAN" className="h-24 w-32 object-cover rounded-md mb-2" />}
                <input type="file" accept="image/*,application/pdf" onChange={onPanSelect} className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-2 px-3 text-neutral-800 dark:text-white" />
                <Input label="PAN Number (Optional)" value={panNumber} onChange={e => setPanNumber(e.target.value)} />
            </div>

            <Button
                type="submit"
                disabled={isSubmitting || !canSubmit || kycStatus === 'Approved'}
                className={kycStatus === 'Approved' ? 'blur-[2px] opacity-50 cursor-not-allowed' : ''}
            >
                {isSubmitting ? 'Processing...' : kycStatus === 'Approved' ? 'KYC Already Approved' : 'Submit KYC'}
            </Button>
        </form>
    );
};
// Minimal Professional StatCard
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-neutral-800 p-3 md:p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow h-full flex flex-col justify-center">
        <div className="flex flex-col space-y-1 md:space-y-3">
            <div className="flex items-center justify-between mb-1 md:mb-0">
                <div className="p-1.5 md:p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    {/* Scale icon down on mobile */}
                    <div className="transform scale-75 md:scale-100 origin-top-left">
                        {icon}
                    </div>
                </div>
            </div>
            <div>
                <p className="text-lg md:text-3xl font-bold text-gray-900 dark:text-white leading-tight truncate">{value}</p>
                <p className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1 truncate max-w-full" title={title}>{title}</p>
            </div>
        </div>
    </div>
);


const SupplierDashboardScreen: React.FC<SupplierViewProps & { goToTab?: (name: string) => void, kycStatus?: string | null }> = ({ navigate, goToTab, kycStatus, onSwitchMode, roleBadge }) => {
    const { user, logout } = useAuth();
    const { bookings, damageReports } = useBooking();
    const { items } = useItem();
    const { reviews } = useReview();
    const { t } = useLanguage();
    const [showWeeklyTrend, setShowWeeklyTrend] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [reuploadTypes, setReuploadTypes] = useState<string[]>([]);

    useEffect(() => {
        const loadReupload = async () => {
            if (!user) return;
            try {
                // Fetch KYC status/docs from backend
                const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api'}/kyc/${user.id}`);
                if (res.ok) {
                    const kycData = await res.json();
                    const docs = kycData.docs || [];
                    const types = Array.isArray(docs) ? docs.filter((d: any) => d && d.status === 'ReuploadRequested').map((d: any) => d.type) : [];
                    setReuploadTypes(types);
                }
            } catch {
                // Silent fail or retry
            }
        };
        loadReupload();
    }, [user]);

    const supplierItems = useMemo(() => items.filter(i => i.ownerId === user?.id), [items, user]);
    const supplierItemIds = useMemo(() => supplierItems.map(i => i.id), [supplierItems]);

    const totalEarnings = useMemo(() => {
        return bookings
            .filter(b => supplierItemIds.includes(b.itemId!) && b.status === 'Completed')
            .reduce((acc, booking) => acc + (booking.finalPrice || 0), 0);
    }, [bookings, supplierItemIds]);

    const { avgRating, totalReviews } = useMemo(() => {
        const relevantReviews = reviews.filter(r => r.itemId && supplierItemIds.includes(r.itemId));
        if (relevantReviews.length === 0) return { avgRating: 0, totalReviews: 0 };
        const total = relevantReviews.reduce((acc, r) => acc + r.rating, 0);
        return {
            avgRating: total / relevantReviews.length,
            totalReviews: relevantReviews.length,
        };
    }, [reviews, supplierItemIds]);

    const popularItems = useMemo(() => {
        const bookingCounts = bookings.reduce((acc, booking) => {
            if (booking.itemId && supplierItemIds.includes(booking.itemId)) {
                acc[booking.itemId] = (acc[booking.itemId] || 0) + 1;
            }
            return acc;
        }, {} as Record<number, number>);

        return Object.entries(bookingCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([itemId, count]) => {
                const item = items.find(i => i.id === Number(itemId));
                return { name: item?.name || 'Unknown Item', count };
            });

    }, [bookings, items, supplierItemIds]);

    const performance = useMemo(() => {
        const supplierBookings = bookings.filter(b => b.itemId && supplierItemIds.includes(b.itemId))
        const total = supplierBookings.length || 1
        const arrived = supplierBookings.filter(b => b.status === 'Arrived').length
        const confirmed = supplierBookings.filter(b => b.status === 'Confirmed').length
        const completed = supplierBookings.filter(b => b.status === 'Completed').length
        const acceptanceRatio = confirmed / total
        const onTimeRatio = arrived / total
        const averageRating = avgRating || 0
        const complaints = damageReports.filter(d => d.itemId && supplierItemIds.includes(d.itemId)).length
        const complaintRatio = complaints / total
        const conditionScore = (() => {
            const conds = items.filter(i => supplierItemIds.includes(i.id)).map(i => i.condition)
            if (conds.length === 0) return 0.8
            const map: Record<string, number> = { New: 1, Good: 0.9, Fair: 0.75 }
            return conds.reduce((a, c) => a + (map[c || 'Good'] || 0.9), 0) / conds.length
        })()
        const score = Math.max(0, Math.min(100,
            Math.round(
                acceptanceRatio * 25 +
                onTimeRatio * 25 +
                (averageRating / 5) * 25 +
                conditionScore * 15 -
                complaintRatio * 10
            )
        ))
        return { score, acceptanceRatio, onTimeRatio, averageRating, complaintRatio }
    }, [bookings, supplierItemIds, avgRating, damageReports, items])
    const finance = useMemo(() => {
        const completed = bookings.filter(b => b.itemId && supplierItemIds.includes(b.itemId) && b.status === 'Completed')
        const byDay: Record<string, number> = {}
        const byItem: Record<number, number> = {}
        completed.forEach(b => {
            const d = new Date(b.paymentDetails?.paymentDate || new Date().toISOString())
            const key = d.toISOString().split('T')[0]
            const amt = b.supplierPaymentAmount || b.finalPrice || 0
            byDay[key] = (byDay[key] || 0) + amt
            if (b.itemId) byItem[b.itemId] = (byItem[b.itemId] || 0) + amt
        })
        const todayKey = new Date().toISOString().split('T')[0]
        const dailyRevenue = byDay[todayKey] || 0
        const last7DaysKeys = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0] }).reverse()
        const weeklyTrend = last7DaysKeys.map(k => ({ date: k, amount: byDay[k] || 0 }))
        const machineWise = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, amt]) => ({ name: items.find(i => i.id === Number(id))?.name || 'Item', amount: amt }))
        return { dailyRevenue, weeklyTrend, machineWise }
    }, [bookings, supplierItemIds, items])

    const ProfileLink: React.FC<{ label: string, onClick: () => void, icon?: React.ReactElement }> = ({ label, onClick, icon }) => (
        <button onClick={onClick} className="w-full text-left p-4 bg-white dark:bg-neutral-800 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors">
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">{label}</span>
            {icon || <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
        </button>
    );

    return (
        <div className="p-6 space-y-6 dark:text-neutral-200 bg-white dark:bg-neutral-900">
            {/* Minimal Welcome Card */}
            <div className="bg-gray-50 dark:bg-neutral-800 p-6 rounded-xl border border-gray-200 dark:border-neutral-700">
                {/* Removed gradient decorative elements */}

                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {user?.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {t('welcome')}, {user?.name}!
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>

                            {kycStatus && (kycStatus === 'Submitted' || kycStatus === 'Pending') && (
                                <p className="text-yellow-700 dark:text-yellow-300 mt-2 text-sm">⏳ KYC verification pending...</p>
                            )}
                            {reuploadTypes.length > 0 && (
                                <div className="mt-2 flex items-center gap-2">
                                    <p className="text-red-700 dark:text-red-300 text-sm">⚠️ Re-upload: {reuploadTypes.join(', ')}</p>
                                    <button onClick={() => navigate({ view: 'MY_ACCOUNT' })} className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">Fix now</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {roleBadge && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {roleBadge}
                        </span>
                    )}

                    {/* Leaderboard Trigger */}
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 border-2 border-orange-400"
                    >
                        <span className="text-lg">🏆</span>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-xs font-semibold opacity-90">Streak</span>
                            <span className="font-bold">{user?.streak?.currentCount || 0}</span>
                        </div>
                    </button>
                </div>
            </div>

            <StreakLeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

            {/* Key Stats Grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div onClick={() => navigate({ view: 'EARNINGS_DETAILS' })} className="cursor-pointer">
                    <StatCard
                        title={t('totalEarnings')}
                        value={`₹${totalEarnings.toLocaleString()}`}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                </div>
                <StatCard
                    title={t('avgRating')}
                    value={avgRating > 0 ? `${avgRating.toFixed(1)}/5` : 'N/A'}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                />
                <StatCard
                    title="Performance Score"
                    value={`${performance.score}/100`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2v0a2 2 0 012-2z" /></svg>}
                />
            </div>

            <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2">{t('mostPopularItems')}</h3>
                {popularItems.length > 0 ? (
                    <ul className="space-y-2">
                        {popularItems.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm p-2 bg-neutral-50 dark:bg-neutral-600 rounded-md">
                                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{index + 1}. {item.name}</span>
                                <span className="font-bold text-primary">{item.count} bookings</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-sm text-neutral-500 py-4">No bookings yet to determine popularity.</p>
                )}
            </div>
            <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2">Performance Breakdown</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                        <p className="text-neutral-600 dark:text-neutral-300">Acceptance</p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-100">{Math.round(performance.acceptanceRatio * 100)}%</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                        <p className="text-neutral-600 dark:text-neutral-300">On-time Arrival</p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-100">{Math.round(performance.onTimeRatio * 100)}%</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                        <p className="text-neutral-600 dark:text-neutral-300">Avg Rating</p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-100">{avgRating > 0 ? `${avgRating.toFixed(1)}/5` : 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                        <p className="text-neutral-600 dark:text-neutral-300">Complaints</p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-100">{Math.round(performance.complaintRatio * 100)}%</p>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2">Financial Dashboard</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                        <p className="text-neutral-600 dark:text-neutral-300">Daily Revenue</p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-100">₹{finance.dailyRevenue.toLocaleString()}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <button onClick={() => setShowWeeklyTrend(true)} className="w-full text-left text-sm font-bold text-primary">Weekly Trend</button>
                </div>
                <div className="mt-4">
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mb-2">Top Machines</p>
                    <div className="space-y-2">
                        {finance.machineWise.map((m, i) => (
                            <div key={i} className="flex justify-between text-sm p-2 bg-neutral-50 dark:bg-neutral-800 rounded-md">
                                <span>{m.name}</span>
                                <span className="font-bold">₹{m.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        {finance.machineWise.length === 0 && (
                            <p className="text-neutral-600 dark:text-neutral-300 text-sm">No earnings yet.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-600">
                    <h3 className="p-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">{t('profile')}</h3>
                    <ProfileLink label={t('myAccount')} onClick={() => navigate({ view: 'MY_ACCOUNT' })} />

                    <ProfileLink label={t('paymentHistory')} onClick={() => navigate({ view: 'PAYMENT_HISTORY' })} />
                    <ProfileLink label={t('bookingHistory')} onClick={() => navigate({ view: 'BOOKING_HISTORY' })} />
                    <ProfileLink label={t('settings')} onClick={() => navigate({ view: 'SETTINGS' })} />
                    <ProfileLink label={t('raiseAComplaint')} onClick={() => navigate({ view: 'SUPPORT' })} />
                    <ProfileLink label={t('privacyPolicy')} onClick={() => navigate({ view: 'POLICY' })} />
                    <ProfileLink label={t('privacyPolicy')} onClick={() => navigate({ view: 'POLICY' })} />
                </div>
                {/* Switch Mode Button */}
                {onSwitchMode && (
                    <button
                        onClick={onSwitchMode}
                        className="w-full p-4 bg-white dark:bg-neutral-700 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-full text-orange-600 dark:text-orange-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </div>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                                Switch to {roleBadge?.includes('Farmer') ? 'Supplier' : 'Farmer'} View
                            </span>
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
            {
                showWeeklyTrend && (
                    <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center">
                        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 w-[90%] max-w-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">Weekly Revenue Trend</h4>
                                <button onClick={() => setShowWeeklyTrend(false)} className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700">✕</button>
                            </div>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={finance.weeklyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="amount" stroke="#10b981" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};


const supplierNavItems: NavItemConfig[] = [
    { name: 'requests', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
    { name: 'bookings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { name: 'schedule', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { name: 'listings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
    { name: 'dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
];



const SupplierView: React.FC<SupplierViewProps> = ({ navigate, onSwitchMode, roleBadge, children, currentView }) => {
    const [view, setView] = useState<'TABS' | 'ADD_ITEM'>('TABS');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const { user } = useAuth();
    const { getUnreadMessageCount } = useChat();
    const { bookings } = useBooking();
    const { t } = useLanguage();
    const unreadChatCount = user ? getUnreadMessageCount(user.id) : 0;
    const hasKycLocal = Boolean(user && user.role === 'Supplier' && (user as any).aadharImageUrl && (user as any).personalPhotoUrl && user.phone);
    const [kycStatus, setKycStatus] = useState<string | null>(null);
    const [showKycForm, setShowKycForm] = useState(false);

    // Sync activeTab with currentView
    useEffect(() => {
        if (currentView === 'HOME' && !['dashboard', 'listings', 'bookings', 'requests', 'schedule', 'earnings'].includes(activeTab)) {
            setActiveTab('dashboard');
        } else {
            switch (currentView) {
                case 'EARNINGS_DETAILS':
                    setActiveTab('earnings');
                    break;
                case 'SETTINGS':
                    setActiveTab('settings');
                    break;
                case 'SUPPORT':
                    setActiveTab('support');
                    break;
            }
        }
    }, [currentView]);

    useEffect(() => {
        const loadKyc = async () => {
            if (!user) return;
            try {
                const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api'}/kyc/${user.id}`);
                if (res.ok) {
                    const kycData = await res.json();
                    setKycStatus(kycData.status);
                }
            } catch {
                // Silent fail
            }
        };
        loadKyc();
    }, [user, activeTab]);

    const hasKyc = hasKycLocal || kycStatus === 'Submitted' || kycStatus === 'Approved' || kycStatus === 'Pending';

    const hasActiveBookings = useMemo(() => {
        if (!user) return false;
        return bookings.some(b => (b.supplierId === user.id || b.operatorId === user.id) && ['Confirmed', 'Arrived', 'In Process'].includes(b.status));
    }, [bookings, user]);

    const handleAddItem = useCallback(() => {
        if (!hasKyc) {
            setActiveTab('listings');
            setShowKycForm(true);
            return;
        }
        setItemToEdit(null);
        setView('ADD_ITEM');
    }, [hasKyc]);

    const handleEditItem = useCallback((item: Item) => {
        if (!hasKyc) {
            setActiveTab('listings');
            setShowKycForm(true);
            return;
        }
        setItemToEdit(item);
        setView('ADD_ITEM');
    }, [hasKyc]);

    const handleBackToDashboard = useCallback(() => {
        setView('TABS');
        setItemToEdit(null);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <SupplierDashboardScreen navigate={navigate} goToTab={setActiveTab} kycStatus={kycStatus} onSwitchMode={onSwitchMode} roleBadge={roleBadge} />;
            case 'requests': return <SupplierRequestsScreen />;
            case 'bookings': return <SupplierBookingsScreen navigate={navigate} />;
            case 'schedule': return <SupplierScheduleScreen />;
            case 'listings':
                return <SupplierListingsScreen onAddItem={handleAddItem} onEditItem={handleEditItem} kycStatus={kycStatus} openKycForm={() => navigate({ view: 'MY_ACCOUNT' })} />;
            default: return <SupplierDashboardScreen navigate={navigate} />;
        }
    }

    if (view === 'ADD_ITEM') {
        return <AddItemScreen itemToEdit={itemToEdit} onBack={handleBackToDashboard} />;
    }

    const navItems = supplierNavItems; // Assuming supplierNavItems is defined globally or imported

    const { logout } = useAuth();

    return (
        <div className="flex h-screen overflow-hidden bg-green-50 dark:bg-neutral-900">
            {/* Desktop Sidebar */}
            <AppSidebar
                role="Supplier"
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                navigate={navigate}
                onLogout={logout}
            />

            {/* Main Content Area Wrapper */}
            <div className="flex-1 flex h-full overflow-hidden relative">

                {/* Center Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto min-h-0 pb-20 md:pb-0">
                        {children ? children : renderContent()}
                    </div>
                </div>

                {/* Right Sidebar (Desktop Only) */}
                <div className={`hidden xl:block ${isRightSidebarOpen ? 'w-80 p-6 opacity-100' : 'w-0 p-0 opacity-0 overflow-hidden'} border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-y-auto transition-all duration-300 ease-in-out`}>
                    <div className="min-w-[18rem]"> {/* Prevent content squash during transition */}
                        <RequestQueuePanel />
                        <EquipmentStatusPanel />
                    </div>
                </div>

                {/* Right Sidebar Toggle Button */}
                <button
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    className={`hidden xl:flex absolute top-24 z-20 items-center justify-center w-5 h-12 bg-white dark:bg-neutral-800 border-l border-t border-b border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md hover:bg-neutral-50 rounded-l-lg transition-all duration-300 ease-in-out bg-opacity-90 backdrop-blur-sm`}
                    style={{ right: isRightSidebarOpen ? '20rem' : '0' }}
                    title={isRightSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-500" viewBox="0 0 20 20" fill="currentColor">
                        {isRightSidebarOpen ? (
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        ) : (
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        )}
                    </svg>
                </button>

            </div>

            {/* Mobile Bottom Navigation */}
            {(currentView !== 'AI_ASSISTANT' && currentView !== 'VOICE_ASSISTANT') && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                    <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={supplierNavItems} />
                </div>
            )}
        </div>
    );
};

export default SupplierView;
