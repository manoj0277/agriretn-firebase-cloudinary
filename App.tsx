

// REACT NATIVE MIGRATION NOTE:
// The navigation logic here (using a `viewStack` state) is a simple simulation for the web.
// In a real React Native app, this would be replaced by a robust library like React Navigation
// (https://reactnavigation.org/) to handle stack, tab, and drawer navigators.

import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import { ItemProvider } from './context/ItemContext';
import { ReviewProvider } from './context/ReviewContext';
import { ToastProvider } from './context/ToastContext';
import { CommunityProvider } from './context/CommunityContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminAlertProvider } from './context/AdminAlertContext';
import { SupportProvider } from './context/SupportContext';
import { ChatProvider } from './context/ChatContext';
import { SettingsProvider } from './context/SettingsContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AppView, Item, UserRole, Booking, User, ItemCategory } from './types';
import AuthScreen from './screens/AuthScreen';
import FarmerView from './screens/FarmerView';
import AgentView from './screens/AgentView';
import SupplierView, { SupplierKycInlineForm } from './screens/SupplierView';
import ItemDetailScreen from './screens/ItemDetailScreen';
import Header from './components/Header';
import BookingFormScreen from './screens/BookingFormScreen';
import BookingSuccessScreen from './screens/BookingSuccessScreen';
import RateItemScreen from './screens/RateItemScreen';
import RateUserScreen from './screens/RateUserScreen';
import Toast from './components/Toast';
import ChatScreen from './screens/ChatScreen';
import SupportScreen from './screens/SupportScreen';
import TrackingScreen from './screens/TrackingScreen';
import ReportDamageScreen from './screens/ReportDamageScreen';
import AiAssistantScreen from './screens/AiAssistantScreen';
import { AiAssistantProvider } from './context/AiAssistantContext';
import { WeatherProvider } from './context/WeatherContext';
import SettingsScreen from './screens/SettingsScreen';
import PolicyScreen from './screens/PolicyScreen';
import PaymentHistoryScreen from './screens/PaymentHistoryScreen';
import BookingHistoryScreen from './screens/BookingHistoryScreen';
import AdminView from './screens/AdminView';
import AdminDashboard from './screens/AdminDashboard';
import VoiceAssistantScreen from './screens/VoiceAssistantScreen';
import AiScanScreen from './screens/AiScanScreen';
import MyAccountScreen from './screens/MyAccountScreen';
import PersonalDetailsScreen from './screens/PersonalDetailsScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import EditDetailsScreen from './screens/EditDetailsScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import CommunityScreen from './screens/CommunityScreen';
import PaymentScreen from './screens/PaymentScreen';
import CropCalendarScreen from './screens/CropCalendarScreen';
import AdminAlertsScreen from './screens/AdminAlertsScreen';


const AppContent: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [viewStack, setViewStack] = useState<AppView[]>(() => {
        try {
            const saved = localStorage.getItem('agrirent-current-view');
            if (saved) {
                const v = JSON.parse(saved);
                if (v && typeof v.view === 'string') return [v];
            }
        } catch { }
        return [{ view: 'HOME' }];
    });

    const navigate = useCallback((view: AppView) => {
        setViewStack(prev => {
            const next = [...prev, view];
            try { localStorage.setItem('agrirent-current-view', JSON.stringify(view)); } catch { }
            // Push state to browser history for back button support
            window.history.pushState({ viewIndex: next.length - 1 }, '');
            return next;
        });
    }, []);

    const goBack = useCallback(() => {
        setViewStack(prev => {
            const next = prev.length > 1 ? prev.slice(0, -1) : [{ view: 'HOME' }];
            try { localStorage.setItem('agrirent-current-view', JSON.stringify(next[next.length - 1])); } catch { }
            return next;
        });
    }, []);

    // Handle browser/mobile back button
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // Go back one step in our view stack
            setViewStack(prev => {
                // If we're already at HOME (stack length of 1), don't go back further
                if (prev.length <= 1) {
                    // Push a new history state to prevent actually leaving the app
                    window.history.pushState({ viewIndex: 0 }, '');
                    return prev;
                }

                const next = prev.slice(0, -1);
                try { localStorage.setItem('agrirent-current-view', JSON.stringify(next[next.length - 1])); } catch { }
                return next;
            });
        };

        window.addEventListener('popstate', handlePopState);

        // Initialize history state
        if (!window.history.state) {
            window.history.replaceState({ viewIndex: 0 }, '');
        }

        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const currentView = viewStack[viewStack.length - 1];





    if (user === undefined) {
        return <div>Loading...</div>;
    }
    if (!user) {
        return <AuthScreen />;
    }


    switch (currentView.view) {
        case 'ITEM_DETAIL':
            return <ItemDetailScreen item={currentView.item as Item} navigate={navigate} goBack={goBack} />;
        case 'BOOKING_FORM':
            return <BookingFormScreen navigate={navigate} goBack={goBack} item={currentView.item as Item | undefined} category={currentView.category as ItemCategory | undefined} quantity={currentView.quantity as number | undefined} workPurpose={currentView.workPurpose} />;
        case 'BOOKING_SUCCESS':
            return <BookingSuccessScreen navigate={navigate} isDirectRequest={currentView.isDirectRequest} paymentType={currentView.paymentType} />;
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
        case 'CROP_CALENDAR':
            return <CropCalendarScreen navigate={navigate} goBack={goBack} />;
        case 'SETTINGS':
            return <SettingsScreen navigate={navigate} goBack={goBack} />;
        case 'POLICY':
            return <PolicyScreen navigate={navigate} goBack={goBack} />;
        case 'PAYMENT_HISTORY':
            return <PaymentHistoryScreen navigate={navigate} goBack={goBack} />;
        case 'BOOKING_HISTORY':
            return <BookingHistoryScreen navigate={navigate} goBack={goBack} />;
        case 'MY_ACCOUNT':
            return <MyAccountScreen goBack={goBack} navigate={navigate} />;
        case 'SUPPLIER_KYC':
            return (
                <div className="dark:text-neutral-200">
                    <Header title={t('myAccount')} onBack={goBack} />
                    <div className="p-4">
                        <SupplierKycInlineForm onSubmitted={() => navigate({ view: 'HOME' })} />
                    </div>
                </div>
            );
        case 'PERSONAL_DETAILS':
            return <PersonalDetailsScreen goBack={goBack} navigate={navigate} />;
        case 'CHANGE_PASSWORD':
            return <ChangePasswordScreen goBack={goBack} />;
        case 'EDIT_DETAILS':
            return <EditDetailsScreen goBack={goBack} />;
        case 'COMMUNITY':
            return <CommunityScreen goBack={goBack} />;
        case 'PAYMENT':
            return <PaymentScreen booking={currentView.booking as Booking} goBack={goBack} navigate={navigate} fromCompletion={(currentView as any).fromCompletion} />;
        case 'ADMIN_ALERTS':
            return <AdminAlertsScreen navigate={navigate} goBack={goBack} />;
        case 'ADMIN_DASHBOARD':
            return <AdminView navigate={navigate} />;
        case 'HOME':
        default:
            console.log('Rendering HOME view for user:', user);
            console.log('User role:', user?.role);
            console.log('Role enum values:', UserRole);

            const role = user.role?.toLowerCase();
            if (role === UserRole.Farmer.toLowerCase()) {
                return <FarmerView navigate={navigate} />;
            }
            if (role === UserRole.Supplier.toLowerCase()) {
                return <SupplierView navigate={navigate} />;
            }
            if (role === UserRole.Admin.toLowerCase()) {
                return <AdminView navigate={navigate} />;
            }
            if (role === UserRole.Agent.toLowerCase()) {
                return <AgentView navigate={navigate} />;
            }
            console.error('Unknown user role - no match found:', user.role);
            return (
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600">Login Error</h2>
                    <p className="text-gray-700 mt-2">Unknown user role: {user.role}</p>
                    <p className="text-sm text-gray-500 mt-1">Please contact support.</p>
                </div>
            );
    }
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <LanguageProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <AdminAlertProvider>
                            <ItemProvider>
                                <BookingProvider>
                                    <ReviewProvider>
                                        <CommunityProvider>
                                            <SupportProvider>
                                                <ChatProvider>
                                                    <SettingsProvider>
                                                        <AiAssistantProvider>
                                                            <WeatherProvider>
                                                                {/* REACT NATIVE MIGRATION NOTE:
                                                                This main container <div> would be replaced by a <SafeAreaView> or <View> component
                                                                from 'react-native' to ensure content is displayed correctly on mobile devices with notches.
                                                                Styling would be applied using the StyleSheet API. */}
                                                                <div className="bg-gray-100 min-h-screen font-sans">
                                                                    <div className="container mx-auto max-w-lg shadow-2xl bg-white min-h-screen relative">
                                                                        <AppContent />
                                                                        <Toast />
                                                                    </div>
                                                                </div>
                                                            </WeatherProvider>
                                                        </AiAssistantProvider>
                                                    </SettingsProvider>
                                                </ChatProvider>
                                            </SupportProvider>
                                        </CommunityProvider>
                                    </ReviewProvider>
                                </BookingProvider>
                            </ItemProvider>
                        </AdminAlertProvider>
                    </NotificationProvider>
                </AuthProvider>
            </LanguageProvider>
        </ToastProvider>
    );
};

export default App;
