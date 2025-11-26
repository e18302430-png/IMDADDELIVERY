
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { Delegate, UserRole, PerformanceStatus } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import HRAddDelegateModal from '../components/HRAddDelegateModal';
import ConfirmationModal from '../components/ConfirmationModal';

// Helper function to format Gregorian date and add Hijri date
const formatDateWithHijri = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return '-';
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) return dateString;
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

const HRDelegateManagement: React.FC = () => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [delegateToEdit, setDelegateToEdit] = useState<Delegate | null>(null);
    const [resignationModal, setResignationModal] = useState<{ isOpen: boolean, delegate: Delegate | null }>({ isOpen: false, delegate: null });
    const [suspensionModal, setSuspensionModal] = useState<{ isOpen: boolean, delegate: Delegate | null }>({ isOpen: false, delegate: null });
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, delegate: Delegate | null }>({ isOpen: false, delegate: null });
    
    const [suspensionDate, setSuspensionDate] = useState(new Date().toISOString().split('T')[0]);
    const [suspensionReturnDate, setSuspensionReturnDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const activeDelegates = useMemo(() => {
        return data.delegates.filter(d => d.employmentStatus === 'نشط');
    }, [data.delegates]);
    
    const filteredDelegates = useMemo(() => {
        if (!searchQuery) return activeDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return activeDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [activeDelegates, searchQuery]);
    
    const supervisors = useMemo(() => data.staff.filter(s => s.role === UserRole.OpsSupervisor), [data.staff]);

    const handleSaveDelegate = (newDelegateData: Omit<Delegate, 'id'>) => {
        setData(prevData => {
            if (delegateToEdit) {
                return { ...prevData, delegates: prevData.delegates.map(d => d.id === delegateToEdit.id ? { ...d, ...newDelegateData } : d) };
            } else {
                const newId = Math.max(0, ...prevData.delegates.map(d => d.id)) + 1;
                return { ...prevData, delegates: [...prevData.delegates, { ...newDelegateData, id: newId }] };
            }
        });
        setIsAddModalOpen(false);
        setDelegateToEdit(null);
    };

    const handleEditDelegate = (delegate: Delegate) => {
        setDelegateToEdit(delegate);
        setIsAddModalOpen(true);
    };

    const handleDeleteDelegate = (delegate: Delegate) => {
        setDeleteModal({ isOpen: true, delegate });
    };

    const confirmDelete = () => {
        if (!deleteModal.delegate) return;
        setData(prevData => ({ ...prevData, delegates: prevData.delegates.filter(d => d.id !== deleteModal.delegate!.id) }));
        setDeleteModal({ isOpen: false, delegate: null });
    };

    const handleMarkAsResigned = (delegate: Delegate) => {
        setResignationModal({ isOpen: true, delegate });
    };
    
    const confirmResignation = () => {
        if (!resignationModal.delegate) return;
        setData(prevData => ({
            ...prevData,
            delegates: prevData.delegates.map(d =>
                d.id === resignationModal.delegate!.id
                    ? { ...d, employmentStatus: 'مستقيل', terminationDate: new Date().toISOString().split('T')[0] }
                    : d
            )
        }));
        setResignationModal({ isOpen: false, delegate: null });
    };

    const handleSuspendDelegate = (delegate: Delegate) => {
        setSuspensionDate(new Date().toISOString().split('T')[0]);
        setSuspensionReturnDate('');
        setSuspensionModal({ isOpen: true, delegate });
    };

    const confirmSuspension = (e: React.FormEvent) => {
        e.preventDefault();
        if (!suspensionModal.delegate) return;
        setData(prevData => ({
            ...prevData,
            delegates: prevData.delegates.map(d => 
                d.id === suspensionModal.delegate!.id 
                ? { 
                    ...d, 
                    performanceStatus: PerformanceStatus.Suspended, 
                    suspensionDate: suspensionDate,
                    suspensionReturnDate: suspensionReturnDate || undefined
                  } 
                : d
            )
        }));
        setSuspensionModal({ isOpen: false, delegate: null });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {isAddModalOpen && (
                <HRAddDelegateModal 
                    onClose={() => { setIsAddModalOpen(false); setDelegateToEdit(null); }}
                    onSave={handleSaveDelegate}
                    staff={data.staff}
                    delegateToEdit={delegateToEdit}
                />
            )}
            {resignationModal.isOpen && resignationModal.delegate && (
                 <ConfirmationModal
                    isOpen={resignationModal.isOpen}
                    onClose={() => setResignationModal({ isOpen: false, delegate: null })}
                    onConfirm={confirmResignation}
                    title={t('confirmResignation')}
                    message={t('areYouSureMarkResigned')}
                    confirmButtonText={`${t('yes')}, ${t('confirm')}`}
                />
            )}
            {deleteModal.isOpen && deleteModal.delegate && (
                 <ConfirmationModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, delegate: null })}
                    onConfirm={confirmDelete}
                    title={t('confirm')}
                    message={`${t('areYouSureYouWantTo')} ${t('action_terminate')} ${deleteModal.delegate.name}?`}
                    confirmButtonText={t('yes')}
                    confirmButtonColor="bg-red-600 hover:bg-red-700"
                />
            )}
            {suspensionModal.isOpen && suspensionModal.delegate && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={() => setSuspensionModal({ isOpen: false, delegate: null })}>
                    <div className="glass-card w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-orange-400 mb-4">{t('suspendDelegateModalTitle')} - {suspensionModal.delegate.name}</h3>
                        <form onSubmit={confirmSuspension} className="space-y-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">{t('suspensionDate')}</label>
                                <input type="date" value={suspensionDate} onChange={e => setSuspensionDate(e.target.value)} className="input-styled w-full" required min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-300">{t('returnDate')} <span className="text-gray-500 text-xs">{t('optional')}</span></label>
                                <input type="date" value={suspensionReturnDate} onChange={e => setSuspensionReturnDate(e.target.value)} className="input-styled w-full" min={suspensionDate} />
                                <p className="text-xs text-gray-500 mt-1">{t('indefinite')}</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setSuspensionModal({ isOpen: false, delegate: null })} className="btn-secondary">{t('cancel')}</button>
                                <button type="submit" className="btn-primary bg-red-600 hover:bg-red-500">{t('action_suspend')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('hrDelegateManagement')}</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                     <div className="relative flex-grow">
                             <i className="fas fa-search absolute top-3 ltr:left-3 rtl:right-3 text-gray-500"></i>
                             <input 
                                type="text" 
                                placeholder={`${t('delegateName')} / ${t('phoneNumber')} / ${t('delegateID')}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-2"
                             />
                    </div>
                    <button onClick={() => { setDelegateToEdit(null); setIsAddModalOpen(true); }} className="btn-primary flex items-center justify-center gap-2">
                        <i className="fas fa-plus-circle"></i> {t('addDelegate')}
                    </button>
                </div>
            </div>
            
            {/* Desktop Table */}
            <div className="glass-card p-4 hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm text-center">
                    <thead className="border-b border-gray-700 text-gray-400">
                        <tr>
                            <th className="p-3 ltr:text-left rtl:text-right">{t('delegateName')}</th>
                            <th className="p-3">{t('delegateID')}</th>
                            <th className="p-3">{t('phoneNumber')}</th>
                            <th className="p-3">{t('supervisorInCharge')}</th>
                            <th className="p-3">{t('joinDate')}</th>
                            <th className="p-3">{t('table_employmentStatus')}</th>
                            <th className="p-3 min-w-[200px]">{t('table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDelegates.length > 0 ? filteredDelegates.map(delegate => (
                            <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5 transition-colors">
                                <td className="p-3 font-semibold ltr:text-left rtl:text-right flex items-center gap-3">
                                    <img src={delegate.imageUrl} alt={delegate.name} className="w-10 h-10 rounded-full object-cover"/>
                                    {delegate.name}
                                </td>
                                <td className="p-3">{delegate.displayId || '-'}</td>
                                <td className="p-3 font-mono">{delegate.phone}</td>
                                <td className="p-3">{supervisors.find(s => s.id === delegate.supervisorId)?.name || 'N/A'}</td>
                                <td className="p-3 text-green-400">{formatDateWithHijri(delegate.joinDate)}</td>
                                <td className="p-3">
                                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-500/20 text-green-300">
                                        {t('active')}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleSuspendDelegate(delegate)} className="bg-yellow-600/50 hover:bg-yellow-500/50 text-yellow-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" title={t('action_suspend')}><i className="fas fa-pause"></i></button>
                                        <button onClick={() => handleMarkAsResigned(delegate)} className="bg-gray-600/50 hover:bg-gray-500/50 text-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" title={t('markAsResigned')}><i className="fas fa-user-times"></i></button>
                                        <button onClick={() => handleEditDelegate(delegate)} className="bg-blue-600/50 hover:bg-blue-500/50 text-blue-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" title={t('editDelegate')}><i className="fas fa-edit"></i></button>
                                        <button onClick={() => handleDeleteDelegate(delegate)} className="bg-red-600/50 hover:bg-red-500/50 text-red-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors" title={t('action_terminate')}><i className="fas fa-trash-alt"></i></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="p-6 text-center text-gray-400">{t('noActiveDelegates')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredDelegates.length > 0 ? filteredDelegates.map(delegate => (
                    <div key={delegate.id} className="glass-card p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-4 border-b border-gray-700 pb-3">
                            <img src={delegate.imageUrl} alt={delegate.name} className="w-14 h-14 rounded-full object-cover border-2 border-orange-500"/>
                            <div>
                                <h3 className="font-bold text-white text-lg">{delegate.name}</h3>
                                <p className="text-sm text-gray-400">{t('delegateID')}: <span className="font-mono text-orange-300">{delegate.displayId || '-'}</span></p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-400">{t('phoneNumber')}:</div>
                            <div className="text-right font-mono">{delegate.phone}</div>
                            <div className="text-gray-400">{t('supervisorInCharge')}:</div>
                            <div className="text-right text-white">{supervisors.find(s => s.id === delegate.supervisorId)?.name || 'N/A'}</div>
                            <div className="text-gray-400">{t('joinDate')}:</div>
                            <div className="text-right text-green-400">{formatDateWithHijri(delegate.joinDate)}</div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300">{t('active')}</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleSuspendDelegate(delegate)} className="bg-yellow-600/50 p-2 rounded-lg text-yellow-200" title={t('action_suspend')}><i className="fas fa-pause"></i></button>
                                <button onClick={() => handleMarkAsResigned(delegate)} className="bg-gray-600/50 p-2 rounded-lg text-gray-200" title={t('markAsResigned')}><i className="fas fa-user-times"></i></button>
                                <button onClick={() => handleEditDelegate(delegate)} className="bg-blue-600/50 p-2 rounded-lg text-blue-200" title={t('editDelegate')}><i className="fas fa-edit"></i></button>
                                <button onClick={() => handleDeleteDelegate(delegate)} className="bg-red-600/50 p-2 rounded-lg text-red-200" title={t('action_terminate')}><i className="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="p-6 text-center text-gray-400 glass-card">{t('noActiveDelegates')}</div>
                )}
            </div>
        </div>
    );
};

export default HRDelegateManagement;
