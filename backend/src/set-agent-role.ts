/**
 * Script to set the Agent role custom claim for a Firebase user
 * 
 * Usage: npm run set-agent-role -- <firebase-uid>
 * Example: npm run set-agent-role -- abc123def456
 * 
 * This script must be run by the founder/admin with Firebase Admin SDK access
 * It sets a custom claim { role: 'agent' } which cannot be modified from the client
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    const serviceAccount = require(path.resolve(__dirname, '../serviceAccountKey.json'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

async function setAgentRole(uid: string): Promise<void> {
    try {
        console.log(`Setting agent role for user UID: ${uid}`);

        // Get user to verify they exist
        const user = await admin.auth().getUser(uid);
        console.log(`User found: ${user.email}`);

        // Set the custom claim
        await admin.auth().setCustomUserClaims(uid, { role: 'agent' });

        console.log(`✓ Successfully set agent role for ${user.email}`);
        console.log(`  User UID: ${uid}`);
        console.log(`  Custom Claim: { role: 'agent' }`);
        console.log(`\nNote: User must sign out and sign back in for the new role to take effect.`);

        // Also update the user document in Firestore if it exists
        const db = admin.firestore();
        const userDoc = await db.collection('users').where('firebaseUid', '==', uid).get();

        if (!userDoc.empty) {
            const docId = userDoc.docs[0].id;
            await db.collection('users').doc(docId).update({ role: 'Agent' });
            console.log(`✓ Also updated role in Firestore user document`);
        }

    } catch (error: any) {
        console.error('Error setting agent role:', error.message);
        if (error.code === 'auth/user-not-found') {
            console.error('User with this UID does not exist. Please verify the UID.');
        }
        process.exit(1);
    }
}

async function removeAgentRole(uid: string): Promise<void> {
    try {
        console.log(`Removing agent role for user UID: ${uid}`);

        const user = await admin.auth().getUser(uid);
        console.log(`User found: ${user.email}`);

        // Set role back to farmer (default)
        await admin.auth().setCustomUserClaims(uid, { role: 'farmer' });

        console.log(`✓ Successfully removed agent role for ${user.email}`);
        console.log(`  User UID: ${uid}`);
        console.log(`  Custom Claim: { role: 'farmer' }`);

        // Update Firestore as well
        const db = admin.firestore();
        const userDoc = await db.collection('users').where('firebaseUid', '==', uid).get();

        if (!userDoc.empty) {
            const docId = userDoc.docs[0].id;
            await db.collection('users').doc(docId).update({ role: 'Farmer' });
            console.log(`✓ Also updated role in Firestore user document`);
        }

    } catch (error: any) {
        console.error('Error removing agent role:', error.message);
        process.exit(1);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('Error: Firebase UID is required');
    console.log('\nUsage:');
    console.log('  Set agent role:    npm run set-agent-role -- <firebase-uid>');
    console.log('  Remove agent role: npm run set-agent-role -- --remove <firebase-uid>');
    console.log('\nExample:');
    console.log('  npm run set-agent-role -- abc123def456');
    process.exit(1);
}

if (args[0] === '--remove') {
    if (args.length < 2) {
        console.error('Error: Firebase UID is required');
        process.exit(1);
    }
    removeAgentRole(args[1]).then(() => process.exit(0));
} else {
    setAgentRole(args[0]).then(() => process.exit(0));
}
