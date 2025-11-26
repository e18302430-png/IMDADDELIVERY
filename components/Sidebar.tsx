import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole } from '../types';

const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void }> = ({ isOpen, setIsOpen }) => {
    const { currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', icon: 'fa-home', label: 'dashboard', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.OpsSupervisor, UserRole.HR, UserRole.Finance, UserRole.Legal] },
        { path: '/admin-board', icon: 'fa-chalkboard-teacher', label: 'adminBoard', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.OpsSupervisor] },
        { path: '/operations-tools', icon: 'fa-tools', label: 'operationsTools', roles: [UserRole.OpsSupervisor, UserRole.GeneralManager, UserRole.MovementManager] },
        { path: '/reports', icon: 'fa-chart-line', label: 'reports', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.Finance, UserRole.HR, UserRole.OpsSupervisor] },
        { path: '/my-requests', icon: 'fa-file-alt', label: 'myRequests', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.OpsSupervisor, UserRole.HR, UserRole.Finance, UserRole.Legal] },
        { path: '/hr-management', icon: 'fa-users-cog', label: 'hrDelegateManagement', roles: [UserRole.HR, UserRole.GeneralManager] },
        { path: '/user-management', icon: 'fa-user-shield', label: 'staffManagement', roles: [UserRole.GeneralManager, UserRole.HR] },
        { path: '/all-delegates', icon: 'fa-users', label: 'allDelegates', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR, UserRole.OpsSupervisor] },
        { path: '/suspended', icon: 'fa-user-lock', label: 'suspendedDelegates', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR, UserRole.OpsSupervisor] },
        { path: '/resigned-delegates', icon: 'fa-user-slash', label: 'resignedDelegates', roles: [UserRole.HR, UserRole.GeneralManager] },
        { path: '/compliance-shield', icon: 'fa-shield-alt', label: 'complianceShield', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR, UserRole.OpsSupervisor] },
        { path: '/guidance-and-circulars', icon: 'fa-bullhorn', label: 'guidanceAndCirculars', roles: [UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR, UserRole.OpsSupervisor] },
        { path: '/self-preparation', icon: 'fa-camera', label: 'selfPreparation', roles: [UserRole.OpsSupervisor, UserRole.GeneralManager, UserRole.MovementManager] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(currentUser?.role as UserRole));

    return (
        <aside className={`fixed inset-y-0 ltr:left-0 rtl:right-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'} md:translate-x-0`}>
            <div className="h-full px-3 py-4 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            IM
                        </div>
                        <span className="text-xl font-bold text-white tracking-wide">{t('appTitle')}</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <ul className="space-y-2 font-medium flex-grow">
                    {filteredItems.map((item) => (
                        <li key={item.path}>
                            <Link 
                                to={item.path} 
                                className={`flex items-center p-3 rounded-lg group transition-all duration-200 ${location.pathname === item.path ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                                onClick={() => window.innerWidth < 768 && setIsOpen(false)}
                            >
                                <i className={`fas ${item.icon} w-6 h-6 transition duration-75 ${location.pathname === item.path ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}></i>
                                <span className="ltr:ml-3 rtl:mr-3">{t(item.label)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="pt-4 mt-4 border-t border-gray-700">
                    <div className="text-xs text-center text-gray-500">
                        v1.0.0 (Official Release)
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
