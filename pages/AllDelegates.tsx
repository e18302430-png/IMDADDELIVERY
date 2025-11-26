
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { Delegate, DelegateType, Staff, UserRole } from '../types';

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

const DelegateTable: React.FC<{ delegates: Delegate[], staff: Staff[] }> = ({ delegates, staff }) => {
    const { t } = useTranslation();
    const supervisors = useMemo(() => staff.filter(s => s.role === UserRole.OpsSupervisor), [staff]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center">
                <thead className="border-b border-gray-700 text-gray-400">
                    <tr>
                        <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('delegateName')}</th>
                        <th scope="col" className="p-3">{t('delegateID')}</th>
                        <th scope="col" className="p-3">{t('phoneNumber')}</th>
                        <th scope="col" className="p-3">{t('supervisorInCharge')}</th>
                    </tr>
                </thead>
                <tbody>
                    {delegates.length > 0 ? delegates.map(delegate => (
                        <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5">
                            <td className="p-3 font-semibold ltr:text-left rtl:text-right flex items-center gap-3">
                                <img src={delegate.imageUrl} alt={delegate.name} className="w-10 h-10 rounded-full object-cover"/>
                                {delegate.name}
                            </td>
                            <td className="p-3">{delegate.displayId || '-'}</td>
                            <td className="p-3 font-mono">{delegate.phone}</td>
                            <td className="p-3">{supervisors.find(s => s.id === delegate.supervisorId)?.name || 'N/A'}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-400">{t('noActiveDelegates')}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};


const AllDelegates: React.FC = () => {
    const { data } = useContext(AppContext);
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'kafala' | 'ajir'>('kafala');
    const [searchQuery, setSearchQuery] = useState('');
    
    const activeDelegates = useMemo(() => {
        return data.delegates.filter(d => d.employmentStatus === 'نشط');
    }, [data.delegates]);
    
    const filteredActiveDelegates = useMemo(() => {
        if (!searchQuery) return activeDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return activeDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [activeDelegates, searchQuery]);

    const kafalaDelegates = useMemo(() => filteredActiveDelegates.filter(d => d.type === DelegateType.Kafala), [filteredActiveDelegates]);
    const ajirDelegates = useMemo(() => filteredActiveDelegates.filter(d => d.type === DelegateType.Ajir), [filteredActiveDelegates]);


    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('allDelegates')}</h1>
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
            
            <div className="glass-card p-4">
                 <div className="border-b border-gray-700">
                    <nav className="-mb-px flex ltr:space-x-4 rtl:space-x-reverse rtl:space-x-4" aria-label="Tabs">
                         <TabButton name={t('kafalaDelegates')} isActive={activeTab === 'kafala'} count={kafalaDelegates.length} onClick={() => setActiveTab('kafala')} />
                         <TabButton name={t('ajirDelegates')} isActive={activeTab === 'ajir'} count={ajirDelegates.length} onClick={() => setActiveTab('ajir')} />
                    </nav>
                </div>

                <div className="pt-4">
                    {activeTab === 'kafala' ? (
                        <DelegateTable delegates={kafalaDelegates} staff={data.staff} />
                    ) : (
                        <DelegateTable delegates={ajirDelegates} staff={data.staff} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllDelegates;
