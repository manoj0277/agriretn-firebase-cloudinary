import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Helper function to get email subject from category
function getCategorySubject(category?: string): string {
    const subjects = {
        weather: '🌤️ Weather Alert - AgriRent',
        location: '📍 New Equipment Nearby - AgriRent',
        price: '💰 Price Alert - AgriRent',
        booking: '📅 Booking Update - AgriRent',
        promotional: '🎉 Special Offer - AgriRent',
        performance: '📊 Account Alert - AgriRent',
        system: '🔔 System Update - AgriRent'
    };
    return subjects[category as keyof typeof subjects] || '🌾 AgriRent Notification';
}
import path from 'path';
import { UserService, ItemService, BookingService, PostService, KYCService, NotificationService, ChatService, ReviewService, SupportService, DamageReportService } from './services/firestore';
import { User, UserRole, Item, ChatMessage, ForumPost, Booking, Notification } from './types';
import cloudinary from './cloudinary';
import { auth as firebaseAuth } from './firebase';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads

// --- HEALTH CHECK ---
app.get('/', (req: Request, res: Response) => {
    res.send('Backend server is running with Firebase & Cloudinary!');
});

// --- DATA ENDPOINTS ---
app.get('/api/users/profile', async (req: Request, res: Response) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await UserService.getByEmail(email as string);
        if (user) res.json(user);
        else res.status(404).json({ message: 'User not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/users/phone', async (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ message: 'Phone is required' });

        const user = await UserService.getByPhone(phone as string);
        if (user) res.json(user);
        else res.status(404).json({ message: 'User not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
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
        let uid = firebaseUid;

        // If no firebaseUid provided (legacy/admin flow), create in Firebase Auth
        if (!uid) {
            const userRecord = await firebaseAuth.createUser({
                email,
                password,
                phoneNumber: phone ? `+91${phone}` : undefined,
                displayName: rest.name
            });
            uid = userRecord.uid;
        }

        // 2. Create in Firestore
        const newUser: User = {
            id: Date.now(), // Internal ID
            firebaseUid: uid,
            email,
            phone,
            ...rest,
            status: rest.role === UserRole.Supplier ? 'pending' : 'approved',
            signupDate: new Date().toISOString(), // Track signup date for targeting new users
        };

        // Check if user already exists in DB to prevent duplicates/overwrites if retrying
        try {
            const existingUser = await UserService.getByEmail(email);
            if (existingUser) {
                // If user exists in DB but we are here, maybe just update/return it?
                // For now, return conflict if it's a fresh signup attempt
                return res.status(409).json({ message: 'User already exists in database' });
            }
        } catch (error: any) {
            // If error is NOT_FOUND, that's fine - user doesn't exist yet
            // Any other error, we should handle it, but for now continue
            if (!error.message?.includes('NOT_FOUND') && error.code !== 5) {
                console.error('Error checking existing user:', error);
            }
            // Continue with signup
        }

        await UserService.create(newUser);

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
app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const updatedUser = await UserService.update(userId, req.body);
        if (updatedUser) res.json(updatedUser);
        else res.status(404).json({ message: 'User not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- ITEMS ---
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

// --- BOOKINGS ---
app.post('/api/bookings', async (req: Request, res: Response) => {
    try {
        console.log('[API] POST /api/bookings received:', JSON.stringify(req.body));

        const bookingsData = Array.isArray(req.body) ? req.body : [req.body];
        const createdBookings = [];

        for (const bookingData of bookingsData) {
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
        console.log(`[API] PUT /api/bookings/${bookingId} received`);
        const updated = await BookingService.update(bookingId, req.body);
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
app.post('/api/posts', async (req: Request, res: Response) => {
    try {
        const newPost = { id: Date.now(), replies: [], ...req.body };
        await PostService.create(newPost);
        res.status(201).json(newPost);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/posts/:id/replies', async (req: Request, res: Response) => {
    try {
        const postId = parseInt(req.params.id);
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

        // If approved, also update user status
        if (status === 'Approved') {
            await UserService.update(kyc.userId, { status: 'approved' });
            console.log(`User ${kyc.userId} approved via KYC verification`);
        }

        console.log(`KYC ${kycId} ${status.toLowerCase()} by admin`);
        res.json({ message: `KYC ${status.toLowerCase()} successfully` });
    } catch (e) {
        console.error('Error verifying KYC:', e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// --- NOTIFICATIONS ---
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
        const updated = await NotificationService.update(id, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Notification not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// Mark notification as seen (sets seenAt and expiresAt)
app.put('/api/notifications/:id/seen', async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const seenAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

        const updated = await NotificationService.update(id, { seenAt, expiresAt });
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Notification not found' });
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
                const { sendPush } = await import('./services/push');
                await sendPush(user.deviceTokens, 'AgriRent', message);
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

// Geocoding endpoint
app.get('/api/geocoding/district', async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const { getDistrictFromCoords } = await import('./services/geocoding');
        const district = await getDistrictFromCoords(parseFloat(lat as string), parseFloat(lng as string));

        res.json({ district });
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
app.post('/api/admin/users/:id/approve', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        await UserService.update(userId, { status: 'approved' });
        res.json({ message: 'User approved' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/admin/users/:id/suspend', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        await UserService.update(userId, { status: 'suspended' });
        res.json({ message: 'User suspended' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.post('/api/admin/users/:id/reactivate', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        await UserService.update(userId, { status: 'approved' });
        res.json({ message: 'User reactivated' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

// --- CLOUDINARY UPLOAD ---
app.post('/api/upload', async (req: Request, res: Response) => {
    try {
        const { image } = req.body; // Expecting base64 string
        if (!image) {
            console.error('Upload failed: No image provided');
            return res.status(400).json({ message: 'No image provided' });
        }

        console.log('Uploading image to Cloudinary...');
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'agrirent/kyc',
            resource_type: 'auto'
        });

        console.log('Image uploaded successfully:', uploadResponse.secure_url);
        res.json({ url: uploadResponse.secure_url });
    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ message: 'Image upload failed', error: error.message });
    }
});

// ========== ADMIN ITEM APPROVAL ENDPOINTS ==========

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

// Initialize notification services
(async () => {
    console.log('[Server] Initializing notification services...');

    // Start notification scheduler (auto-delete expired, process scheduled)
    const { startNotificationScheduler } = await import('./services/notificationScheduler');
    startNotificationScheduler();

    // Start smart notifications (weather, bookings, performance)
    const { startSmartNotifications } = await import('./services/smartNotifications');
    startSmartNotifications();

    console.log('[Server] All notification services initialized');
})();

app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});

