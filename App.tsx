import React, { useState, useMemo, useEffect } from 'react';
import { AppRouter } from './src/router';
import { AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useTranslation } from './hooks/useTranslation';
import { initialData } from './services/dataService';
import { AppData, Staff, UserRole, RequestStatus } from './types';
import { authService } from './src/services/authService';
import { delegatesService } from './src/services/delegatesService';
import { staffService } from './src/services/staffService';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const APP_STATE_KEY = 'imdad-logistics-app-state';

const InnerApp: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [data, setData] = useState<AppData>(() => {
        try {
            const savedState = localStorage.getItem(APP_STATE_KEY);
            return savedState ? JSON.parse(savedState) : initialData;
        } catch (error) {
            console.error("Failed to load state from localStorage:", error);
            return initialData;
        }
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { t, language } = useTranslation();

    useEffect(() => {
        const authUser = authService.getCurrentUser();
        if (authUser && authUser.kind === 'staff') {
            const staffUser: Staff = {
                id: authUser.id,
                name: authUser.name,
                phone: authUser.phone,
                role: authUser.role || UserRole.OpsSupervisor,
                password: authUser.password || '',
                requiresPasswordChange: authUser.requiresPasswordChange,
                nationalId: '0000000000', 
                idExpiryDate: '2030-01-01',
            };
            setCurrentUser(staffUser);
        }
    }, []);

    useEffect(() => {
        const syncData = async () => {
            try {
                const delegates = await delegatesService.loadDelegates();
                const staff = await staffService.loadStaff();
                
                if (delegates.length > 0 || staff.length > 0) {
                    setData(prev => ({
                        ...prev,
                        delegates: delegates.length > 0 ? (delegates as any[]) : prev.delegates,
                        staff: staff.length > 0 ? (staff as any[]) : prev.staff,
                    }));
                }
            } catch (error) {
                console.error("Failed to sync with Supabase:", error);
            }
        };
        syncData();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save state to localStorage:", error);
        }
    }, [data]);

    useEffect(() => {
        const checkTimeouts = () => {
            const now = Date.now();
            let hasUpdates = false;
            const updatedRequests = data.requests.map(req => {
                if (req.status === 'PendingApproval') {
                    const createdAt = new Date(req.createdAt).getTime();
                    const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
                    if (hoursDiff > 72) {
                        hasUpdates = true;
                        return {
                            ...req,
                            status: RequestStatus.Cancelled,
                            history: [...req.history, {
                                actor: 'System' as const,
                                actorName: t('system'),
                                action: 'Cancelled' as const,
                                timestamp: new Date().toISOString(),
                                comment: t('request_timeout_msg')
                            }]
                        };
                    }
                }
                return req;
            });

            if (hasUpdates) {
                setData(prev => ({ ...prev, requests: updatedRequests }));
            }
        };

        checkTimeouts(); 
        const interval = setInterval(checkTimeouts, 60000 * 60);
        return () => clearInterval(interval);
    }, [data.requests, t]);

    useEffect(() => {
        const isRtl = ['ar', 'ur'].includes(language);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const value = useMemo(() => ({
        currentUser,
        setCurrentUser,
        data,
        setData,
    }), [currentUser, data]);

    return (
        <AppProvider value={value}>
            <div className="flex min-h-screen bg-gray-900 relative overflow-hidden">
               {currentUser && (
                   <>
                       <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                       {isSidebarOpen && (
                           <div 
                               className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                               onClick={() => setIsSidebarOpen(false)}
                           />
                       )}
                   </>
               )}
               
               <div className={`flex-1 flex flex-col transition-all duration-300 ${currentUser ? 'md:ltr:ml-64 md:rtl:mr-64' : ''} h-screen overflow-hidden`}>
                   {currentUser && (
                       <Header 
                           toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                           handleChangePassword={() => {}}
                       />
                   )}
                   <main className="flex-1 overflow-y-auto p-2 sm:p-6 custom-scrollbar scroll-smooth">
                       <AppRouter />
                   </main>
                   {currentUser && (
                       <footer className="p-4 text-center text-gray-500 text-xs border-t border-gray-800/50">
                           &copy; {new Date().getFullYear()} {t('appTitle')} - v1.0.0
                       </footer>
                   )}
               </div>
            </div>
        </AppProvider>
    );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <InnerApp />
        </LanguageProvider>
    );
};

export default App;
