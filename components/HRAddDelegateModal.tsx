
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { DelegateType, type Delegate, type Staff, PerformanceStatus, AjirDelegateStatus, UserRole } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { getHours } from '../services/dataService';
import { AppContext } from '../contexts/AppContext';

interface HRAddDelegateModalProps {
    onSave: (newDelegate: Omit<Delegate, 'id'>) => void;
    onClose: () => void;
    staff: Staff[];
    delegateToEdit?: Delegate | null;
}

const FileInputWithPreview: React.FC<{
    id: string;
    label: string;
    onFileChange: (file: File | null) => void;
    initialUrl?: string;
}> = ({ id, label, onFileChange, initialUrl }) => {
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
            <label htmlFor={id} className="block mb-4 text-sm sm:text-base font-bold text-gray-200 uppercase tracking-wider cursor-pointer">{label}</label>
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
                    />
                </div>
                {preview ? (
                    <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-orange-500 shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                         <img src={preview} alt={t('preview')} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/10"></div>
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

const InputWithIcon: React.FC<{ icon: string; label: string; id: string; isReadOnly?: boolean; [key: string]: any }> = ({ icon, label, id, isReadOnly, className, ...props }) => (
    <div 
        className="mb-2 cursor-text" 
        onClick={() => !isReadOnly && document.getElementById(id)?.focus()}
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
                className={`input-styled w-full ltr:pl-12 rtl:pr-12 sm:ltr:pl-14 sm:rtl:pr-14 py-3 sm:py-4 text-base sm:text-lg group-focus-within:border-orange-500/50 group-focus-within:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all rounded-xl ${isReadOnly ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gray-900/50'} ${className}`} 
                readOnly={isReadOnly}
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
                {/* Progress Bar Background */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -z-10 rounded-full"></div>
                
                {/* Active Progress */}
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

const HRAddDelegateModal: React.FC<HRAddDelegateModalProps> = ({ onSave, onClose, staff, delegateToEdit }) => {
    const { t } = useTranslation();
    const { data } = useContext(AppContext);
    const [currentStep, setCurrentStep] = useState(1);
    
    const supervisors = useMemo(() => staff.filter(s => s.role === UserRole.OpsSupervisor), [staff]);
    const noSupervisorsExist = supervisors.length === 0;

    // Form State
    const [delegateType, setDelegateType] = useState<DelegateType>(DelegateType.Kafala);
    const [name, setName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [displayId, setDisplayId] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [operationalDepartment, setOperationalDepartment] = useState<string>('');
    const [supervisorId, setSupervisorId] = useState<string>('');
    const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
    const [iqamaExpiryDate, setIqamaExpiryDate] = useState('');
    const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
    
    const [status, setStatus] = useState<'Active' | 'Suspended' | 'Resigned'>('Active');
    const [suspensionDate, setSuspensionDate] = useState('');
    const [suspensionReturnDate, setSuspensionReturnDate] = useState('');
    const [resignationDate, setResignationDate] = useState('');

    const [carPlateNumber, setCarPlateNumber] = useState('');
    const [rentalCompany, setRentalCompany] = useState('');
    
    const [personalPhotoFile, setPersonalPhotoFile] = useState<File | null>(null);
    const [iqamaPhotoFile, setIqamaPhotoFile] = useState<File | null>(null);
    const [licensePhotoFile, setLicensePhotoFile] = useState<File | null>(null);
    
    // Existing URLs for edit mode
    const [existingPersonalPhotoUrl, setExistingPersonalPhotoUrl] = useState('');
    const [existingIqamaPhotoUrl, setExistingIqamaPhotoUrl] = useState('');
    const [existingLicensePhotoUrl, setExistingLicensePhotoUrl] = useState('');
    
    const [error, setError] = useState('');
    const [duplicateWarning, setDuplicateWarning] = useState('');

    // Populate for Edit Mode
    useEffect(() => {
        if (delegateToEdit) {
            setDelegateType(delegateToEdit.type);
            setName(delegateToEdit.name);
            setNationalId(delegateToEdit.nationalId || '');
            setDisplayId(delegateToEdit.displayId || '');
            setPhone(delegateToEdit.phone);
            setPassword(delegateToEdit.password);
            setOperationalDepartment('Logistics'); // Assuming default as data structure might not hold this separately yet
            setSupervisorId(delegateToEdit.supervisorId.toString());
            setJoinDate(delegateToEdit.joinDate || '');
            setIqamaExpiryDate(delegateToEdit.iqamaExpiryDate || '');
            setLicenseExpiryDate(delegateToEdit.licenseExpiryDate || '');
            setCarPlateNumber(delegateToEdit.carPlateNumber || '');
            setRentalCompany(delegateToEdit.rentalCompany || '');
            setExistingPersonalPhotoUrl(delegateToEdit.imageUrl || '');
            setExistingIqamaPhotoUrl(delegateToEdit.iqamaPhotoUrl || '');
            setExistingLicensePhotoUrl(delegateToEdit.licensePhotoUrl || '');

            if (delegateToEdit.employmentStatus === 'مستقيل') {
                setStatus('Resigned');
                setResignationDate(delegateToEdit.terminationDate || '');
            } else if (delegateToEdit.performanceStatus === PerformanceStatus.Suspended) {
                setStatus('Suspended');
                setSuspensionDate(delegateToEdit.suspensionDate || '');
                setSuspensionReturnDate(delegateToEdit.suspensionReturnDate || '');
            } else {
                setStatus('Active');
            }
        }
    }, [delegateToEdit]);

    useEffect(() => {
        if (displayId && displayId.length >= 4) {
            setPassword(displayId.slice(-4));
        } else {
            setPassword('');
        }
    }, [displayId]);

    // Duplicate Check (Skip checking against self if editing)
    useEffect(() => {
        const duplicate = data.delegates.find(d => 
            d.id !== delegateToEdit?.id && ( // Ensure we don't flag the delegate being edited
                (d.nationalId && d.nationalId === nationalId) || 
                (d.phone === phone) ||
                (d.displayId && d.displayId === displayId) ||
                (d.name === name)
            )
        );

        if (duplicate) {
            let reason = "";
            if (duplicate.nationalId === nationalId) reason = t('nationalId');
            else if (duplicate.phone === phone) reason = t('phoneNumber');
            else if (duplicate.displayId === displayId) reason = t('delegateID');
            else if (duplicate.name === name) reason = t('delegateName');
            
            setDuplicateWarning(`${t('duplicateWarningMessage')} ${reason} (${duplicate.name})`);
        } else {
            setDuplicateWarning('');
        }
    }, [nationalId, phone, displayId, name, data.delegates, t, delegateToEdit]);
    
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
            if (!name || !nationalId || !displayId || !phone) {
                setError(t('error_fillAllFields')); return false;
            }
            if (nationalId.length !== 10) { setError(t('error_nationalId_10_digits')); return false; }
            if (displayId.length !== 6) { setError(t('error_id_6_digits')); return false; }
            if (phone.length !== 10) { setError(t('error_phone_10_digits')); return false; }
            return true;
        }
        if (step === 2) {
            if (noSupervisorsExist) { setError(t('error_noSupervisors_title')); return false; }
            if (!supervisorId || !operationalDepartment || !joinDate) {
                setError(t('error_fillAllFields')); return false;
            }
            if (status === 'Suspended' && !suspensionDate) { setError(t('error_fillAllFields')); return false; }
            if (status === 'Resigned' && !resignationDate) { setError(t('error_fillAllFields')); return false; }
            return true;
        }
        if (step === 3) {
            // If editing, files are optional if URLs exist
            const hasPersonal = personalPhotoFile || existingPersonalPhotoUrl;
            const hasIqama = iqamaPhotoFile || existingIqamaPhotoUrl;
            const hasLicense = licensePhotoFile || existingLicensePhotoUrl;

            if (!hasPersonal || !hasIqama || !hasLicense || !iqamaExpiryDate || !licenseExpiryDate) {
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

        if (duplicateWarning) {
             if (!window.confirm(`${t('duplicateWarning')}: ${duplicateWarning}. ${t('areYouSureYouWantTo')} ${t('continue')}?`)) {
                 return;
             }
        }

        try {
            // Use new file if uploaded, otherwise keep existing URL
            const imageUrl = personalPhotoFile ? await fileToBase64(personalPhotoFile) : existingPersonalPhotoUrl;
            const iqamaPhotoUrl = iqamaPhotoFile ? await fileToBase64(iqamaPhotoFile) : existingIqamaPhotoUrl;
            const licensePhotoUrl = licensePhotoFile ? await fileToBase64(licensePhotoFile) : existingLicensePhotoUrl;
            
            const hours = getHours();

            let employmentStatus: 'نشط' | 'مستقيل' = 'نشط';
            let performanceStatus = PerformanceStatus.Average;
            
            if (status === 'Resigned') { employmentStatus = 'مستقيل'; } 
            else if (status === 'Suspended') { performanceStatus = PerformanceStatus.Suspended; }

            const commonData = {
                name, nationalId, displayId, phone, password, requiresPasswordChange: delegateToEdit ? delegateToEdit.requiresPasswordChange : true,
                supervisorId: parseInt(supervisorId), joinDate, iqamaExpiryDate, licenseExpiryDate,
                carPlateNumber, rentalCompany, type: delegateType, imageUrl, iqamaPhotoUrl, licensePhotoUrl,
                employmentStatus, latitude: 24.7136, longitude: 46.6753, ordersDelivered: delegateToEdit ? delegateToEdit.ordersDelivered : 0,
                activity: delegateToEdit ? delegateToEdit.activity : hours.map(h => ({ hour: h, status: null })),
                suspensionDate: status === 'Suspended' ? suspensionDate : undefined,
                suspensionReturnDate: status === 'Suspended' ? (suspensionReturnDate || undefined) : undefined,
                terminationDate: status === 'Resigned' ? resignationDate : undefined
            };

            let newDelegate: Omit<Delegate, 'id'>;
            if (delegateType === DelegateType.Kafala) {
                newDelegate = { ...commonData, type: DelegateType.Kafala, performanceStatus: performanceStatus, weekendAbsence: delegateToEdit?.weekendAbsence || { thursday: false, friday: false, saturday: false } };
            } else {
                newDelegate = { ...commonData, type: DelegateType.Ajir, ajirStatus: AjirDelegateStatus.Available };
            }
            onSave(newDelegate);

        } catch (err) { setError("Error processing files."); console.error(err); }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/95 flex justify-center items-center z-50 p-4 sm:p-4 backdrop-blur-xl" onClick={onClose}>
            <div className="glass-card w-full max-w-6xl max-h-[95vh] flex flex-col rounded-[1.5rem] sm:rounded-[2rem] border border-gray-700 shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/80 backdrop-blur-md z-20">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">{delegateToEdit ? t('editDelegate') : t('addDelegate')}</h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('appSubtitle')}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-700/50 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all flex items-center justify-center group">
                        <i className="fas fa-times text-lg sm:text-xl group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-900 to-gray-800/95 p-4 sm:p-8">
                    
                    {/* Progress Stepper */}
                    <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
                        <StepIndicator 
                            currentStep={currentStep} 
                            totalSteps={3} 
                            steps={['section_basicInfo', 'section_jobDetails', 'section_documents']} 
                        />
                    </div>

                    <form id="add-delegate-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
                        
                        {/* Alerts */}
                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-200 rounded-xl flex items-center gap-3 animate-shake">
                                <i className="fas fa-exclamation-circle text-xl"></i>
                                <span className="font-medium">{error}</span>
                            </div>
                        )}
                        {duplicateWarning && (
                             <div className="p-4 bg-yellow-600/20 border border-yellow-500/50 text-yellow-200 rounded-xl flex items-center gap-3 animate-pulse">
                                <i className="fas fa-exclamation-triangle text-xl"></i>
                                <span className="font-medium">{duplicateWarning}</span>
                            </div>
                        )}

                        {/* STEP 1: Basic Info */}
                        {currentStep === 1 && (
                            <div className="animate-fade-in space-y-6 sm:space-y-8">
                                {/* Delegate Type Selection - EXPANDED */}
                                <div className="flex flex-col sm:flex-row p-1.5 bg-gray-900 rounded-2xl border border-gray-700/50 w-full max-w-4xl mx-auto mb-4 sm:mb-8 gap-2 sm:gap-0">
                                    <button type="button" onClick={() => setDelegateType(DelegateType.Kafala)} className={`flex-1 py-4 sm:py-5 rounded-xl text-base sm:text-xl font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 ${delegateType === DelegateType.Kafala ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                                        <i className="fas fa-user-tie text-xl sm:text-2xl"></i> {t('kafalaDelegates')}
                                    </button>
                                    <button type="button" onClick={() => setDelegateType(DelegateType.Ajir)} className={`flex-1 py-4 sm:py-5 rounded-xl text-base sm:text-xl font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 ${delegateType === DelegateType.Ajir ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                                        <i className="fas fa-user-clock text-xl sm:text-2xl"></i> {t('ajirDelegates')}
                                    </button>
                                </div>

                                <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-700 pb-2 mb-4">{t('section_basicInfo')}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <InputWithIcon id="delegateName" icon="fa-user" label={t('delegateName')} type="text" value={name} onChange={(e: any) => setName(e.target.value)} placeholder={t('delegateName')} required />
                                    <InputWithIcon id="nationalId" icon="fa-id-card" label={t('nationalId')} type="text" value={nationalId} onChange={(e: any) => setNationalId(e.target.value)} placeholder="10xxxxxxxx" required pattern="\d{10}" />
                                    <InputWithIcon id="delegateId" icon="fa-fingerprint" label={t('delegateID')} type="text" value={displayId} onChange={(e: any) => setDisplayId(e.target.value)} placeholder="xxxxxx" required pattern="\d{6}" />
                                    <InputWithIcon id="phone" icon="fa-phone" label={t('phoneNumber')} type="tel" value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="05xxxxxxxx" required pattern="\d{10}" />
                                    <div className="md:col-span-2">
                                         <InputWithIcon id="password" icon="fa-lock" label={t('password')} type="text" value={password} isReadOnly={true} />
                                         <p className="text-xs text-gray-500 mt-2 ml-2"><i className="fas fa-info-circle"></i> {t('autoPasswordNotice')}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Job Details */}
                        {currentStep === 2 && (
                            <div className="animate-fade-in space-y-6 sm:space-y-8">
                                
                                {/* Assignment Group */}
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-700 pb-2 mb-4">{t('assignmentDetails')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        <div>
                                            <label className="block mb-2 sm:mb-3 text-sm sm:text-base font-bold text-gray-300 uppercase tracking-wider">{t('operationalDepartment')} <span className="text-orange-500">*</span></label>
                                            <div className="relative">
                                                <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-gray-500 z-10"><i className="fas fa-sitemap text-lg"></i></div>
                                                <select 
                                                    value={operationalDepartment} 
                                                    onChange={e => { setOperationalDepartment(e.target.value); setSupervisorId(''); }}
                                                    className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-base appearance-none rounded-xl"
                                                >
                                                    <option value="" disabled>{t('selectOperationalDepartment')}</option>
                                                    <option value="Logistics">{t('role_OpsSupervisor')}</option>
                                                </select>
                                                <i className="fas fa-chevron-down absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-gray-500 pointer-events-none"></i>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block mb-2 sm:mb-3 text-sm sm:text-base font-bold text-gray-300 uppercase tracking-wider">{t('assignSupervisor')} <span className="text-orange-500">*</span></label>
                                            <div className="relative">
                                                <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-gray-500 z-10"><i className="fas fa-user-check text-lg"></i></div>
                                                <select 
                                                    value={supervisorId} 
                                                    onChange={e => setSupervisorId(e.target.value)}
                                                    className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-base appearance-none rounded-xl disabled:opacity-50"
                                                    disabled={!operationalDepartment}
                                                >
                                                    <option value="" disabled>{t('selectSupervisor')}</option>
                                                    {supervisors.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                                                </select>
                                                <i className="fas fa-chevron-down absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-gray-500 pointer-events-none"></i>
                                            </div>
                                        </div>

                                        <InputWithIcon id="joinDate" icon="fa-calendar-alt" label={t('joinDate')} type="date" value={joinDate} onChange={(e: any) => setJoinDate(e.target.value)} required />
                                    </div>
                                </div>

                                {/* Vehicle Group */}
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-700 pb-2 mb-4">{t('vehicleDetails')}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                        <InputWithIcon id="carPlateNumber" icon="fa-car" label={t('carPlateNumber')} type="text" value={carPlateNumber} onChange={(e: any) => setCarPlateNumber(e.target.value)} placeholder="ABC 1234" />
                                        <InputWithIcon id="rentalCompany" icon="fa-building" label={t('rentalCompany')} type="text" value={rentalCompany} onChange={(e: any) => setRentalCompany(e.target.value)} placeholder={t('rentalCompany')} />
                                    </div>
                                </div>

                                {/* Status Group */}
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-700 pb-2 mb-4">{t('statusAndTenure')}</h3>
                                    <div className="bg-gray-800/40 p-4 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-orange-500/30 transition-colors">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                            <div>
                                                <label className="block mb-2 sm:mb-3 text-sm sm:text-base font-bold text-gray-300 uppercase tracking-wider">{t('currentStatus')}</label>
                                                <div className="relative">
                                                    <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-gray-500 z-10"><i className="fas fa-toggle-on text-lg"></i></div>
                                                    <select value={status} onChange={e => setStatus(e.target.value as any)} className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-base appearance-none rounded-xl">
                                                        <option value="Active">{t('status_Active')}</option>
                                                        <option value="Suspended">{t('status_Suspended')}</option>
                                                        <option value="Resigned">{t('status_Resigned')}</option>
                                                    </select>
                                                    <i className="fas fa-chevron-down absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-gray-500 pointer-events-none"></i>
                                                </div>
                                            </div>

                                            {status === 'Suspended' && (
                                                <div className="grid grid-cols-1 gap-4 animate-fade-in">
                                                    <InputWithIcon id="suspensionDate" icon="fa-calendar-minus" label={t('suspensionDate')} type="date" value={suspensionDate} onChange={(e: any) => setSuspensionDate(e.target.value)} required className="bg-red-900/20 border-red-500/50" />
                                                    <InputWithIcon id="suspensionReturnDate" icon="fa-calendar-plus" label={t('returnDate')} type="date" value={suspensionReturnDate} onChange={(e: any) => setSuspensionReturnDate(e.target.value)} className="bg-red-900/20 border-red-500/50" />
                                                </div>
                                            )}
                                            {status === 'Resigned' && (
                                                 <div className="animate-fade-in">
                                                     <InputWithIcon id="resignationDate" icon="fa-calendar-xmark" label={t('resignationDate')} type="date" value={resignationDate} onChange={(e: any) => setResignationDate(e.target.value)} required className="bg-gray-700/50" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Documents */}
                        {currentStep === 3 && (
                            <div className="animate-fade-in space-y-6 sm:space-y-8">
                                <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-700 pb-2 mb-4">{t('section_officialDocs')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                     <InputWithIcon id="iqamaExpiryDate" icon="fa-calendar-xmark" label={t('iqamaExpiryDate')} type="date" value={iqamaExpiryDate} onChange={(e: any) => setIqamaExpiryDate(e.target.value)} required className="bg-gray-900/50" />
                                     <InputWithIcon id="licenseExpiryDate" icon="fa-calendar-xmark" label={t('licenseExpiryDate')} type="date" value={licenseExpiryDate} onChange={(e: any) => setLicenseExpiryDate(e.target.value)} required className="bg-gray-900/50" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                                     <FileInputWithPreview id="personalPhoto" label={t('personalPhoto')} onFileChange={setPersonalPhotoFile} initialUrl={existingPersonalPhotoUrl} />
                                     <FileInputWithPreview id="iqamaPhoto" label={t('iqamaPhoto')} onFileChange={setIqamaPhotoFile} initialUrl={existingIqamaPhotoUrl} />
                                     <FileInputWithPreview id="licensePhoto" label={t('licensePhoto')} onFileChange={setLicensePhotoFile} initialUrl={existingLicensePhotoUrl} />
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer / Navigation */}
                <div className="p-4 sm:p-6 border-t border-gray-700 bg-gray-800/90 backdrop-blur-md z-20 flex justify-between items-center">
                    <button 
                        type="button" 
                        onClick={currentStep === 1 ? onClose : handleBack} 
                        className="px-4 sm:px-6 py-2 sm:py-3 rounded-xl border-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all font-bold text-xs sm:text-sm"
                    >
                        {currentStep === 1 ? t('cancel') : t('back')}
                    </button>
                    
                    {currentStep < 3 ? (
                        <button 
                            type="button" 
                            onClick={handleNext} 
                            className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition-all font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2"
                        >
                            {t('next')} <i className="fas fa-arrow-right rtl:rotate-180"></i>
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            onClick={handleSubmit} 
                            className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 transition-all font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2"
                        >
                            <i className="fas fa-check"></i> {t('save')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HRAddDelegateModal;
