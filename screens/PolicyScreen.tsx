

import React from 'react';
import { AppView } from '../types';
import Header from '../components/Header';
import { useLanguage } from '../context/LanguageContext';

interface PolicyScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const PolicyScreen: React.FC<PolicyScreenProps> = ({ navigate, goBack }) => {
    const { t } = useLanguage();
    return (
        <div className="dark:text-neutral-200">
            <Header title={t('privacyPolicy')} onBack={goBack} />
            <div className="p-6 space-y-4 text-neutral-800 dark:text-neutral-200">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Last Updated: {new Date().toLocaleDateString()}</p>

                <h2 className="text-xl font-bold">1. Introduction</h2>
                <p>
                    Welcome to AgriRent. We are committed to protecting your privacy and handling your personal data in an open and transparent manner. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.
                </p>

                <h2 className="text-xl font-bold pt-2">2. Information We Collect</h2>
                <div className="space-y-2 pl-4">
                    <p><strong>a. Information You Provide:</strong> Name, email, phone, profile details, location, item listings, booking information, support messages, and payment-related details (processed by third parties).</p>
                    <p><strong>b. Information Collected Automatically:</strong> Device data, IP address, browser type, usage analytics, and diagnostic logs.</p>
                    <p><strong>c. Location Data:</strong> With consent, approximate or precise location to enable nearby listings, maps, and tracking features.</p>
                    <p><strong>d. Communications:</strong> In-app chat messages, support tickets, and notifications metadata.</p>
                </div>

                <h2 className="text-xl font-bold pt-2">3. How We Use Your Information</h2>
                <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>Provide, operate, and improve the AgriRent platform.</li>
                    <li>Facilitate listings, bookings, and communications between users.</li>
                    <li>Enable maps, distance, and tracking features for relevant items.</li>
                    <li>Process payments securely via third-party processors.</li>
                    <li>Personalize content, recommendations, and language preferences.</li>
                    <li>Send service, security, and support notifications.</li>
                    <li>Detect, prevent, and address fraud, abuse, or violations.</li>
                    <li>Comply with legal obligations and enforce our terms.</li>
                </ul>

                <h2 className="text-xl font-bold pt-2">4. AI Features</h2>
                <p>
                    The platform may offer AI features (e.g., chat assistance, suggestions). We may send limited, necessary context to AI providers to generate responses. Sensitive personal data is not used for training unless explicitly stated. Outputs are for guidance only; you remain responsible for decisions.
                </p>

                <h2 className="text-xl font-bold pt-2">5. Cookies and Similar Technologies</h2>
                <p>
                    We use cookies/local storage to remember preferences (e.g., language, theme), maintain sessions, and analyze usage. You can manage cookies via your browser settings; some features may not function without them.
                </p>

                <h2 className="text-xl font-bold pt-2">6. Information Sharing</h2>
                <ul className="list-disc list-inside pl-4 space-y-1">
                    <li><strong>Between Users:</strong> Limited details necessary to complete a booking (e.g., name, contact, location) may be shared.</li>
                    <li><strong>Service Providers:</strong> Payment processors, hosting, analytics, mapping (e.g., map tiles, geocoding), customer support tools.</li>
                    <li><strong>Legal/Compliance:</strong> Where required by law or to protect rights and safety.</li>
                    <li><strong>Business Transfers:</strong> In a merger, acquisition, or asset sale, your information may be transferred in accordance with this policy.</li>
                </ul>

                <h2 className="text-xl font-bold pt-2">7. Data Security</h2>
                <p>
                    We apply technical and organizational measures to protect data. However, no method is fully secure; users should use strong passwords and protect their devices.
                </p>

                <h2 className="text-xl font-bold pt-2">8. Data Retention</h2>
                <p>
                    We retain information only as long as necessary for the purposes described above or as required by law. You may request deletion subject to legal/operational constraints.
                </p>

                <h2 className="text-xl font-bold pt-2">9. Your Rights</h2>
                <ul className="list-disc list-inside pl-4 space-y-1">
                    <li>Access, correct, or delete your personal information.</li>
                    <li>Object to or restrict certain processing.</li>
                    <li>Withdraw consent where processing is based on consent.</li>
                    <li>Change language and notification preferences in Settings.</li>
                </ul>

                <h2 className="text-xl font-bold pt-2">10. Children’s Privacy</h2>
                <p>
                    Our services are not directed to children under 18. If we learn we have collected data from a minor without consent, we will delete it.
                </p>

                <h2 className="text-xl font-bold pt-2">11. International Data Transfers</h2>
                <p>
                    Your data may be processed in countries different from your residence where our providers operate, subject to appropriate safeguards.
                </p>

                <h2 className="text-xl font-bold pt-2">12. Contact & Grievance</h2>
                <p>
                    For questions or data requests, contact us via the Support section in the app. For India users, you may also escalate to a Grievance Officer via Support if unresolved.
                </p>

                <h2 className="text-xl font-bold pt-2">13. Changes to This Policy</h2>
                <p>
                    We may update this policy periodically. Significant changes will be communicated via the app or email.
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
