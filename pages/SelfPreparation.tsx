
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole, Delegate } from '../types';

const SelfPreparation: React.FC = () => {
    const { data, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter delegates who have started a shift TODAY and have verification photos
    const preparedDelegates = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        
        return data.delegates.filter(d => {
            // Basic filter: Active status + Role access check
            if (d.employmentStatus !== 'نشط') return false;
            if (currentUser?.role === UserRole.OpsSupervisor && d.supervisorId !== currentUser.id) return false;

            // Check if they have a shift start time for TODAY
            if (!d.lastShiftStartTime) return false;
            const shiftDate = new Date(d.lastShiftStartTime).toISOString().split('T')[0];
            
            return shiftDate === today && d.lastShiftFacePhoto && d.lastShiftCarPhoto;
        });
    }, [data.delegates, currentUser]);

    const filteredDelegates = useMemo(() => {
        if (!searchQuery) return preparedDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return preparedDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery))
        );
    }, [preparedDelegates, searchQuery]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{t('selfPreparation')}</h1>
                <div className="relative w-full sm:w-auto">
                     <i className="fas fa-search absolute top-3 ltr:left-3 rtl:right-3 text-gray-500"></i>
                     <input 
                        type="text" 
                        placeholder={`${t('delegateName')} / ${t('delegateID')}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-styled w-full sm:w-64 ltr:pl-10 rtl:pr-10 py-2"
                     />
                </div>
            </div>

            {filteredDelegates.length === 0 ? (
                <div className="glass-card p-10 text-center text-gray-400">
                    <i className="fas fa-camera text-5xl mb-4 opacity-50"></i>
                    <p className="text-lg">{t('noDataMatchingFilters')}</p>
                    <p className="text-sm mt-2">{t('instructionFace')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredDelegates.map(delegate => (
                        <div key={delegate.id} className="glass-card overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{delegate.name}</h3>
                                    <p className="text-sm text-gray-400">ID: {delegate.displayId}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-orange-400 font-mono bg-orange-900/30 px-2 py-1 rounded">
                                        {new Date(delegate.lastShiftStartTime!).toLocaleTimeString()}
                                    </div>
                                    <p className="text-xs text-green-400 mt-1 flex items-center justify-end gap-1">
                                        <i className="fas fa-check-circle"></i> {t('liveVerification')}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-4 grid grid-cols-2 gap-4 bg-gray-900/20 flex-grow">
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400 text-center">{t('faceCapture')}</p>
                                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-600 relative group">
                                        <img 
                                            src={delegate.lastShiftFacePhoto} 
                                            alt="Live Face" 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400 text-center">{t('carCapture')}</p>
                                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-600 relative group">
                                        <img 
                                            src={delegate.lastShiftCarPhoto} 
                                            alt="Live Car" 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-gray-800/30 border-t border-gray-700 text-center">
                                <span className="text-xs text-gray-500">{t('date')}: {new Date(delegate.lastShiftStartTime!).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SelfPreparation;
