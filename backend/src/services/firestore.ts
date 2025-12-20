import { db } from '../firebase';
export { db }; // Export db for use in index.ts
import { User, Item, Booking, Review, ChatMessage, ForumPost, SupportTicket, DamageReport, Notification } from '../types';

const COLLECTIONS = {
    USERS: 'users',
    ITEMS: 'items',
    BOOKINGS: 'bookings',
    REVIEWS: 'reviews',
    CHATS: 'chats',
    POSTS: 'posts',
    TICKETS: 'tickets',
    NOTIFICATIONS: 'notifications',
    NOTIFICATIONS_USER: 'notifications_user',
    NOTIFICATIONS_ADMIN: 'notifications_admin',
    NOTIFICATIONS_WEATHER: 'notifications_weather',
    NOTIFICATIONS_BOOKING: 'notifications_booking',
    NOTIFICATIONS_SYSTEM: 'notifications_system',
    NOTIFICATIONS_PROMOTIONAL: 'notifications_promotional',
    DAMAGE_REPORTS: 'damage_reports'
};

// Generic Helpers
const getAll = async <T>(collection: string): Promise<T[]> => {
    try {
        console.log(`[Firestore] Fetching ${collection} for Project: ${process.env.FIREBASE_PROJECT_ID}`);
        const snapshot = await db.collection(collection).get();
        console.log(`[Firestore] Fetched ${snapshot.size} docs from ${collection}`);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    } catch (error) {
        console.error(`[Firestore Error] Failed to fetch ${collection}:`, error);
        throw error;
    }
};

const getById = async <T>(collection: string, id: string | number): Promise<T | null> => {
    const doc = await db.collection(collection).doc(String(id)).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() } as unknown as T) : null;
};

const create = async <T>(collection: string, data: T & { id: string | number }): Promise<T> => {
    console.log(`[Firestore] Creating doc in ${collection}:`, data.id);
    try {
        await db.collection(collection).doc(String(data.id)).set(data);
        console.log(`[Firestore] Doc created successfully:`, data.id);
        return data;
    } catch (error) {
        console.error(`[Firestore Error] Failed to create doc in ${collection}:`, error);
        throw error;
    }
};

const update = async <T>(collection: string, id: string | number, data: Partial<T>): Promise<T | null> => {
    const docRef = db.collection(collection).doc(String(id));
    await docRef.update(data);
    const updated = await docRef.get();
    return { id: updated.id, ...updated.data() } as unknown as T;
};

const remove = async (collection: string, id: string | number): Promise<void> => {
    await db.collection(collection).doc(String(id)).delete();
};

export const UserService = {
    getAll: () => getAll<User>(COLLECTIONS.USERS),
    getById: (id: number | string) => getById<User>(COLLECTIONS.USERS, id),
    getByEmail: async (email: string): Promise<User | null> => {
        try {
            const snapshot = await db.collection(COLLECTIONS.USERS).where('email', '==', email).limit(1).get();
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as User;
        } catch (error) {
            console.error('Error in getByEmail:', error);
            return null;
        }
    },
    getByPhone: async (phone: string): Promise<User | null> => {
        try {
            const snapshot = await db.collection(COLLECTIONS.USERS).where('phone', '==', phone).limit(1).get();
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as User;
        } catch (error) {
            console.error('Error in getByPhone:', error);
            return null;
        }
    },
    getByFirebaseUid: async (firebaseUid: string): Promise<User | null> => {
        try {
            // First try direct document access using firebaseUid as document ID
            const doc = await db.collection(COLLECTIONS.USERS).doc(firebaseUid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() } as unknown as User;
            }

            // Fallback: query by firebaseUid field (for old users with timestamp IDs)
            const snapshot = await db.collection(COLLECTIONS.USERS).where('firebaseUid', '==', firebaseUid).limit(1).get();
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as User;
        } catch (error) {
            console.error('Error in getByFirebaseUid:', error);
            return null;
        }
    },

    create: (user: User) => create<User>(COLLECTIONS.USERS, user),
    update: (id: number | string, data: Partial<User>) => update<User>(COLLECTIONS.USERS, id, data),
    delete: (id: number | string) => remove(COLLECTIONS.USERS, id),
};

export const ItemService = {
    getAll: () => getAll<Item>(COLLECTIONS.ITEMS),
    getById: (id: number) => getById<Item>(COLLECTIONS.ITEMS, id),
    create: (item: Item) => create<Item>(COLLECTIONS.ITEMS, item),
    update: (id: number, data: Partial<Item>) => update<Item>(COLLECTIONS.ITEMS, id, data),
    delete: (id: number) => remove(COLLECTIONS.ITEMS, id),
};

export const BookingService = {
    getAll: () => getAll<Booking>(COLLECTIONS.BOOKINGS),
    getById: (id: string) => getById<Booking>(COLLECTIONS.BOOKINGS, id),
    create: (booking: Booking) => create<Booking>(COLLECTIONS.BOOKINGS, booking),
    update: (id: string, data: Partial<Booking>) => update<Booking>(COLLECTIONS.BOOKINGS, id, data),
};

export const PostService = {
    getAll: async () => {
        const posts = await getAll<ForumPost>(COLLECTIONS.POSTS);
        return posts.sort((a, b) => (b.timestamp?.localeCompare?.(a.timestamp || '') || 0));
    },
    getById: (id: string | number) => getById<ForumPost>(COLLECTIONS.POSTS, id),
    create: (post: ForumPost) => create<ForumPost>(COLLECTIONS.POSTS, post),
    update: (id: string | number, data: Partial<ForumPost>) => update<ForumPost>(COLLECTIONS.POSTS, id, data),
    delete: (id: string | number) => remove(COLLECTIONS.POSTS, id),
    deleteReply: async (postId: string | number, replyId: string | number) => {
        const post = await getById<ForumPost>(COLLECTIONS.POSTS, postId);
        if (post) {
            const newReplies = post.replies.filter(r => String(r.id) !== String(replyId));
            await update<ForumPost>(COLLECTIONS.POSTS, postId, { replies: newReplies });
        }
    }
};


export const KYCService = {
    getAll: () => getAll<any>('kycsubmissions'), // Use specific type if available
    getById: (id: string) => getById<any>('kycsubmissions', id),
    getByUserId: async (userId: number) => {
        const snapshot = await db.collection('kycsubmissions').where('userId', '==', userId).limit(1).get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },
    create: (data: any) => create<any>('kycsubmissions', data),
    update: (id: string, data: any) => update<any>('kycsubmissions', id, data),
    delete: (id: string) => remove('kycsubmissions', id)
};

// Helper to get collection name by category
const getNotificationCollection = (category?: string): string => {
    const categoryMap: Record<string, string> = {
        'user': COLLECTIONS.NOTIFICATIONS_USER,
        'admin': COLLECTIONS.NOTIFICATIONS_ADMIN,
        'weather': COLLECTIONS.NOTIFICATIONS_WEATHER,
        'booking': COLLECTIONS.NOTIFICATIONS_BOOKING,
        'system': COLLECTIONS.NOTIFICATIONS_SYSTEM,
        'promotional': COLLECTIONS.NOTIFICATIONS_PROMOTIONAL
    };
    return category && categoryMap[category] || COLLECTIONS.NOTIFICATIONS;
};

export const NotificationService = {
    getAll: () => getAll<Notification>(COLLECTIONS.NOTIFICATIONS),
    getAllByCategory: (category: string) => getAll<Notification>(getNotificationCollection(category)),
    getForUser: async (userId: number) => {
        const snapshot = await db.collection(COLLECTIONS.NOTIFICATIONS).where('userId', '==', userId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Notification));
    },
    create: (data: Notification) => {
        const collection = getNotificationCollection(data.category);
        return create<Notification>(collection, data);
    },
    update: (id: number, data: Partial<Notification>) => update<Notification>(COLLECTIONS.NOTIFICATIONS, id, data),
    markAsRead: (id: number) => update<Notification>(COLLECTIONS.NOTIFICATIONS, id, { read: true }),
    delete: (id: number) => remove(COLLECTIONS.NOTIFICATIONS, id),
    removeUserFromShowTo: async (notificationId: number | string, userId: string) => {
        const docRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc(String(notificationId));
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data() as Notification;
            if (data.showTo && data.showTo.includes(userId)) {
                const newShowTo = data.showTo.filter(id => id !== userId);
                await docRef.update({ showTo: newShowTo });
            }
        }
    }
};

// Personal notifications stored in user subcollection (optimized storage)
export const UserNotificationService = {
    getForUser: async (userId: string): Promise<Notification[]> => {
        try {
            const snapshot = await db.collection(COLLECTIONS.USERS).doc(userId)
                .collection('notifications').orderBy('timestamp', 'desc').limit(50).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Notification));
        } catch (error) {
            console.error(`[Firestore] Error fetching user notifications for ${userId}:`, error);
            return [];
        }
    },
    create: async (userId: string, data: Notification): Promise<Notification> => {
        console.log(`[Firestore] Creating personal notification for user ${userId}:`, data.id);
        const notificationWithShowTo = { ...data, showTo: [userId] };
        await db.collection(COLLECTIONS.USERS).doc(userId)
            .collection('notifications').doc(String(data.id)).set(notificationWithShowTo);
        return notificationWithShowTo;
    },
    markAsRead: async (userId: string, notificationId: string): Promise<void> => {
        await db.collection(COLLECTIONS.USERS).doc(userId)
            .collection('notifications').doc(notificationId).update({ read: true });
    },
    updateReadStatus: async (userId: string, notificationId: number, read: boolean): Promise<void> => {
        try {
            await db.collection(COLLECTIONS.USERS).doc(userId)
                .collection('notifications').doc(String(notificationId)).update({ read });
        } catch (error) {
            console.log(`[Firestore] Notification ${notificationId} not found in user ${userId}'s collection, skipping`);
        }
    },
    delete: async (userId: string, notificationId: string): Promise<void> => {
        await db.collection(COLLECTIONS.USERS).doc(userId)
            .collection('notifications').doc(notificationId).delete();
    },
    deleteAll: async (userId: string): Promise<void> => {
        const snapshot = await db.collection(COLLECTIONS.USERS).doc(userId)
            .collection('notifications').get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
};

// Broadcast notifications (1 doc per event, filtered by district client-side)
export const BroadcastService = {
    getAll: async (): Promise<Notification[]> => {
        try {
            const snapshot = await db.collection('broadcasts')
                .orderBy('timestamp', 'desc').limit(50).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Notification));
        } catch (error) {
            console.error('[Firestore] Error fetching broadcasts:', error);
            return [];
        }
    },
    getForDistrict: async (district: string): Promise<Notification[]> => {
        try {
            // Get broadcasts for specific district OR global broadcasts (district = 'all')
            const snapshot = await db.collection('broadcasts')
                .where('district', 'in', [district, 'all'])
                .orderBy('timestamp', 'desc').limit(20).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Notification));
        } catch (error) {
            console.error(`[Firestore] Error fetching broadcasts for district ${district}:`, error);
            return [];
        }
    },
    create: async (data: Notification & { district: string }): Promise<Notification> => {
        console.log(`[Firestore] Creating broadcast for district ${data.district}:`, data.id);

        // Fetch all relevant users to populate 'showTo'
        let targetUsers: User[] = [];
        if (data.district === 'all') {
            targetUsers = await UserService.getAll();
        } else {
            // This is inefficient but necessary without a direct query by district
            const allUsers = await UserService.getAll();
            targetUsers = allUsers.filter(u => u.district === data.district);
        }

        const showTo = targetUsers.map(u => u.id);
        console.log(`[Firestore] Broadcast target size: ${showTo.length} users`);

        const notificationWithShowTo = {
            ...data,
            showTo
        };

        await db.collection('broadcasts').doc(String(data.id)).set(notificationWithShowTo);
        return notificationWithShowTo;
    },
    delete: async (id: string): Promise<void> => {
        await db.collection('broadcasts').doc(id).delete();
    }
};

export const ChatService = {
    getAll: () => getAll<ChatMessage>(COLLECTIONS.CHATS),
    getById: (id: number) => getById<ChatMessage>(COLLECTIONS.CHATS, id),
    create: (message: ChatMessage) => create<ChatMessage>(COLLECTIONS.CHATS, message),
    update: (id: number, data: Partial<ChatMessage>) => update<ChatMessage>(COLLECTIONS.CHATS, id, data),
};

export const ReviewService = {
    getAll: () => getAll<Review>(COLLECTIONS.REVIEWS),
    getById: (id: number) => getById<Review>(COLLECTIONS.REVIEWS, id),
    create: (review: Review) => create<Review>(COLLECTIONS.REVIEWS, review),
    update: (id: number, data: Partial<Review>) => update<Review>(COLLECTIONS.REVIEWS, id, data),
};

export const SupportService = {
    getAll: () => getAll<SupportTicket>(COLLECTIONS.TICKETS),
    getById: (id: number) => getById<SupportTicket>(COLLECTIONS.TICKETS, id),
    create: (ticket: SupportTicket) => create<SupportTicket>(COLLECTIONS.TICKETS, ticket),
    update: (id: number, data: Partial<SupportTicket>) => update<SupportTicket>(COLLECTIONS.TICKETS, id, data),
};

export const DamageReportService = {
    getAll: () => getAll<DamageReport>(COLLECTIONS.DAMAGE_REPORTS),
    getById: (id: number) => getById<DamageReport>(COLLECTIONS.DAMAGE_REPORTS, id),
    create: (report: DamageReport) => create<DamageReport>(COLLECTIONS.DAMAGE_REPORTS, report),
    update: (id: number, data: Partial<DamageReport>) => update<DamageReport>(COLLECTIONS.DAMAGE_REPORTS, id, data),
};
