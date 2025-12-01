import NodeCache from 'node-cache';

// District cache with TTL of 30 days (2592000 seconds)
const districtCache = new NodeCache({ stdTTL: 2592000, checkperiod: 86400 });

// India district mapping approximation based on coordinates
// This is a fallback when geocoding API is unavailable
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
 * Get district from coordinates using OpenCage Geocoding API
 * Falls back to approximate matching if API fails
 */
export async function getDistrictFromCoords(lat: number, lng: number): Promise<string> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

    // Check cache first
    const cached = districtCache.get<string>(cacheKey);
    if (cached) {
        console.log(`[Geocoding] Cache hit for ${cacheKey}: ${cached}`);
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
                // Try to get district from various possible fields
                const district = components.state_district ||
                    components.county ||
                    components.city ||
                    components.town ||
                    components.village ||
                    'Unknown';

                console.log(`[Geocoding] API success for ${cacheKey}: ${district}`);
                districtCache.set(cacheKey, district);
                return district;
            }
        } catch (error) {
            console.error('[Geocoding] API error:', error);
            // Fall through to approximate matching
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

    console.log(`[Geocoding] Approximate match for ${cacheKey}: ${nearestDistrict} (${minDistance.toFixed(1)}km away)`);
    districtCache.set(cacheKey, nearestDistrict);
    return nearestDistrict;
}

/**
 * Normalize district name for consistent targeting
 */
export function normalizeDistrictName(district: string): string {
    return district
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/district$/i, '')
        .trim();
}

/**
 * Check if two district names match (fuzzy comparison)
 */
export function districtMatches(district1: string, district2: string): boolean {
    const norm1 = normalizeDistrictName(district1);
    const norm2 = normalizeDistrictName(district2);
    return norm1 === norm2 ||
        norm1.includes(norm2) ||
        norm2.includes(norm1);
}
