// REACT NATIVE MIGRATION NOTE:
// The navigation logic here (using a `viewStack` state) is a simple simulation for the web.
// In a real React Native app, this would be replaced by a robust library like React Navigation
// (https://reactnavigation.org/) to handle stack, tab, and drawer navigators.

import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { ItemProvider } from './context/ItemContext';
import { ReviewProvider } from './context/ReviewContext';
import { ToastProvider } from './context/ToastContext';
import { CommunityProvider } from './context/CommunityContext';
import { NotificationProvider } from './context/NotificationContext';
import { SupportProvider } from './context/SupportContext';
import { ChatProvider } from './context/ChatContext';
import { SettingsProvider } from './context/SettingsContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppView, Item, UserRole, Booking, User, ItemCategory } from './types';
import AuthScreen from './screens/AuthScreen';
import FarmerView from './screens/FarmerView';
import SupplierView from './screens/SupplierView';
import ItemDetailScreen from './screens/ItemDetailScreen';
import BookingFormScreen from './screens/BookingFormScreen';
import BookingSuccessScreen from './screens/BookingSuccessScreen';
import RateItemScreen from './screens/RateItemScreen';
import RateUserScreen from './screens/RateUserScreen';
import Toast from './components/Toast';
import ChatScreen from './screens/ChatScreen';
import SupportScreen from './screens/SupportScreen';
import TrackingScreen from './screens/TrackingScreen';
import ReportDamageScreen from './screens/ReportDamageScreen';
import SettingsScreen from './screens/SettingsScreen';
import PolicyScreen from './screens/PolicyScreen';
import PaymentHistoryScreen from './screens/PaymentHistoryScreen';
import AdminView from './screens/AdminView';
import MyAccountScreen from './screens/MyAccountScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import CommunityScreen from './screens/CommunityScreen';
import { AiAssistantProvider } from './context/AiAssistantContext';
import AiAssistantScreen from './screens/AiAssistantScreen';
import VoiceAssistantScreen from './screens/VoiceAssistantScreen';
import AiScanScreen from './screens/AiScanScreen';
import PaymentScreen from './screens/PaymentScreen';


const AppContent: React.FC = () => {
    const { user } = useAuth();
    const [viewStack, setViewStack] = useState<AppView[]>([{ view: 'HOME' }]);

    const navigate = useCallback((view: AppView) => {
        setViewStack(prev => [...prev, view]);
    }, []);

    const goBack = useCallback(() => {
        setViewStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    }, []);

    const currentView = viewStack[viewStack.length - 1];

    if (!user) {
        return <AuthScreen />;
    }

    if (user.role === UserRole.Admin) {
        switch (currentView.view) {
            case 'SETTINGS':
                return <SettingsScreen navigate={navigate} goBack={goBack} />;
            case 'POLICY':
                return <PolicyScreen navigate={navigate} goBack={goBack} />;
            case 'SUPPORT':
                return <SupportScreen navigate={navigate} goBack={goBack} />;
            default:
                return <AdminView navigate={navigate} />;
        }
    }


    switch (currentView.view) {
        case 'ITEM_DETAIL':
            return <ItemDetailScreen item={currentView.item as Item} navigate={navigate} goBack={goBack} />;
        case 'BOOKING_FORM':
            return <BookingFormScreen navigate={navigate} goBack={goBack} item={currentView.item as Item | undefined} category={currentView.category as ItemCategory | undefined} quantity={currentView.quantity as number | undefined} workPurpose={currentView.workPurpose} />;
        case 'BOOKING_SUCCESS':
            return <BookingSuccessScreen navigate={navigate} isDirectRequest={currentView.isDirectRequest} />;
        case 'RATE_ITEM':
            return <RateItemScreen booking={currentView.booking as Booking} navigate={navigate} goBack={goBack} />;
        case 'RATE_USER':
            return <RateUserScreen booking={currentView.booking as Booking} navigate={navigate} goBack={goBack} />;
        case 'CHAT':
            return <ChatScreen chatPartner={currentView.chatPartner as User} item={currentView.item as Item | undefined} navigate={navigate} goBack={goBack} />;
        case 'CONVERSATIONS':
            return <ConversationsScreen navigate={navigate} goBack={goBack} />;
        case 'SUPPORT':
            return <SupportScreen navigate={navigate} goBack={goBack} />;
        case 'TRACKING':
            return <TrackingScreen item={currentView.item as Item} navigate={navigate} goBack={goBack} />;
        case 'REPORT_DAMAGE':
            return <ReportDamageScreen booking={currentView.booking as Booking} navigate={navigate} goBack={goBack} />;
        case 'AI_ASSISTANT':
            return <AiAssistantScreen navigate={navigate} goBack={goBack} />;
        case 'VOICE_ASSISTANT':
            return <VoiceAssistantScreen navigate={navigate} goBack={goBack} />;
        case 'AI_SCAN':
            return <AiScanScreen navigate={navigate} goBack={goBack} />;
        case 'SETTINGS':
            return <SettingsScreen navigate={navigate} goBack={goBack} />;
        case 'POLICY':
            return <PolicyScreen navigate={navigate} goBack={goBack} />;
        case 'PAYMENT_HISTORY':
            return <PaymentHistoryScreen navigate={navigate} goBack={goBack} />;
        case 'MY_ACCOUNT':
            return <MyAccountScreen goBack={goBack} />;
        case 'COMMUNITY':
            return <CommunityScreen goBack={goBack} />;
        case 'PAYMENT':
            return <PaymentScreen booking={currentView.booking as Booking} goBack={goBack} navigate={navigate} fromCompletion={(currentView as any).fromCompletion} />;
        case 'HOME':
        default:
            if (user.role === UserRole.Farmer) {
                return <FarmerView navigate={navigate} />;
            }
            if (user.role === UserRole.Supplier) {
                return <SupplierView navigate={navigate} />;
            }
            return <div>Unknown user role</div>;
    }
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <LanguageProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <ItemProvider>
                            <BookingProvider>
                                <ReviewProvider>
                                    <CommunityProvider>
                                        <SupportProvider>
                                            <ChatProvider>
                                                <SettingsProvider>
                                                    <AiAssistantProvider>
                                                        {/* REACT NATIVE MIGRATION NOTE:
                                                            This main container <div> would be replaced by a <SafeAreaView> or <View> component
                                                            from 'react-native' to ensure content is displayed correctly on mobile devices with notches.
                                                            Styling would be applied using the StyleSheet API. */}
                                                        <div className="bg-neutral-100 dark:bg-neutral-900 min-h-screen font-sans">
                                                            <div className="container mx-auto max-w-lg shadow-2xl bg-neutral-50 dark:bg-neutral-800 min-h-screen relative">
                                                                <AppContent />
                                                                <Toast />
                                                            </div>
                                                        </div>
                                                    </AiAssistantProvider>
                                                </SettingsProvider>
                                            </ChatProvider>
                                        </SupportProvider>
                                    </CommunityProvider>
                                </ReviewProvider>
                            </BookingProvider>
                        </ItemProvider>
                    </NotificationProvider>
                </AuthProvider>
            </LanguageProvider>
        </ToastProvider>
    );
};

export default App;
