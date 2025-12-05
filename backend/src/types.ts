

export enum UserRole {
    Farmer = 'Farmer',
    Supplier = 'Supplier',
    Admin = 'Admin',
}

export interface User {
    id: string; // firebaseUid - use String(id) for legacy conversions
    name: string;
    email: string;
    password?: string;
    phone: string;
    role: UserRole;
    profilePicture?: string;
    aadhaarImage?: string;
    aadhaarNumber?: string;
    address?: string;
    age?: number;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    location?: string;
    userStatus: 'approved' | 'pending' | 'suspended' | 'blocked';
    kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted';
    lastAlerts?: Record<string, string>; // Map of alertType -> timestamp
    firebaseUid?: string;
    avgRating?: number;
    blockedDates?: string[];
    locationCoords?: { lat: number; lng: number; };
    // Notification-related fields
    district?: string; // Derived from GPS coordinates
    mandal?: string; // Mandal/Taluk/Tehsil - more accurate than district
    notificationPreferences?: {
        sms: boolean;
        push: boolean;
        email: boolean;
    };
    deviceTokens?: string[]; // For push notifications
    signupDate?: string; // ISO timestamp for targeting new users
    googleSheetsUrl?: string; // For Agent Bulk Booking
    isTrustedSupplier?: boolean; // Admin can mark suppliers as trusted for manual allocation
}

export enum ItemCategory {
    Tractors = 'Tractors',
    Harvesters = 'Harvesters',
    JCB = 'JCB',
    Workers = 'Workers',
    Drones = 'Drones',
    Sprayers = 'Sprayers',
    Drivers = 'Drivers',
    Borewell = 'Borewell',
}

export const WORK_PURPOSES = [
    'Ploughing',
    'Sowing / Planting',
    'Harvesting',
    'Spraying Pesticides/Fertilizers',
    'Weeding',
    'Irrigation',
    'Land Levelling',
    'Digging / Earth Moving',
    'Transportation'
] as const;

export type WorkPurpose = typeof WORK_PURPOSES[number];

export interface SeasonalPrice {
    name: string; // e.g., "Harvest Season Rate"
    priceModifier: number; // e.g., 1.25 for 25% increase, 0.9 for 10% discount
    startDate: string; // "MM-DD"
    endDate: string; // "MM-DD"
}

export interface Item {
    id: number;
    name: string;
    category: ItemCategory;
    purposes: { name: WorkPurpose, price: number }[];
    images: string[];
    ownerId: string; // Changed to string for firebaseUid
    location: string;
    available: boolean;
    status: 'approved' | 'pending' | 'rejected';
    description: string;
    currentLocation?: { lat: number, lng: number }; // For trackable items
    locationCoords?: { lat: number, lng: number }; // For distance calculation
    operatorCharge?: number;
    avgRating?: number;
    quantityAvailable?: number;
    seasonalPrices?: SeasonalPrice[];
    // New fields for machines
    model?: string;
    licensePlate?: string;
    year?: number;
    horsepower?: number;
    condition?: 'New' | 'Good' | 'Fair';
    gender?: 'Male' | 'Female';
}

export interface Booking {
    id: string;
    farmerId: string; // Changed to string for firebaseUid
    supplierId?: string; // Changed to string for firebaseUid
    itemId?: number;
    itemCategory: ItemCategory;
    date: string;
    startTime: string;
    endTime?: string;
    location: string;
    paymentId?: string;
    status: 'Searching' | 'Awaiting Operator' | 'Confirmed' | 'Arrived' | 'In Process' | 'Pending Payment' | 'Completed' | 'Cancelled' | 'Expired' | 'Pending Confirmation';
    additionalInstructions?: string;
    workPurpose?: WorkPurpose;
    preferredModel?: string;
    operatorRequired?: boolean;
    recurrenceId?: string;
    disputeResolved?: boolean;
    disputeRaised?: boolean;
    damageReported?: boolean;
    estimatedPrice?: number;
    advanceAmount?: number;
    finalPrice?: number;
    distanceCharge?: number;
    paymentMethod?: 'UPI' | 'Card' | 'Wallet';
    advancePaymentId?: string;
    finalPaymentId?: string;
    discountAmount?: number;
    quantity?: number;
    allowMultipleSuppliers?: boolean;
    operatorId?: string; // Changed to string for firebaseUid
    isRebroadcast?: boolean;
    otpCode?: string;
    otpVerified?: boolean;
    workStartTime?: string;
    workEndTime?: string;
    // Agent booking tracking
    bookedByAgentId?: string;        // Changed to string for firebaseUid
    bookedForFarmerId?: string;      // Changed to string for firebaseUid
    isAgentBooking?: boolean;        // Flag for quick identification
    // Timeout and radius tracking
    createdAt?: string;              // Track when booking was created for timeout calculation
    searchTimeoutNotified?: boolean; // Track if 6-hour alert was sent
    searchRadiusExpanded?: boolean;  // Track if farmer expanded search radius
    originalSearchRadius?: number;   // Store original radius before expansion
    expandedSearchRadius?: number;   // Store expanded radius
    manuallyAllottedBy?: string;     // Changed to string for firebaseUid
    adminAlertCount?: number;        // Count of admin alerts sent (max 3 before auto-cancel)
    lastAdminAlertTime?: string;     // Timestamp of last admin alert
}

export interface Review {
    id: number;
    itemId?: number;
    ratedUserId?: string; // Changed to string for firebaseUid
    bookingId: string;
    reviewerId: string; // Changed to string for firebaseUid
    rating: number;
    comment: string;
}

export interface ChatMessage {
    id: number;
    chatId: string; // Composite key for the chat room
    senderId: string; // Changed to string for firebaseUid
    receiverId: string; // Changed to string for firebaseUid
    text: string;
    timestamp: string;
    read: boolean;
    isBotMessage?: boolean;
}

export interface CommunityReply {
    id: number;
    authorId: string; // Changed to string for firebaseUid
    content: string;
    timestamp: string;
}

export interface ForumPost {
    id: number;
    authorId: string; // Changed to string for firebaseUid
    title: string;
    content: string;
    timestamp: string;
    replies: CommunityReply[];
}

export interface DamageReport {
    id: number;
    bookingId: string;
    itemId: number;
    reporterId: string; // Changed to string for firebaseUid
    description: string;
    status: 'pending' | 'resolved';
    timestamp: string;
}

export type NotificationCategory = 'weather' | 'location' | 'price' | 'booking' | 'promotional' | 'performance' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationChannel = 'app' | 'push';

export interface Notification {
    id: number;
    userId: string; // Changed to string for firebaseUid - '0' for broadcast
    message: string;
    type: 'booking' | 'offer' | 'community' | 'admin' | 'coupon' | 'news' | 'update';
    read: boolean;
    timestamp: string;
    // Enhanced fields for smart notifications
    seenAt?: string; // Timestamp when notification was marked as seen
    expiresAt?: string; // Auto-calculated: seenAt + 24 hours
    district?: string; // Target district for location-based notifications
    category?: NotificationCategory; // Smart categorization
    priority?: NotificationPriority; // Notification importance level
    scheduledFor?: string; // For scheduled notifications
    sentVia?: NotificationChannel[]; // Delivery channels used
    metadata?: Record<string, any>; // Additional data (weather info, booking ID, etc.)
}

export interface SupportReply {
    id: number;
    authorId: string; // Changed to string for firebaseUid
    text: string;
    timestamp: string;
}

export interface SupportTicket {
    id: number;
    userId?: string; // Changed to string for firebaseUid
    name: string;
    email: string;
    message: string;
    status: 'open' | 'closed';
    timestamp: string;
    replies?: SupportReply[];
}

export interface AiChatMessage {
    id: number;
    role: 'user' | 'ai';
    text: string;
    timestamp: string;
}


export type AppView =
    | { view: 'HOME' }
    | { view: 'ITEM_DETAIL'; item: Item }
    | { view: 'BOOKING_FORM', category?: ItemCategory, quantity?: number, item?: Item, workPurpose?: WorkPurpose }
    | { view: 'BOOKING_SUCCESS', isDirectRequest?: boolean, paymentType?: 'now' | 'later' }
    | { view: 'RATE_ITEM'; booking: Booking }
    | { view: 'RATE_USER'; booking: Booking }
    | { view: 'CHAT'; chatPartner: User, item?: Item }
    | { view: 'CONVERSATIONS' }
    | { view: 'SUPPORT' }
    | { view: 'ADMIN_DASHBOARD' }
    | { view: 'MANAGE_USERS' }
    | { view: 'MANAGE_ITEMS' }
    | { view: 'MANAGE_BOOKINGS' }
    | { view: 'ADMIN_ANALYTICS' }
    | { view: 'TRACKING', item: Item }
    | { view: 'REPORT_DAMAGE', booking: Booking }
    | { view: 'AI_ASSISTANT' }
    | { view: 'AI_SCAN' }
    | { view: 'MANAGE_SUPPORT_TICKETS' }
    | { view: 'MY_ACCOUNT' }
    | { view: 'SETTINGS' }
    | { view: 'PAYMENT_HISTORY' }
    | { view: 'POLICY' };
