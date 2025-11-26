import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { authService } from '../src/services/authService';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC<{ toggleSidebar: () => void; handleChangePassword: () => void }> = ({ toggleSidebar, handleChangePassword }) => {
    const { currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        window.location.reload(); // Reload to clear application state
    };

    return (
        <header className="h-16 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white focus:outline-none">
                    <i className="fas fa-bars text-2xl"></i>
                </button>
                <h2 className="text-lg font-semibold text-white hidden sm:block">{t('appTitle')}</h2>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
                <LanguageSwitcher />
                
                <div className="flex items-center gap-3 pl-3 border-l border-gray-700">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-bold text-white">{currentUser?.name}</p>
                        <p className="text-xs text-gray-400">{t(`role_${currentUser?.role}`)}</p>
                    </div>
                    <img 
                        src={currentUser?.imageUrl || 'https://ui-avatars.com/api/?name=User&background=random'} 
                        alt="Profile" 
                        className="w-9 h-9 rounded-full border-2 border-orange-500/50"
                    />
                    <button 
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                        title={t('logout')}
                    >
                        <i className="fas fa-sign-out-alt text-lg"></i>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
