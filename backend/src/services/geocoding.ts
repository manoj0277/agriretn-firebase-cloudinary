import NodeCache from 'node-cache';

// Location cache with TTL of 30 days (2592000 seconds)
const locationCache = new NodeCache({ stdTTL: 2592000, checkperiod: 86400 });

// India district mapping approximation based on coordinates (fallback)
const INDIA_DISTRICTS_APPROX: { [key: string]: { lat: number; lng: number } } = {
    'Hyderabad': { lat: 17.385, lng: 78.4867 },
    'Rangareddy': { lat: 17.4065, lng: 78.2783 },
    'Medchal-Malkajgiri': { lat: 17.5520, lng: 78.5410 },
    'Sangareddy': { lat: 17.6167, lng: 78.0833 },
    'Vikarabad': { lat: 17.3372, lng: 77.9047 },
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'Bangalore': { lat: 12.9716, lng: 77.5946 },
    'Chennai': { lat: 13.0827, lng: 80.2707 },
    'Kolkata': { lat: 22.5726, lng: 88.3639 },
    'Delhi': { lat: 28.7041, lng: 77.1025 },
};

/**
 * Location info with both district and mandal
 */
export interface LocationInfo {
    district: string;
    mandal: string;  // Mandal/Taluk/Tehsil - more granular than district
    village?: string;
    state?: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

/**
 * Get FULL location info (district + mandal) from coordinates
 * Returns both district (larger) and mandal (smaller, more accurate)
 */
export async function getLocationFromCoords(lat: number, lng: number): Promise<LocationInfo> {
    const cacheKey = `loc_${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Check cache first
    const cached = locationCache.get<LocationInfo>(cacheKey);
    if (cached) {
        console.log(`[Geocoding] Cache hit for ${cacheKey}:`, cached);
        return cached;
    }

    // Try OpenCage Geocoding API (free tier: 2500 requests/day)
    const apiKey = process.env.OPENCAGE_API_KEY;

    if (apiKey) {
        try {
            const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&language=en&pretty=1`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const components = data.results[0].components;

                // Extract location hierarchy
                // District: state_district or county (larger administrative unit)
                // Mandal: town, suburb, or village (smaller, more accurate)
                const location: LocationInfo = {
                    district: components.state_district || components.county || components.city || 'Unknown',
                    mandal: components.town || components.suburb || components.village || components.city_district || components.state_district || 'Unknown',
                    village: components.village || components.hamlet || undefined,
                    state: components.state || undefined
                };

                console.log(`[Geocoding] API success for ${cacheKey}:`, location);
                locationCache.set(cacheKey, location);
                return location;
            }
        } catch (error) {
            console.error('[Geocoding] API error:', error);
        }
    }

    // Fallback: Find nearest known district
    let nearestDistrict = 'Unknown';
    let minDistance = Infinity;

    for (const [district, coords] of Object.entries(INDIA_DISTRICTS_APPROX)) {
        const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearestDistrict = district;
        }
    }

    const fallbackLocation: LocationInfo = {
        district: nearestDistrict,
        mandal: nearestDistrict // Fallback: use district as mandal
    };

    console.log(`[Geocoding] Approximate match for ${cacheKey}: ${nearestDistrict} (${minDistance.toFixed(1)}km away)`);
    locationCache.set(cacheKey, fallbackLocation);
    return fallbackLocation;
}

/**
 * Get district from coordinates (legacy function for backward compatibility)
 */
export async function getDistrictFromCoords(lat: number, lng: number): Promise<string> {
    const location = await getLocationFromCoords(lat, lng);
    return location.district;
}

/**
 * Get mandal from coordinates (new function for accurate targeting)
 */
export async function getMandalFromCoords(lat: number, lng: number): Promise<string> {
    const location = await getLocationFromCoords(lat, lng);
    return location.mandal;
}

/**
 * Normalize location name for consistent targeting
 */
export function normalizeLocationName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/district$/i, '')
        .replace(/mandal$/i, '')
        .replace(/taluk$/i, '')
        .replace(/tehsil$/i, '')
        .trim();
}

/**
 * Check if two location names match (fuzzy comparison)
 */
export function locationMatches(loc1: string, loc2: string): boolean {
    const norm1 = normalizeLocationName(loc1);
    const norm2 = normalizeLocationName(loc2);
    return norm1 === norm2 ||
        norm1.includes(norm2) ||
        norm2.includes(norm1);
}

// Keep legacy function names for backward compatibility
export const normalizeDistrictName = normalizeLocationName;
export const districtMatches = locationMatches;

