

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
import { AppSkeleton } from './components/AppSkeleton';

// Lazy Load Major Views
const FarmerView = React.lazy(() => import('./screens/FarmerView'));
const AgentView = React.lazy(() => import('./screens/AgentView'));
const NewAgentView = React.lazy(() => import('./screens/NewAgentView'));
// SupplierView has named exports used elsewhere, keeping sync for now or handling properly
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
const AdminView = React.lazy(() => import('./screens/AdminView'));
const FounderView = React.lazy(() => import('./screens/FounderView'));
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
import EarningsDetailsScreen from './screens/EarningsDetailsScreen';
import PWAInstallPrompt from './components/PWAInstallPrompt';



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





    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Reduced splash time to 1 second maximum
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // 1. Splash Screen (Max 1s)
    if (showSplash) {
        // If user is ALREADY loaded (e.g. refresh), we might want to skip this entirely?
        // User asked: "after open and try to refresh don't show logo just refresh fast".
        // If user !== undefined, data is ready. We can force splash off?
        // But let's stick to the 1s requested for "opening app".
        // For refresh (user is already populated in cache presumably if we had persistence, but on web refresh clears state unless we use localStorage/Session heavily before AuthContext inits).
        // AuthContext initiates IDLE/Undefined.

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <img
                    src="/bhommihire_logo.png"
                    alt="BhommiHire"
                    className="w-32 h-32 object-contain animate-bounce"
                />
            </div>
        );
    }

    // 2. Skeleton Loader (If splash is done but user data still loading)
    if (user === undefined) {
        console.log('[App] Splash done, User loading... Showing Skeleton');
        return <AppSkeleton />;
    }

    // 3. Auth SCreen (If user is null/logged out)
    if (!user) {
        console.log('[App] No user found, rendering AuthScreen');
        return <AuthScreen />;
    }


    // Helper to wrap content with proper role-based layout
    const RoleLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
        if (!user) return null;
        const role = user.role?.toLowerCase();

        if (role === UserRole.Farmer.toLowerCase()) {
            return (
                <React.Suspense fallback={<AppSkeleton />}>
                    <FarmerView navigate={navigate} currentView={currentView.view}>
                        {children}
                    </FarmerView>
                </React.Suspense>
            );
        }
        if (role === UserRole.Supplier.toLowerCase()) {
            return (
                <SupplierView navigate={navigate} currentView={currentView.view}>
                    {children}
                </SupplierView>
            );
        }
        if (role === UserRole.Admin.toLowerCase()) {
            return (
                <React.Suspense fallback={<AppSkeleton />}>
                    <AdminView navigate={navigate} currentView={currentView.view}>
                        {children}
                    </AdminView>
                </React.Suspense>
            );
        }
        if (role === UserRole.Founder.toLowerCase()) {
            return (
                <React.Suspense fallback={<AppSkeleton />}>
                    <FounderView navigate={navigate} currentView={currentView.view}>
                        {children}
                    </FounderView>
                </React.Suspense>
            );
        }
        if (role === UserRole.AgentPro.toLowerCase()) {
            return (
                <React.Suspense fallback={<AppSkeleton />}>
                    <AgentView navigate={navigate} currentView={currentView.view} />
                </React.Suspense>
            );
        }
        if (role === UserRole.Agent.toLowerCase()) {
            return (
                <React.Suspense fallback={<AppSkeleton />}>
                    <NewAgentView navigate={navigate} currentView={currentView.view}>
                        {children}
                    </NewAgentView>
                </React.Suspense>
            );
        }
        return <>{children}</>;
    };

    const renderMainContent = () => {
        switch (currentView.view) {
            // Screens that should show within the main layout
            case 'ITEM_DETAIL':
                return <RoleLayout><ItemDetailScreen item={currentView.item as Item} navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'BOOKING_FORM':
                return <RoleLayout><BookingFormScreen navigate={navigate} goBack={goBack} item={currentView.item as Item | undefined} category={currentView.category as ItemCategory | undefined} quantity={currentView.quantity as number | undefined} workPurpose={currentView.workPurpose} /></RoleLayout>;
            case 'BOOKING_SUCCESS':
                return <BookingSuccessScreen navigate={navigate} isDirectRequest={currentView.isDirectRequest} paymentType={currentView.paymentType} />;
            case 'RATE_ITEM':
                return <RoleLayout><RateItemScreen booking={currentView.booking as Booking} navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'RATE_USER':
                return <RoleLayout><RateUserScreen booking={currentView.booking as Booking} navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'CHAT':
                return <RoleLayout><ChatScreen chatPartner={currentView.chatPartner as User} item={currentView.item as Item | undefined} navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'CONVERSATIONS':
                return <RoleLayout><ConversationsScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'SUPPORT':
                return <RoleLayout><SupportScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'TRACKING':
                return <RoleLayout><TrackingScreen item={currentView.item as Item} navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'REPORT_DAMAGE':
                return <RoleLayout><ReportDamageScreen booking={currentView.booking as Booking} navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'AI_ASSISTANT':
                return <RoleLayout><AiAssistantScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'VOICE_ASSISTANT':
                return <RoleLayout><VoiceAssistantScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'AI_SCAN':
                return <RoleLayout><AiScanScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'CROP_CALENDAR':
                return <RoleLayout><CropCalendarScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'SETTINGS':
                return <RoleLayout><SettingsScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'POLICY':
                return <RoleLayout><PolicyScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'PAYMENT_HISTORY':
                return <RoleLayout><PaymentHistoryScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'BOOKING_HISTORY':
                return <RoleLayout><BookingHistoryScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'MY_ACCOUNT':
                return <RoleLayout><MyAccountScreen goBack={goBack} navigate={navigate} /></RoleLayout>;
            case 'SUPPLIER_KYC':
                return (
                    <RoleLayout>
                        <div className="dark:text-neutral-200">
                            <Header title={t('myAccount')} onBack={goBack} />
                            <div className="p-4">
                                <SupplierKycInlineForm onSubmitted={() => navigate({ view: 'HOME' })} />
                            </div>
                        </div>
                    </RoleLayout>
                );
            case 'PERSONAL_DETAILS':
                return <RoleLayout><PersonalDetailsScreen goBack={goBack} navigate={navigate} /></RoleLayout>;
            case 'CHANGE_PASSWORD':
                return <RoleLayout><ChangePasswordScreen goBack={goBack} /></RoleLayout>;
            case 'EDIT_DETAILS':
                return <RoleLayout><EditDetailsScreen goBack={goBack} /></RoleLayout>;
            case 'COMMUNITY':
                return <RoleLayout><CommunityScreen goBack={goBack} /></RoleLayout>;
            case 'PAYMENT':
                return <BookingSuccessScreen navigate={navigate} isDirectRequest={false} />;
            case 'ADMIN_ALERTS':
                return <RoleLayout><AdminAlertsScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'ADMIN_DASHBOARD':
                return <RoleLayout />;
            case 'EARNINGS_DETAILS':
                return <RoleLayout><EarningsDetailsScreen navigate={navigate} goBack={goBack} /></RoleLayout>;
            case 'HOME':
            default:
                return <RoleLayout />;
        }
    };

    return (
        <>
            {renderMainContent()}
            <PWAInstallPrompt />
        </>
    );
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
                                                                <div className="bg-gray-100 dark:bg-neutral-900 min-h-screen font-sans">
                                                                    <div className="mx-auto max-w-lg md:max-w-none md:w-full shadow-2xl md:shadow-none bg-white dark:bg-neutral-950 min-h-screen relative flex flex-col">
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
