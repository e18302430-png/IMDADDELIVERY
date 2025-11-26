
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Delegate, HourActivity, DelegateType, DailyOperationalReport, UserRole, DailyReportEntry, WeekendAbsence, PerformanceStatus } from '../types';
import { getHours } from '../services/dataService';
import EditableInput from '../components/EditableInput';
import { useTranslation } from '../hooks/useTranslation';
import ConfirmationModal from '../components/ConfirmationModal';

// Helper function to format Gregorian date and add Hijri date
const formatDateWithHijri = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return '-';
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) {
        return dateString; 
    }
    const gregorian = date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    });
    const hijri = hijriFormatter.format(date);
    return `${gregorian} (${hijri})`;
};

const TabButton: React.FC<{name: string, isActive: boolean, count?: number, onClick: ()=>void}> = ({name, isActive, count, onClick}) => (
    <button
        onClick={onClick}
        className={`${
        isActive
            ? 'border-orange-500 text-orange-400'
            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
        } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors focus:outline-none flex items-center`}
    >
        {name}
        {typeof count !== 'undefined' && <span className={`ltr:ml-2 rtl:mr-2 rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-700 text-gray-300'}`}>{count}</span>}
    </button>
);

const OperationsTools: React.FC = () => {
    const { data, setData, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'kafala' | 'ajir'>('kafala');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [notification, setNotification] = useState('');
    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');

    const isToday = useMemo(() => new Date().toISOString().split('T')[0] === viewDate, [viewDate]);

    const supervisorDelegates = useMemo(() => {
        if (currentUser?.role === UserRole.OpsSupervisor) {
            return data.delegates.filter(d => d.supervisorId === currentUser.id);
        }
        return data.delegates;
    }, [data.delegates, currentUser]);

    const reportForDate = useMemo(() => {
         if (!currentUser?.id) return null;
        return data.dailyReports?.find(report => 
            report.date === viewDate && report.supervisorId === currentUser.id
        );
    }, [data.dailyReports, currentUser, viewDate]);

    const isReportSubmittedForViewDate = !!reportForDate;

    const displayDelegates = useMemo(() => {
        if (isToday) {
            return supervisorDelegates.filter(d => d.employmentStatus === 'نشط');
        }
        if (reportForDate) {
            return reportForDate.entries.map(entry => {
                const liveDelegate = supervisorDelegates.find(d => d.id === entry.delegateId);
                return {
                    ...liveDelegate, 
                    id: entry.delegateId,
                    name: entry.delegateName,
                    displayId: entry.delegateDisplayId,
                    ordersDelivered: entry.ordersDelivered,
                    activity: entry.activity,
                    weekendAbsence: entry.weekendAbsence,
                    type: liveDelegate?.type || DelegateType.Kafala, 
                } as Delegate;
            });
        }
        return [];
    }, [isToday, reportForDate, supervisorDelegates]);

    const kafalaDelegates = useMemo(() => displayDelegates.filter(d => d.type === DelegateType.Kafala), [displayDelegates]);
    const ajirDelegates = useMemo(() => displayDelegates.filter(d => d.type === DelegateType.Ajir), [displayDelegates]);
    
    const filteredKafalaDelegates = useMemo(() => {
        if (!searchQuery) return kafalaDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return kafalaDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [kafalaDelegates, searchQuery]);

    const filteredAjirDelegates = useMemo(() => {
        if (!searchQuery) return ajirDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return ajirDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [ajirDelegates, searchQuery]);

    const handleUpdate = (delegateId: number, updatedProps: Partial<Delegate>) => {
        if (!isToday) return; 
        setData(prevData => ({
            ...prevData,
            delegates: prevData.delegates.map(d => d.id === delegateId ? { ...d, ...updatedProps } : d)
        }));
    };
    
    const handleRegisterLeave = (delegate: Delegate) => {
        if (!isToday) return;
        if (window.confirm(`${t('areYouSureYouWantTo')} ${t('registerLeave')} ${t('for')} ${delegate.name}?`)) {
            const todayStr = new Date().toISOString().split('T')[0];
            setData(prevData => ({
                ...prevData,
                delegates: prevData.delegates.map(d => 
                    d.id === delegate.id ? {
                        ...d,
                        performanceStatus: PerformanceStatus.Suspended,
                        suspensionDate: todayStr,
                        notes: 'Administrative Leave/Vacation'
                    } : d
                )
            }));
            setNotification(`${delegate.name} ${t('movedToSuspended')} (${t('activity_OnLeave')})`);
            setTimeout(() => setNotification(''), 4000);
        }
    };

    const handleSendReport = () => {
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSendReport = () => {
        if (!currentUser?.id) return;
        const delegatesToReport = supervisorDelegates.filter(d => d.employmentStatus === 'نشط');
        const report: DailyOperationalReport = {
            date: viewDate,
            supervisorId: currentUser.id,
            entries: delegatesToReport.map(d => ({
                delegateId: d.id,
                delegateName: d.name,
                delegateDisplayId: d.displayId,
                ordersDelivered: d.ordersDelivered || 0,
                activity: d.activity || [],
                weekendAbsence: d.weekendAbsence,
            }))
        };
        setData(prevData => ({ ...prevData, dailyReports: [...(prevData.dailyReports || []), report] }));
        setIsConfirmModalOpen(false);
        setNotification(t('reportSubmittedSuccessfully'));
        setTimeout(() => setNotification(''), 4000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmSendReport}
                title={t('confirmReportSubmissionTitle')}
                message={t('confirmReportSubmissionMessage')}
                confirmButtonText={t('yes')}
            />
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                     <h1 className="text-2xl sm:text-3xl font-bold text-white">{isToday ? t('dailyPreparationSection') : t('archivedReportTitle')}</h1>
                     <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="input-styled text-sm" />
                     {!isToday && <button onClick={() => setViewDate(new Date().toISOString().split('T')[0])} className="btn-secondary text-xs">{t('returnToToday')}</button>}
                 </div>
                 {notification && <div className="bg-green-500/20 text-green-300 font-semibold px-4 py-2 rounded-lg animate-fade-in text-sm">{notification}</div>}
            </div>
           
            <div className="glass-card p-2 sm:p-4">
                 {isToday && currentUser?.role === UserRole.OpsSupervisor && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-2 border-b border-gray-700 mb-2 gap-4">
                        <div className="text-xs sm:text-sm text-gray-300">
                           <span className="font-semibold">{t('reportForDate')}: </span>
                           <span className="font-mono text-orange-400">{formatDateWithHijri(viewDate)}</span>
                        </div>
                        <button onClick={handleSendReport} disabled={isReportSubmittedForViewDate} className="btn-primary text-xs sm:text-sm">
                            {isReportSubmittedForViewDate ? t('reportAlreadySubmitted') : t('approveAndSendReport')}
                        </button>
                    </div>
                )}
                 <div className="border-b border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 pb-2">
                    <nav className="-mb-px flex ltr:space-x-4 rtl:space-x-reverse rtl:space-x-4" aria-label="Tabs">
                         <TabButton name={t('kafalaDelegates')} isActive={activeTab === 'kafala'} count={filteredKafalaDelegates.length} onClick={() => setActiveTab('kafala')} />
                         <TabButton name={t('ajirDelegates')} isActive={activeTab === 'ajir'} count={filteredAjirDelegates.length} onClick={() => setActiveTab('ajir')} />
                    </nav>
                    <div className="relative w-full sm:w-auto mb-2 sm:mb-0">
                         <i className="fas fa-search absolute top-2.5 ltr:left-3 rtl:right-3 text-gray-500"></i>
                         <input type="text" placeholder={`${t('delegateName')} / ${t('phoneNumber')}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-1.5 text-sm" />
                    </div>
                </div>

                {!isToday && !isReportSubmittedForViewDate && (
                    <div className="p-8 text-center text-gray-400">
                        <i className="fas fa-file-excel text-5xl mb-4"></i>
                        <p>{t('noReportForThisDate')}</p>
                    </div>
                )}

                {(isToday || isReportSubmittedForViewDate) && (
                    <div className="pt-4">
                        {activeTab === 'kafala' ? (
                            <KafalaPreparationTable delegates={filteredKafalaDelegates} onUpdate={handleUpdate} onRegisterLeave={handleRegisterLeave} isReadOnly={!isToday} />
                        ) : (
                            <AjirPreparationTable delegates={filteredAjirDelegates} onUpdate={handleUpdate} onRegisterLeave={handleRegisterLeave} isReadOnly={!isToday} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const KafalaPreparationTable: React.FC<{ delegates: Delegate[], onUpdate: Function, onRegisterLeave: Function, isReadOnly: boolean }> = ({ delegates, onUpdate, onRegisterLeave, isReadOnly }) => {
    const hours = getHours();
    const { t } = useTranslation();
    
    const handleActivityClick = (delegateId: number, hour: string, currentStatus: HourActivity) => {
        if(isReadOnly) return;
        const nextStatus: HourActivity = 
            currentStatus === null ? 'Present' :
            currentStatus === 'Present' ? 'Absent' :
            currentStatus === 'Absent' ? 'OnLeave' :
            null;
        const delegate = delegates.find(a => a.id === delegateId);
        if (delegate) {
            let newActivity = [...(delegate.activity || [])];
            const index = newActivity.findIndex(act => act.hour === hour);
            if (index !== -1) {
                newActivity[index] = { ...newActivity[index], status: nextStatus };
            } else {
                newActivity.push({ hour, status: nextStatus });
            }
            onUpdate(delegateId, { activity: newActivity });
        }
    };

    const getStatusStyle = (status: HourActivity) => {
        switch (status) {
            case 'Present': return 'bg-green-500/20 text-green-400';
            case 'Absent': return 'bg-red-500/20 text-red-400';
            case 'OnLeave': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-gray-700/50 text-gray-400';
        }
    };

    const getStatusText = (status: HourActivity) => {
        switch (status) {
            case 'Present': return t('activity_Present');
            case 'Absent': return t('activity_Absent');
            case 'OnLeave': return t('activity_OnLeave');
            default: return <span className="text-xs opacity-50">-</span>;
        }
    };

    return (
        <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="min-w-full text-xs sm:text-sm text-center border-collapse">
                <thead className="text-gray-400">
                    <tr>
                        <th scope="col" className="p-2 sticky ltr:left-0 rtl:right-0 bg-gray-900 z-20 min-w-[160px] sm:min-w-[250px] ltr:text-left rtl:text-right border-b border-gray-700 shadow-lg">{t('delegateName')}</th>
                        <th scope="col" className="p-2 min-w-[100px] border-b border-gray-700">{t('delegateID')}</th>
                        <th scope="col" className="p-2 min-w-[120px] border-b border-gray-700">{t('phoneNumber')}</th>
                        <th scope="col" className="p-2 min-w-[80px] border-b border-gray-700">{t('orderCount')}</th>
                        <th scope="col" className="p-2 min-w-[120px] border-b border-gray-700">{t('joinDate')}</th>
                        <th scope="col" className="p-2 min-w-[140px] border-b border-gray-700">{t('weekendAbsence')}</th>
                        {hours.map(hour => (
                            <th key={hour} scope="col" className="p-2 min-w-[160px] font-cairo whitespace-nowrap border-b border-gray-700">{hour}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {delegates.map(delegate => (
                        <tr key={delegate.id} className={`border-b border-gray-800 ${!isReadOnly ? 'hover:bg-orange-500/5' : ''} transition-colors duration-300`}>
                            <td className="p-1 sm:p-3 font-semibold sticky ltr:left-0 rtl:right-0 bg-gray-900 z-10 ltr:text-left rtl:text-right border-r border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex-grow truncate pr-2">
                                         {isReadOnly ? delegate.name : <EditableInput value={delegate.name} onChange={(val:string) => onUpdate(delegate.id, { name: val })} />}
                                    </div>
                                    {!isReadOnly && (
                                        <button onClick={() => onRegisterLeave(delegate)} className="ml-1 text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/20 flex-shrink-0" title={t('registerLeave')}>
                                            <i className="fas fa-plane"></i>
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td className="p-1 sm:p-3">
                                {isReadOnly ? delegate.displayId : <EditableInput value={delegate.displayId || ''} onChange={(val:string) => onUpdate(delegate.id, { displayId: val })} />}
                            </td>
                            <td className="p-1 sm:p-3">
                                {isReadOnly ? delegate.phone : <EditableInput value={delegate.phone} onChange={(val:string) => onUpdate(delegate.id, { phone: val })} />}
                            </td>
                             <td className="p-1 sm:p-3">
                                {isReadOnly ? delegate.ordersDelivered || 0 : <EditableInput type="number" value={delegate.ordersDelivered || 0} onChange={(val: string) => onUpdate(delegate.id, { ordersDelivered: parseInt(val, 10) || 0 })} />}
                            </td>
                            <td className="p-1 sm:p-3 text-green-400 text-xs sm:text-sm whitespace-nowrap">
                                {formatDateWithHijri(delegate.joinDate)}
                            </td>
                            <td className="p-1 sm:p-3">
                                <div className="flex justify-center items-center gap-2 sm:gap-3">
                                    {(['thursday', 'friday', 'saturday'] as const).map((day) => {
                                        const dayInitial = {thursday: t('thursday_short'), friday: t('friday_short'), saturday: t('saturday_short')}[day];
                                        return (
                                            <div key={day} className="flex flex-col items-center">
                                                <label className="text-[10px] text-gray-400 mb-0.5 cursor-pointer">{dayInitial}</label>
                                                <input 
                                                    type="checkbox"
                                                    checked={delegate.weekendAbsence?.[day] || false}
                                                    disabled={isReadOnly}
                                                    onChange={(e) => {
                                                        const currentAbsence = delegate.weekendAbsence || { thursday: false, friday: false, saturday: false };
                                                        onUpdate(delegate.id, { weekendAbsence: { ...currentAbsence, [day]: e.target.checked } });
                                                    }}
                                                    className={`w-4 h-4 rounded bg-gray-800 border-gray-600 text-orange-600 focus:ring-orange-500 ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </td>
                            {hours.map(hour => {
                                const act = delegate.activity?.find(a => a.hour === hour) || { hour, status: null };
                                return (
                                    <td key={`${delegate.id}-${hour}`} className="p-1">
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={(e) => { e.stopPropagation(); handleActivityClick(delegate.id, act.hour, act.status); }}
                                            className={`w-full h-9 sm:h-10 rounded-md p-1 text-center font-bold text-xs transition-colors ${getStatusStyle(act.status)} ${isReadOnly ? 'cursor-not-allowed' : 'hover:bg-gray-600/50'}`}
                                        >
                                            {getStatusText(act.status)}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AjirPreparationTable: React.FC<{ delegates: Delegate[], onUpdate: Function, onRegisterLeave: Function, isReadOnly: boolean }> = ({ delegates, onUpdate, onRegisterLeave, isReadOnly }) => {
    const hours = getHours();
    const { t } = useTranslation();
    
    const handleActivityClick = (delegateId: number, hour: string, currentStatus: HourActivity) => {
        if(isReadOnly) return;
        const nextStatus: HourActivity = currentStatus === null ? 'Present' : currentStatus === 'Present' ? 'Absent' : currentStatus === 'Absent' ? 'OnLeave' : null;
        const delegate = delegates.find(a => a.id === delegateId);
        if (delegate) {
             let newActivity = [...(delegate.activity || [])];
             const index = newActivity.findIndex(act => act.hour === hour);
             if (index !== -1) newActivity[index] = { ...newActivity[index], status: nextStatus };
             else newActivity.push({ hour, status: nextStatus });
             onUpdate(delegateId, { activity: newActivity });
        }
    };

    const getStatusStyle = (status: HourActivity) => {
        switch (status) {
            case 'Present': return 'bg-green-500/20 text-green-400';
            case 'Absent': return 'bg-red-500/20 text-red-400';
            case 'OnLeave': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-gray-700/50 text-gray-400';
        }
    };

    const getStatusText = (status: HourActivity) => {
        switch (status) {
            case 'Present': return t('activity_Present');
            case 'Absent': return t('activity_Absent');
            case 'OnLeave': return t('activity_OnLeave');
            default: return <span className="text-xs opacity-50">-</span>;
        }
    };

    return (
        <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="min-w-full text-xs sm:text-sm text-center border-collapse">
                <thead className="text-gray-400">
                    <tr>
                        <th scope="col" className="p-2 sticky ltr:left-0 rtl:right-0 bg-gray-900 z-20 min-w-[160px] sm:min-w-[250px] ltr:text-left rtl:text-right border-b border-gray-700 shadow-lg">{t('delegateName')}</th>
                        <th scope="col" className="p-2 min-w-[100px] border-b border-gray-700">{t('delegateID')}</th>
                        <th scope="col" className="p-2 min-w-[120px] border-b border-gray-700">{t('phoneNumber')}</th>
                        <th scope="col" className="p-2 min-w-[80px] border-b border-gray-700">{t('orderCount')}</th>
                        <th scope="col" className="p-2 min-w-[120px] border-b border-gray-700">{t('joinDate')}</th>
                        {hours.map(hour => (
                            <th key={hour} scope="col" className="p-2 min-w-[160px] font-cairo whitespace-nowrap border-b border-gray-700">{hour}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {delegates.map(delegate => (
                        <tr key={delegate.id} className={`border-b border-gray-800 ${!isReadOnly ? 'hover:bg-orange-500/5' : ''} transition-colors duration-300`}>
                            <td className="p-1 sm:p-3 font-semibold sticky ltr:left-0 rtl:right-0 bg-gray-900 z-10 ltr:text-left rtl:text-right border-r border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex-grow truncate pr-2">
                                        {isReadOnly ? delegate.name : <EditableInput value={delegate.name} onChange={(val:string) => onUpdate(delegate.id, { name: val })} />}
                                    </div>
                                    {!isReadOnly && (
                                        <button onClick={() => onRegisterLeave(delegate)} className="ml-1 text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/20 flex-shrink-0" title={t('registerLeave')}>
                                            <i className="fas fa-plane"></i>
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td className="p-1 sm:p-3">
                                {isReadOnly ? delegate.displayId : <EditableInput value={delegate.displayId || ''} onChange={(val:string) => onUpdate(delegate.id, { displayId: val })} />}
                            </td>
                            <td className="p-1 sm:p-3">
                               {isReadOnly ? delegate.phone : <EditableInput value={delegate.phone} onChange={(val:string) => onUpdate(delegate.id, { phone: val })} />}
                            </td>
                            <td className="p-1 sm:p-3">
                                {isReadOnly ? delegate.ordersDelivered || 0 : <EditableInput type="number" value={delegate.ordersDelivered || 0} onChange={(val: string) => onUpdate(delegate.id, { ordersDelivered: parseInt(val, 10) || 0 })} />}
                            </td>
                             <td className="p-1 sm:p-3 text-green-400 text-xs sm:text-sm whitespace-nowrap">
                                {formatDateWithHijri(delegate.joinDate)}
                            </td>
                            {hours.map(hour => {
                                const act = delegate.activity?.find(a => a.hour === hour) || { hour, status: null };
                                return (
                                    <td key={`${delegate.id}-${hour}`} className="p-1">
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={(e) => { e.stopPropagation(); handleActivityClick(delegate.id, act.hour, act.status); }}
                                            className={`w-full h-9 sm:h-10 rounded-md p-1 text-center font-bold text-xs transition-colors ${getStatusStyle(act.status)} ${isReadOnly ? 'cursor-not-allowed' : 'hover:bg-gray-600/50'}`}
                                        >
                                            {getStatusText(act.status)}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OperationsTools;
