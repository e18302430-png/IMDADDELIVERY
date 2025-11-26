
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Staff, UserRole } from '../types';

interface AddUserModalProps {
    onClose: () => void;
    onSave: (user: Omit<Staff, 'id'>) => void;
    currentUser: Staff;
    userToEdit?: Staff | null;
}

const FileInputWithPreview: React.FC<{
    id: string;
    label: string;
    onFileChange: (file: File | null) => void;
    isRequired: boolean;
    initialUrl?: string;
}> = ({ id, label, onFileChange, isRequired, initialUrl }) => {
    const [preview, setPreview] = useState<string | null>(initialUrl || null);
    const [fileName, setFileName] = useState<string>('');
    const { t } = useTranslation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileChange(file);
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setFileName('');
            setPreview(null);
        }
    };

    return (
         <div className="group relative bg-gray-800/30 p-4 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 h-full flex flex-col">
            <label htmlFor={id} className="block mb-4 text-sm sm:text-base font-bold text-gray-200 uppercase tracking-wider cursor-pointer">{label} {isRequired && <span className="text-orange-500">*</span>}</label>
            <div className="flex items-center gap-4 sm:gap-6 mt-auto">
                <div className="flex-grow">
                    <label htmlFor={id} className="w-full cursor-pointer bg-gray-700/30 hover:bg-gray-600/30 text-gray-300 text-sm sm:text-base font-medium py-4 sm:py-5 px-4 sm:px-6 rounded-xl inline-flex items-center justify-center transition-all duration-300 border-2 border-dashed border-gray-600 hover:border-orange-400 group-hover:bg-gray-700/50">
                        <i className="fas fa-cloud-upload-alt ltr:mr-3 rtl:ml-3 text-orange-500 text-lg sm:text-xl group-hover:scale-110 transition-transform"></i>
                        <span className="truncate max-w-[120px] sm:max-w-[180px]">{fileName || t('uploadFile')}</span>
                    </label>
                    <input
                        type="file"
                        id={id}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        required={isRequired}
                    />
                </div>
                {preview ? (
                    <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-orange-500 shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                        <img src={preview} alt={t('preview')} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-gray-800 flex items-center justify-center text-gray-600 border-2 border-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0">
                        <i className="fas fa-image text-2xl sm:text-3xl"></i>
                    </div>
                )}
            </div>
        </div>
    );
};

const InputWithIcon: React.FC<{ icon: string; label: string; id: string; [key: string]: any }> = ({ icon, label, id, className, ...props }) => (
    <div 
        className="mb-2 cursor-text" 
        onClick={() => document.getElementById(id)?.focus()}
    >
        <label htmlFor={id} className="block mb-2 sm:mb-3 text-sm sm:text-base font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 cursor-pointer pointer-events-none">
            {label} 
            {props.required && <span className="text-orange-500 text-lg sm:text-xl leading-none">*</span>}
        </label>
        <div className="relative group">
            <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 sm:ltr:left-5 sm:rtl:right-5 text-gray-500 group-focus-within:text-orange-500 transition-colors z-10 text-lg sm:text-xl pointer-events-none">
                <i className={`fas ${icon}`}></i>
            </div>
            <input 
                id={id}
                className={`input-styled w-full ltr:pl-12 rtl:pr-12 sm:ltr:pl-14 sm:rtl:pr-14 py-3 sm:py-4 text-base sm:text-lg group-focus-within:border-orange-500/50 group-focus-within:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all rounded-xl bg-gray-900/50 ${className}`} 
                {...props} 
            />
        </div>
    </div>
);

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number; steps: string[] }> = ({ currentStep, totalSteps, steps }) => {
    const { t } = useTranslation();
    return (
        <div className="w-full mb-4 sm:mb-8">
            <div className="flex justify-between items-center relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 ltr:left-0 rtl:right-0 h-1 bg-orange-500 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                ></div>
                {steps.map((stepName, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum === currentStep;
                    const isCompleted = stepNum < currentStep;
                    return (
                        <div key={stepNum} className="flex flex-col items-center gap-2">
                            <div 
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg transition-all duration-300 border-4 
                                ${isActive ? 'bg-gray-900 border-orange-500 text-orange-500 scale-110 shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 
                                  isCompleted ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
                            >
                                {isCompleted ? <i className="fas fa-check"></i> : stepNum}
                            </div>
                            <span className={`text-[10px] sm:text-sm font-bold hidden sm:block ${isActive ? 'text-orange-400' : isCompleted ? 'text-white' : 'text-gray-500'}`}>
                                {t(stepName)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSave, currentUser, userToEdit }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');

    // Form Data
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [idExpiryDate, setIdExpiryDate] = useState('');
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
    const [role, setRole] = useState<UserRole>(UserRole.OpsSupervisor);
    const [personalPhotoFile, setPersonalPhotoFile] = useState<File | null>(null);
    const [iqamaPhotoFile, setIqamaPhotoFile] = useState<File | null>(null);
    const [licensePhotoFile, setLicensePhotoFile] = useState<File | null>(null);
    
    // Existing URLs for edit mode
    const [existingPersonalPhotoUrl, setExistingPersonalPhotoUrl] = useState('');
    const [existingIqamaPhotoUrl, setExistingIqamaPhotoUrl] = useState('');
    const [existingLicensePhotoUrl, setExistingLicensePhotoUrl] = useState('');

    const availableRoles = useMemo(() => {
        const allRoles = Object.values(UserRole);
        if ([UserRole.GeneralManager, UserRole.MovementManager].includes(currentUser.role)) {
            return allRoles;
        }
        if (currentUser.role === UserRole.HR) {
            return allRoles.filter(r => ![UserRole.GeneralManager, UserRole.MovementManager, UserRole.HR].includes(r));
        }
        return [];
    }, [currentUser]);
    
     useEffect(() => {
        if (availableRoles.length > 0 && !availableRoles.includes(role) && !userToEdit) {
            setRole(availableRoles[0]);
        }
    }, [availableRoles, role, userToEdit]);

    // Pre-fill for Edit Mode
    useEffect(() => {
        if (userToEdit) {
            setName(userToEdit.name);
            setPhone(userToEdit.phone);
            setNationalId(userToEdit.nationalId);
            setIdExpiryDate(userToEdit.idExpiryDate);
            setJoinDate(userToEdit.joinDate || '');
            setRole(userToEdit.role);
            setExistingPersonalPhotoUrl(userToEdit.imageUrl || '');
            setExistingIqamaPhotoUrl(userToEdit.iqamaPhotoUrl || '');
            setExistingLicensePhotoUrl(userToEdit.licensePhotoUrl || '');
        }
    }, [userToEdit]);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const validateStep = (step: number) => {
        setError('');
        if (step === 1) {
            if (!name || !phone || !nationalId) {
                setError(t('error_fillAllFields')); return false;
            }
            if (phone.length !== 10) { setError(t('error_phone_10_digits')); return false; }
            if (nationalId.length !== 10) { setError(t('error_nationalId_10_digits')); return false; }
            return true;
        }
        if (step === 2) {
            if (!role || !idExpiryDate || !joinDate) {
                setError(t('error_fillAllFields')); return false;
            }
            return true;
        }
        if (step === 3) {
            // Files are optional if editing and already exist
            const hasPersonal = personalPhotoFile || existingPersonalPhotoUrl;
            const hasIqama = iqamaPhotoFile || existingIqamaPhotoUrl;

            if (!hasPersonal || !hasIqama) {
                setError(t('error_upload_all_docs')); return false;
            }
            return true;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        try {
            const imageUrl = personalPhotoFile ? await fileToBase64(personalPhotoFile) : existingPersonalPhotoUrl;
            const iqamaPhotoUrl = iqamaPhotoFile ? await fileToBase64(iqamaPhotoFile) : existingIqamaPhotoUrl;
            const licensePhotoUrl = licensePhotoFile ? await fileToBase64(licensePhotoFile) : existingLicensePhotoUrl;
            
            // If editing, keep existing password/settings unless logic changes
            const initialPassword = userToEdit ? userToEdit.password : nationalId;
            const requiresChange = userToEdit ? userToEdit.requiresPasswordChange : true;

            onSave({
                name, phone, password: initialPassword, requiresPasswordChange: requiresChange, nationalId,
                idExpiryDate, joinDate, role, imageUrl, iqamaPhotoUrl, licensePhotoUrl
            });
        } catch (err) {
            setError("Error processing files.");
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/95 flex justify-center items-center z-50 p-2 sm:p-4 backdrop-blur-lg" onClick={onClose}>
            <div className="glass-card w-full max-w-6xl max-h-[95vh] flex flex-col rounded-[2rem] border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/80 backdrop-blur-md z-20">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{userToEdit ? t('editUser') : t('addUser')}</h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('appSubtitle')}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700/50 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all flex items-center justify-center group">
                        <i className="fas fa-times text-lg sm:text-xl group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-900 to-gray-800/95 p-4 sm:p-8">
                    <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
                        <StepIndicator 
                            currentStep={currentStep} 
                            totalSteps={3} 
                            steps={['section_personalInfo', 'section_jobAndLogin', 'section_documents']} 
                        />
                    </div>

                    <form id="add-staff-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-xl flex items-center gap-3 animate-shake">
                                <i className="fas fa-exclamation-circle text-xl"></i>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        {/* STEP 1: Personal Info */}
                        {currentStep === 1 && (
                            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                <div className="md:col-span-1">
                                    <InputWithIcon id="userName" icon="fa-user" type="text" value={name} onChange={(e: any) => setName(e.target.value)} required placeholder={t('userName')} label={t('userName')} />
                                </div>
                                <div className="md:col-span-1">
                                    <InputWithIcon id="nationalId" icon="fa-id-card" type="text" value={nationalId} onChange={(e: any) => setNationalId(e.target.value)} required pattern="\d{10}" placeholder="10xxxxxxxx" label={t('nationalId')} />
                                </div>
                                <div className="md:col-span-1">
                                    <InputWithIcon id="phoneNumber" icon="fa-phone" type="tel" value={phone} onChange={(e: any) => setPhone(e.target.value)} required pattern="\d{10}" placeholder="05xxxxxxxx" label={t('phoneNumber')} />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Job & Login */}
                        {currentStep === 2 && (
                            <div className="animate-fade-in space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                    <div>
                                        <label className="block mb-2 sm:mb-3 text-sm sm:text-base font-bold text-gray-300 uppercase tracking-wider">{t('userRole')} <span className="text-orange-500">*</span></label>
                                        <div className="relative">
                                            <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-gray-500 z-10"><i className="fas fa-user-tag text-lg"></i></div>
                                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-base appearance-none rounded-xl" required>
                                                {availableRoles.map(r => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
                                            </select>
                                            <i className="fas fa-chevron-down absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-gray-500 pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <InputWithIcon id="idExpiryDate" icon="fa-calendar-times" type="date" value={idExpiryDate} onChange={(e: any) => setIdExpiryDate(e.target.value)} required label={t('idExpiryDate')} />
                                    <InputWithIcon id="joinDate" icon="fa-calendar-check" type="date" value={joinDate} onChange={(e: any) => setJoinDate(e.target.value)} required label={t('joinDate')} />
                                </div>
                                {!userToEdit && (
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                                        <i className="fas fa-shield-alt text-blue-400 mt-1 text-2xl"></i>
                                        <div>
                                            <p className="text-sm sm:text-base text-blue-200 font-bold">{t('autoPasswordStaffNotice')}</p>
                                            <p className="text-xs sm:text-sm text-blue-300/70 mt-1">System generated: National ID.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* STEP 3: Documents */}
                        {currentStep === 3 && (
                            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                 <FileInputWithPreview id="personalPhoto" label={t('personalPhoto')} onFileChange={setPersonalPhotoFile} isRequired={!userToEdit} initialUrl={existingPersonalPhotoUrl} />
                                 <FileInputWithPreview id="iqamaPhoto" label={t('iqamaPhoto')} onFileChange={setIqamaPhotoFile} isRequired={!userToEdit} initialUrl={existingIqamaPhotoUrl} />
                                 <FileInputWithPreview id="licensePhoto" label={t('licensePhoto')} onFileChange={setLicensePhotoFile} isRequired={false} initialUrl={existingLicensePhotoUrl} />
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-4 sm:p-6 border-t border-gray-700 bg-gray-800/90 backdrop-blur-md z-20 flex justify-between items-center">
                    <button type="button" onClick={currentStep === 1 ? onClose : handleBack} className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all font-bold text-xs sm:text-sm">{currentStep === 1 ? t('cancel') : t('back')}</button>
                    {currentStep < 3 ? (
                        <button type="button" onClick={handleNext} className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition-all font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2">{t('next')} <i className="fas fa-arrow-right rtl:rotate-180"></i></button>
                    ) : (
                        <button type="button" onClick={handleSubmit} className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 transition-all font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2"><i className="fas fa-check"></i> {t('save')}</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
