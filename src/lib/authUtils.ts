import { auth } from './firebase';

/**
 * Get the current user's Firebase ID token for API authentication
 * @param forceRefresh - If true, forces a token refresh even if not expired
 * @returns The ID token string, or null if no user is logged in
 */
export const getAuthToken = async (forceRefresh: boolean = false): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
        return null;
    }

    try {
        const token = await user.getIdToken(forceRefresh);
        return token;
    } catch (error) {
        console.error('[Auth] Failed to get ID token:', error);
        return null;
    }
};

/**
 * Create headers object with Authorization bearer token
 * Use this for authenticated API calls
 */
export const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

/**
 * Make an authenticated fetch request
 * Automatically includes the Authorization header
 */
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getAuthToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
};
