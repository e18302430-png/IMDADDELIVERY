
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { PerformanceStatus, Delegate, Staff, DelegateType, UserRole } from '../types';
import PerformanceIndicator from '../components/PerformanceIndicator';
import EditableInput from '../components/EditableInput';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTranslation } from '../hooks/useTranslation';

const exportToCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const sanitizedRows = rows.map(row => 
        row.map(field => {
            const str = String(field ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        })
    );
    const csvContent = [headers.join(','), ...sanitizedRows.map(e => e.join(','))].join('\n');
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const AdminBoard: React.FC = () => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const { delegates, staff } = data;
    const [searchQuery, setSearchQuery] = useState('');
    const today = new Date().toISOString().split('T')[0];

    const supervisors = useMemo(() => staff.filter(s => s.role === UserRole.OpsSupervisor), [staff]);

    const [confirmModalState, setConfirmModalState] = useState<{
        isOpen: boolean;
        delegateId: number | null;
        action: PerformanceStatus | null;
        delegateName: string;
        actionText: string;
    }>({ isOpen: false, delegateId: null, action: null, delegateName: '', actionText: '' });

    const [suspensionModal, setSuspensionModal] = useState<{
        isOpen: boolean;
        delegateId: number | null;
        delegateName: string;
    }>({ isOpen: false, delegateId: null, delegateName: '' });
    
    const [suspensionDate, setSuspensionDate] = useState('');
    const [suspensionReturnDate, setSuspensionReturnDate] = useState('');

    const kafalaDelegates = useMemo(() => delegates.filter(d => d.type === DelegateType.Kafala), [delegates]);
    
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

    const handleAction = (delegateId: number, action: PerformanceStatus, actionText: string) => {
        const delegate = delegates.find(d => d.id === delegateId);
        if (!delegate) return;

        if (action === PerformanceStatus.Suspended) {
            setSuspensionDate(today);
            setSuspensionReturnDate('');
            setSuspensionModal({ isOpen: true, delegateId, delegateName: delegate.name });
        } else {
             setData(prevData => ({
                ...prevData,
                delegates: prevData.delegates.map(d => d.id === delegateId ? { ...d, performanceStatus: action } : d),
            }));
        }
    };
    
    const handleConfirmSuspension = (e: React.FormEvent) => {
        e.preventDefault();
        if (suspensionModal.delegateId !== null) {
            setData(prevData => ({
                ...prevData,
                delegates: prevData.delegates.map(delegate =>
                    delegate.id === suspensionModal.delegateId ? { 
                        ...delegate, 
                        performanceStatus: PerformanceStatus.Suspended,
                        suspensionDate: suspensionDate,
                        suspensionReturnDate: suspensionReturnDate || undefined
                    } : delegate
                ),
            }));
        }
        setSuspensionModal({ isOpen: false, delegateId: null, delegateName: '' });
    };

    const handleCloseConfirmModal = () => setConfirmModalState({ isOpen: false, delegateId: null, action: null, delegateName: '', actionText: '' });
    
    const handleConfirmAction = () => {
        if (confirmModalState.delegateId !== null && confirmModalState.action !== null) {
            setData(prevData => ({
                ...prevData,
                delegates: prevData.delegates.map(delegate =>
                    delegate.id === confirmModalState.delegateId ? { ...delegate, performanceStatus: confirmModalState.action as PerformanceStatus } : delegate
                ),
            }));
        }
        handleCloseConfirmModal();
    };
    
    const handleStaffUpdate = (staffId: number, updatedProps: Partial<Staff>) => {
         setData(prevData => ({ ...prevData, staff: prevData.staff.map(s => s.id === staffId ? { ...s, ...updatedProps } : s) }));
    };
    
    const handleDelegateUpdate = (delegateId: number, updatedProps: Partial<Delegate>) => {
        setData(prevData => ({ ...prevData, delegates: prevData.delegates.map(delegate => delegate.id === delegateId ? { ...delegate, ...updatedProps } : delegate) }));
    };

    const supervisorPerformance = useMemo(() => {
        return supervisors.map(sup => {
            const supDelegates = kafalaDelegates.filter(a => a.supervisorId === sup.id);
            const activeCount = supDelegates.filter(a => a.performanceStatus !== PerformanceStatus.Suspended).length;
            const suspendedCount = supDelegates.length - activeCount;
            const performanceScore = supDelegates.length > 0 
                ? (supDelegates.filter(a => a.performanceStatus === PerformanceStatus.Excellent).length / supDelegates.length) * 100
                : 0;
            return { ...sup, totalDelegates: supDelegates.length, activeCount, suspendedCount, performanceScore };
        }).sort((a,b) => b.performanceScore - a.performanceScore);
    }, [kafalaDelegates, supervisors]);

    const handleExportSupervisors = () => {
        const headers = [t('table_supervisor'), t('table_totalDelegates'), t('table_active'), t('table_suspended'), t('table_performanceIndex')];
        const rows = supervisorPerformance.map(s => [s.name, s.totalDelegates, s.activeCount, s.suspendedCount, `${s.performanceScore.toFixed(0)}%`]);
        exportToCsv('supervisor_accountability_report', headers, rows);
    };

    const handleExportDelegates = () => {
        const headers = [t('table_delegate'), t('table_delegateId'), t('table_supervisor'), t('table_currentStatus'), t('table_notes')];
        const rows = filteredKafalaDelegates.map(d => [d.name, d.displayId || '', supervisors.find(s => s.id === d.supervisorId)?.name || t('unknown'), t(`perfStatus_${d.performanceStatus?.replace(/\s/g, '')}`), d.notes || '']);
        exportToCsv('delegate_performance_report', headers, rows);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-white">{t('adminBoard')}</h1>
            
            <ConfirmationModal
                isOpen={confirmModalState.isOpen}
                onClose={handleCloseConfirmModal}
                onConfirm={handleConfirmAction}
                title={`${t('confirm')} ${confirmModalState.actionText}`}
                message={`${t('areYouSureYouWantTo')} ${confirmModalState.actionText} ${t('theDelegate')} "${confirmModalState.delegateName}"?`}
                confirmButtonText={`${t('yes')}, ${confirmModalState.actionText}`}
            />

            {suspensionModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={() => setSuspensionModal({ ...suspensionModal, isOpen: false })}>
                    <div className="glass-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-orange-400 mb-4">{t('suspendDelegateModalTitle')} - {suspensionModal.delegateName}</h3>
                        <form onSubmit={handleConfirmSuspension} className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">{t('suspensionDate')}</label>
                                <input type="date" value={suspensionDate} onChange={e => setSuspensionDate(e.target.value)} className="input-styled w-full" required min={today} />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">{t('returnDate')} <span className="text-gray-500 text-xs">{t('optional')}</span></label>
                                <input type="date" value={suspensionReturnDate} onChange={e => setSuspensionReturnDate(e.target.value)} className="input-styled w-full" min={suspensionDate || today} />
                                <p className="text-xs text-gray-500 mt-1">{t('indefinite')}</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setSuspensionModal({ ...suspensionModal, isOpen: false })} className="btn-secondary">{t('cancel')}</button>
                                <button type="submit" className="btn-primary bg-red-600 hover:bg-red-500">{t('action_suspend')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Supervisor Accountability Section */}
            <div className="glass-card p-4 sm:p-6">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">{t('supervisorAccountability')}</h2>
                    <button onClick={handleExportSupervisors} className="btn-secondary bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20 hover:text-green-300 flex items-center text-xs sm:text-sm">
                        <i className="fas fa-file-csv ltr:mr-2 rtl:ml-2"></i> {t('export')}
                    </button>
                </div>
                
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full text-sm text-center">
                        <thead className="border-b border-gray-700 text-gray-400">
                            <tr>
                                <th className="p-3 ltr:text-left rtl:text-right">{t('table_supervisor')}</th>
                                <th className="p-3">{t('table_totalDelegates')}</th>
                                <th className="p-3">{t('table_active')}</th>
                                <th className="p-3">{t('table_suspended')}</th>
                                <th className="p-3">{t('table_performanceIndex')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supervisorPerformance.map(sup => (
                                <tr key={sup.id} className="border-b border-gray-800 hover:bg-orange-500/5">
                                    <td className="p-3 font-semibold ltr:text-left rtl:text-right">
                                        <div className="flex items-center gap-3">
                                            <img src={sup.imageUrl || 'https://placehold.co/100x100/7F8C8D/FFFFFF/png?text=N/A'} alt={sup.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"/>
                                            <EditableInput value={sup.name} onChange={(val) => handleStaffUpdate(sup.id, { name: val })} />
                                        </div>
                                    </td>
                                    <td className="p-3 font-semibold">{sup.totalDelegates}</td>
                                    <td className="p-3 text-green-400 font-semibold">{sup.activeCount}</td>
                                    <td className="p-3 text-red-400 font-semibold">{sup.suspendedCount}</td>
                                    <td className="p-3">
                                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                                            <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${sup.performanceScore}%` }}></div>
                                        </div>
                                        <span className="text-xs font-semibold">{sup.performanceScore.toFixed(0)}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {supervisorPerformance.map(sup => (
                        <div key={sup.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center gap-3 mb-3">
                                <img src={sup.imageUrl || 'https://placehold.co/100x100/7F8C8D/FFFFFF/png?text=N/A'} alt={sup.name} className="w-12 h-12 rounded-full object-cover border-2 border-orange-500"/>
                                <div className="flex-grow">
                                    <EditableInput value={sup.name} onChange={(val) => handleStaffUpdate(sup.id, { name: val })} />
                                    <div className="text-xs text-gray-400 mt-1">{t('table_performanceIndex')}: <span className="text-orange-400 font-bold">{sup.performanceScore.toFixed(0)}%</span></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-sm bg-gray-900/50 p-2 rounded-lg">
                                <div>
                                    <div className="text-gray-500 text-xs">{t('table_totalDelegates')}</div>
                                    <div className="font-bold text-white">{sup.totalDelegates}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-xs">{t('table_active')}</div>
                                    <div className="font-bold text-green-400">{sup.activeCount}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-xs">{t('table_suspended')}</div>
                                    <div className="font-bold text-red-400">{sup.suspendedCount}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Agent Performance Board Section */}
            <div className="glass-card p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-white">{t('delegatePerformanceBoard')}</h2>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-grow sm:flex-grow-0">
                             <i className="fas fa-search absolute top-3 ltr:left-3 rtl:right-3 text-gray-500"></i>
                             <input type="text" placeholder={`${t('delegateName')} / ${t('phoneNumber')}`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-2 text-sm" />
                        </div>
                        <button onClick={handleExportDelegates} className="btn-secondary bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20 hover:text-green-300 flex items-center text-xs sm:text-sm">
                            <i className="fas fa-file-csv ltr:mr-2 rtl:ml-2"></i> {t('export')}
                        </button>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full text-sm text-center">
                        <thead className="border-b border-gray-700 text-gray-400">
                            <tr>
                                <th className="p-3 ltr:text-left rtl:text-right">{t('table_delegate')}</th>
                                <th className="p-3">{t('table_delegateId')}</th>
                                <th className="p-3">{t('table_supervisor')}</th>
                                <th className="p-3">{t('table_currentStatus')}</th>
                                <th className="p-3">{t('table_notes')}</th>
                                <th className="p-3">{t('table_suggestedAction')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredKafalaDelegates.map(delegate => (
                                <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5">
                                    <td className="p-3 font-semibold ltr:text-left rtl:text-right">
                                        <div className="flex items-center gap-3">
                                            <img src={delegate.imageUrl || 'https://placehold.co/100x100/7F8C8D/FFFFFF/png?text=N/A'} alt={delegate.name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"/>
                                            <EditableInput value={delegate.name} onChange={(val) => handleDelegateUpdate(delegate.id, { name: val })} />
                                        </div>
                                    </td>
                                     <td className="p-3"><EditableInput value={delegate.displayId || ''} onChange={(val) => handleDelegateUpdate(delegate.id, { displayId: val })} /></td>
                                    <td className="p-3 text-gray-400">{supervisors.find(s => s.id === delegate.supervisorId)?.name || t('unknown')}</td>
                                    <td className="p-3"><PerformanceIndicator status={delegate.performanceStatus!} /></td>
                                    <td className="p-3 ltr:text-left rtl:text-right max-w-xs truncate">{delegate.notes || '-'}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center space-x-2 space-x-reverse">
                                            <button onClick={() => handleAction(delegate.id, PerformanceStatus.Excellent, t('action_followUp'))} className="px-2 py-1 text-xs font-medium text-green-300 bg-green-900/50 rounded-md hover:bg-green-800/50">{t('action_followUp')}</button>
                                            <button onClick={() => handleAction(delegate.id, PerformanceStatus.Average, t('action_monitor'))} className="px-2 py-1 text-xs font-medium text-yellow-300 bg-yellow-900/50 rounded-md hover:bg-yellow-800/50">{t('action_monitor')}</button>
                                            <button onClick={() => handleAction(delegate.id, PerformanceStatus.Suspended, t('action_suspend'))} className="px-2 py-1 text-xs font-medium text-gray-300 bg-gray-700/50 rounded-md hover:bg-gray-600/50">{t('action_suspend')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredKafalaDelegates.map(delegate => (
                        <div key={delegate.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex flex-col gap-3">
                            <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
                                <img src={delegate.imageUrl || 'https://placehold.co/100x100/7F8C8D/FFFFFF/png?text=N/A'} alt={delegate.name} className="w-14 h-14 rounded-full object-cover border-2 border-orange-500"/>
                                <div className="flex-grow">
                                    <EditableInput value={delegate.name} onChange={(val) => handleDelegateUpdate(delegate.id, { name: val })} />
                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                        ID: <EditableInput value={delegate.displayId || ''} onChange={(val) => handleDelegateUpdate(delegate.id, { displayId: val })} />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-gray-400">{t('table_supervisor')}:</div>
                                <div className="text-right text-white">{supervisors.find(s => s.id === delegate.supervisorId)?.name || t('unknown')}</div>
                                <div className="text-gray-400">{t('table_currentStatus')}:</div>
                                <div className="text-right"><PerformanceIndicator status={delegate.performanceStatus!} /></div>
                            </div>
                            <div className="bg-gray-900/50 p-2 rounded text-xs text-gray-300 italic">
                                {delegate.notes || t('noNotesRecorded')}
                            </div>
                            <div className="flex justify-between gap-2 pt-2 border-t border-gray-700">
                                <button onClick={() => handleAction(delegate.id, PerformanceStatus.Excellent, t('action_followUp'))} className="flex-1 py-2 text-xs font-bold text-green-300 bg-green-900/30 rounded border border-green-900 hover:bg-green-900/50">{t('action_followUp')}</button>
                                <button onClick={() => handleAction(delegate.id, PerformanceStatus.Average, t('action_monitor'))} className="flex-1 py-2 text-xs font-bold text-yellow-300 bg-yellow-900/30 rounded border border-yellow-900 hover:bg-yellow-900/50">{t('action_monitor')}</button>
                                <button onClick={() => handleAction(delegate.id, PerformanceStatus.Suspended, t('action_suspend'))} className="flex-1 py-2 text-xs font-bold text-gray-300 bg-gray-700/30 rounded border border-gray-600 hover:bg-gray-700/50">{t('action_suspend')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminBoard;
