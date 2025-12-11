/**
 * Script to set the AgentPro role custom claim for a Firebase user
 * 
 * Usage: npm run set-agent-pro-role -- <firebase-uid>
 * 
 * This sets { role: 'agent_pro' } AND updates Firestore to 'AgentPro'
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { UserRole } from './types';

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

async function setAgentProRole(uid: string): Promise<void> {
    try {
        console.log(`Setting AgentPro role for user UID: ${uid}`);

        const user = await admin.auth().getUser(uid);
        console.log(`User found: ${user.email}`);

        // Set the custom claim
        await admin.auth().setCustomUserClaims(uid, { role: UserRole.AgentPro });

        console.log(`✓ Successfully set AgentPro role for ${user.email}`);

        // Also update the user document in Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').where('firebaseUid', '==', uid).get();

        if (!userDoc.empty) {
            const docId = userDoc.docs[0].id;
            await db.collection('users').doc(docId).update({ role: UserRole.AgentPro });
            console.log(`✓ Also updated role in Firestore user document to 'AgentPro'`);
        } else {
            console.warn(`! User document not found in Firestore for UID ${uid}`);
        }

    } catch (error: any) {
        console.error('Error setting AgentPro role:', error.message);
        process.exit(1);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Error: Firebase UID is required');
    process.exit(1);
}

setAgentProRole(args[0]).then(() => process.exit(0));
