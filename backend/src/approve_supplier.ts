import { db } from './firebase';
import { UserService } from './services/firestore';
import dotenv from 'dotenv';

dotenv.config();

const approveSupplier = async (email: string) => {
    try {
        console.log(`Looking for user with email: ${email}...`);
        const user = await UserService.getByEmail(email);

        if (!user) {

            if (!kycDoc.exists) {
                console.log('Creating new KYC record...');
                await kycRef.set({
                    userId: user.id,
                    status: 'Approved',
                    submittedAt: new Date().toISOString(),
                    reviewedAt: new Date().toISOString(),
                    docs: []
                });
            } else {
                console.log('Updating existing KYC record...');
                await kycRef.update({
                    status: 'Approved',
                    reviewedAt: new Date().toISOString()
                });
            }

            console.log('Success! Supplier approved and KYC verified.');
            process.exit(0);
        } catch (error) {
            console.error('Error approving supplier:', error);
            process.exit(1);
        }
    };

    const email = process.argv[2];
    if (!email) {
        console.error('Please provide an email address.');
        process.exit(1);
    }

    approveSupplier(email);
