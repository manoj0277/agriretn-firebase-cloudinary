import React from 'react';
import { AppView } from '../types';
import Header from '../components/Header';

interface PolicyScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const PolicyScreen: React.FC<PolicyScreenProps> = ({ navigate, goBack }) => {
    return (
        <div className="dark:text-neutral-200">
            <Header title="Privacy Policy" onBack={goBack} />
            <div className="p-6 space-y-4 text-neutral-800 dark:text-neutral-200">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Last Updated: {new Date().toLocaleDateString()}</p>

                <h2 className="text-xl font-bold">1. Introduction</h2>
                <p>
                    Welcome to AgriRent. We are committed to protecting your privacy and handling your personal data in an open and transparent manner. This privacy policy sets out how we collect, use, and safeguard your personal information when you use our platform.
                </p>

                <h2 className="text-xl font-bold pt-2">2. Information We Collect</h2>
                <div className="space-y-2 pl-4">
                    <p><strong>a. Information You Provide to Us:</strong> This includes personal data you provide when you register for an account, create a listing, make a booking, or communicate with us, such as your name, email address, phone number, location, and payment information.</p>
                    <p><strong>b. Information We Collect Automatically:</strong> When you use the AgriRent platform, we automatically collect information about your device and your usage of our services, including your IP address, device type, and browsing history.</p>
                    <p><strong>c. Location Information:</strong> With your consent, we may collect information about your precise or approximate location as determined through data such as GPS, IP address, and WiFi.</p>
                </div>
                
                <h2 className="text-xl font-bold pt-2">3. How We Use Your Information</h2>
                <p>
                    We use your information to:
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>Provide, operate, and improve the AgriRent platform.</li>
                    <li>Facilitate bookings and communication between Farmers and Suppliers.</li>
                    <li>Process payments and transactions securely.</li>
                    <li>Personalize your experience on our platform.</li>
                    <li>Send you service, support, and administrative messages.</li>
                    <li>For compliance purposes, including enforcing our Terms of Service.</li>
                </ul>

                <h2 className="text-xl font-bold pt-2">4. AI Features</h2>
                <p>
                    We offer AI-powered features (e.g., chat assistance, pricing suggestions). Limited context may be sent to AI providers to generate responses. We do not use sensitive personal data to train these models unless explicitly stated. AI outputs are suggestions only.
                </p>

                <h2 className="text-xl font-bold pt-2">5. Cookies and Similar Technologies</h2>
                <p>
                    We use cookies and local storage to remember preferences (language, theme), maintain sessions, and analyze usage. You can control cookies in your browser; disabling them may impact functionality.
                </p>

                <h2 className="text-xl font-bold pt-2">6. Information Sharing and Disclosure</h2>
                <p>
                    We do not sell your personal data. We may share your information with the following parties:
                </p>
                 <ul className="list-disc list-inside pl-4 space-y-1">
                    <li><strong>Between Users:</strong> To facilitate a booking, we share relevant information (like name, location, and contact details) between the Farmer and Supplier.</li>
                    <li><strong>Service Providers:</strong> Payment processors, hosting, analytics, mapping (e.g., map tiles, geocoding), customer support tools, and AI providers.</li>
                    <li><strong>Legal Compliance:</strong> We may disclose information if required to do so by law or in the good faith belief that such action is necessary to comply with legal obligations.</li>
                </ul>

                <h2 className="text-xl font-bold pt-2">7. Data Security</h2>
                <p>
                    We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
                </p>

                <h2 className="text-xl font-bold pt-2">8. Data Retention</h2>
                <p>
                    We retain data only for as long as necessary for the purposes described or as required by law. You may request deletion, subject to legal obligations and legitimate interests.
                </p>

                <h2 className="text-xl font-bold pt-2">9. Your Rights</h2>
                <p>
                    You have rights concerning your personal information, including the right to access, correct, or delete your data. You can manage your information through your account settings or by contacting our support team.
                </p>

                <h2 className="text-xl font-bold pt-2">10. Children’s Privacy</h2>
                <p>
                    Our services are not directed to children under 18. If we learn we have collected data from a minor without consent, we will delete it.
                </p>

                <h2 className="text-xl font-bold pt-2">11. International Data Transfers</h2>
                <p>
                    Your data may be processed in other countries where our providers operate, with appropriate safeguards.
                </p>

                <h2 className="text-xl font-bold pt-2">12. Changes to This Policy</h2>
                <p>
                    We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page.
                </p>
                
                 <h2 className="text-xl font-bold pt-2">13. Contact & Grievance</h2>
                <p>
                    If you have any questions or requests, please contact us through the Help & Support section of the app. For India users, unresolved concerns may be escalated to a Grievance Officer via Support.
                </p>

                <h2 className="text-xl font-bold pt-2">14. Supplier Safety & Liability</h2>
                <ul className="list-disc list-inside pl-4 space-y-1">
                    <li><strong>Machine Damage & Breakdown:</strong> AgriRent is not responsible for any machine damage, breakdowns, or other critical mechanical issues. Suppliers operate and accept bookings at their own risk.</li>
                    <li><strong>Accidents & Injuries:</strong> If a supplier’s driver, cleaner, or any personnel meets with an accident or is injured during work, AgriRent is not responsible. Please ensure adequate insurance coverage and safety practices.</li>
                    <li><strong>Personal Safety:</strong> Do not go alone to job sites. Always follow safety protocols and local guidelines. AgriRent is not responsible for personal safety incidents on-site.</li>
                    <li><strong>Verification & Training:</strong> Suppliers must verify operators’ credentials, provide proper training, and ensure safe operation of equipment.</li>
                    <li><strong>Compliance:</strong> Suppliers and operators must comply with applicable laws, permits, and safety regulations. Non-compliance is solely your responsibility.</li>
                    <li><strong>On-site Conduct:</strong> Meet in safe, public areas when possible, use in-app chat for coordination, keep OTP confidential, and report threats or unsafe situations via Support.</li>
                    <li><strong>Preventive Maintenance:</strong> Inspect and maintain machines regularly before dispatch to reduce breakdown risk.</li>
                    <li><strong>Emergency Preparedness:</strong> Keep emergency contacts handy and have a plan for medical assistance, towing, or repairs.</li>
                </ul>
            </div>
        </div>
    );
};

export default PolicyScreen;