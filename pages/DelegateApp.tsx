import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Delegate, Request, RequestStatus, RequestType, UserRole, RequestHistoryEvent, DelegateRequestTopic, Circular, Notification } from '../types';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { generateRequestNumber } from '../services/dataService';
import { verifyDelegateIdentity, verifyDelegateVehicle } from '../services/geminiService';

// --- Camera Modal Component ---
const CameraModal: React.FC<{
    step: 'face' | 'car';
    instructions: string;
    referencePhoto?: string;
    onCapture: (photoBase64: string) => Promise<boolean>;
    onClose: () => void;
    isVerifying: boolean;
}> = ({ step, instructions, onCapture, onClose, isVerifying }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        let currentStream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                const constraints = {
                    video: {
                        facingMode: step === 'face' ? 'user' : 'environment',
                        width: { ideal: 640 },
                        height: { ideal: 640 }
                    }
                };
                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                currentStream = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.warn("Specific camera constraint failed, retrying with default video.", err);
                try {
                    // Fallback to any video device if specific facingMode fails (e.g. on laptops)
                    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    currentStream = mediaStream;
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                    }
                } catch (fallbackErr) {
                    setError(t('cameraPermissionDenied'));
                    console.error("Camera initialization failed:", fallbackErr);
                }
            }
        };

        startCamera();

        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [step, t]);

    const handleCapture = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const photoBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        const success = await onCapture(photoBase64);
        if (!success) {
             // Keep camera open for retry
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-50">
            <div className="w-full max-w-md p-4 flex flex-col h-full">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{t(step === 'face' ? 'verificationStep1' : 'verificationStep2')}</h3>
                    <button onClick={onClose} className="text-gray-400 text-2xl">&times;</button>
                </div>
                
                <div className="relative flex-grow flex items-center justify-center bg-black rounded-lg overflow-hidden">
                    {error ? (
                        <div className="text-red-400 text-center px-4 flex flex-col items-center gap-2">
                            <i className="fas fa-exclamation-triangle text-3xl"></i>
                            <p>{error}</p>
                            <p className="text-sm text-gray-500">Please ensure camera permissions are granted and a camera is available.</p>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <div className="absolute inset-0 border-4 border-dashed border-opacity-50 border-white m-8 pointer-events-none rounded-lg flex items-end justify-center p-4">
                                <p className="text-white font-bold text-center bg-black/50 p-2 rounded">{instructions}</p>
                            </div>
                            {isVerifying && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                                        <p className="text-white font-bold animate-pulse">{t('verifying')}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="mt-6 mb-4">
                     <button 
                        onClick={handleCapture} 
                        disabled={!!error || isVerifying}
                        className="w-full bg-orange-600 text-white font-bold py-4 rounded-full text-xl shadow-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-camera"></i>
                        {t(step === 'face' ? 'takeSelfie' : 'takeCarPhoto')}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Login Component ---
const DelegateLogin: React.FC<{ onLogin: (delegate: Delegate) => void }> = ({ onLogin }) => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const delegate = data.delegates.find(d => d.phone === phoneNumber);

        if (delegate && delegate.password === password) {
            onLogin(delegate);
        } else {
            setError(t('error_incorrectPassword'));
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
            <div className="w-full max-w-sm glass-card p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-4xl font-bold primary-title">IMDAD-X</h1>
                    <p className="text-gray-400 mt-2">{t('delegateApp')}</p>
                </div>
                <form onSubmit={handleLogin} className="animate-fade-in space-y-4">
                    <div>
                        <label htmlFor="phone-input" className="block mb-2 text-sm font-medium text-gray-300">{t('phoneNumber')}</label>
                        <input
                            id="phone-input"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="05xxxxxxxx"
                            className="input-styled w-full text-left"
                            dir="ltr"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password-input" className="block mb-2 text-sm font-medium text-gray-300">{t('password')}</label>
                        <div className="relative">
                            <input
                                id="password-input"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                className="input-styled w-full text-center text-lg tracking-[.2em] pr-10"
                                required
                            />
                             <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-white focus:outline-none"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
                    <button type="submit" disabled={!phoneNumber || !password} className="w-full btn-primary bg-green-600 hover:bg-green-500">{t('login')}</button>
                </form>
                <div className="text-center pt-4 border-t border-orange-500/20">
                    <Link to="/login" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">
                        <i className="fas fa-arrow-left ltr:mr-1 rtl:ml-1"></i>{t('backToMainDashboard')}
                    </Link>
                </div>
            </div>
        </div>
    );
};

// --- Change Password Component ---
const ChangePasswordView: React.FC<{ delegate: Delegate; onPasswordChanged: (delegate: Delegate) => void; isModal?: boolean; onClose?: () => void }> = ({ delegate, onPasswordChanged, isModal, onClose }) => {
    const { t } = useTranslation();
    const { setData } = useContext(AppContext);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError(t('error_passwordsDoNotMatch'));
            return;
        }
        if (newPassword.length < 4) {
            setError('Password too short');
            return;
        }

        setData(prevData => ({
            ...prevData,
            delegates: prevData.delegates.map(d =>
                d.id === delegate.id
                    ? { ...d, password: newPassword, requiresPasswordChange: false }
                    : d
            )
        }));

        const updatedDelegate = { ...delegate, password: newPassword, requiresPasswordChange: false };
        onPasswordChanged(updatedDelegate);
        setSuccess(t('passwordChangedSuccess'));
        
        if (onClose) {
            setTimeout(() => onClose(), 1500);
        }
    };

    const strength = useMemo(() => {
        if (newPassword.length === 0) return 0;
        if (newPassword.length < 6) return 1;
        if (newPassword.length < 8) return 2;
        return 3;
    }, [newPassword]);

    return (
        <div className={`flex flex-col h-full items-center justify-center p-6 ${!isModal ? 'bg-gray-900' : ''}`}>
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                        <i className="fas fa-key text-3xl text-white"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">{t('changePassword')}</h2>
                    {!isModal && <p className="text-gray-400 text-sm mt-2">{t('changePasswordRequired')}</p>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 bg-gray-800/50 p-6 rounded-3xl border border-gray-700 backdrop-blur-md">
                    <div className="space-y-4">
                        <div className="relative group">
                            <i className="fas fa-lock absolute top-4 ltr:left-4 rtl:right-4 text-gray-500 group-focus-within:text-orange-500 transition-colors"></i>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 bg-gray-900/50 focus:ring-2 focus:ring-orange-500/50 rounded-xl transition-all"
                                placeholder={t('newPassword')}
                                required
                            />
                        </div>
                        
                        {/* Strength Meter */}
                        <div className="flex gap-2 h-1.5 mt-2">
                            <div className={`flex-1 rounded-full transition-colors ${strength >= 1 ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                            <div className={`flex-1 rounded-full transition-colors ${strength >= 2 ? 'bg-yellow-500' : 'bg-gray-700'}`}></div>
                            <div className={`flex-1 rounded-full transition-colors ${strength >= 3 ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                        </div>

                        <div className="relative group">
                            <i className="fas fa-check-double absolute top-4 ltr:left-4 rtl:right-4 text-gray-500 group-focus-within:text-orange-500 transition-colors"></i>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 bg-gray-900/50 focus:ring-2 focus:ring-orange-500/50 rounded-xl transition-all"
                                placeholder={t('confirmPassword')}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">{error}</div>}
                    {success && <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm text-center font-medium">{success}</div>}
                    
                    <div className="flex gap-3 pt-2">
                         {onClose && <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all font-bold">{t('cancel')}</button>}
                         <button type="submit" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all">{t('setNewPassword')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main App ---
const DelegateApp: React.FC = () => {
    const [loggedInDelegate, setLoggedInDelegate] = useState<Delegate | null>(null);
    const [activeView, setActiveView] = useState<'dashboard' | 'requests' | 'directives' | 'circulars'>('dashboard');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        const timer = setTimeout(() => setNotification(null), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!loggedInDelegate) {
        return <DelegateLogin onLogin={setLoggedInDelegate} />;
    }
    
    if (loggedInDelegate.requiresPasswordChange) {
        return <ChangePasswordView delegate={loggedInDelegate} onPasswordChanged={setLoggedInDelegate} />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-2 sm:p-4 bg-gray-900 overflow-hidden">
            {notification && (
                <div role="alert" className={`fixed top-5 right-4 left-4 z-50 p-4 rounded-lg shadow-lg text-white text-center animate-fade-in ${notification.type === 'success' ? 'bg-green-600/90' : notification.type === 'error' ? 'bg-red-600/90' : 'bg-blue-600/90'}`}>
                    {notification.message}
                </div>
            )}
            <div className="w-full max-w-sm md:max-w-md lg:max-w-lg h-full max-h-[calc(100vh-1rem)] flex flex-col glass-card overflow-hidden border border-gray-700/50 shadow-2xl">
                <Header delegate={loggedInDelegate} onLogout={() => setLoggedInDelegate(null)} onUpdateDelegate={setLoggedInDelegate} />
                <main className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-gradient-to-b from-gray-900 to-gray-800">
                    {activeView === 'dashboard' && <DashboardView delegate={loggedInDelegate} showNotification={showNotification} />}
                    {activeView === 'requests' && <RequestsView delegate={loggedInDelegate} showNotification={showNotification} />}
                    {activeView === 'directives' && <DirectivesView delegate={loggedInDelegate} showNotification={showNotification} />}
                    {activeView === 'circulars' && <CircularsView />}
                </main>
                <BottomNav activeView={activeView} setActiveView={setActiveView} />
            </div>
        </div>
    );
};

// ... Sub-components
const Header: React.FC<{ delegate: Delegate; onLogout: () => void; onUpdateDelegate: (d: Delegate) => void }> = ({ delegate, onLogout, onUpdateDelegate }) => {
    const { t } = useTranslation();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    return (
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/80 backdrop-blur-md z-20">
             {isPasswordModalOpen && (
                 <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md h-full sm:h-auto overflow-y-auto">
                         <ChangePasswordView 
                            delegate={delegate} 
                            onPasswordChanged={onUpdateDelegate} 
                            isModal={true} 
                            onClose={() => setIsPasswordModalOpen(false)} 
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3">
                <img src={delegate.imageUrl} alt={delegate.name} className="w-10 h-10 rounded-full object-cover border-2 border-orange-500 shadow-md shadow-orange-500/20" />
                <div>
                    <h2 className="text-base font-bold text-white leading-tight">{delegate.name}</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('deliveryDelegate')}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsPasswordModalOpen(true)} className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center transition-colors" title={t('changePassword')}>
                    <i className="fas fa-key text-xs"></i>
                </button>
                <button onClick={onLogout} className="w-8 h-8 rounded-full bg-red-900/30 hover:bg-red-600 text-red-300 hover:text-white flex items-center justify-center transition-colors" title={t('logout')}>
                    <i className="fas fa-sign-out-alt text-xs"></i>
                </button>
            </div>
        </div>
    );
};

const DashboardView: React.FC<{ delegate: Delegate; showNotification: Function }> = ({ delegate, showNotification }) => {
    const { t } = useTranslation();
    const { setData } = useContext(AppContext);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [verificationStep, setVerificationStep] = useState<'none' | 'face' | 'car'>('none');
    const [tempFacePhoto, setTempFacePhoto] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    }, []);

    const handleStartShiftFlow = () => {
        if (isOnDuty) {
            const messageKey = 'supervisor_notification_offline';
            showNotification(t(messageKey, { delegateName: delegate.name }), 'info');
            
            const newNotification: Notification = {
                id: Date.now(),
                supervisorId: delegate.supervisorId,
                messageKey: 'delegate_offline',
                messageParams: { delegateName: delegate.name },
                createdAt: new Date().toISOString(),
                read: false
            };
            setData(prev => ({...prev, notifications: [...(prev.notifications || []), newNotification]}));
            setIsOnDuty(false);
        } else {
            setVerificationStep('face');
        }
    };
    
    const handleFaceCapture = async (photoBase64: string) => {
        setIsVerifying(true);
        try {
            const referencePhoto = delegate.imageUrl;
            
            if (!referencePhoto) {
                showNotification("No profile photo found for verification. Contact HR.", 'error');
                return false;
            }

            const result = await verifyDelegateIdentity(photoBase64, referencePhoto);
            
            if (result.verified) {
                setTempFacePhoto(photoBase64);
                showNotification(t('faceMatchSuccess'), 'success');
                setVerificationStep('car');
                return true;
            } else {
                showNotification(t('faceMatchFailed') + (result.confidence ? `: ${result.confidence}` : ""), 'error');
                return false;
            }
        } catch (e) {
            console.error(e);
            showNotification(t('faceMatchFailed'), 'error');
            return false;
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCarCapture = async (photoBase64: string) => {
         setIsVerifying(true);
         try {
             const result = await verifyDelegateVehicle(photoBase64);
             if (result.verified) {
                 showNotification(t('carCheckSuccess'), 'success');
                 
                 const now = new Date().toISOString();
                 setData(prev => ({
                     ...prev,
                     delegates: prev.delegates.map(d => d.id === delegate.id ? {
                         ...d,
                         lastShiftStartTime: now,
                         lastShiftFacePhoto: tempFacePhoto!,
                         lastShiftCarPhoto: photoBase64
                     } : d),
                     notifications: [...(prev.notifications || []), {
                        id: Date.now(),
                        supervisorId: delegate.supervisorId,
                        messageKey: 'delegate_online',
                        messageParams: { delegateName: delegate.name },
                        createdAt: now,
                        read: false
                    }]
                 }));
                 
                 setIsOnDuty(true);
                 setVerificationStep('none');
                 showNotification(t('verificationComplete'), 'success');
                 return true;
             } else {
                 showNotification(t('carCheckFailed') + ": " + result.reason, 'error');
                 return false;
             }
         } catch (e) {
             console.error(e);
             showNotification("Verification Error", 'error');
             return false;
         } finally {
             setIsVerifying(false);
         }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {verificationStep === 'face' && (
                <CameraModal 
                    step="face" 
                    instructions={t('instructionFace')} 
                    onCapture={handleFaceCapture} 
                    onClose={() => setVerificationStep('none')}
                    isVerifying={isVerifying}
                />
            )}
            {verificationStep === 'car' && (
                <CameraModal 
                    step="car" 
                    instructions={t('instructionCar')} 
                    onCapture={handleCarCapture} 
                    onClose={() => setVerificationStep('none')}
                    isVerifying={isVerifying}
                />
            )}

            <div className="text-center pt-4">
                <p className="text-orange-400 text-sm font-medium uppercase tracking-widest mb-1">{greeting}</p>
                <h1 className="text-3xl font-bold text-white">{t('delegate_welcome_title')}</h1>
                <p className="text-gray-400 text-sm mt-1">{t('delegate_welcome_subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-800/40 backdrop-blur-md p-5 rounded-2xl border border-orange-500/20 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                            <i className="fas fa-clock text-xl"></i>
                        </div>
                        <div>
                            <h2 className="font-bold text-orange-100 text-lg">{t('delegate_peak_hours_title')}</h2>
                            <p className="text-xs text-gray-300 mt-1 leading-relaxed">{t('delegate_peak_hours_desc')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800/40 backdrop-blur-md p-5 rounded-2xl border border-green-500/20 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="p-3 bg-green-500/20 text-green-400 rounded-xl">
                            <i className="fas fa-bullseye text-xl"></i>
                        </div>
                        <div>
                            <h2 className="font-bold text-green-100 text-lg">{t('delegate_daily_goal_title')}</h2>
                            <p className="text-xs text-gray-300 mt-1 leading-relaxed">{t('delegate_daily_goal_desc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button 
                    onClick={handleStartShiftFlow} 
                    className={`w-full font-bold rounded-2xl text-lg px-6 py-5 text-center transition-all duration-300 transform active:scale-95 shadow-xl ${
                        isOnDuty 
                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-500/20' 
                        : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-green-500/20'
                    }`}
                >
                    <div className="flex items-center justify-center gap-3">
                        <i className={`fas ${isOnDuty ? 'fa-stop-circle' : 'fa-play-circle'} text-2xl`}></i>
                        <span>{isOnDuty ? t('endShift') : t('startShift')}</span>
                    </div>
                </button>
                {isOnDuty && (
                    <div className="mt-3 text-center animate-pulse">
                        <span className="text-green-400 text-xs font-bold px-3 py-1 rounded-full bg-green-900/30 border border-green-500/30">
                            <i className="fas fa-circle text-[8px] ltr:mr-2 rtl:ml-2"></i> {t('youAreOnDuty')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper for input with icon
const InputWithIcon: React.FC<{ icon: string; [key: string]: any }> = ({ icon, className, ...props }) => (
    <div className="relative group">
        <div className="absolute top-3 ltr:left-3 rtl:right-3 text-gray-500 group-focus-within:text-orange-500 transition-colors z-10">
            <i className={`fas ${icon}`}></i>
        </div>
        <props.component 
            className={`input-styled w-full ltr:pl-10 rtl:pr-10 group-focus-within:border-orange-500/50 group-focus-within:shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all ${className} text-[16px]`} 
            {...props} 
        />
    </div>
);

const CreateRequestView: React.FC<{ delegate: Delegate, onCreate: (req: Omit<Request, 'id'>) => void, onCancel: () => void }> = ({ delegate, onCreate, onCancel }) => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [topic, setTopic] = useState<DelegateRequestTopic>(DelegateRequestTopic.Leave);
    const [details, setDetails] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedTemplate(val);
        if (val) {
            setDetails(t(`template_${val}_Text`));
        } else {
            setDetails('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!details.trim()) {
            setError(t('error_fillAllFields'));
            return;
        }

        try {
            const imageUrl = imageFile ? await fileToBase64(imageFile) : undefined;
            const now = new Date().toISOString();
            
            let workflow: UserRole[];
            const fullChain = [UserRole.OpsSupervisor, UserRole.MovementManager, UserRole.HR, UserRole.GeneralManager, UserRole.Finance];
            
            if ([DelegateRequestTopic.Financial, DelegateRequestTopic.Clearance].includes(topic)) {
                 workflow = fullChain;
            } else if (topic === DelegateRequestTopic.ContactSupervisor) { 
                workflow = [UserRole.OpsSupervisor];
            } else if (topic === DelegateRequestTopic.ConfidentialComplaint) {
                workflow = [UserRole.MovementManager, UserRole.GeneralManager];
            } else {
                workflow = [UserRole.OpsSupervisor, UserRole.MovementManager, UserRole.HR, UserRole.GeneralManager];
            }

            const initialHistory: RequestHistoryEvent = {
                actor: 'Delegate',
                actorName: delegate.name,
                action: 'Created',
                timestamp: now
            };

            const newRequestData: Omit<Request, 'id'> = {
                requestNumber: generateRequestNumber(RequestType.Employee, data.requests),
                title: t(`request_topic_${topic}`),
                description: details,
                type: RequestType.Employee,
                status: RequestStatus.PendingApproval,
                fromDelegateId: delegate.id,
                createdAt: now,
                lastActionTimestamp: now,
                history: [initialHistory],
                imageUrl,
                topic,
                workflow,
                currentStageIndex: 0,
            };
            onCreate(newRequestData);
        } catch (err) {
            setError('Error processing image.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in pb-4">
             {/* 72 Hour Warning Note - Complete Shape Update */}
             <div className="w-full bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex flex-col gap-2 shadow-lg shadow-red-900/10">
                <div className="flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-red-400 text-lg animate-pulse"></i>
                    <h4 className="text-sm font-bold text-red-200">{t('warning_72h_close')}</h4>
                </div>
                <p className="text-xs text-red-200/80 leading-relaxed">
                    {t('warning_72h_detail')}
                </p>
            </div>

            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-pen-fancy text-orange-400"></i> {t('create_new_request')}
            </h3>
            
            <div className="bg-gray-800/30 p-5 rounded-2xl border border-gray-700/30 space-y-5">
                <div>
                    <label className="block mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('request_topic')}</label>
                    <div className="relative group">
                        <div className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-gray-500 z-10"><i className="fas fa-tag"></i></div>
                        <select value={topic} onChange={e => setTopic(e.target.value as DelegateRequestTopic)} className="input-styled w-full ltr:pl-10 rtl:pr-10 appearance-none">
                            {Object.values(DelegateRequestTopic).map(t_val => (
                                <option key={t_val} value={t_val}>{t(`request_topic_${t_val}`)}</option>
                            ))}
                        </select>
                        <div className="absolute top-1/2 -translate-y-1/2 ltr:right-3 rtl:left-3 text-gray-500 pointer-events-none"><i className="fas fa-chevron-down text-xs"></i></div>
                    </div>
                </div>

                <div>
                    <label className="block mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('useFormalTemplate')}</label>
                     <div className="relative group">
                        <div className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-gray-500 z-10"><i className="fas fa-file-contract"></i></div>
                        <select value={selectedTemplate} onChange={handleTemplateChange} className="input-styled w-full ltr:pl-10 rtl:pr-10 appearance-none text-gray-300">
                            <option value="">{t('selectTemplate')}</option>
                            <option value="GeneralRequest">{t('template_GeneralRequest')}</option>
                            <option value="Complaint">{t('template_Complaint')}</option>
                            <option value="Financial">{t('template_Financial')}</option>
                        </select>
                        <div className="absolute top-1/2 -translate-y-1/2 ltr:right-3 rtl:left-3 text-gray-500 pointer-events-none"><i className="fas fa-chevron-down text-xs"></i></div>
                    </div>
                </div>

                <div>
                    <label className="block mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t('request_details')}</label>
                    <InputWithIcon component="textarea" icon="fa-align-left" value={details} onChange={(e: any) => setDetails(e.target.value)} rows={6} className="py-3" required />
                </div>
                <div>
                     <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-orange-500/50 transition-colors group">
                        <label htmlFor="delegate-file-upload" className="block mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer">{t('attach_supporting_document')}</label>
                        <div className="flex items-center gap-4">
                            <div className="flex-grow">
                                <label htmlFor="delegate-file-upload" className="w-full cursor-pointer bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-sm font-medium py-3 px-4 rounded-lg inline-flex items-center justify-center transition-all duration-300 border border-dashed border-gray-600 hover:border-orange-400 group-hover:bg-gray-700/80">
                                    <i className="fas fa-cloud-upload-alt ltr:mr-2 rtl:ml-2 text-orange-500 group-hover:scale-110 transition-transform"></i>
                                    <span className="truncate max-w-[150px]">{imageFile ? imageFile.name : t('uploadFile')}</span>
                                </label>
                                <input id="delegate-file-upload" type="file" accept="image/*,application/pdf" onChange={e => setImageFile(e.target.files?.[0] || null)} className="hidden" />
                            </div>
                             <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 border border-gray-700 group-hover:text-gray-400 transition-colors">
                                <i className="fas fa-paperclip text-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && <p className="text-sm text-red-400 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-4 pt-2">
                <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 font-bold text-sm w-full sm:w-auto">{t('cancel')}</button>
                <button type="submit" className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-500/30 w-full sm:w-auto">
                    <i className="fas fa-paper-plane ltr:mr-2 rtl:ml-2"></i> {t('submit_request')}
                </button>
            </div>
        </form>
    );
};

const RequestsView: React.FC<{ delegate: Delegate, showNotification: Function }> = ({ delegate, showNotification }) => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const [view, setView] = useState<'list' | 'create'>('list');
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');

    const delegateRequests = useMemo(() => {
        let reqs = data.requests.filter(r => r.fromDelegateId === delegate.id && r.type !== RequestType.DirectDirective);
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            reqs = reqs.filter(r => r.requestNumber.toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
        }

        if (statusFilter !== 'All') {
            reqs = reqs.filter(r => r.status === statusFilter);
        }

        return reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [data.requests, delegate.id, searchQuery, statusFilter]);

    const handleCreateRequest = (newRequestData: Omit<Request, 'id'>) => {
        setData(prev => {
            const newRequest: Request = {
                id: Date.now(),
                ...newRequestData,
            };
            return { ...prev, requests: [...prev.requests, newRequest] }
        });
        showNotification(t('request_submitted_successfully', { requestNumber: newRequestData.requestNumber }), 'success');
        setView('list');
    };

    if (selectedRequest) {
        return <RequestProgressMap request={selectedRequest} onClose={() => setSelectedRequest(null)} />;
    }

    if (view === 'create') {
        return <CreateRequestView delegate={delegate} onCreate={handleCreateRequest} onCancel={() => setView('list')} />;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{t('my_requests')}</h2>
                <button onClick={() => setView('create')} className="btn-primary py-2 px-4 text-sm shadow-lg shadow-orange-500/20">
                    <i className="fas fa-plus ltr:mr-2 rtl:ml-2"></i>{t('create_new_request')}
                </button>
            </div>

            <div className="mb-4 space-y-2 bg-gray-800/30 p-3 rounded-xl border border-gray-700/30">
                <div className="relative group">
                     <i className="fas fa-search absolute top-2.5 ltr:left-3 rtl:right-3 text-gray-500 text-xs group-focus-within:text-orange-500 transition-colors"></i>
                     <input 
                        type="text" 
                        placeholder={t('searchRequestsPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-styled w-full ltr:pl-8 rtl:pr-8 py-1.5 text-sm bg-gray-900/50 focus:bg-gray-900 text-[16px]"
                    />
                </div>
                <div className="relative group">
                    <i className="fas fa-filter absolute top-2.5 ltr:left-3 rtl:right-3 text-gray-500 text-xs z-10"></i>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'All')}
                        className="input-styled w-full ltr:pl-8 rtl:pr-8 py-1.5 text-sm bg-gray-900/50 focus:bg-gray-900 appearance-none"
                    >
                        <option value="All">{t('filterByStatus')}: {t('all')}</option>
                        {Object.values(RequestStatus).map(s => (
                            <option key={s} value={s}>{t(`status_${s}`)}</option>
                        ))}
                    </select>
                    <i className="fas fa-chevron-down absolute top-2.5 ltr:right-3 rtl:left-3 text-gray-500 text-xs pointer-events-none"></i>
                </div>
            </div>

            {delegateRequests.length > 0 ? (
                <div className="space-y-3">
                    {delegateRequests.map(req => (
                        <div key={req.id} onClick={() => setSelectedRequest(req)} className="glass-card p-4 cursor-pointer hover:bg-gray-700/50 transition-colors border-l-4 border-l-transparent hover:border-l-orange-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-white">{req.title}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{req.requestNumber}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${req.status === 'Approved' ? 'bg-green-900/30 text-green-400 border-green-500/30' : req.status === 'Rejected' ? 'bg-red-900/30 text-red-400 border-red-500/30' : 'bg-blue-900/30 text-blue-400 border-blue-500/30'}`}>
                                    {t(`status_${req.status}`)}
                                </span>
                            </div>
                            <div className="flex justify-between items-end mt-3">
                                 <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                                    {t('view_request_progress')} <i className="fas fa-arrow-right text-[10px]"></i>
                                </span>
                                <span className="text-[10px] text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 mt-16">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-file-alt text-3xl opacity-50"></i>
                    </div>
                    <p>{t('no_requests_submitted')}</p>
                </div>
            )}
        </div>
    );
};


const RequestProgressMap: React.FC<{ request: Request; onClose: () => void; }> = ({ request, onClose }) => {
    const { t } = useTranslation();
    const stages = request.workflow;
    const isCompleted = request.status === 'Completed' || request.status === 'Approved';
    const isRejected = request.status === 'Rejected';
    
    const lastSignificantEvent = [...request.history].reverse().find(h => 
        ['Approved', 'Rejected', 'ResolvedAndClosed', 'ResolvedAndDirected'].includes(h.action)
    );
    const closingActorRole = lastSignificantEvent?.actor as UserRole | undefined;
    const closingComment = lastSignificantEvent?.comment;

    let stopIndex = stages.length - 1;
    if (isCompleted || isRejected) {
        if (closingActorRole) {
             const idx = stages.indexOf(closingActorRole);
             if (idx !== -1) stopIndex = idx;
        }
    }

    return (
        <div className="p-4 animate-fade-in h-full flex flex-col">
            <button onClick={onClose} className="text-gray-400 mb-4 flex items-center gap-2 hover:text-white transition-colors">
                <i className="fas fa-arrow-left"></i>{t('backToMainDashboard')}
            </button>
            
            {/* Request Details */}
            <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50 mb-6 text-center">
                 <h3 className="text-xl font-bold text-white mb-2">{request.title}</h3>
                 <p className="text-sm text-orange-400 font-mono mb-4">{request.requestNumber}</p>
                 <div className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-xl text-right">
                     <p className="font-bold text-gray-500 mb-1">{t('requestDetails')}:</p>
                     <p className="mb-2">{request.description}</p>
                     {request.imageUrl && (
                         <div className="mt-3 pt-3 border-t border-gray-700 flex flex-col items-center gap-2">
                             {request.imageUrl.startsWith('data:image') && (
                                 <img src={request.imageUrl} alt="Attachment" className="max-h-32 rounded border border-gray-600" />
                             )}
                             <a href={request.imageUrl} download="attachment" target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center gap-2">
                                 <i className="fas fa-paperclip"></i> {t('openAttachment')}
                             </a>
                         </div>
                     )}
                 </div>
            </div>

            {/* Map */}
            <div className="flex-grow flex flex-col items-center justify-start">
                <div className="flex items-start justify-between w-full overflow-x-auto pb-8 px-2">
                    {stages.map((role, index) => {
                        const isCloser = closingActorRole === role;
                        
                        // Node status logic
                        let isPassed = false;
                        let isCurrent = false;
                        let isFailed = false;

                        if (isCompleted || isRejected) {
                             if (index < stopIndex) {
                                 isPassed = true;
                             } else if (index === stopIndex) {
                                  if (isRejected) isFailed = true;
                                  else isPassed = true; 
                             }
                        } else {
                             if (index < request.currentStageIndex) isPassed = true;
                             else if (index === request.currentStageIndex) isCurrent = true;
                        }

                        let statusColor = 'bg-gray-700 border-gray-600 text-gray-400';
                        let icon = <span className="font-bold">{index + 1}</span>;

                        if (isFailed) {
                            statusColor = 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]';
                            icon = <i className="fas fa-times text-lg"></i>;
                        } else if (isPassed) {
                            statusColor = 'bg-green-600 border-green-400 text-white';
                            icon = <i className="fas fa-check text-lg"></i>;
                             if (isCompleted && index === stopIndex) {
                                 statusColor = 'bg-green-600 border-green-400 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]';
                                 icon = <i className="fas fa-check-double text-lg"></i>; 
                            }
                        } else if (isCurrent) {
                            statusColor = 'bg-blue-600 border-blue-400 text-white animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.5)]';
                        }

                        return (
                            <React.Fragment key={`${role}-${index}`}>
                                <div className="flex flex-col items-center z-10 text-center min-w-[80px]">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${statusColor}`}>
                                        {icon}
                                    </div>
                                    <p className={`text-xs mt-3 font-bold ${isCloser || isCurrent ? 'text-orange-400' : 'text-gray-400'}`}>{t(`stage_${role}`)}</p>
                                </div>
                                {index < stages.length - 1 && (
                                    <div className="flex-grow h-1 bg-gray-700 relative -mx-4 mt-7 min-w-[40px]">
                                        <div className={`absolute top-0 left-0 h-1 ${isPassed && index < stopIndex ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-transparent'}`} style={{ width: '100%', transition: 'width 0.8s ease-in-out' }}></div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                
                {/* Final Response Section */}
                {(isCompleted || isRejected) && closingComment && (
                    <div className="w-full mt-6 animate-fade-in">
                         <div className={`p-4 rounded-xl border-l-4 ${isRejected ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
                             <h4 className={`font-bold mb-2 ${isRejected ? 'text-red-400' : 'text-green-400'}`}>
                                 {t('finalResponse')} ({t(`role_${closingActorRole}`)})
                             </h4>
                             <p className="text-gray-300 text-sm leading-relaxed">"{closingComment}"</p>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const CircularsView: React.FC = () => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();

    const delegateCirculars = useMemo(() => {
        return (data.circulars || [])
            .filter(c => c.audience === 'all' || c.audience === 'delegates')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [data.circulars]);

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-4">{t('circulars')}</h2>
            {delegateCirculars.length > 0 ? (
                <div className="space-y-4">
                    {delegateCirculars.map(c => (
                        <div key={c.id} className="glass-card p-5 border-l-4 border-l-orange-500">
                            <div className="flex justify-between items-start mb-2">
                                 <p className="font-bold text-lg text-white">{c.title}</p>
                                 <i className="fas fa-thumbtack text-orange-500/50 -rotate-45"></i>
                            </div>
                            <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                            <div className="text-[10px] text-gray-500 mt-4 pt-3 border-t border-gray-700/50 flex justify-between">
                                <span className="flex items-center gap-1"><i className="fas fa-user-edit"></i> {c.authorName}</span>
                                <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 mt-16">
                    <i className="fas fa-bullhorn text-5xl mb-4 opacity-50"></i>
                    <p>{t('noCirculars')}</p>
                </div>
            )}
        </div>
    );
};


// --- Directives View ---

const DirectivesView: React.FC<{ delegate: Delegate, showNotification: Function }> = ({ delegate, showNotification }) => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const [selectedDirective, setSelectedDirective] = useState<Request | null>(null);
    const [responseModalOpen, setResponseModalOpen] = useState(false);
    const [comment, setComment] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const directives = useMemo(() => {
        return data.requests.filter(r => r.type === RequestType.DirectDirective && r.toDelegateId === delegate.id);
    }, [data.requests, delegate.id]);

    const handleOpenResponse = (directive: Request) => {
        setSelectedDirective(directive);
        setResponseModalOpen(true);
        setComment('');
        setFile(null);
    };
    
    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmitResponse = async () => {
        if (!comment.trim()) {
            showNotification(t('commentRequired'), 'error');
            return;
        }
        
        let imageUrl = undefined;
        if(file) {
            try {
                imageUrl = await fileToBase64(file);
            } catch(e) {
                console.error(e);
            }
        }

        setData(prev => {
             const updatedRequests = prev.requests.map(r => {
                 if (r.id === selectedDirective?.id) {
                     return {
                         ...r,
                         status: RequestStatus.Completed,
                         directiveResponse: {
                             type: 'Replied', // Unified action
                             comment: comment,
                             imageUrl: imageUrl
                         },
                         history: [...r.history, {
                             actor: 'Delegate',
                             actorName: delegate.name,
                             action: 'DirectiveReplied',
                             timestamp: new Date().toISOString(),
                             comment: comment
                         }]
                     }
                 }
                 return r;
             });
             return { ...prev, requests: updatedRequests };
        });

        setResponseModalOpen(false);
        setSelectedDirective(null);
        showNotification(t('responseSubmitted'), 'success');
    };

    return (
        <div className="animate-fade-in">
             {/* Response Modal */}
            {responseModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-6 space-y-4">
                        <h3 className="text-xl font-bold text-white">{t('respondToDirective')}</h3>
                        
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">{t('responseComment')}</label>
                            <textarea 
                                className="input-styled w-full" 
                                rows={4} 
                                value={comment} 
                                onChange={e => setComment(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div>
                             <label className="block text-sm text-gray-300 mb-1">{t('attach_supporting_document')} {t('optional')}</label>
                             <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="input-styled w-full" />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setResponseModalOpen(false)} className="btn-secondary">{t('cancel')}</button>
                            <button onClick={handleSubmitResponse} className="btn-primary">{t('confirmDirectiveResponse')}</button>
                        </div>
                    </div>
                </div>
            )}


            <h2 className="text-xl font-bold text-white mb-4">{t('tab_directives')}</h2>
            
            {directives.length === 0 ? (
                 <div className="text-center text-gray-400 mt-16">
                    <i className="fas fa-bullseye text-5xl mb-4"></i>
                    <p>{t('no_directives')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {directives.map(dir => {
                         const createdAt = new Date(dir.createdAt).getTime();
                         const now = Date.now();
                         const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
                         const isExpired = hoursDiff > 72 && dir.status === RequestStatus.PendingApproval;
                         const isCompleted = dir.status === RequestStatus.Completed;

                         return (
                            <div key={dir.id} className={`glass-card p-4 ${isExpired ? 'opacity-50 grayscale' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-orange-400">{dir.title}</h3>
                                    {isExpired && <span className="text-red-400 text-xs font-bold border border-red-500 px-1 rounded">{t('status_Expired')}</span>}
                                    {isCompleted && <span className="text-green-400 text-xs font-bold border border-green-500 px-1 rounded">{t('status_Completed')}</span>}
                                </div>
                                
                                <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">{dir.description}</p>
                                <p className="text-xs text-gray-500 mb-4">{t('from')}: {t(`role_${dir.fromRole}`)} | {new Date(dir.createdAt).toLocaleDateString()}</p>
                                
                                {dir.imageUrl && (
                                    <div className="mb-4">
                                         <a href={dir.imageUrl} download="directive_attachment" target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded inline-flex items-center gap-2">
                                            <i className="fas fa-paperclip"></i> {t('openAttachment')}
                                         </a>
                                    </div>
                                )}

                                {!isCompleted && !isExpired && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenResponse(dir)} className="flex-1 py-2 bg-green-600/80 text-white rounded hover:bg-green-500 transition text-sm font-bold">
                                            <i className="fas fa-check-circle ltr:mr-2 rtl:ml-2"></i> {t('acknowledgeAndReply')}
                                        </button>
                                    </div>
                                )}
                                {isCompleted && dir.directiveResponse && (
                                    <div className="mt-2 p-2 bg-gray-800/50 rounded text-sm">
                                        <span className="text-gray-400">{t('responseComment')}:</span> <span className="text-white">{dir.directiveResponse.comment}</span>
                                    </div>
                                )}
                            </div>
                         );
                    })}
                </div>
            )}
        </div>
    );
};


const BottomNav: React.FC<{ activeView: string; setActiveView: (view: 'dashboard' | 'requests' | 'directives' | 'circulars') => void; }> = ({ activeView, setActiveView }) => {
    const { t } = useTranslation();
    const navItems = [
        { id: 'dashboard', icon: 'fa-home', labelKey: 'dashboard' },
        { id: 'requests', icon: 'fa-file-alt', labelKey: 'my_requests' },
        { id: 'directives', icon: 'fa-bullseye', labelKey: 'tab_directives' }, 
        { id: 'circulars', icon: 'fa-bullhorn', labelKey: 'circulars' },
    ];
    return (
        <div className="flex-shrink-0 flex justify-around p-2 border-t border-gray-700 bg-gray-900/80 backdrop-blur-md pb-safe">
            {navItems.map(item => (
                <button key={item.id} onClick={() => setActiveView(item.id as 'dashboard' | 'requests' | 'directives' | 'circulars')}
                    className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 ${activeView === item.id ? 'text-orange-400 bg-orange-500/10 scale-105' : 'text-gray-400 hover:text-white'}`}>
                    <i className={`fas ${item.icon} text-xl mb-1 ${activeView === item.id ? 'animate-pulse' : ''}`}></i>
                    <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                </button>
            ))}
        </div>
    );
};

export default DelegateApp;