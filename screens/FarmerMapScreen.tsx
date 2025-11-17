
import React, { useState, useMemo } from 'react';
import { AppView, Item, ItemCategory } from '../types';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import ItemCard from '../components/ItemCard';

interface FarmerMapScreenProps {
    items: Item[];
    navigate: (view: AppView) => void;
    userLocation?: { lat: number; lng: number; };
}

// Custom hook to change map view when an item is selected
const ChangeView: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

const userIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" class="w-6 h-6"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" clip-rule="evenodd" /></svg>'),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: 'ring-2 ring-white rounded-full'
});

const ICON_COLORS: Record<ItemCategory, string> = {
    [ItemCategory.Tractors]: '#8B4513',
    [ItemCategory.Harvesters]: '#DAA520',
    [ItemCategory.JCB]: '#FFC107',
    [ItemCategory.Workers]: '#0288D1',
    [ItemCategory.Drones]: '#455A64',
    [ItemCategory.Sprayers]: '#4CAF50',
    [ItemCategory.Drivers]: '#795548',
    [ItemCategory.Borewell]: '#607D8B',
};
const defaultIconColor = '#475569';

const ICON_SVGS: Partial<Record<ItemCategory, string>> = {
    [ItemCategory.Tractors]: `<path stroke-linecap="round" stroke-linejoin="round" d="M19 14a4 4 0 10-8 0 4 4 0 008 0zM5 14a4 4 0 10-8 0 4 4 0 008 0zM12 14H6V9h1l2-3h5v5h-2v3z" />`,
    [ItemCategory.Workers]: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.78-4.125a4 4 0 00-6.44 0A6 6 0 003 20v1z" />`,
    [ItemCategory.Drones]: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />`,
};

const getImageIconForItem = (item: Item) => {
    const fallbackSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23e5e7eb'/%3E%3C/text%3E%3C/svg%3E";
    const imgSrc = item.images && item.images[0] && item.images[0].trim() !== '' ? item.images[0] : fallbackSvg;
    const borderColor = ICON_COLORS[item.category] || defaultIconColor;
    const iconHtml = `
        <div class="rounded-full shadow-lg ring-2" style="width: 36px; height: 36px; overflow: hidden; ring-color: white; border: 2px solid ${borderColor}; background: #fff;">
            <img src="${imgSrc}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>`;
    return new L.DivIcon({
        html: iconHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
    });
};


const FarmerMapScreen: React.FC<FarmerMapScreenProps> = ({ items, navigate, userLocation }) => {
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    const center: [number, number] = useMemo(() => {
        if (selectedItem?.locationCoords) {
            return [selectedItem.locationCoords.lat, selectedItem.locationCoords.lng];
        }
        if (userLocation) {
            return [userLocation.lat, userLocation.lng];
        }
        if (items.length > 0 && items[0].locationCoords) {
            return [items[0].locationCoords.lat, items[0].locationCoords.lng];
        }
        return [17.3850, 78.4867]; // Default to Hyderabad, Telangana
    }, [selectedItem, userLocation, items]);


    return (
        <div className="relative w-full h-full bg-neutral-200">
            <MapContainer 
                center={center}
                zoom={12} 
                scrollWheelZoom={true} 
                style={{ height: '100%', width: '100%', minHeight: '320px' }}
                onClick={() => setSelectedItem(null)}
            >
                <ChangeView center={center} zoom={selectedItem ? 14 : 12} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
                )}
                
                {items.map(item => {
                    if (!item.locationCoords) return null;
                    return (
                        <Marker
                            key={item.id}
                            position={[item.currentLocation?.lat ?? item.locationCoords.lat, item.currentLocation?.lng ?? item.locationCoords.lng]}
                            icon={getImageIconForItem(item)}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    setSelectedItem(item);
                                }
                            }}
                        />
                    )
                })}
            </MapContainer>

            {selectedItem && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[1000]">
                    <div className="relative">
                         <button onClick={() => setSelectedItem(null)} className="absolute -top-2 -right-2 z-10 bg-white dark:bg-neutral-600 rounded-full p-1 shadow-md text-neutral-600 dark:text-neutral-200 hover:text-red-500 dark:hover:text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <ItemCard item={selectedItem} onClick={() => navigate({ view: 'ITEM_DETAIL', item: selectedItem })} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FarmerMapScreen;
