import fetch from 'node-fetch';
import { UserService } from './services/firestore';
import dotenv from 'dotenv';

dotenv.config();

const debugUserProfile = async (email: string) => {
    try {
        console.log(`Getting user by email: ${email}`);
        const user = await UserService.getByEmail(email);
        if (!user) {
            console.error('User not found in DB');
            return;
        }
        console.log(`User Firebase UID: ${user.firebaseUid}`);

        const url = `http://localhost:3001/api/users/profile?uid=${user.firebaseUid}`;
        console.log(`Fetching from: ${url}`);

        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error(text);
            return;
        }

        const data = await res.json();
        console.log('API Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
};

const email = process.argv[2];
if (!email) {
    console.error('Please provide email');
    process.exit(1);
}

debugUserProfile(email);
