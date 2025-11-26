


import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Request, RequestStatus, RequestType, UserRole, RequestHistoryEvent, Staff, DelegateRequestTopic } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { generateRequestNumber } from '../services/dataService';

const FileInputWithPreview: React.FC<{
    id: string;
    label: string;
    onFileChange: (file: File | null) => void;
}> = ({ id, label, onFileChange }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const { t } = useTranslation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onFileChange(file);
        if (file) {
            setFileName(file.name);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setPreview(null);
            }
        } else {
            setFileName('');
            setPreview(null);
        }
    };

    return (
        <div className="bg-gray-800/40 p-4 sm:p-6 rounded-2xl border border-gray-700/50 hover:border-orange-500/50 transition-colors group h-full">
            <label htmlFor={id} className="block mb-4 text-sm font-bold text-gray-300 uppercase tracking-wider cursor-pointer">{label}</label>
            <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex-grow">
                    <label htmlFor={id} className="w-full cursor-pointer bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-sm sm:text-base font-medium py-3 sm:py-4 px-4 sm:px-6 rounded-xl inline-flex items-center justify-center transition-all duration-300 border-2 border-dashed border-gray-600 hover:border-orange-400 group-hover:bg-gray-700/80">
                        <i className="fas fa-cloud-upload-alt ltr:mr-3 rtl:ml-3 text-orange-500 text-lg sm:text-xl group-hover:scale-110 transition-transform"></i>
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">{fileName || t('uploadFile')}</span>
                    </label>
                    <input
                        type="file"
                        id={id}
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden" 
                    />
                </div>
                {preview ? (
                     <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-orange-500 shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                        <img src={preview} alt={t('preview')} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-800 flex items-center justify-center text-gray-600 border-2 border-gray-700 group-hover:text-gray-400 transition-colors flex-shrink-0">
                        <i className="fas fa-file-alt text-xl sm:text-2xl"></i>
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
        <label htmlFor={id} className="block mb-2 sm:mb-3 text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 cursor-pointer pointer-events-none">
            {label} {props.required && <span className="text-orange-500 text-lg">*</span>}
        </label>
        <div className="relative group">
            <div className="absolute top-3 ltr:left-4 rtl:right-4 text-gray-500 group-focus-within:text-orange-500 transition-colors z-10 text-lg pointer-events-none">
                <i className={`fas ${icon}`}></i>
            </div>
            <props.component 
                id={id}
                className={`input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-sm sm:text-base group-focus-within:border-orange-500/50 group-focus-within:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all rounded-xl bg-gray-900/50 ${className}`} 
                {...props} 
            />
        </div>
    </div>
);

const CreateInternalRequestModal: React.FC<{
    onClose: () => void;
    onSave: (requestData: Omit<Request, 'id'>) => void;
    currentUser: Staff;
    existingRequests: Request[];
    delegates: any[]; 
}> = ({ onClose, onSave, currentUser, existingRequests, delegates }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    const [targetType, setTargetType] = useState<'Department' | 'Delegate'>('Department');
    const [targetRole, setTargetRole] = useState<UserRole | ''>('');
    const [targetDelegateId, setTargetDelegateId] = useState<string>('');

    const [attachment, setAttachment] = useState<File | null>(null);

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim() || !description.trim()) {
             alert(t('error_fillAllFields'));
            return;
        }
        if (targetType === 'Department' && !targetRole) {
            alert(t('error_fillAllFields'));
            return;
        }
        if (targetType === 'Delegate' && !targetDelegateId) {
             alert(t('error_fillAllFields'));
            return;
        }
        
        let imageUrl = undefined;
        if (attachment) {
            try {
                imageUrl = await fileToBase64(attachment);
            } catch(err) {
                console.error("File error", err);
            }
        }

        const now = new Date().toISOString();
        const isDirective = targetType === 'Delegate';
        const type = isDirective ? RequestType.DirectDirective : RequestType.Internal;
        
        const newRequest: Omit<Request, 'id'> = {
            requestNumber: generateRequestNumber(type, existingRequests),
            title,
            description,
            type,
            status: RequestStatus.PendingApproval,
            fromRole: currentUser.role,
            createdAt: now,
            lastActionTimestamp: now,
            history: [{
                actor: currentUser.role,
                actorName: currentUser.name,
                action: 'Created',
                timestamp: now
            }],
            workflow: isDirective ? [] : [targetRole as UserRole],
            toDelegateId: isDirective ? parseInt(targetDelegateId) : undefined,
            currentStageIndex: 0,
            imageUrl
        };
        onSave(newRequest);
    };

    const availableDepartments = useMemo(() => {
        return Object.values(UserRole).filter(role => role !== currentUser.role);
    }, [currentUser.role]);

    return (
        <div className="fixed inset-0 bg-gray-900/95 flex justify-center items-center z-50 p-2 sm:p-4 backdrop-blur-md" onClick={onClose}>
            <div className="glass-card w-full max-w-3xl max-h-[95vh] flex flex-col rounded-[1.5rem] sm:rounded-[2rem] border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 sm:p-8 border-b border-gray-700 flex justify-between items-center bg-gray-800/90 backdrop-blur-xl">
                    <div className="flex items-center gap-3 sm:gap-5">
                        <div className="bg-orange-500/20 p-3 sm:p-4 rounded-2xl border border-orange-500/20">
                            <i className="fas fa-paper-plane text-orange-400 text-xl sm:text-2xl"></i>
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-wide">{t('createNewRequest')}</h2>
                            <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('appSubtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-700/50 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all flex items-center justify-center group">
                        <i className="fas fa-times text-lg sm:text-xl group-hover:rotate-90 transition-transform"></i>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-900 to-gray-800/95">
                    <form id="create-internal-request" onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 sm:space-y-10">
                        
                        {/* 72 Hour Warning */}
                        <div className="w-full bg-red-900/20 border border-red-500/50 p-4 sm:p-5 rounded-2xl flex flex-col gap-2 sm:gap-3 shadow-lg shadow-red-900/10">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500/20 p-2 rounded-lg">
                                    <i className="fas fa-clock text-red-400 text-lg sm:text-xl"></i>
                                </div>
                                <h4 className="text-base sm:text-lg font-bold text-red-100">{t('warning_72h_close')}</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed pl-1">
                                {t('warning_72h_detail')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <button 
                                type="button" 
                                onClick={() => setTargetType('Department')}
                                className={`p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center group hover:shadow-lg ${targetType === 'Department' ? 'bg-orange-500/20 border-orange-500 text-white shadow-orange-500/10' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-500'}`}
                            >
                                <i className={`fas fa-building text-2xl sm:text-3xl ${targetType === 'Department' ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`}></i>
                                <span className="text-sm sm:text-base font-bold tracking-wide">{t('internalRequests')}</span>
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setTargetType('Delegate')}
                                className={`p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center group hover:shadow-lg ${targetType === 'Delegate' ? 'bg-orange-500/20 border-orange-500 text-white shadow-orange-500/10' : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-500'}`}
                            >
                                <i className={`fas fa-bullseye text-2xl sm:text-3xl ${targetType === 'Delegate' ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`}></i>
                                <span className="text-sm sm:text-base font-bold tracking-wide">{t('createDirectDirective')}</span>
                            </button>
                        </div>

                        <div className="space-y-6 sm:space-y-8 bg-gray-800/20 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-700/30 shadow-lg">
                            {targetType === 'Department' ? (
                                <div>
                                    <label htmlFor="targetRole" className="block mb-2 sm:mb-3 text-sm font-bold text-gray-300 uppercase tracking-wider">{t('selectTargetDepartment')} <span className="text-orange-500">*</span></label>
                                    <div className="relative group">
                                        <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-gray-500 z-10 text-lg"><i className="fas fa-sitemap"></i></div>
                                        <select
                                            id="targetRole"
                                            value={targetRole}
                                            onChange={e => setTargetRole(e.target.value as UserRole)}
                                            className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-sm sm:text-base appearance-none bg-gray-900/50 rounded-xl"
                                            required
                                        >
                                            <option value="" disabled>{t('selectDepartment')}</option>
                                            {availableDepartments.map(role => (
                                                <option key={role} value={role}>{t(`role_${role}`)}</option>
                                            ))}
                                        </select>
                                        <div className="absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-gray-500 pointer-events-none"><i className="fas fa-chevron-down text-sm"></i></div>
                                    </div>
                                </div>
                            ) : (
                                 <div>
                                    <label htmlFor="targetDelegate" className="block mb-2 sm:mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider">{t('selectTargetDelegate')} <span className="text-orange-500">*</span></label>
                                    <div className="relative group">
                                        <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-gray-500 z-10 text-lg"><i className="fas fa-user-tag"></i></div>
                                        <select
                                            id="targetDelegate"
                                            value={targetDelegateId}
                                            onChange={e => setTargetDelegateId(e.target.value)}
                                            className="input-styled w-full ltr:pl-12 rtl:pr-12 py-3 sm:py-4 text-sm sm:text-base appearance-none bg-gray-900/50 rounded-xl"
                                            required
                                        >
                                            <option value="" disabled>{t('selectDelegate')}</option>
                                            {delegates.filter(d => d.employmentStatus === 'نشط').map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-gray-500 pointer-events-none"><i className="fas fa-chevron-down text-sm"></i></div>
                                    </div>
                                </div>
                            )}

                            <InputWithIcon id="reqTitle" component="input" icon="fa-heading" type="text" value={title} onChange={(e: any) => setTitle(e.target.value)} label={t('requestTitle')} placeholder={targetType === 'Department' ? t('internalRequestTitlePlaceholder') : t('directiveTitlePlaceholder')} required />
                            
                            <InputWithIcon id="reqDesc" component="textarea" icon="fa-align-left" value={description} onChange={(e: any) => setDescription(e.target.value)} rows={5} label={t('requestDescription')} className="py-3 sm:py-4" required />
                            
                            <div>
                                <FileInputWithPreview 
                                    id="internal-doc" 
                                    label={t('attach_supporting_document')} 
                                    onFileChange={setAttachment} 
                                />
                            </div>
                        </div>
                    </form>
                </div>
                 <div className="p-5 sm:p-8 border-t border-gray-700 bg-gray-800/90 backdrop-blur-xl rounded-b-[1.5rem] sm:rounded-b-[2rem] flex-shrink-0 z-10">
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 sm:gap-6">
                        <button type="button" onClick={onClose} className="px-8 py-4 rounded-xl border-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all font-bold text-sm sm:text-base shadow-lg w-full sm:w-auto">{t('cancel')}</button>
                        <button type="submit" form="create-internal-request" className="px-10 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-sm sm:text-base hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform hover:-translate-y-1 w-full sm:w-auto">
                            <i className="fas fa-paper-plane ltr:mr-2 rtl:ml-2"></i> {targetType === 'Department' ? t('submit_request') : t('submitDirective')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const MainTabButton: React.FC<{ name: string; icon: string; isActive: boolean; onClick: () => void; }> = ({ name, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-3 py-3 px-4 rounded-md transition-colors whitespace-nowrap ${
            isActive ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
        }`}
    >
        <i className={`fas ${icon}`}></i>
        <span className="font-semibold text-xs sm:text-sm">{name}</span>
    </button>
);


const SubTabButton: React.FC<{ name: string; isActive: boolean; onClick: () => void; }> = ({ name, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`${isActive ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'} whitespace-nowrap py-3 px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors focus:outline-none flex-1 sm:flex-none text-center`}
    >
        {name}
    </button>
);

const RequestProgressMap: React.FC<{ request: Request; }> = ({ request }) => {
    const { t } = useTranslation();
    const stages = request.workflow;
    
    const isCompleted = request.status === 'Completed' || request.status === 'Approved';
    const isRejected = request.status === 'Rejected';
    
    const lastSignificantEvent = [...request.history].reverse().find(h => 
        ['Approved', 'Rejected', 'ResolvedAndClosed', 'ResolvedAndDirected', 'DirectiveViewed', 'DirectiveReplied'].includes(h.action)
    );
    
    if (request.type === RequestType.DirectDirective) {
         return (
            <div className="flex items-center justify-center p-4 bg-gray-900/50 rounded-lg">
                 <div className="flex items-center gap-4">
                    <div className="bg-gray-700 px-3 py-1 rounded text-white text-sm">{t(`role_${request.fromRole}`)}</div>
                    <i className="fas fa-arrow-right text-gray-500"></i>
                    <div className={`px-3 py-1 rounded text-sm ${isCompleted ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
                        {t('delegate')}
                        {isCompleted && <i className="fas fa-check ltr:ml-2 rtl:mr-2"></i>}
                    </div>
                 </div>
            </div>
         )
    }
    
    const closingActorRole = lastSignificantEvent?.actor as UserRole | undefined;
    
    // Logic: If the request is closed/rejected, we stop highlighting the map at the closing actor.
    // If it is pending, we highlight up to current stage.
    
    let stopIndex = stages.length - 1;
    if (isCompleted || isRejected) {
        // Find index of closing actor
        if (closingActorRole) {
             const idx = stages.indexOf(closingActorRole);
             if (idx !== -1) stopIndex = idx;
        }
    }

    return (
        <div className="flex items-start justify-between p-4 bg-gray-900/50 rounded-lg overflow-x-auto">
            {stages.map((role, index) => {
                const isCloser = closingActorRole === role;
                
                // Node status determination
                let isPassed = false;
                let isCurrent = false;
                let isFailed = false;

                if (isCompleted || isRejected) {
                    // If completed/rejected, only highlight nodes up to the closing actor
                    if (index < stopIndex) {
                        isPassed = true;
                    } else if (index === stopIndex) {
                         if (isRejected) isFailed = true;
                         else isPassed = true; // Completed at this node
                    }
                } else {
                    // Normal progress
                    if (index < request.currentStageIndex) isPassed = true;
                    else if (index === request.currentStageIndex) isCurrent = true;
                }

                let statusColor = 'bg-gray-600 border-gray-400 text-gray-300';
                let icon = <span className="font-bold">{index + 1}</span>;

                if (isFailed) {
                    statusColor = 'bg-red-500 border-red-300 text-white';
                    icon = <i className="fas fa-times text-xl"></i>;
                } else if (isPassed) {
                    statusColor = 'bg-green-500 border-green-300 text-white';
                    icon = <i className="fas fa-check text-xl"></i>;
                    if (isCompleted && index === stopIndex) {
                         icon = <i className="fas fa-check-double text-xl"></i>; // Double check for closer
                    }
                } else if (isCurrent) {
                    statusColor = 'bg-blue-500 border-blue-300 text-white animate-pulse';
                }

                return (
                    <React.Fragment key={`${role}-${index}`}>
                        <div className="flex flex-col items-center z-10 text-center min-w-[80px]">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${statusColor}`}>
                                {icon}
                            </div>
                            <p className={`text-xs mt-2 font-semibold ${isCurrent || isCloser ? 'text-orange-400' : 'text-gray-400'}`}>{t(`stage_${role}`)}</p>
                        </div>
                        {index < stages.length - 1 && (
                            <div className="flex-grow h-1 bg-gray-600 relative -mx-2 mt-6 min-w-[50px]">
                                <div className={`absolute top-0 left-0 h-1 ${isPassed && index < stopIndex ? 'bg-green-400' : 'bg-transparent'}`} style={{ width: '100%', transition: 'width 0.5s ease-in-out' }}></div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const RequestHistory: React.FC<{ history: RequestHistoryEvent[], t: any }> = ({ history, t }) => {
    const getActionInfo = (action: RequestHistoryEvent['action'], directedTo?: UserRole) => {
        const iconMap: Record<RequestHistoryEvent['action'], string> = {
            'Created': 'fa-plus-circle text-blue-400',
            'Approved': 'fa-check-circle text-green-400',
            'Rejected': 'fa-times-circle text-red-400',
            'Commented': 'fa-comment-alt text-gray-400',
            'ResolvedAndClosed': 'fa-flag-checkered text-purple-400',
            'Cancelled': 'fa-ban text-yellow-400',
            'ResolvedAndDirected': 'fa-sitemap text-indigo-400',
            'DirectiveViewed': 'fa-eye text-blue-400',
            'DirectiveReplied': 'fa-reply text-green-400',
        };
        const text = action === 'ResolvedAndDirected' && directedTo 
            ? `${t('history_ResolvedAndDirected')} ${t(`role_${directedTo}`)}`
            : t(`history_${action}`);
        return {
            text,
            icon: iconMap[action] || 'fa-question-circle',
        };
    };

    return (
        <div className="space-y-4">
            {history.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0 bg-gray-700 rounded-full flex items-center justify-center">
                        <i className={`fas ${getActionInfo(event.action).icon}`}></i>
                    </div>
                    <div>
                        <p className="text-sm">
                            <span className="font-bold text-white">{event.actorName}</span>
                            <span className="text-gray-300 mx-1">{getActionInfo(event.action, event.directedTo).text}</span>
                        </p>
                        {event.comment && (
                            <p className="text-sm bg-gray-800/50 p-2 rounded-md mt-1 text-gray-300 border-l-2 border-orange-500/50">
                                "{event.comment}"
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


const RequestModal: React.FC<{ request: Request; onClose: () => void; onAction: Function; currentUser: Staff;}> = ({ request, onClose, onAction, currentUser }) => {
    const [actionComment, setActionComment] = useState('');
    const [isDirecting, setIsDirecting] = useState(false);
    const [directToRole, setDirectToRole] = useState<UserRole | ''>('');
    const [directiveComment, setDirectiveComment] = useState('');
    const { t } = useTranslation();
    const { data } = useContext(AppContext);
    
    const isCurrentUserTurn = request.status === 'PendingApproval' && request.workflow[request.currentStageIndex] === currentUser.role;
    const canResolveAndDirect = [UserRole.GeneralManager].includes(currentUser.role);


    const getSourceName = () => {
        if (request.fromDelegateId) {
            const delegate = data.delegates.find(d => d.id === request.fromDelegateId);
            return delegate ? delegate.name : `${t('delegate')} #${request.fromDelegateId}`;
        }
        return request.history[0]?.actorName || t(`role_${request.fromRole}`);
    };
    
    const getStatusInfo = (status: RequestStatus) => {
        const map: Record<RequestStatus, { text: string, color: string }> = {
            'PendingApproval': { text: t('status_PendingApproval'), color: 'bg-blue-500/20 text-blue-300' },
            'Approved': { text: t('status_Approved'), color: 'bg-green-500/20 text-green-300' },
            'Rejected': { text: t('status_Rejected'), color: 'bg-red-500/20 text-red-300' },
            'Completed': { text: t('status_Completed'), color: 'bg-purple-500/20 text-purple-300' },
            'Cancelled': { text: t('status_Cancelled'), color: 'bg-yellow-500/20 text-yellow-300' },
        };
        return map[status] || { text: status, color: 'bg-gray-500/20 text-gray-300' };
    };

    const handleActionSubmit = (actionType: 'approve' | 'reject' | 'resolveAndDirect') => {
        if (actionType === 'reject' && !actionComment.trim()) {
            alert(t('error_rejectionReasonRequired'));
            return;
        }
        if (actionType === 'resolveAndDirect' && (!directToRole || !directiveComment.trim())) {
             alert(t('error_fillAllFields'));
            return;
        }
        onAction(request.id, actionType, { comment: actionComment, directTo: directToRole, directiveComment });
        setActionComment('');
    };
    
    const roles: UserRole[] = Object.values(UserRole);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-orange-400">{request.title} <span className="text-gray-400 font-mono">({request.requestNumber})</span></h2>
                            <p className="text-sm text-gray-400">{t('from')}: {getSourceName()}</p>
                        </div>
                         <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusInfo(request.status).color}`}>{getStatusInfo(request.status).text}</span>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-300 mb-2">{t('request_progress_map')}:</h3>
                        <RequestProgressMap request={request} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                             {request.imageUrl && (
                                <div>
                                    <h3 className="font-semibold text-gray-300 mb-2">{t('attach_supporting_document')}:</h3>
                                    <div className="flex flex-col gap-2">
                                        {request.imageUrl.startsWith('data:image') && (
                                            <img src={request.imageUrl} alt="Attachment" className="rounded-lg max-h-48 object-cover border border-gray-600 w-full sm:w-auto" />
                                        )}
                                        <a href={request.imageUrl} download="attachment" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto py-2">
                                            <i className="fas fa-download"></i> {t('openAttachment')} / {t('download')}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {request.directiveResponse?.imageUrl && (
                                 <div>
                                    <h3 className="font-semibold text-gray-300 mb-2">{t('directiveResponse_Replied')} Attachment:</h3>
                                    <div className="flex flex-col gap-2">
                                         {request.directiveResponse.imageUrl.startsWith('data:image') && (
                                            <img src={request.directiveResponse.imageUrl} alt="Response Attachment" className="rounded-lg max-h-48 object-cover border border-gray-600 w-full sm:w-auto" />
                                         )}
                                         <a href={request.directiveResponse.imageUrl} download="response_attachment" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto py-2">
                                            <i className="fas fa-download"></i> {t('openAttachment')} / {t('download')}
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-900/30 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-300 mb-2">{t('requestDescription')}:</h3>
                                <p className="text-gray-300 whitespace-pre-wrap">{request.description}</p>
                            </div>
                        </div>
                        <div className="bg-gray-900/30 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-300 mb-4">{t('requestHistory')}:</h3>
                            <div className="max-h-96 overflow-y-auto ltr:pr-2 rtl:pl-2 custom-scrollbar">
                                <RequestHistory history={request.history} t={t}/>
                            </div>
                        </div>
                    </div>
                </div>
                 {isCurrentUserTurn && (
                    <div className="p-6 border-t border-gray-700 bg-gray-900/30">
                        <h3 className="text-lg font-semibold mb-3 text-white">{t('actions')}</h3>
                        {isDirecting ? (
                             <div className="space-y-3 animate-fade-in">
                                <h4 className="font-semibold text-orange-400">{t('resolveAndDirect')}</h4>
                                 <div>
                                    <label className="block mb-2 text-sm font-medium text-gray-300">{t('directToDepartment')}</label>
                                    <select value={directToRole} onChange={e => setDirectToRole(e.target.value as UserRole)} className="input-styled w-full">
                                        <option value="" disabled>{t('selectDepartment')}</option>
                                        {roles.filter(r => r !== currentUser.role).map(r => (
                                            <option key={r} value={r}>{t(`role_${r}`)}</option>
                                        ))}
                                    </select>
                                 </div>
                                 <div>
                                     <label className="block mb-2 text-sm font-medium text-gray-300">{t('directiveComment')}</label>
                                     <textarea value={directiveComment} onChange={e => setDirectiveComment(e.target.value)} className="input-styled w-full" rows={3} required />
                                 </div>
                                 <div className="flex justify-end gap-2">
                                     <button type="button" onClick={() => setIsDirecting(false)} className="btn-secondary py-2 px-4">{t('cancel')}</button>
                                     <button type="button" onClick={() => handleActionSubmit('resolveAndDirect')} className="btn-primary py-2 px-4">{t('confirmResolveAndDirect')}</button>
                                 </div>
                             </div>
                        ) : (
                            <div className="space-y-3">
                                <textarea
                                    value={actionComment}
                                    onChange={e => setActionComment(e.target.value)}
                                    className="input-styled w-full"
                                    rows={3}
                                    placeholder={t('addReasonPlaceholder')}
                                />
                                <div className="flex justify-end gap-2 flex-wrap">
                                    <button onClick={() => handleActionSubmit('reject')} className="btn-secondary bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30">{t('reject')}</button>
                                    <button onClick={() => onAction(request.id, 'resolveAndClose', { comment: actionComment })} className="btn-secondary bg-purple-500/20 border-purple-500 text-purple-300 hover:bg-purple-500/30">{t('resolveAndClose')}</button>
                                    {canResolveAndDirect && <button onClick={() => setIsDirecting(true)} className="btn-secondary bg-indigo-500/20 border-indigo-500 text-indigo-300 hover:bg-indigo-500/30">{t('resolveAndDirect')}</button>}
                                    <button onClick={() => handleActionSubmit('approve')} className="btn-primary">{t('approveAndForward')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                 <div className="p-2 text-center">
                     <button onClick={onClose} className="text-gray-400 hover:text-white text-sm py-2">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};


const MyRequests: React.FC = () => {
    const { data, setData, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [activeMainTab, setActiveMainTab] = useState<RequestType | 'DirectDirective'>(RequestType.Employee);
    const [activeSubTab, setActiveSubTab] = useState<'incoming' | 'sent' | 'all'>('incoming');
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');


    const filteredRequests = useMemo(() => {
        let requests = data.requests.filter(r => {
            if (r.topic === DelegateRequestTopic.ConfidentialComplaint) {
                const isAuthorized = [UserRole.GeneralManager, UserRole.MovementManager].includes(currentUser!.role);
                const isSender = r.fromDelegateId ? false : r.fromRole === currentUser!.role;
                return isAuthorized || isSender;
            }
            return true;
        });

        if (activeMainTab === 'DirectDirective') {
             requests = requests.filter(r => r.type === RequestType.DirectDirective);
        } else {
            requests = requests.filter(r => r.type === activeMainTab);
        }

        switch (activeSubTab) {
            case 'incoming':
                requests = requests.filter(r => r.workflow[r.currentStageIndex] === currentUser?.role && r.status === RequestStatus.PendingApproval);
                break;
            case 'sent':
                requests = requests.filter(r => r.fromRole === currentUser?.role);
                break;
            case 'all':
                if (![UserRole.GeneralManager, UserRole.MovementManager].includes(currentUser!.role)) {
                    requests = requests.filter(r => r.fromRole === currentUser?.role || r.workflow.includes(currentUser!.role));
                }
                break;
        }
        
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            requests = requests.filter(r => 
                r.requestNumber.toLowerCase().includes(lowerQuery) || 
                r.title.toLowerCase().includes(lowerQuery)
            );
        }
        
        if (statusFilter !== 'All') {
            requests = requests.filter(r => r.status === statusFilter);
        }
        
        return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
    }, [data.requests, activeMainTab, activeSubTab, currentUser, searchQuery, statusFilter]);


    const handleAction = (requestId: number, actionType: 'approve' | 'reject' | 'resolveAndClose' | 'resolveAndDirect', payload: { comment: string, directTo?: UserRole, directiveComment?: string }) => {
        setData(prevData => {
            const requests = [...prevData.requests];
            const requestIndex = requests.findIndex(r => r.id === requestId);
            if (requestIndex === -1) return prevData;

            const request = { ...requests[requestIndex] };
            const now = new Date().toISOString();
            
            const newHistoryEvent: RequestHistoryEvent = {
                actor: currentUser!.role,
                actorName: currentUser!.name,
                action: 'Commented',
                timestamp: now,
                comment: payload.comment || undefined,
            };

            if (actionType === 'approve') {
                newHistoryEvent.action = 'Approved';
                request.currentStageIndex++;
                if (request.currentStageIndex >= request.workflow.length) {
                    request.status = RequestStatus.Approved;
                } else {
                     request.status = RequestStatus.PendingApproval;
                }
            } else if (actionType === 'reject') {
                newHistoryEvent.action = 'Rejected';
                request.status = RequestStatus.Rejected;
            } else if (actionType === 'resolveAndClose') {
                newHistoryEvent.action = 'ResolvedAndClosed';
                request.status = RequestStatus.Completed;
            } else if (actionType === 'resolveAndDirect' && payload.directTo && payload.directiveComment) {
                 newHistoryEvent.action = 'ResolvedAndDirected';
                 newHistoryEvent.directedTo = payload.directTo;
                 newHistoryEvent.comment = payload.directiveComment;
                 request.status = RequestStatus.Completed;
                 
                 const newInternalRequest: Request = {
                     id: Date.now(),
                     requestNumber: generateRequestNumber(RequestType.Internal, requests),
                     title: `${t('followUpOnRequest')} ${request.requestNumber}`,
                     description: `${t('basedOnDirectionFrom')} ${t(`role_${currentUser!.role}`)}:\n\n"${payload.directiveComment}"\n\n${t('originalRequestDetails')}:\n${request.description}`,
                     type: RequestType.Internal,
                     status: RequestStatus.PendingApproval,
                     fromRole: currentUser!.role,
                     createdAt: now,
                     lastActionTimestamp: now,
                     history: [{ actor: currentUser!.role, actorName: currentUser!.name, action: 'Created', timestamp: now }],
                     workflow: [payload.directTo],
                     currentStageIndex: 0,
                     imageUrl: request.imageUrl // Copy original attachment to the new directed request
                 };
                 requests.push(newInternalRequest);
            }

            request.history.push(newHistoryEvent);
            request.lastActionTimestamp = now;
            requests[requestIndex] = request;

            return { ...prevData, requests };
        });
        setSelectedRequest(null);
    };
    
     const handleCreateInternalRequest = (newRequestData: Omit<Request, 'id'>) => {
        setData(prev => {
            const newRequest: Request = {
                id: Date.now(),
                ...newRequestData,
            };
            return { ...prev, requests: [...prev.requests, newRequest] };
        });
        setIsCreateModalOpen(false);
    };


    const getSourceName = (request: Request) => {
        if (request.fromDelegateId) {
            const delegate = data.delegates.find(d => d.id === request.fromDelegateId);
            return delegate ? delegate.name : `${t('delegate')} #${request.fromDelegateId}`;
        }
        return request.history[0]?.actorName || t(`role_${request.fromRole}`);
    };
    
    return (
        <div className="space-y-6 animate-fade-in pb-6">
             {selectedRequest && (
                <RequestModal 
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onAction={handleAction}
                    currentUser={currentUser!}
                />
            )}
            
            {isCreateModalOpen && (
                <CreateInternalRequestModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateInternalRequest}
                    currentUser={currentUser!}
                    existingRequests={data.requests}
                    delegates={data.delegates}
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('myRequests')}</h1>
                 {(activeMainTab === RequestType.Internal || activeMainTab === 'DirectDirective') && (
                     <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2 justify-center w-full sm:w-auto">
                        <i className="fas fa-plus-circle"></i> {t('createNewRequest')}
                    </button>
                 )}
            </div>

            <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-4 p-2 bg-gray-900/50 rounded-lg overflow-x-auto">
                    <MainTabButton name={t('employeeRequests')} icon="fa-users" isActive={activeMainTab === RequestType.Employee} onClick={() => setActiveMainTab(RequestType.Employee)} />
                    <MainTabButton name={t('internalRequests')} icon="fa-building" isActive={activeMainTab === RequestType.Internal} onClick={() => setActiveMainTab(RequestType.Internal)} />
                    <MainTabButton name={t('tab_directives')} icon="fa-bullseye" isActive={activeMainTab === 'DirectDirective'} onClick={() => setActiveMainTab('DirectDirective' as any)} />
                </div>

                 <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-700 gap-4 pb-2">
                    <nav className="w-full md:w-auto -mb-px flex ltr:space-x-2 rtl:space-x-reverse rtl:space-x-2 overflow-x-auto" aria-label="Tabs">
                         <SubTabButton name={t('tab_incoming')} isActive={activeSubTab === 'incoming'} onClick={() => setActiveSubTab('incoming')} />
                         <SubTabButton name={t('tab_mySent')} isActive={activeSubTab === 'sent'} onClick={() => setActiveSubTab('sent')} />
                         <SubTabButton name={t('tab_allRequests')} isActive={activeSubTab === 'all'} onClick={() => setActiveSubTab('all')} />
                    </nav>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'All')}
                            className="input-styled py-2 px-3 text-sm w-full sm:w-auto"
                        >
                            <option value="All">{t('filterByStatus')}: {t('all')}</option>
                            {Object.values(RequestStatus).map(s => (
                                <option key={s} value={s}>{t(`status_${s}`)}</option>
                            ))}
                        </select>
                        <div className="relative flex-grow w-full sm:w-auto">
                            <i className="fas fa-search absolute top-2.5 ltr:left-3 rtl:right-3 text-gray-500 text-xs"></i>
                            <input 
                                type="text" 
                                placeholder={t('searchRequestsPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-styled w-full ltr:pl-8 rtl:pr-8 py-2 text-sm"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto pt-4">
                     <table className="min-w-full text-sm text-center">
                        <thead className="text-gray-400">
                            <tr>
                                <th className="p-3 ltr:text-left rtl:text-right min-w-[100px]">{t('request_number')}</th>
                                <th className="p-3 ltr:text-left rtl:text-right min-w-[180px]">{t('requestTitle')}</th>
                                <th className="p-3 min-w-[120px]">{t('from')}</th>
                                <th className="p-3 min-w-[150px]">{t('currentStage')}</th>
                                <th className="p-3 min-w-[120px]">{t('status_pending')}</th>
                                <th className="p-3 min-w-[100px]">{t('date')}</th>
                            </tr>
                        </thead>
                        <tbody>
                             {filteredRequests.length > 0 ? filteredRequests.map(req => {
                                  const createdAt = new Date(req.createdAt).getTime();
                                  const now = Date.now();
                                  const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
                                  const isExpired = hoursDiff > 72 && req.status === RequestStatus.PendingApproval;

                                  return (
                                    <tr key={req.id} onClick={() => setSelectedRequest(req)} className={`border-b border-gray-800 hover:bg-orange-500/5 cursor-pointer ${isExpired ? 'opacity-60' : ''}`}>
                                        <td className="p-3 font-mono ltr:text-left rtl:text-right">{req.requestNumber}</td>
                                        <td className="p-3 font-semibold text-white ltr:text-left rtl:text-right">
                                            {req.title}
                                            {isExpired && <span className="ml-2 text-red-400 text-xs border border-red-500 px-1 rounded">{t('status_Expired')}</span>}
                                        </td>
                                        <td className="p-3">{getSourceName(req)}</td>
                                        <td className="p-3 text-cyan-400">
                                            {req.type === RequestType.DirectDirective ? '-' : t(`stage_${req.workflow[req.currentStageIndex]}`)}
                                        </td>
                                        <td className="p-3">{t(`status_${req.status}`)}</td>
                                        <td className="p-3 text-gray-500 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                  )
                             }) : (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-500">{t('noDataMatchingFilters')}</td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyRequests;