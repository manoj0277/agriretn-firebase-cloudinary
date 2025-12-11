import fs from 'fs';
import path from 'path';

// ============================================
// LOGGING SERVICE
// Comprehensive logging for errors, security, and audit
// ============================================

const LOGS_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Log file paths
const LOG_FILES = {
    ERROR: path.join(LOGS_DIR, 'errors.log'),
    AUTH: path.join(LOGS_DIR, 'auth.log'),
    AUDIT: path.join(LOGS_DIR, 'audit.log'),
    SECURITY: path.join(LOGS_DIR, 'security.log'),
};

// Log levels
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

// ============================================
// CORE LOGGING FUNCTIONS
// ============================================

const formatLogEntry = (level: LogLevel, category: string, message: string, data?: any): string => {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${category}] ${message}${dataStr}\n`;
};

const writeLog = (filePath: string, entry: string): void => {
    try {
        fs.appendFileSync(filePath, entry);
    } catch (error) {
        console.error('Failed to write log:', error);
    }
};

// ============================================
// ERROR LOGGING
// ============================================

export const logError = (error: Error | string, context?: {
    endpoint?: string;
    userId?: string | number;
    requestId?: string;
    stack?: string;
}): void => {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : context?.stack;

    const entry = formatLogEntry('ERROR', 'ERROR', message, {
        ...context,
        stack: stack?.split('\n').slice(0, 5).join(' | '), // First 5 lines of stack
    });

    writeLog(LOG_FILES.ERROR, entry);
    console.error(`[ERROR] ${message}`);
};

export const logCriticalError = (error: Error | string, context?: any): void => {
    const message = error instanceof Error ? error.message : error;

    const entry = formatLogEntry('CRITICAL', 'CRITICAL_ERROR', message, context);
    writeLog(LOG_FILES.ERROR, entry);
    console.error(`[CRITICAL ERROR] ${message}`);
};

// ============================================
// AUTH LOGGING (Failed attempts, suspicious patterns)
// ============================================

export const logAuthAttempt = (type: 'LOGIN' | 'SIGNUP' | 'OTP' | 'TOKEN_VERIFY', data: {
    success: boolean;
    email?: string;
    phone?: string;
    ip?: string;
    userAgent?: string;
    reason?: string;
}): void => {
    const level: LogLevel = data.success ? 'INFO' : 'WARN';
    const message = `${type} attempt - ${data.success ? 'SUCCESS' : 'FAILED'}`;

    const entry = formatLogEntry(level, 'AUTH', message, {
        email: data.email,
        phone: data.phone,
        ip: data.ip,
        userAgent: data.userAgent?.substring(0, 100), // Truncate user agent
        reason: data.reason,
    });

    writeLog(LOG_FILES.AUTH, entry);

    if (!data.success) {
        console.warn(`[AUTH WARN] ${message} - ${data.email || data.phone}`);
    }
};

// Track failed attempts for rate limiting / blocking
const failedAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

export const trackFailedAttempt = (identifier: string): { blocked: boolean; attempts: number } => {
    const now = new Date();
    const record = failedAttempts.get(identifier);

    if (record) {
        // Reset if last attempt was more than 15 minutes ago
        const timeDiff = now.getTime() - record.lastAttempt.getTime();
        if (timeDiff > 15 * 60 * 1000) {
            failedAttempts.set(identifier, { count: 1, lastAttempt: now });
            return { blocked: false, attempts: 1 };
        }

        record.count++;
        record.lastAttempt = now;

        // Block after 5 failed attempts in 15 minutes
        if (record.count >= 5) {
            logSecurityEvent('BRUTE_FORCE_DETECTED', { identifier, attempts: record.count });
            return { blocked: true, attempts: record.count };
        }

        return { blocked: false, attempts: record.count };
    }

    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { blocked: false, attempts: 1 };
};

export const clearFailedAttempts = (identifier: string): void => {
    failedAttempts.delete(identifier);
};

// ============================================
// SECURITY EVENT LOGGING
// ============================================

export const logSecurityEvent = (event: string, data?: {
    identifier?: string;
    ip?: string;
    userId?: string | number;
    attempts?: number;
    details?: string;
}): void => {
    const entry = formatLogEntry('WARN', 'SECURITY', event, data);
    writeLog(LOG_FILES.SECURITY, entry);
    console.warn(`[SECURITY] ${event}`, data);
};

// ============================================
// AUDIT TRAIL LOGGING
// ============================================

type AuditAction =
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'USER_SUSPENDED'
    | 'USER_REACTIVATED'
    | 'SUPPLIER_APPROVED'
    | 'ADMIN_ACTION'
    | 'ITEM_CREATED'
    | 'ITEM_UPDATED'
    | 'ITEM_DELETED'
    | 'BOOKING_CREATED'
    | 'BOOKING_UPDATED'
    | 'BOOKING_CANCELLED'
    | 'KYC_SUBMITTED'
    | 'KYC_APPROVED'
    | 'KYC_REJECTED'
    | 'PASSWORD_CHANGED'
    | 'ROLE_CHANGED';

export const logAudit = (action: AuditAction, data: {
    performedBy: string | number;
    targetUser?: string | number;
    targetResource?: string;
    details?: string;
    oldValue?: any;
    newValue?: any;
}): void => {
    const entry = formatLogEntry('INFO', 'AUDIT', action, {
        performedBy: data.performedBy,
        targetUser: data.targetUser,
        targetResource: data.targetResource,
        details: data.details,
        changes: data.oldValue || data.newValue ? {
            from: data.oldValue,
            to: data.newValue,
        } : undefined,
    });

    writeLog(LOG_FILES.AUDIT, entry);
    console.log(`[AUDIT] ${action} by ${data.performedBy}`);
};

// ============================================
// REQUEST LOGGING MIDDLEWARE
// ============================================

export const requestLogger = (req: any, res: any, next: any): void => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        // Log suspicious patterns
        if (status === 401 || status === 403) {
            logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
                ip: req.ip || req.connection?.remoteAddress,
                details: `${req.method} ${req.path} - Status ${status}`,
            });
        }

        // Log slow requests (>5 seconds)
        if (duration > 5000) {
            logError(`Slow request: ${req.method} ${req.path}`, {
                endpoint: req.path,
                requestId: req.headers['x-request-id'],
            });
        }
    });

    next();
};

// ============================================
// LOG ROTATION (Simple daily rotation)
// ============================================

export const rotateLogs = (): void => {
    const today = new Date().toISOString().split('T')[0];

    Object.entries(LOG_FILES).forEach(([name, filePath]) => {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const fileDate = stats.mtime.toISOString().split('T')[0];

            // Rotate if file is from a previous day and larger than 10MB
            if (fileDate !== today && stats.size > 10 * 1024 * 1024) {
                const archivePath = filePath.replace('.log', `-${fileDate}.log`);
                fs.renameSync(filePath, archivePath);
                console.log(`[Logger] Rotated ${name} log to ${archivePath}`);
            }
        }
    });
};

// Run log rotation on startup
rotateLogs();

// Export log file paths for external access
export const getLogFilePaths = (): typeof LOG_FILES => LOG_FILES;
