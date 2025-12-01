import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
// Expects service account credentials in environment variables or a file
// For now, we'll try to load from environment variables
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

import { getFirestore } from 'firebase-admin/firestore';

// ... (imports)

// ... (initialization)

// Use named database if specified, otherwise default
const databaseId = process.env.FIREBASE_DATABASE_ID || undefined;

if (databaseId) {
    console.log(`[Firebase] Connecting to named database: ${databaseId}`);
} else {
    console.log('[Firebase] Connecting to default database');
}

export const db = databaseId ? getFirestore(admin.app(), databaseId) : getFirestore(admin.app());

export const auth = admin.auth();
export const storage = admin.storage();
