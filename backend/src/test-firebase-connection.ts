
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load env from correct path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Testing Firebase Connection...');
console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
const pk = process.env.FIREBASE_PRIVATE_KEY;
console.log('Private Key length:', pk ? pk.length : 'MISSING');
console.log('Private Key start:', pk ? pk.substring(0, 30) : 'N/A');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const dbId = process.env.FIREBASE_DATABASE_ID;
    console.log(`Firebase initialized. Connecting to database: ${dbId || '(default)'}...`);

    // Connect to specific database if defined
    const db = dbId ? getFirestore(admin.app(), dbId) : getFirestore();

    db.collection('users').limit(1).get()
        .then((snapshot: any) => {
            console.log('Success! Fetched', snapshot.size, 'docs.');
            process.exit(0);
        })
        .catch((err: any) => {
            console.error('Firestore Connection Failed!');
            console.error(JSON.stringify(err, null, 2));
            process.exit(1);
        });

} catch (error: any) {
    console.error('Initialization Error:', error.message);
    process.exit(1);
}
