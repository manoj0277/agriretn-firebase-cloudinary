import { Request, Response, NextFunction } from 'express';
import { auth as firebaseAuth } from '../firebase';
import { UserService } from '../services/firestore';
import { UserRole } from '../types';
import { logAuthAttempt, logSecurityEvent, trackFailedAttempt, clearFailedAttempts } from '../services/logger';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email: string;
                role: UserRole;
                id: string | number;
            };
        }
    }
}

/**
 * Middleware to verify Firebase ID token
 * Extracts user info and attaches to req.user
 */
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication token provided'
        });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Verify the Firebase ID token
        const decodedToken = await firebaseAuth.verifyIdToken(token);

        // Note: No session timeout - users stay logged in until they explicitly logout
        // Firebase handles token refresh automatically

        // Fetch user from database to get role
        const user = await UserService.getByFirebaseUid(decodedToken.uid);

        if (!user) {
            return res.status(401).json({
                error: 'User Not Found',
                message: 'User account not found in database'
            });
        }

        // Check if user is suspended
        if (user.userStatus === 'suspended') {
            return res.status(403).json({
                error: 'Account Suspended',
                message: 'Your account has been suspended. Please contact support.'
            });
        }

        // Attach user info to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email || user.email,
            role: user.role as UserRole,
            id: user.id
        };

        next();
    } catch (error: any) {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';

        // Log failed token verification
        logAuthAttempt('TOKEN_VERIFY', {
            success: false,
            ip,
            userAgent: req.headers['user-agent'],
            reason: error.code || error.message,
        });

        // Track failed attempts for brute force detection
        const { blocked, attempts } = trackFailedAttempt(ip);
        if (blocked) {
            return res.status(429).json({
                error: 'Too Many Attempts',
                message: 'Too many failed authentication attempts. Please try again later.'
            });
        }

        console.error('[Auth Middleware] Token verification failed:', error.message);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                error: 'Token Expired',
                message: 'Authentication token has expired. Please refresh your session.'
            });
        }

        return res.status(401).json({
            error: 'Invalid Token',
            message: 'Authentication token is invalid'
        });
    }
};

/**
 * Middleware factory to check user roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        // Admin and Founder always have access to everything (case-insensitive check)
        const userRole = req.user.role?.toLowerCase();
        const isAdmin = userRole === UserRole.Admin.toLowerCase();
        const isFounder = userRole === UserRole.Founder.toLowerCase();

        if (isAdmin || isFounder) {
            return next();
        }

        const isAllowed = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!isAllowed) {
            console.warn(`[Auth Middleware] Role check failed: User ${req.user.email} with role ${req.user.role} tried to access route requiring ${allowedRoles.join(' or ')}`);
            return res.status(403).json({
                error: 'Forbidden',
                message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Middleware to check if user can only access their own resources
 * Used for routes like PUT /api/users/:id
 */
export const requireSelfOrAdmin = (paramName: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const resourceId = req.params[paramName];
        const userId = String(req.user.id);

        // Admin can access any resource
        if (req.user.role === UserRole.Admin) {
            return next();
        }

        // User can only access their own resource
        if (resourceId !== userId) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own resources'
            });
        }

        next();
    };
};

/**
 * Optional auth middleware - doesn't block if no token, but attaches user if valid
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continue without user
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        const user = await UserService.getByFirebaseUid(decodedToken.uid);

        if (user) {
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email || user.email,
                role: user.role as UserRole,
                id: user.id
            };
        }
    } catch (error) {
        // Silently fail - user will be undefined
    }

    next();
};
