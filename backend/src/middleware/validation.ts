import { z } from 'zod';

// ==========================================
// INPUT VALIDATION SCHEMAS
// Use these to validate request bodies/params
// ==========================================

// --- USER SCHEMAS ---
export const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
    role: z.enum(['Farmer', 'Supplier', 'Admin', 'Agent']),
    district: z.string().optional(),
    mandal: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export const updateUserSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^[0-9]{10}$/).optional(),
    district: z.string().optional(),
    mandal: z.string().optional(),
    locationCoords: z.object({
        lat: z.number(),
        lng: z.number(),
    }).optional(),
}).partial();

// --- ITEM SCHEMAS ---
export const createItemSchema = z.object({
    name: z.string().min(2, 'Item name is required').max(200),
    description: z.string().max(2000).optional(),
    category: z.string().min(1, 'Category is required'),
    pricePerDay: z.number().positive('Price must be positive'),
    pricePerHour: z.number().positive().optional(),
    images: z.array(z.string().url()).optional(),
    ownerId: z.number(),
});

export const updateItemSchema = createItemSchema.partial();

// --- BOOKING SCHEMAS ---
export const createBookingSchema = z.object({
    itemId: z.union([z.string(), z.number()]).optional(),
    itemCategory: z.string().optional(),
    farmerId: z.number(),
    supplierId: z.number().optional(),
    date: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string(),
    totalPrice: z.number().positive().optional(),
    status: z.string().optional(),
    notes: z.string().max(1000).optional(),
});

export const updateBookingSchema = z.object({
    status: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    totalPrice: z.number().positive().optional(),
    notes: z.string().max(1000).optional(),
    otp: z.string().length(4).optional(),
}).partial();

// --- NOTIFICATION SCHEMAS ---
export const createNotificationSchema = z.object({
    userId: z.number(),
    message: z.string().min(1).max(500),
    type: z.string(),
    category: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
});

// --- ID PARAMETER VALIDATION ---
export const idParamSchema = z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format'),
});

export const numericIdParamSchema = z.object({
    id: z.string().regex(/^[0-9]+$/, 'ID must be numeric'),
});

// --- HELPER FUNCTION ---
// Validate request and return errors if invalid
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    };
};

// --- EXPRESS MIDDLEWARE FACTORY ---
// Use this to validate request bodies in routes
export const validate = <T>(schema: z.ZodSchema<T>) => {
    return (req: any, res: any, next: any) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: result.error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        req.validatedBody = result.data;
        next();
    };
};

// Validate params middleware
export const validateParams = <T>(schema: z.ZodSchema<T>) => {
    return (req: any, res: any, next: any) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({
                error: 'Invalid Parameters',
                details: result.error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        req.validatedParams = result.data;
        next();
    };
};
