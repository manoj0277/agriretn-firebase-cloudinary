import express from 'express';
import fetch from 'node-fetch';
import { db } from '../firebase';

const router = express.Router();

// Interface for Google Sheets row data
interface BulkBookingRow {
    rowNumber: number;
    Customer_Mobile: string;
    Equipment_SKU: string;
    Rental_Date: string;
    Rental_Duration_Hours: number;
    Delivery_Pincode: string;
    Booking_Source: string;
    Status: string;
}

interface ProcessingResult {
    success: boolean;
    rowNumber: number;
    bookingId?: string;
    error?: string;
    customerMobile?: string;
    equipmentSKU?: string;
}

// POST /api/agent/bulk-bookings/process
// Process bulk bookings from Google Sheets
router.post('/bulk-bookings/process', async (req, res) => {
    try {
        const { sheetsUrl, agentId, agentName } = req.body;

        if (!sheetsUrl) {
            return res.status(400).json({ error: 'Google Sheets URL is required' });
        }

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        console.log(`[Bulk Booking] Agent ${agentName} (ID: ${agentId}) starting bulk booking process`);
        console.log(`[Bulk Booking] Fetching data from: ${sheetsUrl}`);

        // Fetch data from Google Sheets Web App
        const response = await fetch(sheetsUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch from Google Sheets: ${response.statusText}`);
        }

        const rows = (await response.json()) as BulkBookingRow[];
        console.log(`[Bulk Booking] Fetched ${rows.length} PENDING rows from Google Sheets`);

        if (rows.length === 0) {
            return res.json({
                success: true,
                message: 'No pending bookings to process',
                results: {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    details: []
                }
            });
        }

        // Process each row
        const results: ProcessingResult[] = [];
        const updates: any[] = [];

        for (const row of rows) {
            try {
                // Validate mobile number
                const mobileRegex = /^[6-9]\d{9}$/;
                if (!mobileRegex.test(row.Customer_Mobile)) {
                    results.push({
                        success: false,
                        rowNumber: row.rowNumber,
                        error: `Invalid mobile number: ${row.Customer_Mobile}`,
                        customerMobile: row.Customer_Mobile,
                        equipmentSKU: row.Equipment_SKU
                    });
                    updates.push({
                        rowNumber: row.rowNumber,
                        status: 'FAILED',
                        bookingId: `Error: Invalid mobile`
                    });
                    continue;
                }

                // Find farmer by mobile number
                const usersSnapshot = await db.collection('users')
                    .where('phone', '==', row.Customer_Mobile)
                    .where('role', '==', 'Farmer')
                    .limit(1)
                    .get();

                if (usersSnapshot.empty) {
                    results.push({
                        success: false,
                        rowNumber: row.rowNumber,
                        error: `Farmer not found with mobile: ${row.Customer_Mobile}`,
                        customerMobile: row.Customer_Mobile,
                        equipmentSKU: row.Equipment_SKU
                    });
                    updates.push({
                        rowNumber: row.rowNumber,
                        status: 'FAILED',
                        bookingId: `Error: Farmer not found`
                    });
                    continue;
                }

                const farmer = usersSnapshot.docs[0].data();
                const farmerId = farmer.id;

                // Find equipment by SKU
                const itemsSnapshot = await db.collection('items')
                    .where('sku', '==', row.Equipment_SKU)
                    .where('status', '==', 'approved')
                    .limit(1)
                    .get();

                if (itemsSnapshot.empty) {
                    results.push({
                        success: false,
                        rowNumber: row.rowNumber,
                        error: `Equipment not found: ${row.Equipment_SKU}`,
                        customerMobile: row.Customer_Mobile,
                        equipmentSKU: row.Equipment_SKU
                    });
                    updates.push({
                        rowNumber: row.rowNumber,
                        status: 'FAILED',
                        bookingId: `Error: Equipment not found`
                    });
                    continue;
                }

                const item = itemsSnapshot.docs[0].data();
                const itemId = item.id;

                // Validate duration
                if (row.Rental_Duration_Hours <= 0) {
                    results.push({
                        success: false,
                        rowNumber: row.rowNumber,
                        error: `Invalid duration: ${row.Rental_Duration_Hours}`,
                        customerMobile: row.Customer_Mobile,
                        equipmentSKU: row.Equipment_SKU
                    });
                    updates.push({
                        rowNumber: row.rowNumber,
                        status: 'FAILED',
                        bookingId: `Error: Invalid duration`
                    });
                    continue;
                }

                // Create booking
                const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                const bookingData = {
                    id: bookingId,
                    farmerId: farmerId,
                    itemId: itemId,
                    itemCategory: item.category,
                    date: row.Rental_Date,
                    startTime: '09:00', // Default start time
                    estimatedDuration: row.Rental_Duration_Hours,
                    location: row.Delivery_Pincode,
                    status: 'Searching',
                    workPurpose: item.purposes?.[0] || null,
                    additionalInstructions: `Bulk booking from ${row.Booking_Source}`,
                    // Agent tracking fields
                    bookedByAgentId: agentId,
                    bookedForFarmerId: farmerId,
                    isAgentBooking: true,
                    createdAt: new Date().toISOString()
                };

                // Save to Firestore
                await db.collection('bookings').doc(bookingId).set(bookingData);

                console.log(`[Bulk Booking] Created booking ${bookingId} for farmer ${farmerId}`);

                results.push({
                    success: true,
                    rowNumber: row.rowNumber,
                    bookingId: bookingId,
                    customerMobile: row.Customer_Mobile,
                    equipmentSKU: row.Equipment_SKU
                });

                updates.push({
                    rowNumber: row.rowNumber,
                    status: 'PROCESSED',
                    bookingId: bookingId
                });

            } catch (error: any) {
                console.error(`[Bulk Booking] Error processing row ${row.rowNumber}:`, error);
                results.push({
                    success: false,
                    rowNumber: row.rowNumber,
                    error: error.message || 'Unknown error',
                    customerMobile: row.Customer_Mobile,
                    equipmentSKU: row.Equipment_SKU
                });
                updates.push({
                    rowNumber: row.rowNumber,
                    status: 'FAILED',
                    bookingId: `Error: ${error.message}`
                });
            }
        }

        // Update Google Sheets with status
        try {
            const updateResponse = await fetch(sheetsUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });

            if (!updateResponse.ok) {
                console.warn('[Bulk Booking] Failed to update Google Sheets status');
            } else {
                console.log(`[Bulk Booking] Updated ${updates.length} rows in Google Sheets`);
            }
        } catch (updateError) {
            console.warn('[Bulk Booking] Error updating Google Sheets:', updateError);
        }

        // Log agent action
        const agentActionId = `AA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.collection('agentActions').doc(agentActionId).set({
            id: agentActionId,
            agentId: agentId,
            agentName: agentName,
            action: 'BULK_UPLOAD',
            details: {
                totalRows: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                source: 'Google Sheets'
            },
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || 'Unknown'
        });

        const successfulCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        console.log(`[Bulk Booking] Processing complete: ${successfulCount} successful, ${failedCount} failed`);

        res.json({
            success: true,
            message: `Processed ${results.length} bookings: ${successfulCount} successful, ${failedCount} failed`,
            results: {
                total: results.length,
                successful: successfulCount,
                failed: failedCount,
                details: results
            }
        });

    } catch (error: any) {
        console.error('[Bulk Booking] Fatal error:', error);
        res.status(500).json({
            error: 'Failed to process bulk bookings',
            details: error.message
        });
    }
});

export default router;
