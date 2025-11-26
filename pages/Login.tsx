


import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Staff, UserRole } from '../types';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Login: React.FC = () => {
    const { data, setData, setCurrentUser, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    
    // Password Change State
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [pendingUser, setPendingUser] = useState<Staff | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changePasswordError, setChangePasswordError] = useState('');

    const supervisors = useMemo(() => data.staff.filter(s => s.role === UserRole.OpsSupervisor), [data.staff]);
    const singleUserRoles = useMemo(() => {
        const roleMap = new Map<UserRole, Staff>();
        data.staff.forEach(staff => {
            if (staff.role !== UserRole.OpsSupervisor) {
                roleMap.set(staff.role, staff);
            }
        });
        return Array.from(roleMap.values());
    }, [data.staff]);


    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedRole) {
            setError(t('error_selectRole'));
            return;
        }

        let user;
        if (selectedRole === UserRole.OpsSupervisor) {
             if (!selectedSupervisorId) {
                setError(t('selectSupervisor', 'Please select a supervisor.'));
                return;
            }
            user = data.staff.find(staff => staff.id === parseInt(selectedSupervisorId, 10));
        } else {
            user = data.staff.find(staff => staff.role === selectedRole);
        }


        if (user && user.password === password) {
            if (user.requiresPasswordChange) {
                setPendingUser(user);
                setShowChangePasswordModal(true);
            } else {
                setCurrentUser(user);
            }
        } else {
            setError(t('error_incorrectPassword'));
        }
    };
    
    const handleChangePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordError('');
        
        if (newPassword !== confirmNewPassword) {
            setChangePasswordError(t('error_passwordsDoNotMatch'));
            return;
        }
        
        if (pendingUser) {
            // Update user in data
             setData(prevData => ({
                ...prevData,
                staff: prevData.staff.map(s => 
                    s.id === pendingUser.id 
                        ? { ...s, password: newPassword, requiresPasswordChange: false }
                        : s
                )
            }));
            
            // Log them in
            setCurrentUser({ ...pendingUser, password: newPassword, requiresPasswordChange: false });
            setShowChangePasswordModal(false);
            setPendingUser(null);
        }
    };

    if (currentUser) {
        return <Navigate to="/" />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-4 ltr:right-4 rtl:left-4 z-20">
                <LanguageSwitcher />
            </div>
            <div className="absolute inset-0 bg-cover bg-center z-0" style={{backgroundImage: "url('https://images.unsplash.com/photo-1545166228-55435e954429?q=80&w=2670&auto=format&fit=crop')", filter: 'blur(3px) brightness(0.4)'}}></div>
            
            {/* Change Password Modal */}
            {showChangePasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-8 space-y-6">
                        <h2 className="text-2xl font-bold text-orange-500 text-center">{t('changePassword')}</h2>
                        <p className="text-gray-300 text-center text-sm">{t('changePasswordRequired')}</p>
                        
                        <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">{t('newPassword')}</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-styled w-full"
                                    required
                                />
                            </div>
                             <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">{t('confirmPassword')}</label>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className="input-styled w-full"
                                    required
                                />
                            </div>
                            {changePasswordError && <p className="text-sm text-red-400 text-center">{changePasswordError}</p>}
                            
                            <div className="pt-4">
                                <button type="submit" className="w-full btn-primary">
                                    {t('setNewPassword')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md z-10">
                <div className="glass-card p-8 space-y-8">
                    <div className="text-center">
                        <h1 className="text-5xl font-bold text-orange-500 primary-title">{t('appTitle')}</h1>
                        <p className="text-gray-300 mt-2">{t('appSubtitle')}</p>
                    </div>
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="role" className="block mb-2 text-sm font-medium text-gray-300">{t('chooseYourRole')}</label>
                             <select
                                id="role"
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value as UserRole);
                                    setSelectedSupervisorId('');
                                }}
                                className="input-styled block w-full"
                                required
                            >
                                <option value="" disabled>{t('chooseYourRole')}</option>
                                {singleUserRoles.map(staffMember => (
                                    <option key={staffMember.id} value={staffMember.role}>
                                        {t(`role_${staffMember.role}` as any, staffMember.name)}
                                    </option>
                                ))}
                                {supervisors.length > 0 && (
                                     <option value={UserRole.OpsSupervisor}>{t('role_OpsSupervisor')}</option>
                                )}
                            </select>
                        </div>
                        
                        <div className={selectedRole === UserRole.OpsSupervisor ? 'animate-fade-in' : 'hidden'}>
                             <label htmlFor="supervisor" className="block mb-2 text-sm font-medium text-gray-300">{t('selectSupervisor')}</label>
                             <select
                                id="supervisor"
                                value={selectedSupervisorId}
                                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                                className="input-styled block w-full"
                                required={selectedRole === UserRole.OpsSupervisor}
                            >
                                <option value="" disabled>{t('selectSupervisor')}</option>
                                {supervisors.map(sup => (
                                    <option key={sup.id} value={sup.id}>
                                        {sup.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-300">{t('password')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-styled block w-full ltr:pr-10 rtl:pl-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute top-1/2 -translate-y-1/2 ltr:right-3 rtl:left-3 text-gray-400 hover:text-white focus:outline-none"
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                        <div>
                            <button type="submit" className="w-full btn-primary">
                                {t('login')}
                            </button>
                        </div>
                    </form>
                </div>
                 <div className="text-center mt-8">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-gray-300 mb-4">
                            <i className="fas fa-car ltr:mr-2 rtl:ml-2 text-green-400"></i>
                            {t('delegateSection')}
                        </h2>
                        <Link 
                            to="/delegate-app" 
                            className="w-full inline-block text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-800 font-medium rounded-lg text-md px-5 py-3 text-center transition-transform hover:scale-105"
                        >
                           <i className="fas fa-mobile-alt ltr:mr-2 rtl:ml-2"></i>
                           {t('openDelegateApp')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;