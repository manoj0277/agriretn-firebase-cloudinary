/**
 * Firebase Database Migration Script
 * Renames User.status to User.userStatus and adds User.kycStatus field
 * 
 * Run this script once to migrate existing Firestore data:
 * ts-node src/migrate-status-fields.ts
 */

import { db } from './firebase';
import admin from 'firebase-admin';

async function migrateStatusFields() {
    try {
        console.log('[Migration] Starting status fields migration...');

        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            console.log('[Migration] No users found in database');
            return;
        }

        console.log(`[Migration] Found ${snapshot.size} users to migrate`);

        let batch = db.batch();
        let batchCount = 0;
        let totalMigrated = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Prepare update data
            const updateData: any = {};

            // Rename status to userStatus (keep existing value)
            if (data.status) {
                updateData.userStatus = data.status;
                // Delete old status field
                updateData.status = admin.firestore.FieldValue.delete();
            } else if (!data.userStatus) {
                // If neither exists, set default
                updateData.userStatus = 'approved';
            }

            // Add kycStatus if it doesn't exist
            if (!data.kycStatus) {
                updateData.kycStatus = 'not_submitted';
            }

            batch.update(doc.ref, updateData);
            batchCount++;
            totalMigrated++;

            // Firestore batch limit is 500 operations
            if (batchCount >= 500) {
                console.log(`[Migration] Committing batch of ${batchCount} updates...`);
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }

        // Commit remaining updates
        if (batchCount > 0) {
            console.log(`[Migration] Committing final batch of ${batchCount} updates...`);
            await batch.commit();
        }

        console.log(`[Migration] ✅ Successfully migrated ${totalMigrated} users`);
        console.log('[Migration] Changes:');
        console.log('  - Renamed "status" → "userStatus"');
        console.log('  - Added "kycStatus" (default: "not_submitted")');

        // Verify migration
        console.log('\n[Migration] Verifying migration...');
        const verifySnapshot = await usersRef.limit(5).get();
        let verified = true;

        verifySnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`\nSample User ${index + 1} (${data.email || 'No email'}):`);
            console.log(`  - userStatus: ${data.userStatus || 'MISSING'}`);
            console.log(`  - kycStatus: ${data.kycStatus || 'MISSING'}`);
            console.log(`  - status (old): ${data.status || 'DELETED ✓'}`);

            if (!data.userStatus || !data.kycStatus || data.status) {
                verified = false;
            }
        });

        if (verified) {
            console.log('\n[Migration] ✅ Verification passed!');
        } else {
            console.log('\n[Migration] ⚠️ Verification found issues - please check manually');
        }

    } catch (error) {
        console.error('[Migration] ❌ Error during migration:', error);
        throw error;
    }
}

// Run migration
if (require.main === module) {
    migrateStatusFields()
        .then(() => {
            console.log('\n[Migration] Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n[Migration] Migration failed:', error);
            process.exit(1);
        });
}

export { migrateStatusFields };
