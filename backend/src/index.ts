import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to get email subject from category
function getCategorySubject(category?: string): string {
    const subjects: any = {
        weather: '🌤️ Weather Alert - AgriRent',
        location: '📍 New Equipment Nearby - AgriRent',
        price: '💰 Price Alert - AgriRent',
        booking: '📅 Booking Update - AgriRent',
        promotional: '🎉 Special Offer - AgriRent',
        performance: '📊 Account Alert - AgriRent',
        system: '🔔 System Update - AgriRent',
        alert: '⚠️ Critical Alert - AgriRent'
    };
    return subjects[category as string] || '🌾 AgriRent Notification';
}
import path from 'path';
import {
    UserService, ItemService, BookingService, PostService, KYCService, NotificationService, ChatService, ReviewService, SupportService, DamageReportService,
    UserNotificationService, BroadcastService, SearchService,
    db
} from './services/firestore';
import agentRoutes from './routes/agent';
import { sendWelcomeNotification, sendKYCStatusNotification } from './services/smartNotifications';
import { User, UserRole, Item, ChatMessage, ForumPost, Booking, Notification } from './types';
import cloudinary from './cloudinary';
import { auth as firebaseAuth } from './firebase';

dotenv.config();

// Maximum daily working hours per equipment category
const MAX_DAILY_WORKING_HOURS: Record<string, number> = {
    'Tractors': 12,
    'Drones': 12,
    'Harvesters': 16,
    'Borewell': 16,
    'Workers': 13, // 6 AM to 7 PM
    'JCB': 12,
    'Sprayers': 12,
    'Drivers': 12,
    'default': 12
};

// Helper to calculate already booked hours for a supplier/item on a specific date
async function getBookedHoursForSupplierOnDate(
    supplierId: string,
    itemId: number,
    date: string
): Promise<number> {
    const bookings = await BookingService.getAll();
    const activeStatuses = ['Confirmed', 'In Process', 'Arrived', 'Pending Payment'];
    const relevantBookings = bookings.filter(b =>
        b.supplierId === supplierId &&
        b.itemId === itemId &&
        b.date === date &&
        activeStatuses.includes(b.status)
    );

    return relevantBookings.reduce((total, b) => {
        return total + (b.estimatedDuration || 3); // Default 3 hours if not specified
    }, 0);
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
import helmet from 'helmet';

// --- SECURITY HEADERS (Helmet.js) ---
// Protects against XSS, clickjacking, MIME sniffing, and other attacks
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for some frontend frameworks
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://firebaseapp.com", "https://*.firebaseio.com", "https://*.googleapis.com"],
        },
    },
    crossOriginEmbedderPolicy: false, // Required for loading external resources
}));

// --- CORS CONFIGURATION ---
// Restrict to allowed origins only (no wildcard *)
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL, // For production, set this in .env
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
            callback(new Error('CORS: Origin not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads

// --- REQUEST LOGGING ---
import { requestLogger, logAudit, logError } from './services/logger';
app.use(requestLogger);

// --- RATE LIMITING ---
import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 requests per minute
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for auth endpoints: 5 requests per minute
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP rate limiter: 3 requests per minute
const otpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: { error: 'Too many OTP requests, please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api', generalLimiter);

// --- SERVER-SIDE CACHING ---
import NodeCache from 'node-cache';

// Cache with different TTLs
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // Default 5 min TTL

// Cache keys
const CACHE_KEYS = {
    USERS: 'all_users',
    ITEMS: 'all_items',
    BOOKINGS: 'all_bookings',
    NOTIFICATIONS: 'all_notifications',
};

// Helper to invalidate related caches
const invalidateCache = (keys: string[]) => {
    keys.forEach(key => cache.del(key));
    console.log(`[Cache] Invalidated: ${keys.join(', ')}`);
};

// --- HEALTH CHECK ---
app.get('/', (req: Request, res: Response) => {
    res.send('Backend server is running with Firebase & Cloudinary!');
});

// --- AUTH MIDDLEWARE ---
import { verifyToken, requireRole, requireSelfOrAdmin, optionalAuth } from './middleware/authMiddleware';

// --- Upload endpoint ---
app.post('/api/upload', async (req: Request, res: Response) => {
    try {
        // Accept both field names for compatibility
        const imageData = req.body.image || req.body.base64Image;
        if (!imageData) {
            console.error('Upload failed: No image provided. Received body keys:', Object.keys(req.body));
            return res.status(400).json({ error: 'No image provided' });
        }

        console.log('Uploading image to Cloudinary...');
        const result = await cloudinary.uploader.upload(imageData, {
            folder: 'agrirent',
            resource_type: 'auto'
        });

        console.log('Image uploaded successfully:', result.secure_url);
        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

// --- BOOKING TIMEOUT & TRUSTED SUPPLIER ENDPOINTS ---
import { checkBookingTimeouts, checkExpiredBookings, getSearchDurationHours } from './services/bookingTimeout';

// --- VERIFIED ACCOUNT ENDPOINTS ---

// Toggle verified account status (Admin only)
app.post('/api/admin/suppliers/:id/toggle-verified', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        const supplierId = req.params.id;
        const user = await UserService.getById(supplierId);

        if (!user || user.role !== UserRole.Supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const isNowVerified = !user.isVerifiedAccount;

        // Calculate dates for verification
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity

        // Build history entry if granting verification
        const historyEntry = isNowVerified ? {
            purchaseDate: now.toISOString(),
            expiryDate: expiryDate.toISOString(),
            plan: '30-Day Verified',
            amount: 999
        } : null;

        const existingHistory = user.verificationHistory || [];

        const updated = await UserService.update(supplierId, {
            isVerifiedAccount: isNowVerified,
            verifiedAccountPurchaseDate: isNowVerified ? now.toISOString() : undefined,
            verifiedAccountExpiryDate: isNowVerified ? expiryDate.toISOString() : undefined,
            verificationHistory: historyEntry ? [...existingHistory, historyEntry] : existingHistory
        });

        console.log(`Supplier ${supplierId} verified status toggled to:`, isNowVerified);
        res.json(updated);
    } catch (e) {
        console.error('Error toggling verified supplier:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Request verification (User/Supplier side)
app.post('/api/users/:id/request-verification', verifyToken, async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        if (req.user!.id !== userId) return res.status(403).json({ error: 'Unauthorized' });

        // Logic to create a notification for admin
        // For now, we will simulate a success response. 
        // In a real app, this would create a 'verification_request' notification for admins.

        console.log(`User ${userId} requested verification.`);

        // Find admins to notify (simplified)
        // const admins = await UserService.getAllAdmins(); 
        // admins.forEach(admin => createNotification(admin.id, 'New Verification Request', ...));

        res.json({ message: 'Verification requested successfully. Admin will review.' });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get all verified suppliers (Admin)
app.get('/api/admin/verified-suppliers', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        const allUsers = await UserService.getAll();
        const verifiedSuppliers = allUsers.filter(u =>
            u.role === UserRole.Supplier && u.isVerifiedAccount
        );
        console.log(`Found ${verifiedSuppliers.length} verified suppliers`);
        res.json(verifiedSuppliers);
    } catch (e) {
        console.error('Error fetching verified suppliers:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Supplier: Request verified account purchase
app.post('/api/suppliers/:id/request-verified', async (req: Request, res: Response) => {
    try {
        const supplierId = req.params.id;
        const user = await UserService.getById(supplierId);

        if (!user || user.role !== UserRole.Supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        if (user.isVerifiedAccount) {
            return res.status(400).json({ message: 'Already a verified account' });
        }

        // In production, this would integrate with payment gateway
        // For now, we mark it as pending for admin approval
        const updated = await UserService.update(supplierId, {
            isVerifiedAccount: true,
            verifiedAccountPurchaseDate: new Date().toISOString()
        });

        console.log(`Supplier ${supplierId} purchased verified account`);
        res.json({
            success: true,
            message: 'Verified account activated successfully!',
            user: updated
        });
    } catch (e) {
        console.error('Error processing verified account request:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Toggle trusted supplier status (Admin only)
app.post('/api/admin/suppliers/:id/toggle-trusted', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        const supplierId = parseInt(req.params.id);
        const user = await UserService.getById(supplierId);

        if (!user || user.role !== UserRole.Supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const updated = await UserService.update(supplierId, {
            isTrustedSupplier: !user.isTrustedSupplier
        });

        console.log(`Supplier ${supplierId} trusted status toggled to:`, updated?.isTrustedSupplier);
        res.json(updated);
    } catch (e) {
        console.error('Error toggling trusted supplier:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- WAR (Weighted Average Rating) Endpoints ---
import { calculateWAR, updateSupplierWAR, recalculateAllSuppliersWAR } from './services/warRating';

// Get detailed WAR breakdown for a supplier (Admin only)
app.get('/api/admin/suppliers/:id/war-details', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        const supplierId = req.params.id;
        const user = await UserService.getById(supplierId);

        if (!user || user.role !== UserRole.Supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        const warDetails = await calculateWAR(supplierId);
        res.json({
            supplierId,
            supplierName: user.name,
            currentDisplayedRating: user.avgRating,
            ...warDetails
        });
    } catch (e) {
        console.error('Error fetching WAR details:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Recalculate WAR for a specific supplier (Admin only)
app.post('/api/admin/suppliers/:id/recalculate-war', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        const supplierId = req.params.id;
        const user = await UserService.getById(supplierId);

        if (!user || user.role !== UserRole.Supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        await updateSupplierWAR(supplierId);
        const updatedUser = await UserService.getById(supplierId);

        res.json({
            success: true,
            message: `WAR recalculated for ${user.name}`,
            newRating: updatedUser?.avgRating,
            warLastCalculated: updatedUser?.warLastCalculated
        });
    } catch (e) {
        console.error('Error recalculating WAR:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Recalculate WAR for ALL suppliers (Admin only - use sparingly)
app.post('/api/admin/recalculate-all-war', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        console.log('[WAR] Admin triggered full recalculation');
        recalculateAllSuppliersWAR();
        res.json({
            success: true,
            message: 'WAR recalculation started for all suppliers. Check server logs for progress.'
        });
    } catch (e) {
        console.error('Error triggering WAR recalculation:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get all trusted suppliers (Admin only)
app.get('/api/admin/trusted-suppliers', verifyToken, requireRole(UserRole.Admin), async (req: Request, res: Response) => {
    try {
        const allUsers = await UserService.getAll();
        const trustedSuppliers = allUsers.filter(u =>
            u.role === UserRole.Supplier && u.isTrustedSupplier
        );
        console.log(`Found ${trustedSuppliers.length} trusted suppliers`);
        res.json(trustedSuppliers);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Manually allot booking to supplier
app.post('/api/admin/bookings/:bookingId/allot/:supplierId', async (req: Request, res: Response) => {
    try {
        const { bookingId, supplierId } = req.params;
        const { adminId } = req.body;

        const booking = await BookingService.getById(bookingId);
        const supplier = await UserService.getById(parseInt(supplierId));

        if (!booking || !supplier) {
            return res.status(404).json({ message: 'Booking or supplier not found' });
        }

        // Get supplier's item in the required category
        const items = await ItemService.getAll();
        const supplierItem = items.find(i =>
            i.ownerId === supplier.id &&
            i.category === booking.itemCategory &&
            i.status === 'approved'
        );

        const updated = await BookingService.update(bookingId, {
            status: 'Pending Confirmation',
            supplierId: supplier.id,
            itemId: supplierItem?.id,
            manuallyAllottedBy: adminId
        });

        // Send notification to supplier
        await NotificationService.create({
            id: Date.now(),
            userId: supplier.id,
            message: `Admin has assigned a ${booking.itemCategory} booking to you (${booking.location} on ${booking.date}). Please confirm.`,
            type: 'booking',
            category: 'booking',
            priority: 'high',
            read: false,
            timestamp: new Date().toISOString()
        });

        // Send notification to farmer
        await NotificationService.create({
            id: Date.now() + 1,
            userId: booking.farmerId,
            message: `Good news! Admin has found a supplier for your ${booking.itemCategory} booking. Waiting for supplier confirmation.`,
            type: 'booking',
            category: 'booking',
            priority: 'medium',
            read: false,
            timestamp: new Date().toISOString()
        });

        console.log(`Booking ${bookingId} manually allotted to supplier ${supplierId} by admin ${adminId}`);
        res.json(updated);
    } catch (e) {
        console.error('Error allotting booking:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Expand search radius for a booking
// Expand search radius for a booking
app.post('/api/bookings/:id/expand-radius', async (req: Request, res: Response) => {
    try {
        const bookingId = req.params.id;
        const { newRadius } = req.body;

        const booking = await BookingService.getById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const originalRadius = booking.searchRadiusExpanded ? booking.expandedSearchRadius : 50; // Assume default 50km

        const updated = await BookingService.update(bookingId, {
            searchRadiusExpanded: true,
            originalSearchRadius: originalRadius,
            expandedSearchRadius: newRadius
        });

        console.log(`Booking ${bookingId} search radius expanded to ${newRadius} km`);
        res.json(updated);
    } catch (e) {
        console.error('Error expanding search radius:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- FAILED SEARCHES LOGGING ---

app.post('/api/failed-searches', async (req: Request, res: Response) => {
    try {
        const { userId, location, selectedCategory, userLocation, searchRadius } = req.body;

        const failedSearch = {
            id: Date.now(),
            userId,
            location: location || 'Unknown',
            userLocation: userLocation || null,
            selectedCategory: selectedCategory || 'All',
            searchRadius: searchRadius || 20,
            timestamp: new Date().toISOString()
        };

        const created = await SearchService.create(failedSearch);
        console.log(`[Search] Logged failed search for user ${userId} in category ${selectedCategory}`);

        // Notify Admins/Founders
        const allUsers = await UserService.getAll();
        const admins = allUsers.filter(u => u.role === UserRole.Admin || u.role === UserRole.Founder);

        const notificationPromises = admins.map(admin =>
            NotificationService.create({
                id: Date.now() + Math.floor(Math.random() * 1000),
                userId: admin.id,
                message: `Demand Alert: A farmer in ${location || 'their area'} searched for ${selectedCategory === 'All' ? 'any equipment' : selectedCategory} but found nothing within the extended radius.`,
                type: 'system',
                category: 'system',
                priority: 'medium',
                read: false,
                timestamp: new Date().toISOString()
            })
        );

        await Promise.all(notificationPromises);

        res.status(201).json(created);
    } catch (e) {
        console.error('Error logging failed search:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get all failed searches (Admin/Founder only)
app.get('/api/admin/failed-searches', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const failedSearches = await SearchService.getAll();
        res.json(failedSearches);
    } catch (e) {
        console.error('Error fetching failed searches:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get search duration for a booking
app.get('/api/bookings/:id/search-duration', async (req: Request, res: Response) => {
    try {
        const bookingId = req.params.id;
        const booking = await BookingService.getById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const hours = getSearchDurationHours(booking);
        res.json({ hours, exceededThreshold: hours >= 6 });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Run timeout checker on startup
checkBookingTimeouts();
checkExpiredBookings();

// Schedule timeout checker to run every hour
setInterval(async () => {
    try {
        console.log('[Scheduler] Running hourly booking timeout check...');
        await checkBookingTimeouts();
    } catch (error) {
        console.error('[Scheduler] Error in timeout checker:', error);
    }
}, 60 * 60 * 1000); // Every hour

// Schedule expiry checker to run every 30 minutes
setInterval(async () => {
    try {
        console.log('[Scheduler] Running booking expiry check...');
        await checkExpiredBookings();
    } catch (error) {
        console.error('[Scheduler] Error in expiry checker:', error);
    }
}, 30 * 60 * 1000); // Every 30 minutes

// --- DATA ENDPOINTS ---
app.get('/api/users/profile', async (req: Request, res: Response) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await UserService.getByEmail(email as string);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/users/phone', async (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ message: 'Phone is required' });

        const phoneStr = phone as string;
        // Try exact match first
        let user = await UserService.getByPhone(phoneStr);

        // Try with +91 if not found and input doesn't have it
        if (!user && !phoneStr.startsWith('+91')) {
            user = await UserService.getByPhone(`+91${phoneStr}`);
        }

        // Try without +91 if not found and input has it
        if (!user && phoneStr.startsWith('+91')) {
            user = await UserService.getByPhone(phoneStr.replace('+91', ''));
        }

        // Try removing spaces/dashes
        if (!user) {
            const cleaned = phoneStr.replace(/[\s-]/g, '');
            user = await UserService.getByPhone(cleaned);
            if (!user && !cleaned.startsWith('+91')) {
                user = await UserService.getByPhone(`+91${cleaned}`);
            }
        }

        if (user) res.json({ ...user, exists: true });
        else res.status(404).json({ message: 'User not found', exists: false });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Sync User Endpoint (Create/Update based on Firebase Auth)
app.post('/api/users', async (req: Request, res: Response) => {
    try {
        const { id, firebaseUid, email, phone, ...rest } = req.body;

        // Check if user already exists
        let existingUser = await UserService.getById(id);

        if (existingUser) {
            // Update existing
            const updated = await UserService.update(id, rest);
            return res.json(updated);
        }

        // Create new user
        const newUser: User = {
            id,
            firebaseUid: firebaseUid || id,
            email,
            phone,
            ...rest,
            userStatus: rest.userStatus || 'approved',
            signupDate: new Date().toISOString()
        };

        const created = await UserService.create(newUser);

        // Send welcome notification if it's a new signup
        sendWelcomeNotification(created.id).catch(console.error);

        res.status(201).json(created);
    } catch (e) {
        console.error('Error syncing user:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

app.get('/api/users', async (req: Request, res: Response) => {
    try {
        const users = await UserService.getAll();
        res.json(users);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/items', async (req: Request, res: Response) => {
    try {
        const items = await ItemService.getAll();
        res.json(items);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/bookings', async (req: Request, res: Response) => {
    try {
        const bookings = await BookingService.getAll();
        res.json(bookings);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/posts', async (req: Request, res: Response) => {
    try {
        const posts = await PostService.getAll();
        res.json(posts);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- AUTH ---
// Note: Frontend should ideally use Firebase Auth SDK directly and send ID token.
// But to keep existing structure working with "local API" calls from AuthContext:
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    // Since we can't verify password on backend with Firebase Admin SDK (it doesn't support signInWithEmailAndPassword),
    // we rely on the frontend to have performed the sign-in and sent the user details OR
    // we change the flow.
    // CRITICAL: The previous local auth just checked array. Firebase Admin cannot check passwords.
    // FIX: The Frontend AuthContext MUST use Firebase SDK to login.
    // However, for this endpoint to remain compatible if called, we can't really do much without the ID token.
    // We will assume this endpoint is DEPRECATED in favor of frontend auth, BUT if we want to support the "Refactored AuthContext"
    // which calls this, we need to change AuthContext to use Firebase SDK.
    // For now, let's return a 400 telling the frontend to use Firebase SDK.
    res.status(400).json({ message: 'Please use Firebase SDK on frontend for login' });
});

app.post('/api/auth/signup', async (req: Request, res: Response) => {
    const { email, phone, password, firebaseUid, ...rest } = req.body;

    try {
        // 1. Check if user already exists in DB (Duplicate Prevention)
        const existingPhone = await UserService.getByPhone(phone);
        if (existingPhone) {
            return res.status(409).json({ message: 'Phone number already exists. Please login.' });
        }

        if (email) {
            const existingEmail = await UserService.getByEmail(email);
            if (existingEmail) {
                return res.status(409).json({ message: 'Email already exists. Please login.' });
            }
        }

        // 2. Create in Firebase Auth (if not already provided)
        let uid = firebaseUid;
        if (!uid) {
            try {
                const userRecord = await firebaseAuth.createUser({
                    email,
                    password,
                    phoneNumber: phone ? `+91${phone}` : undefined, // Check format
                    displayName: rest.name
                });
                uid = userRecord.uid;
            } catch (firebaseError: any) {
                if (firebaseError.code === 'auth/email-already-exists') {
                    return res.status(409).json({ message: 'Email already exists in system.' });
                }
                if (firebaseError.code === 'auth/phone-number-already-exists') {
                    return res.status(409).json({ message: 'Phone number already exists in system.' });
                }
                throw firebaseError;
            }
        }

        // 3. Create in Firestore
        const newUser: User = {
            id: uid, // Use firebaseUid as document ID for easy access
            firebaseUid: uid,
            email,
            phone,
            ...rest,
            userStatus: 'approved', // Auto-approve all roles (Farmer, Supplier, Agent)
            signupDate: new Date().toISOString(), // Track signup date
        };

        await UserService.create(newUser);

        // Send welcome notification
        sendWelcomeNotification(newUser.id).catch(err => console.error('Error sending welcome notification:', err));

        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error: any) {
        console.error('Signup error:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ message: 'Email already exists in Auth' });
        }
        res.status(500).json({ message: error.message });
    }
});



// --- USERS ---
app.get('/api/users/profile/:uid', async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;
        const user = await UserService.getByFirebaseUid(uid);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (e) {
        console.error('Error fetching user profile:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id; // Correctly handle string UIDs
        const updatedUser = await UserService.update(userId, req.body);
        if (updatedUser) res.json(updatedUser);
        else res.status(404).json({ message: 'User not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- ITEMS ---

// Get utilization percentage for all items (booked hours / available hours)
app.get('/api/items/utilization', async (req: Request, res: Response) => {
    try {
        const items = await ItemService.getAll();
        const bookings = await BookingService.getAll();
        const users = await UserService.getAll();

        // Calculate utilization for each item
        // Available hours: Non-verified = 8 hours/day, Verified = 10 hours/day

        const utilizationData = items.map(item => {
            // Get completed/confirmed bookings for this item in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const itemBookings = bookings.filter(b =>
                String(b.itemId) === String(item.id) &&
                new Date(b.date) >= thirtyDaysAgo &&
                (b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'In Process')
            );

            // Calculate total booked hours
            let totalBookedHours = 0;
            itemBookings.forEach(b => {
                if (b.startTime && b.endTime) {
                    // Parse time strings like "09:00" and "17:00"
                    const [startH, startM] = b.startTime.split(':').map(Number);
                    const [endH, endM] = b.endTime.split(':').map(Number);
                    const hours = (endH + endM / 60) - (startH + startM / 60);
                    if (hours > 0) totalBookedHours += hours;
                } else {
                    // Default to 8 hours per booking if no time specified
                    totalBookedHours += 8;
                }
            });

            // Check if owner is verified - verified accounts treated as Agents (bypass cap logic in frontend)
            // Use standard 8 hours/day for calculation base for everyone
            const hoursPerDay = 8;
            const AVAILABLE_HOURS_PER_MONTH = 30 * hoursPerDay;

            // Calculate utilization percentage
            const utilizationPercent = Math.min(100, Math.round((totalBookedHours / AVAILABLE_HOURS_PER_MONTH) * 100));

            // Find owner
            const owner = users.find(u => u.id === item.ownerId);

            return {
                itemId: item.id,
                itemName: item.name,
                ownerId: item.ownerId,
                category: item.category,
                bookedHours: Math.round(totalBookedHours),
                availableHours: AVAILABLE_HOURS_PER_MONTH,
                utilizationPercent,
                totalBookings: itemBookings.length,
                isVerifiedOwner: owner?.isVerifiedAccount || false,
            };
        });

        res.json(utilizationData);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get supplier-level utilization (average of all their items)
app.get('/api/suppliers/utilization', async (req: Request, res: Response) => {
    try {
        const items = await ItemService.getAll();
        const bookings = await BookingService.getAll();
        const users = await UserService.getAll();
        const suppliers = users.filter(u => u.role === 'Supplier');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const supplierUtilization = suppliers.map(supplier => {
            const supplierItems = items.filter(i => i.ownerId === supplier.id);

            // Available hours: Standard 8 hours/day for consistent calculation
            const hoursPerDay = 8;
            const AVAILABLE_HOURS_PER_MONTH = 30 * hoursPerDay;

            if (supplierItems.length === 0) {
                return {
                    supplierId: supplier.id,
                    supplierName: supplier.name,
                    totalItems: 0,
                    avgUtilizationPercent: 0,
                    isVerified: supplier.isVerifiedAccount || false,
                    availableHoursPerDay: hoursPerDay,
                };
            }

            let totalUtilization = 0;
            supplierItems.forEach(item => {
                const itemBookings = bookings.filter(b =>
                    String(b.itemId) === String(item.id) &&
                    new Date(b.date) >= thirtyDaysAgo &&
                    (b.status === 'Completed' || b.status === 'Confirmed' || b.status === 'In Process')
                );

                let bookedHours = 0;
                itemBookings.forEach(b => {
                    if (b.startTime && b.endTime) {
                        const [startH, startM] = b.startTime.split(':').map(Number);
                        const [endH, endM] = b.endTime.split(':').map(Number);
                        const hours = (endH + endM / 60) - (startH + startM / 60);
                        if (hours > 0) bookedHours += hours;
                    } else {
                        bookedHours += 8;
                    }
                });

                totalUtilization += (bookedHours / AVAILABLE_HOURS_PER_MONTH) * 100;
            });

            const avgUtilization = Math.round(totalUtilization / supplierItems.length);

            return {
                supplierId: supplier.id,
                supplierName: supplier.name,
                totalItems: supplierItems.length,
                avgUtilizationPercent: Math.min(100, avgUtilization),
                isVerified: supplier.isVerifiedAccount || false,
                availableHoursPerDay: hoursPerDay,
            };
        });

        res.json(supplierUtilization);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

app.post('/api/items', async (req: Request, res: Response) => {
    try {
        const newItem: Item = { id: Date.now(), ...req.body, status: 'pending' };
        await ItemService.create(newItem);
        res.status(201).json(newItem);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.put('/api/items/:id', async (req: Request, res: Response) => {
    try {
        const itemId = parseInt(req.params.id);
        const updated = await ItemService.update(itemId, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Item not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.delete('/api/items/:id', async (req: Request, res: Response) => {
    try {
        const itemId = parseInt(req.params.id);
        await ItemService.delete(itemId);
        res.status(204).send();
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Helper to apply streak penalty
async function applyStreakPenalty(userId: string, reason: string) {
    const user = await UserService.getById(parseInt(userId));
    if (!user || user.role !== 'Supplier') return;

    const streak = user.streak || { currentCount: 0, lastLoginDate: '', guards: 0, maxGuards: 5, points: 0 };
    let points = streak.points || 0;
    let count = streak.currentCount;

    // Deduct 50 points
    points -= 50;

    // Borrow from Streak Count if negative
    if (points < 0) {
        if (count > 0) {
            count -= 1;
            points += 100;
            // e.g., 20 pts - 50 = -30. Need 30 more. Borrow 1 streak (100). Points become 70.
        } else {
            points = 0; // Floor at 0 if no streak to borrow
        }
    }

    await UserService.update(parseInt(userId), {
        streak: { ...streak, currentCount: count, points }
    });

    console.log(`[Penalty] Applied -50 pts to Supplier ${userId} for ${reason}. New: ${count} / ${points} pts`);

    // Notify Supplier
    await NotificationService.create({
        id: Date.now() + Math.random(),
        userId: userId,
        message: `Penalty applied: -50 Streak Points due to ${reason}. Current Score: ${points}/100.`,
        type: 'system',
        category: 'performance',
        priority: 'high',
        read: false,
        timestamp: new Date().toISOString()
    });
}

// --- BOOKINGS ---
app.post('/api/bookings', async (req: Request, res: Response) => {
    try {
        console.log('[API] POST /api/bookings received:', JSON.stringify(req.body));

        const bookingsData = Array.isArray(req.body) ? req.body : [req.body];
        const createdBookings = [];

        for (const bookingData of bookingsData) {
            // Validate daily working hours limits for Confirmed bookings
            // Skip for Agent/AgentPro suppliers (managed by founder, no limits)
            if (bookingData.status === 'Confirmed' && bookingData.supplierId && bookingData.itemId) {
                const item = await ItemService.getById(bookingData.itemId);
                if (item) {
                    // Check supplier role
                    const supplier = await UserService.getById(parseInt(item.ownerId));
                    const isAgentSupplier = supplier && (supplier.role === 'Agent' || supplier.role === 'AgentPro');

                    if (!isAgentSupplier) {
                        const bookingDate = bookingData.date || new Date().toISOString().split('T')[0];
                        const alreadyBookedHours = await getBookedHoursForSupplierOnDate(
                            bookingData.supplierId,
                            bookingData.itemId,
                            bookingDate
                        );
                        const maxHours = MAX_DAILY_WORKING_HOURS[item.category] || MAX_DAILY_WORKING_HOURS['default'];
                        const requestedHours = bookingData.estimatedDuration || 3;
                        const remainingHours = maxHours - alreadyBookedHours;

                        if (requestedHours > remainingHours) {
                            console.log(`[API] Rejected booking: Exceeds daily ${maxHours}h limit for ${item.category}`);
                            return res.status(400).json({
                                error: `Cannot accept booking: This ${item.category} has ${remainingHours.toFixed(1)}h remaining out of ${maxHours}h daily limit on ${bookingDate}.`
                            });
                        }
                    }
                }
            }

            // Use ID from frontend if available, otherwise generate one
            const id = bookingData.id || `AGB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newBooking = { ...bookingData, id };
            await BookingService.create(newBooking);
            createdBookings.push(newBooking);
            console.log('[API] Booking created successfully:', id);
        }

        // Return array if input was array, else single object (for backward compatibility)
        if (Array.isArray(req.body)) {
            res.status(201).json(createdBookings);
        } else {
            res.status(201).json(createdBookings[0]);
        }
    } catch (e) {
        console.error('[API] Error creating booking:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

app.get('/api/bookings', async (req: Request, res: Response) => {
    try {
        console.log('[API] GET /api/bookings called');
        const bookings = await BookingService.getAll();
        console.log(`[API] Returning ${bookings.length} bookings`);
        res.json(bookings);
    } catch (e) {
        console.error('[API] Error fetching bookings:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

app.put('/api/bookings/:id', async (req: Request, res: Response) => {
    try {
        const bookingId = req.params.id;
        const updates = req.body;
        console.log(`[API] PUT /api/bookings/${bookingId} received`, updates);

        // --- RE-BROADCAST & RATING & AVAILABILITY LOGIC START ---
        if (updates.status === 'Cancelled') {
            const existingBooking = await BookingService.getById(bookingId);

            // Case A: Supplier Cancellation
            if (existingBooking && existingBooking.supplierId && (existingBooking.status === 'Confirmed' || existingBooking.status === 'Pending Confirmation')) {
                console.log(`[API] Intercepting Cancellation for Booking ${bookingId}: Re-broadcasting to pool.`);

                // 1. Reset status to Searching (Re-broadcast)
                updates.status = 'Searching';

                // 2. Clear assignment fields
                updates.supplierId = null;
                updates.itemId = null;
                updates.otpCode = null;
                updates.otpVerified = false;
                updates.operatorId = null;
                updates.isRebroadcast = true;

                // 3. Notify Farmer
                await NotificationService.create({
                    id: Date.now(),
                    userId: existingBooking.farmerId,
                    message: `⚠️ Your supplier had to cancel. We are automatically looking for a new supplier for your ${existingBooking.itemCategory} booking.`,
                    type: 'booking',
                    category: 'booking',
                    priority: 'high',
                    read: false,
                    timestamp: new Date().toISOString()
                });

                // 4. Penalize Supplier Rating (8% decrease)
                if (existingBooking.supplierId) {
                    const supplier = await UserService.getById(parseInt(existingBooking.supplierId));
                    if (supplier) {
                        const currentRating = supplier.avgRating || 5.0;
                        // Decrease by 8% (multiply by 0.92)
                        const newRating = Math.max(1.0, parseFloat((currentRating * 0.92).toFixed(2)));
                        await UserService.update(parseInt(existingBooking.supplierId), { avgRating: newRating });
                        console.log(`[API] Penalized Supplier ${existingBooking.supplierId} rating: ${currentRating} -> ${newRating}`);

                        // Notify Supplier about penalty
                        await NotificationService.create({
                            id: Date.now() + 1,
                            userId: existingBooking.supplierId,
                            message: `You cancelled a confirmed booking. Your rating has been decreased by 8% to ${newRating}.`,
                            type: 'system',
                            category: 'performance',
                            priority: 'high',
                            read: false,
                            timestamp: new Date().toISOString()
                        });

                        // Realtime WAR Update
                        await updateSupplierWAR(existingBooking.supplierId);

                        // 5. Handle Sequential Cancellations & Suspension/Blocking
                        const currentStreak = (supplier.cancelledStreak || 0) + 1;

                        // --- STREAK PENALTY (Cancellation) ---
                        // Deduct 50 points for cancellation
                        await applyStreakPenalty(existingBooking.supplierId, 'Cancellation');

                        const blockThreshold = 5;
                        const suspendThreshold = 3;
                        let userUpdates: Partial<User> = { cancelledStreak: currentStreak };

                        if (currentStreak >= blockThreshold) {
                            const blockUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                            userUpdates = {
                                ...userUpdates,
                                userStatus: 'blocked',
                                suspendedUntil: blockUntil, // Reuse suspendedUntil field or create blockedUntil? suspendedUntil is fine if semantic implies "halted".
                                cancelledStreak: 0
                            };
                            console.log(`[API] BLOCKING Supplier ${existingBooking.supplierId} until ${blockUntil}`);

                            // Notify Admin - High Alert
                            await NotificationService.create({
                                id: Date.now() + 2,
                                userId: '0',
                                message: `CRITICAL: Supplier #${existingBooking.supplierId} BLOCKED for 7 DAYS due to 5 sequential cancellations.`,
                                type: 'admin',
                                category: 'alert',
                                priority: 'critical',
                                read: false,
                                timestamp: new Date().toISOString()
                            });

                            // Notify Supplier
                            await NotificationService.create({
                                id: Date.now() + 3,
                                userId: existingBooking.supplierId,
                                message: `ACCOUNT BLOCKED: You have cancelled 5 confirmed bookings in a row. Your account is blocked for 7 days. Please contact Admin to raise a complaint if you believe this is an error.`,
                                type: 'system',
                                category: 'alert',
                                priority: 'critical',
                                read: false,
                                timestamp: new Date().toISOString()
                            });

                        } else if (currentStreak >= suspendThreshold) {
                            const suspendUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                            userUpdates = {
                                ...userUpdates,
                                userStatus: 'suspended',
                                suspendedUntil: suspendUntil,
                                cancelledStreak: 0
                            };
                            console.log(`[API] SUSPENDING Supplier ${existingBooking.supplierId} until ${suspendUntil}`);

                            // Notify Admin
                            await NotificationService.create({
                                id: Date.now() + 2,
                                userId: '0',
                                message: `Supplier #${existingBooking.supplierId} suspended for 24h due to 3 sequential cancellations.`,
                                type: 'admin',
                                category: 'alert',
                                priority: 'high',
                                read: false,
                                timestamp: new Date().toISOString()
                            });

                            // Notify Supplier
                            await NotificationService.create({
                                id: Date.now() + 3,
                                userId: existingBooking.supplierId,
                                message: `ACCOUNT SUSPENDED: You have cancelled ${suspendThreshold} confirmed bookings in a row. Your account is suspended for 24 hours.`,
                                type: 'system',
                                category: 'alert',
                                priority: 'critical',
                                read: false,
                                timestamp: new Date().toISOString()
                            });
                        }

                        await UserService.update(parseInt(existingBooking.supplierId), userUpdates);
                    }
                }
            } else if (existingBooking && !existingBooking.supplierId && (existingBooking.status === 'Searching' || existingBooking.status === 'Pending Confirmation')) {
                // Case B: Farmer Cancellation
                // Logic: If Farmer cancels 3 sequentially (implied: without completing one?), suspend.
                // We need to track Farmer's cancellations here. 
                // Note: 'Searching' cancel is also a cancel. 

                const farmer = await UserService.getById(parseInt(existingBooking.farmerId));
                if (farmer) {
                    const currentStreak = (farmer.cancelledStreak || 0) + 1;
                    const blockThreshold = 5;
                    const suspendThreshold = 3;
                    let userUpdates: Partial<User> = { cancelledStreak: currentStreak };

                    if (currentStreak >= blockThreshold) {
                        const blockUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                        userUpdates = {
                            ...userUpdates,
                            userStatus: 'blocked',
                            suspendedUntil: blockUntil,
                            cancelledStreak: 0
                        };
                        console.log(`[API] BLOCKING Farmer ${existingBooking.farmerId} until ${blockUntil}`);

                        // Notify Admin
                        await NotificationService.create({
                            id: Date.now(),
                            userId: '0',
                            message: `CRITICAL: Farmer #${existingBooking.farmerId} BLOCKED for 7 DAYS due to 5 sequential cancellations.`,
                            type: 'admin',
                            category: 'alert',
                            priority: 'critical',
                            read: false,
                            timestamp: new Date().toISOString()
                        });

                        // Notify Farmer
                        await NotificationService.create({
                            id: Date.now() + 1,
                            userId: existingBooking.farmerId,
                            message: `ACCOUNT BLOCKED: You have cancelled 5 confirmed bookings in a row. Your account is blocked for 7 days. Please contact Admin to raise a complaint.`,
                            type: 'system',
                            category: 'alert',
                            priority: 'critical',
                            read: false,
                            timestamp: new Date().toISOString()
                        });

                    } else if (currentStreak >= suspendThreshold) {
                        const suspendUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                        userUpdates = {
                            ...userUpdates,
                            userStatus: 'suspended',
                            suspendedUntil: suspendUntil,
                            cancelledStreak: 0
                        };
                        console.log(`[API] SUSPENDING Farmer ${existingBooking.farmerId} until ${suspendUntil}`);

                        // Notify Admin
                        await NotificationService.create({
                            id: Date.now(),
                            userId: '0',
                            message: `Farmer #${existingBooking.farmerId} suspended for 24h due to 3 sequential cancellations.`,
                            type: 'admin',
                            category: 'alert',
                            priority: 'high',
                            read: false,
                            timestamp: new Date().toISOString()
                        });

                        // Notify Farmer
                        await NotificationService.create({
                            id: Date.now() + 1,
                            userId: existingBooking.farmerId,
                            message: `ACCOUNT SUSPENDED: You have cancelled ${suspendThreshold} bookings in a row. Your account is suspended for 24 hours.`,
                            type: 'system',
                            category: 'alert',
                            priority: 'critical',
                            read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                    await UserService.update(parseInt(existingBooking.farmerId), userUpdates);
                }
            }

            // Global Case: If a booking had an Item ID, ensure that Item is marked available again
            // (Unless it's the supplier cancellation case above where we just detached it - actually we detached it in updates object, 
            //  so the original item needs to be freed).
            // Logic: If 'updates' says Cancelled, OR (updates says Searching AND we detached an item), we should free the item.

            const itemIDToFree = existingBooking?.itemId; // The item that WAS locked
            if (itemIDToFree) {
                const item = await ItemService.getById(itemIDToFree);
                if (item) {
                    // If quantity based, increment. If boolean, set available=true.
                    // The requirement says "immediately show to all farmer available".
                    // We simplified availability model to boolean 'available' for now in most places, or quantity.
                    const updateData: Partial<Item> = { available: true };
                    if (existingBooking.quantity && item.quantityAvailable !== undefined) {
                        const currentQty = item.quantityAvailable || 0;
                        // We don't know max quantity easily without fetching original, but assume adding back is safe.
                        // Actually, we should be careful not to exceed stock if it wasn't decremented? 
                        // Yes it was decremented on Confirm. 
                        // Check status: Only Confirm decrements. Pending Confirmation might not have?
                        // In frontend AcceptJobModal: "availableItems" are filtered.
                        // Let's just set available: true for now as a safe "show to all" signal.
                        updateData.quantityAvailable = currentQty + (existingBooking.quantity || 0);
                    }

                    await ItemService.update(itemIDToFree, updateData);
                    console.log(`[API] Restored availability for Item ${itemIDToFree}`);
                }
            }

        }

        // --- WORK COMPLETION - RATING BONUS ---
        if (updates.status === 'Completed') {
            const existingBooking = await BookingService.getById(bookingId);
            if (existingBooking && existingBooking.supplierId) {
                const supplier = await UserService.getById(parseInt(existingBooking.supplierId));
                if (supplier) {
                    const currentRating = supplier.avgRating || 0;
                    const base = currentRating > 0 ? currentRating : 4.0;
                    const newRating = Math.min(5.0, parseFloat((base * 1.04).toFixed(2)));

                    // --- STREAK & POINTS LOGIC START ---
                    const dailyWorkStreakUpdate: Partial<User> = {
                        avgRating: newRating,
                        cancelledStreak: 0
                    };

                    // Only apply if NO disputes and NO damage
                    if (!existingBooking.disputeRaised && !existingBooking.damageReported) {
                        const today = new Date().toISOString().split('T')[0];
                        const currentStreak = supplier.streak || {
                            currentCount: 0,
                            lastLoginDate: '',
                            guards: 0,
                            maxGuards: 5,
                            points: 0,
                            lastWorkDate: ''
                        };

                        let newCount = currentStreak.currentCount;
                        let newPoints = currentStreak.points || 0;
                        let pointsAdded = 0;

                        // 1. Daily Work Streak Calculation
                        const lastWork = currentStreak.lastWorkDate ? new Date(currentStreak.lastWorkDate) : null;
                        const currDate = new Date(today);

                        // Normalize to midnight for accurate day difference
                        if (lastWork) lastWork.setHours(0, 0, 0, 0);
                        currDate.setHours(0, 0, 0, 0);

                        let shouldIncrementStreak = false;
                        let isStreakBroken = false;

                        if (!lastWork) {
                            shouldIncrementStreak = true; // First ever job
                        } else {
                            const diffTime = Math.abs(currDate.getTime() - lastWork.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (diffDays === 0) {
                                shouldIncrementStreak = false; // Already worked today
                            } else if (diffDays === 1) {
                                shouldIncrementStreak = true; // Consecutive day
                            } else {
                                // Diff > 1: Potential Break. Check for "In-Progress" protection.
                                // Logic: If workStartTime was on a valid day (diff <= 1 from last work), we bridge the gap.
                                let protectedByWorkStart = false;
                                if (existingBooking.workStartTime) {
                                    const jobStart = new Date(existingBooking.workStartTime);
                                    jobStart.setHours(0, 0, 0, 0);
                                    const startDiffTime = Math.abs(jobStart.getTime() - lastWork.getTime());
                                    const startDiffDays = Math.ceil(startDiffTime / (1000 * 60 * 60 * 24));

                                    if (startDiffDays <= 1) {
                                        protectedByWorkStart = true;
                                        console.log(`[API] Streak Saved! Job started ${startDiffDays} days after last work (within Valid Window)`);
                                    }
                                }

                                if (protectedByWorkStart) {
                                    shouldIncrementStreak = true;
                                    // Note: We don't "fill" the missing days in DB, but we keep the streak count alive and accumulating.
                                    // Effectively: 10 -> [Gap] -> 11.
                                } else {
                                    isStreakBroken = true;
                                }
                            }
                        }

                        if (isStreakBroken) {
                            newCount = 1; // Reset to 1 (Today is the new start)
                            // TODO: Add Guard consumption logic here if desired in future
                        } else if (shouldIncrementStreak) {
                            newCount += 1;
                        }

                        // 2. Performance Points (5 points per hour)
                        // Calculate hours
                        let durationHours = existingBooking.estimatedDuration || 3; // Fallback
                        if (existingBooking.workStartTime && existingBooking.workEndTime) {
                            const start = new Date(existingBooking.workStartTime).getTime();
                            const end = new Date(existingBooking.workEndTime).getTime();
                            durationHours = (end - start) / (1000 * 60 * 60);
                        } else if (existingBooking.startTime && existingBooking.endTime) {
                            // Try scheduled times if actuals not available (fallback for testing/manual completion)
                            const [startH, startM] = existingBooking.startTime.split(':').map(Number);
                            const [endH, endM] = existingBooking.endTime.split(':').map(Number);
                            durationHours = (endH + endM / 60) - (startH + startM / 60);
                        }

                        // Rounding logic? User said "for every hour add 5 points".
                        // Let's Floor or Round? "completed work... no delay".
                        // Assuming fractional hours count proportionally? Or just floor?
                        // "for every hour" implies discrete, but usually points are better granular.
                        // Let's use Math.floor(durationHours) * 5? Or duration * 5?
                        // Let's do proportional to be fair: Math.round(duration * 5)
                        pointsAdded = Math.round(durationHours * 5);
                        if (pointsAdded < 0) pointsAdded = 0;

                        newPoints += pointsAdded;

                        // 3. Bonus Streak (Every 100 points)
                        // "if points reach 100, add one more streak... points carry back if not 100"
                        while (newPoints >= 100) {
                            newCount += 1;
                            newPoints -= 100;
                        }

                        // Construct updated Streak object
                        dailyWorkStreakUpdate.streak = {
                            ...currentStreak,
                            currentCount: newCount,
                            points: newPoints,
                            lastWorkDate: today // Mark worked today
                        };

                        console.log(`[API] Supplier ${existingBooking.supplierId} Streak: Count ${currentStreak.currentCount}->${newCount}, Points ${currentStreak.points}->${newPoints} (+${pointsAdded})`);
                    }

                    await UserService.update(parseInt(existingBooking.supplierId), dailyWorkStreakUpdate);
                    // --- STREAK & POINTS LOGIC END ---

                    console.log(`[API] Rewarded Supplier ${existingBooking.supplierId} rating: ${currentRating} -> ${newRating}`);

                    // Also reset Farmer streak? 
                    // Logic: "Cancelled 3 sequentially". A success breaks the sequence.
                    await UserService.update(parseInt(existingBooking.farmerId), { cancelledStreak: 0 });


                    // Notify Supplier about bonus
                    await NotificationService.create({
                        id: Date.now(),
                        userId: existingBooking.supplierId,
                        message: `Great job! Job completed flawlessly. Rating +4%. Points earned: 5/hr. Leaderboard updated!`,
                        type: 'system',
                        category: 'performance',
                        priority: 'medium',
                        read: false,
                        showTo: [existingBooking.supplierId],
                        timestamp: new Date().toISOString()
                    });

                    // Realtime WAR Update
                    await updateSupplierWAR(existingBooking.supplierId);
                }
            }

            // Restore Item Availability on Completion
            if (existingBooking && existingBooking.itemId) {
                const item = await ItemService.getById(existingBooking.itemId);
                if (item) {
                    const updateData: Partial<Item> = { available: true };
                    if (existingBooking.quantity && item.quantityAvailable !== undefined) {
                        const currentQty = item.quantityAvailable || 0;
                        updateData.quantityAvailable = currentQty + (existingBooking.quantity || 0);
                    }
                    await ItemService.update(existingBooking.itemId, updateData);
                    console.log(`[API] Restored availability for Completed Item ${existingBooking.itemId}`);
                }
            }
        }



        // --- STREAK PENALTY (Dispute / Damage) ---
        if (updates.disputeRaised === true) {
            const existing = await BookingService.getById(bookingId);
            if (existing && existing.supplierId) {
                await applyStreakPenalty(existing.supplierId, 'Dispute Raised');
            }
        }
        if (updates.damageReported === true) {
            const existing = await BookingService.getById(bookingId);
            if (existing && existing.supplierId) {
                await applyStreakPenalty(existing.supplierId, 'Damage Reported');
            }
        }

        // --- RE-BROADCAST & RATING & AVAILABILITY LOGIC END ---

        const updated = await BookingService.update(bookingId, updates);

        if (updated) {
            console.log('[API] Booking updated:', bookingId);
            res.json(updated);
        }
        else {
            console.warn('[API] Booking not found for update:', bookingId);
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (e) {
        console.error('[API] Error updating booking:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- POSTS ---
app.get('/api/posts', async (req: Request, res: Response) => {
    try {
        const posts = await PostService.getAll();
        res.json(posts);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/posts', async (req: Request, res: Response) => {
    try {
        const newPost = { id: Date.now(), replies: [], ...req.body };
        await PostService.create(newPost);
        res.status(201).json(newPost);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/posts/:id/replies', async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        const post = await PostService.getById(postId);
        if (post) {
            const newReply = { id: Date.now(), ...req.body };
            const updatedReplies = [...(post.replies || []), newReply];
            await PostService.update(postId, { replies: updatedReplies });
            res.status(201).json(newReply);
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Update post (e.g., close it)
app.put('/api/posts/:id', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        const updates = req.body;
        await PostService.update(postId as any, updates);
        res.status(200).json({ success: true, message: 'Post updated' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});



// GET ALL CHATS (Founder only - protected by frontend mainly, ideally middleware)
app.get('/api/chats', async (req: Request, res: Response) => {
    try {
        // In a real app, verify admin/founder here
        const chats = await ChatService.getAll();
        res.json(chats);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Delete post (and all nested replies - they're stored in the same document)
app.delete('/api/posts/:id', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const postId = req.params.id;
        await PostService.delete(postId as any);
        res.status(200).json({ success: true, message: 'Post and all replies deleted' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Delete a specific reply from a post
app.delete('/api/posts/:postId/replies/:replyId', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const postId = req.params.postId;
        const replyId = req.params.replyId;
        await PostService.deleteReply(postId as any, replyId as any);
        res.status(200).json({ success: true, message: 'Reply deleted' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- KYC ---
app.post('/api/kyc', async (req: Request, res: Response) => {
    try {
        const { userId, aadhaarUrl, photoUrl, aadhaarNumber, panUrl, panNumber, address, location, phone, fullName, docs } = req.body;

        console.log('===== KYC SUBMISSION DEBUG =====');
        console.log('Full request body:', JSON.stringify(req.body, null, 2));

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const existing = await KYCService.getByUserId(userId);

        // If docs array is provided (e.g. from admin re-upload request), use it directly
        // Otherwise build it from individual fields (supplier submission)
        let kycDocs: any[] = docs || [];

        if (!docs) {
            // Build docs from individual fields if docs array not provided
            if (aadhaarUrl && aadhaarNumber) {
                kycDocs.push({
                    type: 'Aadhaar',
                    url: aadhaarUrl,
                    number: aadhaarNumber,
                    status: 'Pending'
                });
            }
            if (photoUrl) {
                kycDocs.push({
                    type: 'PersonalPhoto',
                    url: photoUrl,
                    status: 'Pending'
                });
            }
            if (panUrl && panNumber) {
                kycDocs.push({
                    type: 'PAN',
                    url: panUrl,
                    number: panNumber,
                    status: 'Pending'
                });
            }
        }

        const kycData: any = {
            userId,
            status: existing ? (existing as any).status : 'Pending', // Preserve status if updating docs
            submittedAt: new Date().toISOString(),
            docs: kycDocs
        };



        // Add additional details
        if (address) kycData.address = address;
        if (location) kycData.location = location;
        if (phone) kycData.phone = phone;
        if (fullName) kycData.fullName = fullName;

        if (existing) {
            await KYCService.update(existing.id, kycData);
            console.log(`KYC updated for user ${userId}`);
            res.json({ message: 'KYC updated', id: existing.id });
        } else {
            const newKyc = { id: `KYC-${Date.now()}`, ...kycData };
            await KYCService.create(newKyc);
            console.log(`KYC created for user ${userId}:`, newKyc.id);
            res.status(201).json(newKyc);
        }
    } catch (e) {
        console.error('KYC submission error:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

app.get('/api/kyc/:userId', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const kyc = await KYCService.getByUserId(userId);
        if (kyc) res.json(kyc);
        else res.status(404).json({ message: 'KYC not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Admin: Get all KYC submissions
app.get('/api/admin/kyc', async (req: Request, res: Response) => {
    try {
        const allKyc = await KYCService.getAll();
        console.log(`Fetched ${allKyc.length} KYC submissions for admin`);
        res.json(allKyc);
    } catch (e) {
        console.error('Error fetching KYC submissions:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Admin: Approve or Reject KYC
app.post('/api/admin/kyc/:id/verify', async (req: Request, res: Response) => {
    try {
        const kycId = req.params.id;
        const { status, rejectionReason } = req.body; // status: 'Approved' or 'Rejected'

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected.' });
        }

        const updateData: any = {
            status,
            reviewedAt: new Date().toISOString()
        };

        if (status === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        // Update all documents in the KYC submission
        const kyc = await KYCService.getById(kycId);
        if (!kyc) {
            return res.status(404).json({ message: 'KYC not found' });
        }

        // Update doc statuses
        if (kyc.docs && Array.isArray(kyc.docs)) {
            updateData.docs = kyc.docs.map((doc: any) => ({
                ...doc,
                status
            }));
        }

        await KYCService.update(kycId, updateData);

        // If approved, also update user KYC status
        if (status === 'Approved') {
            await UserService.update(kyc.userId, { kycStatus: 'approved' });
            console.log(`User ${kyc.userId} KYC approved by admin`);
        } else if (status === 'Rejected') {
            await UserService.update(kyc.userId, { kycStatus: 'rejected' });
        }

        console.log(`KYC ${kycId} ${status.toLowerCase()} by admin`);

        // Send automatic notification to user
        sendKYCStatusNotification(kyc.userId, status, rejectionReason)
            .catch(err => console.error('Error sending KYC notification:', err));

        res.json({ message: `KYC ${status.toLowerCase()} successfully` });
    } catch (e) {
        console.error('Error verifying KYC:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- USER CHECK ENDPOINTS ---
app.get('/api/users/phone', async (req: Request, res: Response) => {
    try {
        const phone = req.query.phone as string;
        if (!phone) return res.status(400).json({ message: 'Phone number required' });

        const user = await UserService.getByPhone(phone);
        if (user) {
            res.json({ exists: true, email: user.email, name: user.name });
        } else {
            res.status(404).json({ exists: false, message: 'User not found' });
        }
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

app.get('/api/users/profile', async (req: Request, res: Response) => {
    try {
        const email = req.query.email as string;
        if (!email) return res.status(400).json({ message: 'Email required' });

        const user = await UserService.getByEmail(email);
        if (user) {
            res.json({ exists: true, user });
        } else {
            res.status(404).json({ exists: false });
        }
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- NOTIFICATIONS ---
app.get('/api/admin/notifications/history', async (req: Request, res: Response) => {
    try {
        // Fetch last 50 notifications for admin history
        const notifications = await NotificationService.getAll();
        // Sort by timestamp desc and take 50
        const recent = notifications
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50);
        res.json(recent);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/notifications', async (req: Request, res: Response) => {
    try {
        const notifications = await NotificationService.getAll();
        res.json(notifications);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/notifications/:userId', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const notifications = await NotificationService.getForUser(userId);
        res.json(notifications);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Get MERGED notifications (personal + broadcasts) - OPTIMIZED STORAGE
app.get('/api/notifications/merged/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const user = await UserService.getById(userId);

        // Get personal notifications from user subcollection
        const personal = await UserNotificationService.getForUser(userId);

        // Get broadcasts where 'showTo' contains userId
        // Note: We need a composite index for this query usually, or we filter in memory if list is small.
        // For now, assuming we fetch broadcasts and filter (or query if possible).
        // Since 'broadcasts' collection structure might not strictly have 'showTo' yet on old docs, we handle carefully.

        // Option 1: Query (Efficient)
        // const broadcastSnapshot = await db.collection('broadcasts').where('showTo', 'array-contains', userId).get();
        // const broadcasts = broadcastSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Notification));

        // Option 2: Fetch merging logic (Preserving existing district logic + showTo check)
        const allBroadcasts = user?.district
            ? await BroadcastService.getForDistrict(user.district)
            : await BroadcastService.getAll();

        // Filter: Must be in 'showTo' array (if field exists logic)
        // Requirement: "show only for that user". 
        // If showTo is missing (old notifications), do we show or hide? 
        // User asked "for all notifications add field... show only for that user".
        // Use safer check: if showTo exists, must include userId. If not exists, maybe default to explicit show? 
        // Let's assume we populate it. If empty/undefined, it's hidden (strict whitelist).
        // BUT for backward compat with existing non-migrated data, might be safer to allow if undefined?
        // User said "for all notifications add field...". I'll enforce strict check for new ones, 
        // but maybe lenient for old? No, strict is cleaner for "delete" logic.

        const broadcasts = allBroadcasts.filter(n => n.showTo && n.showTo.includes(userId));

        // Merge and sort by timestamp (newest first)
        const merged = [...personal, ...broadcasts]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(merged);
    } catch (e) {
        console.error('[Notifications] Error fetching merged notifications:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

app.post('/api/notifications', async (req: Request, res: Response) => {
    try {
        const newNotification: Notification = { id: Date.now(), read: false, timestamp: new Date().toISOString(), ...req.body };
        await NotificationService.create(newNotification);
        res.status(201).json(newNotification);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.put('/api/notifications/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const { userId, read, ...otherUpdates } = req.body;

        // Update the main notification
        const updated = await NotificationService.update(id, req.body);

        // Also update in user's personal notifications if userId provided and read status changes
        if (userId && read !== undefined) {
            try {
                await UserNotificationService.updateReadStatus(userId, id, read);
            } catch (userNotifError) {
                console.log('[Notifications] Could not update user notification read status:', userNotifError);
            }
        }

        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Notification not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Mark notification as seen (sets seenAt and expiresAt)
app.put('/api/notifications/:id/seen', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const seenAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

        const updated = await NotificationService.update(id, { seenAt, expiresAt });
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Notification not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Remove user from notification's showTo subcollection (hide notification for user)
app.delete('/api/notifications/:id/show-to/:userId', async (req: Request, res: Response) => {
    try {
        const notificationId = req.params.id;
        const userId = req.params.userId;

        // Use new showTo logic: Remove userId from the notification's showTo array
        await NotificationService.removeUserFromShowTo(notificationId, userId);

        // Also delete from personal subcollection just in case it was a personal one
        await UserNotificationService.delete(userId, notificationId);

        res.json({ message: 'Notification hidden for user' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Check if notification should be shown to a user
app.get('/api/notifications/:id/show-to/:userId', async (req: Request, res: Response) => {
    try {
        const notificationId = req.params.id;
        const userId = req.params.userId;

        const doc = await db.collection('notifications').doc(notificationId)
            .collection('showTo').doc(userId).get();

        res.json({ shouldShow: doc.exists });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Get all notifications by category
app.get('/api/notifications/category/:category', async (req: Request, res: Response) => {
    try {
        const category = req.params.category;
        const notifications = await NotificationService.getAllByCategory(category);
        res.json(notifications);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Get all notifications that should be shown to a specific user
app.get('/api/notifications/for-user/:userId', async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const allNotifications = await NotificationService.getAll();

        // Check each notification to see if it should be shown to this user
        const notificationsWithStatus = await Promise.all(
            allNotifications.map(async (notification) => {
                // Check if user is in showTo subcollection
                const showToDoc = await db.collection('notifications').doc(String(notification.id))
                    .collection('showTo').doc(userId).get();
                return {
                    ...notification,
                    shouldShow: showToDoc.exists
                };
            })
        );

        // Filter to only notifications that should be shown
        const visibleNotifications = notificationsWithStatus.filter(n => n.shouldShow);
        res.json(visibleNotifications);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        await NotificationService.delete(id);
        res.json({ message: 'Notification deleted successfully' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Delete all notifications for a user
app.delete('/api/notifications/user/:userId', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const notifications = await NotificationService.getForUser(userId);

        // Delete each notification
        for (const notification of notifications) {
            await NotificationService.delete(notification.id);
        }

        res.json({ message: 'All notifications deleted successfully', count: notifications.length });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Register device token for push notifications
app.post('/api/users/:id/device-token', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { deviceToken } = req.body;

        if (!deviceToken) {
            return res.status(400).json({ message: 'Device token is required' });
        }

        const user = await UserService.getById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const deviceTokens = user.deviceTokens || [];
        if (!deviceTokens.includes(deviceToken)) {
            deviceTokens.push(deviceToken);
            await UserService.update(userId, { deviceTokens });
        }

        res.json({ message: 'Device token registered', deviceTokens });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Update notification preferences
app.put('/api/users/:id/notification-preferences', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const { sms, push, email } = req.body;

        await UserService.update(userId, {
            notificationPreferences: { sms, push, email }
        });

        res.json({ message: 'Notification preferences updated' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- ADMIN NOTIFICATION MANAGER ---
// Send targeted notifications
app.post('/api/admin/notifications/send', async (req: Request, res: Response) => {
    try {
        const { message, category, priority, targetAudience, channels, scheduledFor } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Get target users based on audience criteria
        const allUsers = await UserService.getAll();
        let targetUsers: typeof allUsers = [];

        if (targetAudience.allUsers) {
            targetUsers = allUsers;
        } else {
            // Filter by districts
            if (targetAudience.districts && targetAudience.districts.length > 0) {
                targetUsers = allUsers.filter(u =>
                    targetAudience.districts.includes(u.district)
                );
            }

            // Filter by user IDs
            if (targetAudience.userIds && targetAudience.userIds.length > 0) {
                targetUsers = allUsers.filter(u =>
                    targetAudience.userIds.includes(u.id)
                );
            }

            // Filter by roles
            if (targetAudience.roles && targetAudience.roles.length > 0) {
                targetUsers = targetUsers.length > 0
                    ? targetUsers.filter(u => targetAudience.roles.includes(u.role))
                    : allUsers.filter(u => targetAudience.roles.includes(u.role));
            }

            // Filter by new signups
            if (targetAudience.newSignups) {
                const daysAgo = targetAudience.newSignupsDays || 7;
                const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
                targetUsers = targetUsers.length > 0
                    ? targetUsers.filter(u => u.signupDate && new Date(u.signupDate) >= cutoffDate)
                    : allUsers.filter(u => u.signupDate && new Date(u.signupDate) >= cutoffDate);
            }
        }

        // Create notifications for each target user
        const notifications = [];
        for (const user of targetUsers) {
            const notification: Notification = {
                id: Date.now() + Math.random(),
                userId: user.id,
                message,
                type: 'admin',
                category,
                priority: priority || 'medium',
                read: false,
                timestamp: scheduledFor || new Date().toISOString(),
                scheduledFor: scheduledFor || undefined,
                sentVia: channels || ['app'],
                district: user.district
            };

            await NotificationService.create(notification);
            notifications.push(notification);

            // Send push notification if enabled
            if (channels?.includes('push') && user.deviceTokens && user.deviceTokens.length > 0 && user.notificationPreferences?.push !== false) {
                try {
                    const { sendPush } = await import('./services/push');
                    await sendPush(user.deviceTokens, 'AgriRent', message);
                } catch (pushError) {
                    console.error(`Failed to send push to user ${user.id}:`, pushError);
                    // Continue to next user, don't fail the request
                }
            }
        }

        res.status(201).json({
            message: `Notifications sent to ${targetUsers.length} users`,
            recipientCount: targetUsers.length,
            notifications
        });
    } catch (e) {
        console.error('[Admin Notifications] Error:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Preview recipient count before sending
app.post('/api/admin/notifications/preview', async (req: Request, res: Response) => {
    try {
        const { targetAudience } = req.body;

        const allUsers = await UserService.getAll();
        let targetUsers: typeof allUsers = [];

        if (targetAudience.allUsers) {
            targetUsers = allUsers;
        } else {
            if (targetAudience.districts && targetAudience.districts.length > 0) {
                targetUsers = allUsers.filter(u =>
                    targetAudience.districts.includes(u.district)
                );
            }

            if (targetAudience.userIds && targetAudience.userIds.length > 0) {
                const userIdSet = new Set(targetAudience.userIds);
                targetUsers = targetUsers.length > 0
                    ? targetUsers.filter(u => userIdSet.has(u.id))
                    : allUsers.filter(u => userIdSet.has(u.id));
            }

            if (targetAudience.roles && targetAudience.roles.length > 0) {
                targetUsers = targetUsers.length > 0
                    ? targetUsers.filter(u => targetAudience.roles.includes(u.role))
                    : allUsers.filter(u => targetAudience.roles.includes(u.role));
            }

            if (targetAudience.newSignups) {
                const daysAgo = targetAudience.newSignupsDays || 7;
                const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
                targetUsers = targetUsers.length > 0
                    ? targetUsers.filter(u => u.signupDate && new Date(u.signupDate) >= cutoffDate)
                    : allUsers.filter(u => u.signupDate && new Date(u.signupDate) >= cutoffDate);
            }
        }

        res.json({
            recipientCount: targetUsers.length,
            users: targetUsers.map(u => ({ id: u.id, name: u.name, district: u.district, role: u.role }))
        });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get notification stats
app.get('/api/admin/notifications/stats', async (req: Request, res: Response) => {
    try {
        const notifications = await NotificationService.getAll();

        const stats = {
            total: notifications.length,
            read: notifications.filter(n => n.read).length,
            unread: notifications.filter(n => !n.read).length,
            byCategory: {
                weather: notifications.filter(n => n.category === 'weather').length,
                location: notifications.filter(n => n.category === 'location').length,
                price: notifications.filter(n => n.category === 'price').length,
                booking: notifications.filter(n => n.category === 'booking').length,
                promotional: notifications.filter(n => n.category === 'promotional').length,
                performance: notifications.filter(n => n.category === 'performance').length,
                system: notifications.filter(n => n.category === 'system').length
            }
        };

        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Create a broadcast notification (storage-optimized: 1 doc per district)
app.post('/api/admin/broadcasts', async (req: Request, res: Response) => {
    try {
        const { message, category, priority, district, expiresAt } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const notification = {
            id: Date.now(),
            userId: '0', // '0' indicates broadcast
            district: district || 'all',
            message,
            type: 'admin' as const,
            category: category || 'system',
            priority: priority || 'medium',
            read: false,
            timestamp: new Date().toISOString(),
            expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default: 7 days
            sentVia: ['app']
        };

        await BroadcastService.create(notification as any);
        console.log(`[Admin] Broadcast created for district: ${district || 'all'}`);

        res.status(201).json({
            message: 'Broadcast notification created',
            notification
        });
    } catch (e) {
        console.error('[Admin Broadcasts] Error:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get all broadcasts (for admin)
app.get('/api/admin/broadcasts', async (req: Request, res: Response) => {
    try {
        const broadcasts = await BroadcastService.getAll();
        res.json(broadcasts);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Delete a broadcast
app.delete('/api/admin/broadcasts/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        await BroadcastService.delete(id);
        res.json({ message: 'Broadcast deleted' });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

// Geocoding endpoint - returns both district AND mandal for accurate targeting
app.get('/api/geocoding/district', async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const { getLocationFromCoords } = await import('./services/geocoding');
        const location = await getLocationFromCoords(parseFloat(lat as string), parseFloat(lng as string));

        // Return full location info including mandal
        res.json({
            district: location.district,
            mandal: location.mandal,
            village: location.village,
            state: location.state
        });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});


// --- CHAT MESSAGES ---
app.get('/api/chat-messages', async (req: Request, res: Response) => {
    try {
        const messages = await ChatService.getAll();
        res.json(messages);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/chat-messages', async (req: Request, res: Response) => {
    try {
        const newMessage: ChatMessage = { id: Date.now(), timestamp: new Date().toISOString(), read: false, ...req.body } as ChatMessage;
        await ChatService.create(newMessage);
        res.status(201).json(newMessage);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.put('/api/chat-messages/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updated = await ChatService.update(id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Message not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- REVIEWS ---
app.get('/api/reviews', async (req: Request, res: Response) => {
    try {
        const reviews = await ReviewService.getAll();
        res.json(reviews);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/reviews', async (req: Request, res: Response) => {
    try {
        const newReview = { id: Date.now(), ...req.body };
        await ReviewService.create(newReview);

        // --- STREAK ADJUSTMENT BASED ON RATING ---
        if (newReview.ratedUserId && newReview.bookingId && newReview.rating !== undefined) {
            const userId = newReview.ratedUserId;
            const rating = parseFloat(newReview.rating);
            const booking = await BookingService.getById(newReview.bookingId);

            // Only for Suppliers and if booking exists
            // (Check if userId matches booking supplierId for safety, or just trust ratedUserId)
            if (booking && booking.supplierId === userId) {
                const user = await UserService.getById(parseInt(userId));

                // Logic: We awarded 5 pts/hr at completion (Optimistic).
                // Adjustment = Hours * (Rating - 5.0).
                // e.g. Rating 3.0 -> Adjustment = Hours * -2.0.
                // e.g. Rating 5.0 -> Adjustment = 0.

                // Calculate Hours (same logic as completion)
                let durationHours = booking.estimatedDuration || 3;
                if (booking.workStartTime && booking.workEndTime) {
                    const start = new Date(booking.workStartTime).getTime();
                    const end = new Date(booking.workEndTime).getTime();
                    durationHours = (end - start) / (1000 * 60 * 60);
                }

                const adjustment = Math.round(durationHours * (rating - 5));

                if (adjustment !== 0 && user && user.streak) {
                    let { currentCount, points } = user.streak;
                    points = (points || 0) + adjustment; // can be negative

                    // Handle negative points (Borrow from Streak)
                    while (points < 0) {
                        if (currentCount > 0) {
                            currentCount -= 1;
                            points += 100;
                        } else {
                            points = 0; // Floor at 0 if no streak
                            break;
                        }
                    }

                    // Handle positive overflow (Bonus Streak) - Unlikely with Rating <= 5, but good for robustness
                    while (points >= 100) {
                        currentCount += 1;
                        points -= 100;
                    }

                    await UserService.update(parseInt(userId), {
                        streak: { ...user.streak, currentCount, points }
                    });

                    console.log(`[Review] Adjusted Streak for User ${userId}. Rating ${rating}/5. Adjustment: ${adjustment} pts. New: ${currentCount}/${points}`);
                }
            }
        }
        // --- END STREAK ADJUSTMENT ---

        res.status(201).json(newReview);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- SUPPORT TICKETS ---
app.get('/api/support-tickets', async (req: Request, res: Response) => {
    try {
        const tickets = await SupportService.getAll();
        res.json(tickets);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/support-tickets', async (req: Request, res: Response) => {
    try {
        const newTicket = { id: Date.now(), status: 'open', timestamp: new Date().toISOString(), replies: [], ...req.body };
        await SupportService.create(newTicket);
        res.status(201).json(newTicket);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.put('/api/support-tickets/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updated = await SupportService.update(id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Ticket not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- DAMAGE REPORTS ---
app.get('/api/damage-reports', async (req: Request, res: Response) => {
    try {
        const reports = await DamageReportService.getAll();
        res.json(reports);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/damage-reports', async (req: Request, res: Response) => {
    try {
        const newReport = { id: Date.now(), timestamp: new Date().toISOString(), ...req.body };
        await DamageReportService.create(newReport);
        res.status(201).json(newReport);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.put('/api/damage-reports/:id', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const updated = await DamageReportService.update(id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Report not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- ADMIN ACTIONS ---
app.post('/api/admin/users/:id/approve', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        await UserService.update(userId, { userStatus: 'approved' });
        res.json({ message: 'User approved' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/admin/users/:id/suspend', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        await UserService.update(userId, { userStatus: 'suspended' });
        res.json({ message: 'User suspended' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/admin/users/:id/reactivate', verifyToken, requireRole(UserRole.Admin, UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        await UserService.update(userId, { userStatus: 'approved' });
        res.json({ message: 'User reactivated' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- FOUNDER SPECIFIC USER MANAGEMENT ---
app.post('/api/founder/users/:id/role', verifyToken, requireRole(UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        const updated = await UserService.update(userId, { role });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/founder/users/:id/status', verifyToken, requireRole(UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        const updated = await UserService.update(userId, { userStatus: status });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.delete('/api/founder/users/:id', verifyToken, requireRole(UserRole.Founder), async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        // 1. Delete from Firestore
        await UserService.delete(userId);
        // 2. Delete from Firebase Auth
        await firebaseAuth.deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// ========== ADMIN ITEM APPROVAL ENDPOINTS ========== (Upload endpoint consolidated at top of file)

// Admin: Get all items for review
app.get('/api/admin/items', async (req: Request, res: Response) => {
    try {
        const items = await ItemService.getAll();
        console.log(`Fetched ${items.length} items for admin review`);
        res.json(items);
    } catch (e) {
        console.error('Error fetching items for admin:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Admin: Approve or Reject Item
app.post('/api/admin/items/:id/verify', async (req: Request, res: Response) => {
    try {
        const itemId = parseInt(req.params.id);
        const { status, rejectionReason } = req.body; // status: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
        }

        const item = await ItemService.getById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const updateData: any = {
            status,
            reviewedAt: new Date().toISOString(),
            reuploadRequested: false // Clear any previous re-upload request
        };

        if (status === 'rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        await ItemService.update(itemId, updateData);
        console.log(`Item ${itemId} status updated to ${status}`);

        // Send notification to supplier
        const notificationMessage = status === 'approved'
            ? `Your item "${item.name}" has been approved and is now visible to farmers!`
            : `Your item "${item.name}" was rejected. ${rejectionReason ? 'Reason: ' + rejectionReason : 'Please review and resubmit.'}`;

        await NotificationService.create({
            id: Date.now(),
            userId: item.ownerId,
            message: notificationMessage,
            type: 'admin',
            timestamp: new Date().toISOString(),
            read: false
        });

        res.json({ message: `Item ${status} successfully` });
    } catch (e) {
        console.error('Error verifying item:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Admin: Request Re-upload of Item
app.post('/api/admin/items/:id/request-reupload', async (req: Request, res: Response) => {
    try {
        const itemId = parseInt(req.params.id);
        const { message } = req.body;

        const item = await ItemService.getById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Increment reupload count and set flag
        const currentCount = (item as any).reuploadCount || 0;
        const updateData: any = {
            reuploadRequested: true,
            reuploadCount: currentCount + 1,
            status: 'pending' as const // Set back to pending
        };

        await ItemService.update(itemId, updateData);
        console.log(`Re-upload requested for item ${itemId}`);

        // Send notification to supplier
        const notificationMessage = message
            ? `Admin has requested you to re-upload your item "${item.name}". Message: ${message}`
            : `Admin has requested you to re-upload your item "${item.name}". Please review and update.`;

        await NotificationService.create({
            id: Date.now(),
            userId: item.ownerId,
            message: notificationMessage,
            type: 'admin',
            timestamp: new Date().toISOString(),
            read: false
        });

        res.json({ message: 'Re-upload request sent successfully' });
    } catch (e) {
        console.error('Error requesting re-upload:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- AGENT BULK BOOKING FROM GOOGLE SHEETS ---
// --- AGENT BULK BOOKING ---
// Protect agent routes: Only AgentPro and Admin can access
app.use('/api/agent', verifyToken, requireRole(UserRole.AgentPro), agentRoutes);

// Initialize notification services
(async () => {
    console.log('[Server] Initializing notification services...');

    // Start notification scheduler (auto-delete expired, process scheduled)
    const { startNotificationScheduler } = await import('./services/notificationScheduler');
    startNotificationScheduler();

    // Start smart notifications (weather, bookings, performance)
    const { startSmartNotifications } = await import('./services/smartNotifications');
    startSmartNotifications();

    // Start Weighted Average Rating (WAR) scheduler
    const { initWARScheduler } = await import('./services/warRating');
    initWARScheduler();

    console.log('[Server] All notification services initialized');
})();

app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});

