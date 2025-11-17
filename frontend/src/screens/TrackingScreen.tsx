import React, { useEffect, useMemo, useState } from 'react';
import { AppView, Item } from '../types';
import Header from '../components/Header';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useItem } from '../context/ItemContext';

interface TrackingScreenProps {
    item: Item;
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const TrackingScreen: React.FC<TrackingScreenProps> = ({ item, navigate, goBack }) => {
    const { items } = useItem();
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | undefined>(
        item.currentLocation || item.locationCoords
    );

    // Poll for item location updates every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const updated = items.find(i => i.id === item.id);
            if (updated?.currentLocation) {
                setLiveLocation(updated.currentLocation);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [items, item.id]);

    const center: [number, number] = useMemo(() => {
        if (liveLocation) return [liveLocation.lat, liveLocation.lng];
        return item.locationCoords ? [item.locationCoords.lat, item.locationCoords.lng] : [17.3850, 78.4867];
    }, [liveLocation, item.locationCoords]);

    const itemIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    return (
        <div className="flex flex-col h-screen">
            <Header title={`Tracking: ${item.name}`} onBack={goBack} />
            <div className="flex-grow flex flex-col">
                <div className="flex-grow">
                    <MapContainer center={center} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%', minHeight: '320px' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {liveLocation && (
                            <Marker position={[liveLocation.lat, liveLocation.lng]} icon={itemIcon}>
                                <Popup>
                                    <div className="space-y-1">
                                        <div className="font-bold">{item.name}</div>
                                        <div className="text-xs">Lat: {liveLocation.lat.toFixed(5)}, Lng: {liveLocation.lng.toFixed(5)}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>
                <div className="p-6 bg-white border-t">
                    <h2 className="text-lg font-bold text-neutral-800">Live Location</h2>
                    <p className="text-neutral-700">{item.name} current position:</p>
                    <p className="font-mono text-primary mt-1">
                        Lat: {liveLocation?.lat ?? '—'}, Lng: {liveLocation?.lng ?? '—'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrackingScreen;