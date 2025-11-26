import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './src/router';
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

    // 1. Sync Auth State
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

    // 2. Sync Data from Supabase
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

    // 3. Persist Data
    useEffect(() => {
        try {
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save state to localStorage:", error);
        }
    }, [data]);

    // 4. RTL Handling
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
                       <AppRoutes />
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
        <HashRouter>
            <LanguageProvider>
                <InnerApp />
            </LanguageProvider>
        </HashRouter>
    );
};

export default App;
