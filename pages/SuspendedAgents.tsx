


import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { PerformanceStatus, UserRole, Delegate } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ConfirmationModal from '../components/ConfirmationModal';

// Helper function to format Gregorian date and add Hijri date
const formatDateWithHijri = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return '-';
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) return dateString;
    
    const gregorian = date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
    const hijri = hijriFormatter.format(date);
    return `${gregorian} (${hijri})`;
};


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


const SuspendedAgents: React.FC = () => {
    const { data, setData } = useContext(AppContext);
    const { t } = useTranslation();
    const { delegates, staff } = data;
    const [searchQuery, setSearchQuery] = useState('');
    const [resumeModal, setResumeModal] = useState<{ isOpen: boolean, delegate: Delegate | null }>({ isOpen: false, delegate: null });

    const supervisors = useMemo(() => staff.filter(s => s.role === UserRole.OpsSupervisor), [staff]);

    const suspendedDelegates = useMemo(() => {
        return delegates.filter(delegate => delegate.performanceStatus === PerformanceStatus.Suspended);
    }, [delegates]);
    
    const filteredSuspendedDelegates = useMemo(() => {
        if (!searchQuery) return suspendedDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return suspendedDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [suspendedDelegates, searchQuery]);
    
    const handleExport = () => {
        const headers = [t('delegateName'), t('supervisorInCharge'), t('suspensionDate'), t('returnDate'), t('suspensionNotes')];
        const rows = filteredSuspendedDelegates.map(d => [
            d.name,
            supervisors.find(s => s.id === d.supervisorId)?.name || t('unknown'),
            d.suspensionDate || '-',
            d.suspensionReturnDate || t('indefinite'),
            d.notes || ''
        ]);
        exportToCsv('suspended_delegates', headers, rows);
    };
    
    const handleResumeWork = (delegate: Delegate) => {
        setResumeModal({ isOpen: true, delegate });
    };
    
    const confirmResumeWork = () => {
        if (!resumeModal.delegate) return;
        
        setData(prevData => ({
            ...prevData,
            delegates: prevData.delegates.map(d => 
                d.id === resumeModal.delegate!.id 
                ? { ...d, performanceStatus: PerformanceStatus.Average, suspensionDate: undefined, suspensionReturnDate: undefined } // Reset to average status
                : d
            )
        }));
        setResumeModal({ isOpen: false, delegate: null });
    };

    return (
        <div className="space-y-6 animate-fade-in">
             {resumeModal.isOpen && resumeModal.delegate && (
                <ConfirmationModal 
                    isOpen={resumeModal.isOpen}
                    onClose={() => setResumeModal({ isOpen: false, delegate: null })}
                    onConfirm={confirmResumeWork}
                    title={t('confirmResume')}
                    message={t('resumeDelegateMessage')}
                    confirmButtonText={t('yes')}
                    confirmButtonColor="bg-green-600 hover:bg-green-700"
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('suspendedDelegates')}</h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                     <div className="relative flex-grow sm:flex-grow-0">
                             <i className="fas fa-search absolute top-3 ltr:left-3 rtl:right-3 text-gray-500"></i>
                             <input 
                                type="text" 
                                placeholder={`${t('delegateName')} / ${t('phoneNumber')} / ${t('delegateID')}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-2"
                             />
                    </div>
                    <button 
                        onClick={handleExport}
                        className="btn-secondary bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20 hover:text-green-300 flex items-center"
                    >
                        <i className="fas fa-file-csv ltr:mr-2 rtl:ml-2"></i> {t('export')}
                    </button>
                </div>
            </div>


            <div className="overflow-x-auto glass-card p-1">
                <table className="min-w-full text-sm text-center">
                    <thead className="border-b border-gray-700 text-gray-400">
                        <tr>
                            <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('delegateName')}</th>
                            <th scope="col" className="p-3">{t('supervisorInCharge')}</th>
                             <th scope="col" className="p-3">{t('suspensionDate')}</th>
                            <th scope="col" className="p-3">{t('returnDate')}</th>
                            <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('suspensionNotes')}</th>
                            <th scope="col" className="p-3">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuspendedDelegates.length > 0 ? filteredSuspendedDelegates.map(delegate => (
                            <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5">
                                <td className="p-3 font-semibold ltr:text-left rtl:text-right">{delegate.name}</td>
                                <td className="p-3 text-gray-400">{supervisors.find(s => s.id === delegate.supervisorId)?.name || t('unknown')}</td>
                                <td className="p-3 text-red-300">{formatDateWithHijri(delegate.suspensionDate)}</td>
                                <td className="p-3 text-yellow-300">{delegate.suspensionReturnDate ? formatDateWithHijri(delegate.suspensionReturnDate) : t('indefinite')}</td>
                                <td className="p-3 ltr:text-left rtl:text-right max-w-md">{delegate.notes || t('noNotesRecorded')}</td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => handleResumeWork(delegate)}
                                        className="px-3 py-1.5 bg-green-600/80 text-white rounded-lg hover:bg-green-500 transition-colors text-xs font-bold"
                                    >
                                        {t('resumeWork')}
                                    </button>
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={6} className="p-6 text-center text-gray-400">{t('noSuspendedDelegates')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SuspendedAgents;