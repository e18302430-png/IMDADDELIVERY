
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole } from '../types';

// Helper function to format Gregorian date and add Hijri date
const formatDateWithHijri = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return '-';
    // The input is 'YYYY-MM-DD'. Appending 'T00:00:00Z' ensures it's parsed as UTC midnight
    // to avoid timezone-related "off by one day" errors.
    const date = new Date(`${dateString}T00:00:00Z`);
    if (isNaN(date.getTime())) {
        return dateString; // Return original string if invalid
    }
    
    // Format Gregorian date as YYYY-MM-DD
    const gregorian = date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
    
    // Format Hijri date
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    });
    const hijri = hijriFormatter.format(date);

    return `${gregorian} (${hijri})`;
};

const ResignedDelegates: React.FC = () => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const resignedDelegates = useMemo(() => {
        return data.delegates.filter(d => d.employmentStatus === 'مستقيل');
    }, [data.delegates]);
    
    const filteredResignedDelegates = useMemo(() => {
        if (!searchQuery) return resignedDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return resignedDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [resignedDelegates, searchQuery]);

    const supervisors = useMemo(() => data.staff.filter(s => s.role === UserRole.OpsSupervisor), [data.staff]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('resignedDelegates')}</h1>
                 <div className="relative w-full sm:w-auto">
                         <i className="fas fa-search absolute top-3 ltr:left-3 rtl:right-3 text-gray-500"></i>
                         <input 
                            type="text" 
                            placeholder={`${t('delegateName')} / ${t('phoneNumber')} / ${t('delegateID')}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-2"
                         />
                </div>
            </div>
            
            <div className="glass-card p-4 overflow-x-auto">
                <table className="min-w-full text-sm text-center">
                    <thead className="border-b border-gray-700 text-gray-400">
                        <tr>
                            <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('delegateName')}</th>
                            <th scope="col" className="p-3">{t('delegateID')}</th>
                            <th scope="col" className="p-3">{t('supervisorInCharge')}</th>
                            <th scope="col" className="p-3">{t('joinDate')}</th>
                            <th scope="col" className="p-3">{t('resignationDate')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredResignedDelegates.length > 0 ? filteredResignedDelegates.map(delegate => (
                            <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5">
                                <td className="p-3 font-semibold ltr:text-left rtl:text-right flex items-center gap-3">
                                    <img src={delegate.imageUrl} alt={delegate.name} className="w-10 h-10 rounded-full object-cover"/>
                                    {delegate.name}
                                </td>
                                <td className="p-3">{delegate.displayId || '-'}</td>
                                <td className="p-3">{supervisors.find(s => s.id === delegate.supervisorId)?.name || 'N/A'}</td>
                                <td className="p-3 text-green-400">{formatDateWithHijri(delegate.joinDate)}</td>
                                <td className="p-3 text-red-400">{formatDateWithHijri(delegate.terminationDate)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-gray-400">{t('noResignedDelegates')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResignedDelegates;
