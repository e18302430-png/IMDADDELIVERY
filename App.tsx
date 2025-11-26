


import React, { useState, useMemo, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AppContext, AppProvider } from './contexts/AppContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useTranslation } from './hooks/useTranslation';
import Dashboard from './pages/Dashboard';
import AdminBoard from './pages/AdminBoard';
import SuspendedAgents from './pages/SuspendedAgents';
import Login from './pages/Login';
import DelegateApp from './pages/DelegateApp';
import OperationsTools from './pages/OperationsTools';
import Reports from './pages/Reports';
import MyRequests from './pages/MyRequests';
import HRDelegateManagement from './pages/HRDelegateManagement';
import ResignedDelegates from './pages/ResignedDelegates';
import ComplianceShield from './pages/ComplianceShield';
import AllDelegates from './pages/AllDelegates';
import GuidanceAndCirculars from './pages/GuidanceAndCirculars';
import UserManagement from './pages/UserManagement';
import SelfPreparation from './pages/SelfPreparation';
import { initialData } from './services/dataService';
import type { Staff, AppData, Delegate, Notification, RequestStatus } from './types';
import { UserRole } from './types';
import LanguageSwitcher from './components/LanguageSwitcher';

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
    const { t } = useTranslation();

    useEffect(() => {
        try {
            localStorage.setItem(APP_STATE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save state to localStorage:", error);
        }
    }, [data]);
    
    // Check for expired requests on mount
    useEffect(() => {
        const checkExpiredRequests = () => {
            const now = new Date();
            const expiryThreshold = 72 * 60 * 60 * 1000; // 72 hours in ms
            let hasChanges = false;

            const updatedRequests = data.requests.map(req => {
                if (req.status === 'PendingApproval') {
                    const createdTime = new Date(req.createdAt).getTime();
                    if (now.getTime() - createdTime > expiryThreshold) {
                        hasChanges = true;
                        return {
                            ...req,
                            status: 'Cancelled' as RequestStatus,
                            lastActionTimestamp: now.toISOString(),
                            history: [
                                ...req.history,
                                {
                                    actor: 'System' as any,
                                    actorName: 'System',
                                    action: 'Cancelled' as any,
                                    comment: t('request_timeout_msg'), // "تم انتهاء مهلة الطلب"
                                    timestamp: now.toISOString()
                                }
                            ]
                        };
                    }
                }
                return req;
            });

            if (hasChanges) {
                setData(prev => ({ ...prev, requests: updatedRequests }));
            }
        };

        checkExpiredRequests();
         // Optional: Set interval to check periodically if app stays open for days
         const interval = setInterval(checkExpiredRequests, 3600000); // Check every hour
         return () => clearInterval(interval);

    }, []); 


    const value = useMemo(() => ({
        currentUser,
        setCurrentUser,
        data,
        setData,
    }), [currentUser, data]);

    return (
        <AppProvider value={value}>
            <HashRouter>
                <Routes>
                    <Route path="/delegate-app" element={<DelegateApp />} />
                    <Route path="/*" element={<MainApp />} />
                </Routes>
            </HashRouter>
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

const LanguageManager: React.FC = () => {
    const { language } = useTranslation();
    useEffect(() => {
        const isRtl = ['ar', 'ur'].includes(language);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);
    return null;
};


const MainApp: React.FC = () => {
    const { currentUser } = useContext(AppContext);

    return (
        <>
        <LanguageManager />
        {!currentUser ? (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        ) : (
           <MainLayout />
        )}
       </>
    );
}


const MainLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

     return (
        <div className="flex min-h-screen bg-gray-900 relative overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen w-full relative z-0">
                <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-7xl mx-auto h-full">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/admin-board" element={<AdminBoard />} />
                            <Route path="/suspended" element={<SuspendedAgents />} />
                            <Route path="/operations-tools" element={<OperationsTools />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/my-requests" element={<MyRequests />} />
                            <Route path="/hr-management" element={<HRDelegateManagement />} />
                            <Route path="/user-management" element={<UserManagement />} />
                            <Route path="/all-delegates" element={<AllDelegates />} />
                            <Route path="/resigned-delegates" element={<ResignedDelegates />} />
                            <Route path="/compliance-shield" element={<ComplianceShield />} />
                            <Route path="/guidance-and-circulars" element={<GuidanceAndCirculars />} />
                            <Route path="/self-preparation" element={<SelfPreparation />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
}


interface NavLink {
    path: string;
    icon: string;
    labelKey: string;
    roles: UserRole[];
    badge?: number;
}

const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (open: boolean) => void }> = ({ isOpen, setIsOpen }) => {
    const location = useLocation();
    const { currentUser, data } = useContext(AppContext);
    const { t, language } = useTranslation();
    const allAdminRoles = Object.values(UserRole);
    const isRtl = ['ar', 'ur'].includes(language);

    // Calculate pending requests for badge
    const pendingRequestsCount = useMemo(() => {
        if (!currentUser) return 0;
        return data.requests.filter(r => 
            r.status === 'PendingApproval' && 
            r.workflow[r.currentStageIndex] === currentUser.role
        ).length;
    }, [data.requests, currentUser]);

    const navLinks: NavLink[] = [
        { path: '/', icon: 'fa-compass', labelKey: 'strategicGuidance', roles: allAdminRoles },
        { path: '/my-requests', icon: 'fa-network-wired', labelKey: 'myRequests', roles: allAdminRoles, badge: pendingRequestsCount },
        { path: '/self-preparation', icon: 'fa-camera', labelKey: 'selfPreparation', roles: [UserRole.OpsSupervisor, UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR] },
        { path: '/user-management', icon: 'fa-users-gear', labelKey: 'staffManagement', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR] },
        { path: '/hr-management', icon: 'fa-users-cog', labelKey: 'hrDelegateManagement', roles: [UserRole.HR, UserRole.GeneralManager, UserRole.MovementManager] },
        { path: '/all-delegates', icon: 'fa-users', labelKey: 'allDelegates', roles: allAdminRoles },
        { path: '/resigned-delegates', icon: 'fa-user-times', labelKey: 'resignedDelegates', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR] },
        { path: '/suspended', icon: 'fa-user-slash', labelKey: 'suspendedDelegates', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR] },
        { path: '/operations-tools', icon: 'fa-clipboard-check', labelKey: 'operationsTools', roles: [UserRole.OpsSupervisor, UserRole.GeneralManager, UserRole.MovementManager] },
        { path: '/reports', icon: 'fa-chart-pie', labelKey: 'reports', roles: allAdminRoles },
        { path: '/compliance-shield', icon: 'fa-shield-alt', labelKey: 'complianceShield', roles: allAdminRoles },
        { path: '/guidance-and-circulars', icon: 'fa-bullhorn', labelKey: 'guidanceAndCirculars', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.OpsSupervisor, UserRole.HR, UserRole.Legal] },
        { path: '/admin-board', icon: 'fa-user-tie', labelKey: 'adminBoard', roles: [UserRole.GeneralManager, UserRole.MovementManager] },
    ];

    const visibleLinks = useMemo(() => {
        if (!currentUser) return [];
        return navLinks.filter(link => link.roles.includes(currentUser.role));
    }, [currentUser, navLinks]);
    
    const sidebarClasses = `
        fixed inset-y-0 z-30 w-64 bg-gray-900 p-4 flex flex-col border-r border-gray-700/50 shadow-2xl
        transition-transform duration-300 ease-in-out transform
        md:relative md:translate-x-0 md:shadow-none md:border-r rtl:md:border-l
        ${isOpen 
            ? 'translate-x-0' 
            : isRtl ? 'translate-x-full' : '-translate-x-full'}
        ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
    `;

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            <div className={sidebarClasses}>
                <div className="flex justify-between items-center mb-8">
                     <div className="text-center w-full">
                        <h1 className="text-2xl font-bold primary-title tracking-wide">{t('appTitle')}</h1>
                        <p className="text-xs text-gray-400">{t('appSubtitle')}</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <nav className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
                    <ul className="space-y-1">
                        {visibleLinks.map(link => {
                            const isActive = location.pathname === link.path;
                            return (
                                <li key={link.path}>
                                    <Link 
                                        to={link.path} 
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center p-3 rounded-lg transition-all duration-300 group relative ${isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        <i className={`fas ${link.icon} w-8 text-center text-lg ${isActive ? 'text-orange-500' : ''}`}></i>
                                        <span className="ltr:ml-3 rtl:mr-3 font-semibold text-sm">{t(link.labelKey)}</span>
                                        {link.badge ? (
                                            <span className="absolute ltr:right-2 rtl:left-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-pulse">
                                                {link.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="mt-4 pt-4 border-t border-gray-800 text-center">
                    <p className="text-[10px] text-gray-500 font-mono">v1.0.0 (Official Release)</p>
                </div>
            </div>
        </>
    );
};

const getDaysUntil = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
    const { currentUser, setCurrentUser, data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    
    // Change Password State
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const documentAlerts = useMemo(() => {
        if (!currentUser) return [];
        const relevantRoles = [UserRole.OpsSupervisor, UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR];
        if (!relevantRoles.includes(currentUser.role)) return [];

        let delegatesToCheck: Delegate[];
        if (currentUser.role === UserRole.OpsSupervisor) {
             delegatesToCheck = data.delegates.filter(d => d.supervisorId === currentUser.id);
        } else {
             delegatesToCheck = data.delegates;
        }

        const alerts: { id: string, type: 'document', delegate: Delegate, docType: 'iqama' | 'license', status: 'expired' | 'expiring' }[] = [];
        delegatesToCheck.forEach(delegate => {
            if (delegate.iqamaExpiryDate) {
                const daysLeft = getDaysUntil(delegate.iqamaExpiryDate);
                if (daysLeft < 0) {
                    alerts.push({ id: `doc-${delegate.id}-iqama`, type: 'document', delegate, docType: 'iqama', status: 'expired' });
                } else if (daysLeft <= 30) {
                    alerts.push({ id: `doc-${delegate.id}-iqama`, type: 'document', delegate, docType: 'iqama', status: 'expiring' });
                }
            }
            if (delegate.licenseExpiryDate) {
                const daysLeft = getDaysUntil(delegate.licenseExpiryDate);
                if (daysLeft < 0) {
                    alerts.push({ id: `doc-${delegate.id}-license`, type: 'document', delegate, docType: 'license', status: 'expired' });
                } else if (daysLeft <= 30) {
                    alerts.push({ id: `doc-${delegate.id}-license`, type: 'document', delegate, docType: 'license', status: 'expiring' });
                }
            }
        });
        return alerts;
    }, [data.delegates, currentUser]);

    const shiftNotifications = useMemo(() => {
        if (!currentUser || currentUser.role !== UserRole.OpsSupervisor) return [];
        return (data.notifications || [])
            .filter(n => n.supervisorId === currentUser.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(n => ({...n, id: `shift-${n.id}`, type: 'shift' as const}));
    }, [data.notifications, currentUser]);

    const combinedNotifications = useMemo(() => {
        return [...shiftNotifications, ...documentAlerts];
    }, [shiftNotifications, documentAlerts]);
    
    const handleLogout = () => {
        if(setCurrentUser) {
            setCurrentUser(null);
        }
    };
    
    const handleMarkAsRead = (specificId?: string) => {
        if (specificId) {
             if(specificId.startsWith('shift-')) {
                 const numericId = parseInt(specificId.replace('shift-', ''));
                 if (!isNaN(numericId)) {
                      setData(prev => ({
                        ...prev,
                        notifications: prev.notifications.map(n => 
                            n.id === numericId ? { ...n, read: true } : n
                        )
                    }));
                 }
             }
             return;
        }

        const unreadShiftNotificationIds = shiftNotifications.filter(n => !n.read).map(n => n.id.replace('shift-', '')).map(Number);
        if (unreadShiftNotificationIds.length > 0) {
            setData(prev => ({
                ...prev,
                notifications: prev.notifications.map(n => 
                    unreadShiftNotificationIds.includes(n.id) ? { ...n, read: true } : n
                )
            }));
        }
        setIsNotificationsOpen(false);
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError(t('error_passwordsDoNotMatch'));
            return;
        }

        if (currentUser) {
             setData(prevData => ({
                ...prevData,
                staff: prevData.staff.map(s => 
                    s.id === currentUser.id 
                        ? { ...s, password: newPassword }
                        : s
                )
            }));
            
            setCurrentUser(prev => prev ? ({ ...prev, password: newPassword }) : null);

            setPasswordSuccess(t('passwordChangedSuccess'));
            setTimeout(() => {
                setIsChangePasswordOpen(false);
                setNewPassword('');
                setConfirmPassword('');
                setPasswordSuccess('');
            }, 1500);
        }
    };


    if (!currentUser) return null;
    
    const unreadCount = shiftNotifications.filter(n => !n.read).length + documentAlerts.length;

    return (
        <header className="p-4 flex justify-between md:justify-end items-center sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 md:bg-transparent md:border-none">
            
            <button 
                onClick={onToggleSidebar} 
                className="md:hidden p-2 text-gray-300 hover:text-white focus:outline-none"
            >
                <i className="fas fa-bars text-2xl"></i>
            </button>

            <div className="flex items-center gap-3 sm:gap-4">
                 <LanguageSwitcher />

                 {/* Change Password Modal - Improved Internal Design */}
                 {isChangePasswordOpen && (
                    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4 backdrop-blur-md" onClick={() => setIsChangePasswordOpen(false)}>
                        <div className="glass-card w-full max-w-md p-8 space-y-6 rounded-3xl shadow-2xl border border-gray-700/50" onClick={e => e.stopPropagation()}>
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                                    <i className="fas fa-shield-alt text-3xl text-orange-500"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-white">{t('changePassword')}</h3>
                                <p className="text-gray-400 text-sm mt-1">Create a new strong password for your account</p>
                            </div>
                            
                            <form onSubmit={handleChangePassword} className="space-y-5">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <i className="fas fa-lock absolute top-4 ltr:left-4 rtl:right-4 text-gray-500 group-focus-within:text-orange-500 transition-colors"></i>
                                        <input 
                                            type="password" 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 bg-gray-900/50 focus:ring-2 focus:ring-orange-500/50 rounded-xl transition-all" 
                                            placeholder={t('newPassword')}
                                            required 
                                        />
                                    </div>
                                    <div className="relative group">
                                        <i className="fas fa-check-circle absolute top-4 ltr:left-4 rtl:right-4 text-gray-500 group-focus-within:text-orange-500 transition-colors"></i>
                                        <input 
                                            type="password" 
                                            value={confirmPassword} 
                                            onChange={e => setConfirmPassword(e.target.value)} 
                                            className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 bg-gray-900/50 focus:ring-2 focus:ring-orange-500/50 rounded-xl transition-all" 
                                            placeholder={t('confirmPassword')}
                                            required 
                                        />
                                    </div>
                                </div>

                                {passwordError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">{passwordError}</div>}
                                {passwordSuccess && <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm text-center font-medium">{passwordSuccess}</div>}
                                
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all font-bold">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all">
                                        {t('save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                 )}

                <div className="relative">
                    <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="glass-card p-2 h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full relative hover:bg-gray-800/80 transition-colors">
                        <i className="fas fa-bell text-lg sm:text-xl text-gray-300"></i>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <div className="absolute top-14 ltr:right-0 rtl:left-0 glass-card p-2 rounded-2xl w-72 sm:w-80 shadow-2xl shadow-black/50 z-20 max-h-80 sm:max-h-96 overflow-y-auto border border-gray-700">
                            <div className="p-3 font-bold text-white border-b border-gray-700 flex justify-between items-center">
                                <span>{t('notifications')}</span>
                                <button onClick={() => handleMarkAsRead()} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                                    {t('markAllAsRead')}
                                </button>
                            </div>
                            {combinedNotifications.length > 0 ? (
                                <ul>
                                    {combinedNotifications.map((notif) => {
                                        if (notif.type === 'shift') {
                                            return (
                                                <li 
                                                    key={notif.id} 
                                                    onClick={() => handleMarkAsRead(notif.id)}
                                                    className={`p-3 border-b border-gray-800 last:border-b-0 cursor-pointer hover:bg-gray-700/50 transition-colors ${notif.read ? 'opacity-60' : 'bg-gray-800/30'}`}
                                                >
                                                    <span className={`block text-sm font-medium ${notif.read ? 'text-gray-400' : 'text-cyan-400'}`}>
                                                         <i className={`fas ${notif.messageKey === 'delegate_online' ? 'fa-play-circle' : 'fa-stop-circle'} ltr:mr-2 rtl:ml-2`}></i>
                                                         {t(notif.messageKey, notif.messageParams)}
                                                    </span>
                                                     <p className="text-xs text-gray-500 ltr:text-right rtl:text-left mt-1">{new Date(notif.createdAt).toLocaleTimeString()}</p>
                                                </li>
                                            )
                                        }
                                        const message = notif.status === 'expired' 
                                            ? (notif.docType === 'iqama' ? t('iqamaExpired', { delegateName: notif.delegate.name }) : t('licenseExpired', { delegateName: notif.delegate.name }))
                                            : (notif.docType === 'iqama' ? t('iqamaExpiresSoon', { delegateName: notif.delegate.name }) : t('licenseExpiresSoon', { delegateName: notif.delegate.name }));
                                        return (
                                            <li key={notif.id} className="p-3 border-b border-gray-800 last:border-b-0">
                                                <span className={`block text-sm font-medium ${notif.status === 'expired' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    <i className={`fas ${notif.status === 'expired' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} ltr:mr-2 rtl:ml-2`}></i>
                                                    {message}
                                                </span>
                                            </li>
                                        )
                                    })}
                                    <li className="p-2 text-center border-t border-gray-700 mt-2">
                                        <button onClick={() => { navigate('/compliance-shield'); setIsNotificationsOpen(false); }} className="text-orange-400 hover:text-orange-300 text-sm font-bold transition-colors">
                                            {t('viewDetails')}
                                        </button>
                                    </li>
                                </ul>
                            ) : (
                                <p className="p-6 text-center text-gray-500 text-sm">{t('noUrgentNotifications')}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 sm:gap-4 glass-card p-1.5 sm:p-2 rounded-full">
                    <div className="text-right hidden lg:block px-2">
                        <span className="font-bold text-white block text-sm">{currentUser.name}</span>
                        <span className="text-[10px] text-orange-400 block uppercase tracking-wider">{t(`role_${currentUser.role}`)}</span>
                    </div>
                     {currentUser.imageUrl && (
                        <img src={currentUser.imageUrl} alt="Profile" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-orange-500"/>
                    )}
                     <button 
                        onClick={() => setIsChangePasswordOpen(true)}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-colors flex items-center justify-center"
                        title={t('changePassword')}
                    >
                        <i className="fas fa-key text-sm"></i>
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white font-bold w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-colors flex items-center justify-center"
                        title={t('logout')}
                    >
                        <i className="fas fa-power-off text-sm"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default App;
