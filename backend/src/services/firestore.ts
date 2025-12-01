import { db } from '../firebase';
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
    getById: (id: number) => getById<User>(COLLECTIONS.USERS, id),
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

    create: (user: User) => create<User>(COLLECTIONS.USERS, user),
    update: (id: number, data: Partial<User>) => update<User>(COLLECTIONS.USERS, id, data),
    delete: (id: number) => remove(COLLECTIONS.USERS, id),
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
    getById: (id: number) => getById<ForumPost>(COLLECTIONS.POSTS, id),
    create: (post: ForumPost) => create<ForumPost>(COLLECTIONS.POSTS, post),
    update: (id: number, data: Partial<ForumPost>) => update<ForumPost>(COLLECTIONS.POSTS, id, data),
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

export const NotificationService = {
    getAll: () => getAll<Notification>(COLLECTIONS.NOTIFICATIONS),
    getForUser: async (userId: number) => {
        const snapshot = await db.collection(COLLECTIONS.NOTIFICATIONS).where('userId', '==', userId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Notification));
    },
    create: (data: Notification) => create<Notification>(COLLECTIONS.NOTIFICATIONS, data),
    update: (id: number, data: Partial<Notification>) => update<Notification>(COLLECTIONS.NOTIFICATIONS, id, data),
    markAsRead: (id: number) => update<Notification>(COLLECTIONS.NOTIFICATIONS, id, { read: true }),
    delete: (id: number) => remove(COLLECTIONS.NOTIFICATIONS, id)
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
