


export enum UserRole {
    Farmer = 'Farmer',
    Supplier = 'Supplier',
    Admin = 'Admin',
    AgentPro = 'AgentPro',
    Agent = 'Agent',
    Founder = 'Founder',
}

export interface User {
    id: string; // firebaseUid - use String(id) for any legacy numeric conversions
    firebaseUid?: string; // Firebase Auth UID - redundant but kept for backward compat
    name: string;
    email: string;
    password?: string;
    phone: string;
    role: UserRole;
    profilePicture?: string;
    age?: number;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    location?: string;
    userStatus: 'approved' | 'pending' | 'suspended' | 'blocked';
    suspendedUntil?: string; // Date string for when suspension ends
    kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted';
    lastAlerts?: Record<string, string>; // Map of alertType -> timestamp
    avgRating?: number;
    blockedDates?: string[];
    locationCoords?: { lat: number; lng: number; };
    aadharImageUrl?: string;
    personalPhotoUrl?: string;
    aadhaarNumber?: string;
    address?: string;
    // Notification-related fields
    district?: string;
    mandal?: string; // Mandal/Taluk/Tehsil - more accurate than district
    notificationPreferences?: {
        sms: boolean;
        push: boolean;
        email: boolean;
    };
    deviceTokens?: string[];
    signupDate?: string;
    googleSheetsUrl?: string; // For Agent Bulk Booking
    isTrustedSupplier?: boolean; // Admin can mark suppliers as trusted for manual allocation
    isVerifiedAccount?: boolean; // Paid verified account - treated as "Agent" (bypass utilization cap, top priority)
    verifiedAccountPurchaseDate?: string; // When the supplier purchased verified account
    verifiedAccountExpiryDate?: string; // When the verification expires
    verificationHistory?: { purchaseDate: string; expiryDate: string; plan: string; amount: number; }[]; // History of verification purchases
    // --- Weighted Average Rating (WAR) System Fields ---
    warTotalJobs?: number; // Total completed jobs
    warOnTimeCount?: number; // Number of on-time deliveries
    warDisputeCount6M?: number; // Disputes in last 6 months
    warCancellationCount6M?: number; // Supplier-initiated cancellations in last 6 months
    warLastCalculated?: string; // When the WAR was last recalculated
    warFinalRating?: number; // Final calculated WAR rating (displayed as avgRating)
    // Gamification & Streak System
    streak?: {
        currentCount: number;
        lastLoginDate: string; // YYYY-MM-DD
        guards: number;
        maxGuards: number; // Max 5 usually
        points?: number; // Accumulated points (0-99)
        lastWorkDate?: string; // YYYY-MM-DD
    };
    gamificationScore?: number;
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
    'Transportation',
    'Monitoring',
    // New Tractor Implements
    'Rotavator',
    'MB Plough',
    'Disc Harrow',
    'Cultivator',
    'Seed Drill',
    'Paddy Transplanter',
    'Boom Sprayer',
    'Leveller',
    // New Harvester Types
    'Paddy Harvestor',
    'Paddy Chain Harvestor',
    'Maize Harvestor',
    // New Worker Types
    'Sowing',
    'Planting',
    'Spraying',
    'Others'
] as const;

export const CATEGORY_WORK_PURPOSES: Record<ItemCategory, WorkPurpose[]> = {
    [ItemCategory.Tractors]: ['Rotavator', 'MB Plough', 'Disc Harrow', 'Cultivator', 'Seed Drill', 'Paddy Transplanter', 'Boom Sprayer', 'Leveller', 'Transportation'],
    [ItemCategory.Harvesters]: ['Paddy Harvestor', 'Paddy Chain Harvestor', 'Maize Harvestor'],
    [ItemCategory.JCB]: ['Digging / Earth Moving', 'Land Levelling'],
    [ItemCategory.Workers]: ['Sowing', 'Planting', 'Weeding', 'Spraying', 'Others'],
    [ItemCategory.Drones]: ['Spraying Pesticides/Fertilizers', 'Monitoring'],
    [ItemCategory.Sprayers]: ['Spraying Pesticides/Fertilizers'],
    [ItemCategory.Drivers]: ['Transportation'],
    [ItemCategory.Borewell]: ['Irrigation']
};

// Image mapping for Worker purposes
export const WORKER_PURPOSE_IMAGES: Record<string, string> = {
    'Sowing': '/assets/worker-purposes/sowing.jpg',
    'Planting': '/assets/worker-purposes/planting.jpg',
    'Weeding': '/assets/worker-purposes/weeding.jpg',
    'Spraying': '/assets/worker-purposes/spraying.jpg',
};

// Image mapping for Harvester purposes
export const HARVESTER_PURPOSE_IMAGES: Record<string, string> = {
    'Maize Harvestor': '/assets/harvester-purposes/maize.jpg',
    'Paddy Harvestor': '/assets/harvester-purposes/paddy.jpg',
    'Paddy Chain Harvestor': '/assets/harvester-purposes/paddy-chain.jpg',
};

// Image mapping for Tractor purposes  
export const TRACTOR_PURPOSE_IMAGES: Record<string, string> = {
    'Seed Drill': '/assets/tractor-purposes/seed-drill.jpg',
    'Cultivator': '/assets/tractor-purposes/cultivator.jpg',
    'Disc Harrow': '/assets/tractor-purposes/disc-harrow.jpg',
    'Rotavator': '/assets/tractor-purposes/rotavator.jpg',
    'Boom Sprayer': '/assets/tractor-purposes/boom-sprayer.jpg',
    'Paddy Transplanter': '/assets/tractor-purposes/transplanter.jpg',
    'MB Plough': '/assets/tractor-purposes/plough.jpg',
    'Leveller': '/assets/tractor-purposes/leveller.jpg',
    'Transportation': '/assets/tractor-purposes/transportation.jpg',
};

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
    autoPriceOptimization?: boolean;
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
    estimatedDuration: number;
    location: string;
    paymentId?: string;
    status: 'Searching' | 'Awaiting Operator' | 'Confirmed' | 'Arrived' | 'In Process' | 'Pending Payment' | 'Completed' | 'Cancelled' | 'Expired' | 'Pending Confirmation';
    additionalInstructions?: string;
    workPurpose?: WorkPurpose;
    workPurposeDetails?: string; // For 'Others'
    crop?: string; // Crop name for workers
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
    paymentMethod?: 'Cash' | 'Online' | 'UPI' | 'Card' | 'Wallet';
    advancePaymentId?: string;
    finalPaymentId?: string;
    discountAmount?: number;
    quantity?: number;
    acres?: number; // Number of acres for the job
    allowMultipleSuppliers?: boolean;
    operatorId?: string; // Changed to string for firebaseUid
    isRebroadcast?: boolean;
    // OTP-based start
    otpCode?: string;
    otpVerified?: boolean;
    workStartTime?: string;
    workEndTime?: string;
    // Payment details after completion
    farmerPaymentAmount?: number;
    supplierPaymentAmount?: number;
    adminCommission?: number;
    paymentDetails?: {
        farmerAmount: number;
        supplierAmount: number;
        commission: number;
        totalAmount: number;
        paymentDate: string;
        method?: 'Cash' | 'Online';
    };
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
    locationCoords?: { lat: number; lng: number; }; // Coordinates for the booking location
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
    chatId: string; // Composite key for the chat room, e.g., '1-2' for users or 'post-1' for forum
    senderId: string; // Changed to string for firebaseUid
    receiverId: string; // Changed to string for firebaseUid - Can be a user ID or '0' for group/post chat
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
    status?: 'open' | 'closed';
    closedAt?: string;
    closedBy?: string;
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
    seenAt?: string;
    expiresAt?: string;
    district?: string;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    scheduledFor?: string;
    sentVia?: NotificationChannel[];
    metadata?: Record<string, any>;
    showTo?: string[]; // List of user IDs who can see this notification
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
    status: 'open' | 'closed' | 'escalated' | 'pending';
    timestamp: string;
    replies?: SupportReply[];
    category?: 'Machine' | 'Payment' | 'Booking' | 'Behaviour';
    subcategory?: string;
    againstUserId?: string; // Changed to string for firebaseUid
    bookingId?: string;
    evidenceUrls?: string[];
    priority?: 'Low' | 'Med' | 'High';
    adminNotes?: string[];
}

export interface AiChatMessage {
    id: number;
    role: 'user' | 'ai';
    text: string;
    timestamp: string;
}


export type AppView =
    | { view: 'HOME' }
    | { view: 'EARNINGS_DETAILS' }
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
    | { view: 'VOICE_ASSISTANT' }
    | { view: 'AI_SCAN' }
    | { view: 'MANAGE_SUPPORT_TICKETS' }
    | { view: 'MY_ACCOUNT' }
    | { view: 'PERSONAL_DETAILS' }
    | { view: 'CHANGE_PASSWORD' }
    | { view: 'EDIT_DETAILS' }
    | { view: 'SETTINGS' }
    | { view: 'PAYMENT_HISTORY' }
    | { view: 'POLICY' }
    | { view: 'COMMUNITY' }
    | { view: 'CROP_CALENDAR' }
    | { view: 'SUPPLIER_KYC' }
    | { view: 'BULK_BOOKING' }
    | { view: 'VERIFIED_ACCOUNT_MANAGER' }
    | { view: 'ADMIN_VERIFICATION_MANAGER' }
    | { view: 'ADMIN_DEMAND' }
    | { view: 'PROFILE' };

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface FraudFlag {
    id: string;
    type: 'Farmer' | 'Supplier' | 'Payment';
    userId?: string; // Changed to string for firebaseUid
    bookingId?: string;
    reason: string;
    score: number;
    risk: RiskLevel;
    timestamp: string;
}

export interface KycDocument {
    type: 'Aadhaar' | 'PAN' | 'Photo' | 'GST' | 'MachineProof' | 'BankPassbook';
    url?: string;
    status: 'Submitted' | 'Approved' | 'Rejected' | 'ReuploadRequested';
    notes?: string;
}

export interface KycSubmission {
    id: number;
    userId: string; // Changed to string for firebaseUid
    docs: KycDocument[];
    status: 'Pending' | 'Approved' | 'Rejected';
    riskLevel?: RiskLevel;
    submittedAt: string;
    adminNotes?: string[];
    geo?: { lat: number; lng: number };
}

// Agent Action Types for Audit Trail
export type AgentActionType =
    | 'BOOKING_CREATED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_MODIFIED'
    | 'FARMER_CONTACTED'
    | 'BULK_UPLOAD'
    | 'VIEWED_DASHBOARD'
    | 'EXPORTED_DATA';

export interface AgentAction {
    id: string;
    agentId: string; // Changed to string for firebaseUid
    agentName: string;
    action: AgentActionType;
    targetFarmerId?: string; // Changed to string for firebaseUid
    targetFarmerName?: string;
    bookingId?: string;
    details: Record<string, any>;
    timestamp: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface AgentStatistics {
    totalBookings: number;
    bookingsThisWeek: number;
    bookingsThisMonth: number;
    bookingsToday: number;
    farmersServed: number;
    uniqueFarmersThisWeek: number;
    averageBookingsPerDay: number;
    mostBookedCategory?: ItemCategory;
    recentActions: AgentAction[];
    topFarmers: { farmerId: string; farmerName: string; count: number }[];
}
