import { User, UserRole } from '../types';
import { UserService, BookingService, ReviewService } from './firestore';

/**
 * Weighted Average Rating (WAR) System
 * 
 * Formula:
 * 1. Base Score = (0.60 × Star Rating Mean) + (0.40 × On-Time Rate × 5)
 * 2. Penalties = (Disputes × 0.5) + (Cancellations × 0.75)
 * 3. Volume Weighted (Bayesian) = ((N × R_current) + (M × R_default)) / (N + M)
 * 4. Recency Decay: 100% for last 90 days, 50% for 91-180 days, 0% for older
 * 
 * Final Rating = Volume Weighted Score (after penalties and recency)
 */

// Constants
const STAR_RATING_WEIGHT = 0.60;
const ON_TIME_WEIGHT = 0.40;
const DISPUTE_PENALTY = 0.5;
const CANCELLATION_PENALTY = 0.75;
const CREDIBILITY_FACTOR = 5; // M: minimum "default" ratings for stability
const DEFAULT_RATING = 3.0; // New suppliers start as if they have 5 jobs at 3.0

interface WARCalculationResult {
    starRatingMean: number;
    onTimeRate: number;
    baseScore: number;
    disputePenalty: number;
    cancellationPenalty: number;
    totalPenalty: number;
    scoreAfterPenalties: number;
    volumeWeightedRating: number;
    totalJobs: number;
    onTimeCount: number;
    disputeCount: number;
    cancellationCount: number;
    finalRating: number;
}

/**
 * Calculate On-Time Rate for a supplier based on bookings
 * A booking is "on-time" if the supplier arrived within 30 minutes of scheduled start
 */
const calculateOnTimeRate = async (supplierId: string): Promise<{ onTimeCount: number; totalJobs: number }> => {
    const bookings = await BookingService.getAll();
    const supplierBookings = bookings.filter(b =>
        b.supplierId === supplierId &&
        b.status === 'Completed'
    );

    const totalJobs = supplierBookings.length;

    // Count on-time arrivals (if workStartTime is within 30 min of startTime, considered on-time)
    let onTimeCount = 0;
    supplierBookings.forEach(b => {
        if (b.startTime && b.workStartTime) {
            const [scheduledH, scheduledM] = b.startTime.split(':').map(Number);
            const [actualH, actualM] = b.workStartTime.split(':').map(Number);
            const scheduledMinutes = scheduledH * 60 + scheduledM;
            const actualMinutes = actualH * 60 + actualM;
            // On-time if arrived within 30 minutes of scheduled time
            if (actualMinutes <= scheduledMinutes + 30) {
                onTimeCount++;
            }
        } else {
            // If no workStartTime recorded, assume on-time for completed bookings
            onTimeCount++;
        }
    });

    return { onTimeCount, totalJobs };
};

/**
 * Calculate Star Rating Mean with recency decay
 * - Last 90 days: 100% weight
 * - 91-180 days: 50% weight
 * - Older than 180 days: excluded
 */
const calculateStarRatingMean = async (supplierId: string): Promise<number> => {
    const reviews = await ReviewService.getAll();
    const bookings = await BookingService.getAll();

    // Get bookings for this supplier to find related reviews
    const supplierBookingIds = bookings
        .filter(b => b.supplierId === supplierId)
        .map(b => b.id);

    // Filter reviews for this supplier's bookings
    const supplierReviews = reviews.filter(r =>
        supplierBookingIds.includes(r.bookingId) || r.ratedUserId === supplierId
    );

    if (supplierReviews.length === 0) {
        return DEFAULT_RATING;
    }

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    let weightedSum = 0;
    let totalWeight = 0;

    supplierReviews.forEach(review => {
        const booking = bookings.find(b => b.id === review.bookingId);
        const reviewDate = booking ? new Date(booking.date) : new Date();

        let weight = 0;
        if (reviewDate >= ninetyDaysAgo) {
            weight = 1.0; // 100% for last 90 days
        } else if (reviewDate >= oneEightyDaysAgo) {
            weight = 0.5; // 50% for 91-180 days
        }
        // Older than 180 days = 0 weight (excluded)

        if (weight > 0) {
            weightedSum += review.rating * weight;
            totalWeight += weight;
        }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : DEFAULT_RATING;
};

/**
 * Count disputes for a supplier in the last 6 months
 */
const countDisputes = async (supplierId: string): Promise<number> => {
    const bookings = await BookingService.getAll();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const disputes = bookings.filter(b =>
        b.supplierId === supplierId &&
        b.disputeRaised === true &&
        new Date(b.date) >= sixMonthsAgo
    );

    return disputes.length;
};

/**
 * Count supplier-initiated cancellations in the last 6 months
 */
const countCancellations = async (supplierId: string): Promise<number> => {
    const bookings = await BookingService.getAll();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Supplier-initiated cancellations: status is 'Cancelled' and supplier was assigned
    const cancellations = bookings.filter(b =>
        b.supplierId === supplierId &&
        b.status === 'Cancelled' &&
        new Date(b.date) >= sixMonthsAgo
    );

    return cancellations.length;
};

/**
 * Apply Bayesian Volume Weighting
 * R_stable = ((N × R_current) + (M × R_default)) / (N + M)
 */
const applyVolumeWeighting = (currentRating: number, totalJobs: number): number => {
    const N = totalJobs;
    const M = CREDIBILITY_FACTOR;
    const R_current = currentRating;
    const R_default = DEFAULT_RATING;

    return ((N * R_current) + (M * R_default)) / (N + M);
};

/**
 * Calculate the full Weighted Average Rating for a supplier
 */
export const calculateWAR = async (supplierId: string): Promise<WARCalculationResult> => {
    // Step 1: Get Star Rating Mean (with recency decay)
    const starRatingMean = await calculateStarRatingMean(supplierId);

    // Step 2: Get On-Time Rate
    const { onTimeCount, totalJobs } = await calculateOnTimeRate(supplierId);
    const onTimeRate = totalJobs > 0 ? onTimeCount / totalJobs : 1.0;
    const onTimeScore = onTimeRate * 5; // Convert to 5-point scale

    // Step 3: Calculate Base Score
    const baseScore = (STAR_RATING_WEIGHT * starRatingMean) + (ON_TIME_WEIGHT * onTimeScore);

    // Step 4: Calculate Penalties
    const disputeCount = await countDisputes(supplierId);
    const cancellationCount = await countCancellations(supplierId);
    const disputePenalty = disputeCount * DISPUTE_PENALTY;
    const cancellationPenalty = cancellationCount * CANCELLATION_PENALTY;
    const totalPenalty = disputePenalty + cancellationPenalty;

    // Step 5: Apply Penalties (minimum 0)
    const scoreAfterPenalties = Math.max(0, baseScore - totalPenalty);

    // Step 6: Apply Volume Weighting (Bayesian Average)
    const volumeWeightedRating = applyVolumeWeighting(scoreAfterPenalties, totalJobs);

    // Step 7: Clamp final rating between 0 and 5
    const finalRating = Math.min(5, Math.max(0, Math.round(volumeWeightedRating * 10) / 10));

    return {
        starRatingMean,
        onTimeRate,
        baseScore,
        disputePenalty,
        cancellationPenalty,
        totalPenalty,
        scoreAfterPenalties,
        volumeWeightedRating,
        totalJobs,
        onTimeCount,
        disputeCount,
        cancellationCount,
        finalRating,
    };
};

/**
 * Recalculate and update WAR for a single supplier
 */
export const updateSupplierWAR = async (supplierId: string): Promise<void> => {
    try {
        const result = await calculateWAR(supplierId);

        await UserService.update(supplierId, {
            avgRating: result.finalRating,
            warTotalJobs: result.totalJobs,
            warOnTimeCount: result.onTimeCount,
            warDisputeCount6M: result.disputeCount,
            warCancellationCount6M: result.cancellationCount,
            warLastCalculated: new Date().toISOString(),
            warBaseScore: Math.round(result.baseScore * 100) / 100,
            warFinalRating: result.finalRating,
        });

        console.log(`[WAR] Updated supplier ${supplierId}: Rating ${result.finalRating} (Jobs: ${result.totalJobs}, OnTime: ${result.onTimeRate * 100}%)`);
    } catch (error) {
        console.error(`[WAR] Failed to update supplier ${supplierId}:`, error);
    }
};

/**
 * Recalculate WAR for ALL suppliers (run as scheduled job)
 */
export const recalculateAllSuppliersWAR = async (): Promise<void> => {
    console.log('[WAR] Starting recalculation for all suppliers...');
    const startTime = Date.now();

    try {
        const users = await UserService.getAll();
        const suppliers = users.filter(u => u.role === UserRole.Supplier);

        let updated = 0;
        let failed = 0;

        for (const supplier of suppliers) {
            try {
                await updateSupplierWAR(supplier.id);
                updated++;
            } catch (error) {
                console.error(`[WAR] Failed for supplier ${supplier.id}:`, error);
                failed++;
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[WAR] Recalculation complete. Updated: ${updated}, Failed: ${failed}, Duration: ${duration}ms`);
    } catch (error) {
        console.error('[WAR] Recalculation job failed:', error);
    }
};

/**
 * Initialize the WAR recalculation scheduled job
 * Runs daily at midnight
 */
export const initWARScheduler = (): void => {
    // Run immediately on startup
    setTimeout(() => {
        console.log('[WAR] Running initial WAR calculation...');
        recalculateAllSuppliersWAR();
    }, 10000); // 10 seconds after startup

    // Schedule daily recalculation (every 24 hours)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
        console.log('[WAR] Running scheduled daily WAR recalculation...');
        recalculateAllSuppliersWAR();
    }, TWENTY_FOUR_HOURS);

    console.log('[WAR] Scheduler initialized - will run daily');
};
