import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
        const newBooking = { id: `AGB-${Date.now()}`, ...req.body };
        await BookingService.create(newBooking);
        res.status(201).json(newBooking);
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.put('/api/bookings/:id', async (req: Request, res: Response) => {
    try {
        const bookingId = req.params.id;
        const updated = await BookingService.update(bookingId, req.body);
        if (updated) res.json(updated);
        else res.status(404).json({ message: 'Booking not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
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
        const { userId, ...data } = req.body;
        const existing = await KYCService.getByUserId(userId);
        if (existing) {
            await KYCService.update(existing.id, data);
            res.json({ message: 'KYC updated', id: existing.id });
        } else {
            const newKyc = { id: `KYC-${Date.now()}`, userId, ...data, status: 'Pending', submittedAt: new Date().toISOString() };
            await KYCService.create(newKyc);
            res.status(201).json(newKyc);
        }
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});

app.get('/api/kyc/:userId', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId);
        const kyc = await KYCService.getByUserId(userId);
        if (kyc) res.json(kyc);
        else res.status(404).json({ message: 'KYC not found' });
    } catch (e) { res.status(500).json({ error: (e as Error).message }); }
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
        if (!image) return res.status(400).json({ message: 'No image provided' });

        const uploadResponse = await cloudinary.uploader.upload(image, {
            upload_preset: 'agrirent_preset', // Optional: if user has presets, otherwise remove or use default
            folder: 'agrirent'
        });
        res.json({ url: uploadResponse.secure_url });
    } catch (error: any) {
        console.error('Cloudinary upload error:', error);
        res.status(500).json({ message: 'Image upload failed', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});
