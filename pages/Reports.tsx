


import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { DelegateType, Delegate, UserRole, Staff } from '../types';
import { useTranslation } from '../hooks/useTranslation';

// Utility function to export data to CSV
const exportToCsv = (filename: string, headers: string[], rows: (string | number | undefined)[][]) => {
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

type FilterPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

const Reports: React.FC = () => {
    const { data, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const { delegates, staff, dailyReports } = data;
    const supervisors = useMemo(() => staff.filter(s => s.role === UserRole.OpsSupervisor), [staff]);

    const [showKafala, setShowKafala] = useState(true);
    const [showAjir, setShowAjir] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterPeriod>('monthly');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>(''); // New State for Supervisor Filter
    
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            start: firstDayOfMonth.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0],
        };
    });

    const handleFilterChange = (period: FilterPeriod) => {
        setActiveFilter(period);

        if (period === 'custom') {
            return; // Let user pick dates
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (period === 'daily') {
            // startDate is already today's start
        } else if (period === 'weekly') {
            const day = startDate.getDay(); // 0=Sun, 6=Sat
            const diff = (day + 1) % 7; // Assuming week starts Saturday
            startDate.setDate(startDate.getDate() - diff);
        } else if (period === 'monthly') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }

        setDateRange({
            start: startDate.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0],
        });
    };

    const { reportDelegates, kafalaTotalOrders, ajirTotalOrders, periodStart, periodEnd } = useMemo(() => {
        const today = new Date();
        
        // Base delegates filtering by Supervisor Selection
        let baseDelegates = delegates;
        if (selectedSupervisorId) {
            baseDelegates = baseDelegates.filter(d => d.supervisorId === parseInt(selectedSupervisorId));
        } else if (currentUser?.role === UserRole.OpsSupervisor) {
             baseDelegates = baseDelegates.filter(d => d.supervisorId === currentUser.id);
        }

        // Daily filter shows LIVE, UNCONFIRMED data for today
        if (activeFilter === 'daily') {
            let liveDelegates = baseDelegates.filter(d => {
                const typeMatch = (showKafala && d.type === DelegateType.Kafala) || (showAjir && d.type === DelegateType.Ajir);
                return typeMatch && d.employmentStatus === 'نشط';
            });
            
            const totalKafala = liveDelegates.filter(d => d.type === DelegateType.Kafala).reduce((sum, d) => sum + (d.ordersDelivered || 0), 0);
            const totalAjir = liveDelegates.filter(d => d.type === DelegateType.Ajir).reduce((sum, d) => sum + (d.ordersDelivered || 0), 0);
            
            return {
                reportDelegates: liveDelegates,
                kafalaTotalOrders: totalKafala,
                ajirTotalOrders: totalAjir,
                periodStart: today,
                periodEnd: today
            };
        }
        
        // Other filters use historical, CONFIRMED data from dailyReports
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);

        // Filter reports by date AND by selected supervisor if applicable
        const relevantReports = (dailyReports || []).filter(report => {
            const reportDate = new Date(report.date);
            reportDate.setUTCHours(0, 0, 0, 0);
            
            const isDateMatch = reportDate >= start && reportDate <= end;
            
            // Check Supervisor Filter
            if (selectedSupervisorId) {
                return isDateMatch && report.supervisorId === parseInt(selectedSupervisorId);
            } else if (currentUser?.role === UserRole.OpsSupervisor) {
                return isDateMatch && report.supervisorId === currentUser.id;
            }

            return isDateMatch;
        });
        
        const delegateTotals = new Map<number, number>();
        relevantReports.forEach(report => {
            report.entries.forEach(entry => {
                const currentTotal = delegateTotals.get(entry.delegateId) || 0;
                delegateTotals.set(entry.delegateId, currentTotal + entry.ordersDelivered);
            });
        });
        
        // We use baseDelegates here which is already filtered by Supervisor above if selected
        let filteredDelegates = baseDelegates.filter(d => {
             const typeMatch = (showKafala && d.type === DelegateType.Kafala) || (showAjir && d.type === DelegateType.Ajir);
             const joinDate = d.joinDate ? new Date(d.joinDate) : null;
             const termDate = d.terminationDate ? new Date(d.terminationDate) : null;
             const wasActiveInPeriod = joinDate && joinDate <= end && (!termDate || termDate >= start);
             return typeMatch && wasActiveInPeriod;
        }).map(d => ({
            ...d,
            ordersDelivered: delegateTotals.get(d.id) || 0,
        }));
        
        const totalKafala = filteredDelegates.filter(d => d.type === DelegateType.Kafala).reduce((sum, d) => sum + (d.ordersDelivered || 0), 0);
        const totalAjir = filteredDelegates.filter(d => d.type === DelegateType.Ajir).reduce((sum, d) => sum + (d.ordersDelivered || 0), 0);
        
        return {
            reportDelegates: filteredDelegates,
            kafalaTotalOrders: totalKafala,
            ajirTotalOrders: totalAjir,
            periodStart: start,
            periodEnd: end
        };
    }, [activeFilter, dateRange, delegates, dailyReports, showKafala, showAjir, currentUser, selectedSupervisorId]);
    
    const finalFilteredDelegates = useMemo(() => {
         if (!searchQuery) return reportDelegates;
        const lowerQuery = searchQuery.toLowerCase();
        return reportDelegates.filter(d => 
            d.name.toLowerCase().includes(lowerQuery) ||
            d.phone.includes(lowerQuery) ||
            (d.displayId && d.displayId.includes(lowerQuery)) ||
            (d.nationalId && d.nationalId.includes(lowerQuery))
        );
    }, [reportDelegates, searchQuery]);


    const handleExport = () => {
        const headers = [t('delegateName'), t('delegateID'), t('phoneNumber'), t('supervisorInCharge'), t('joinDate'), t('resignationDate'), t('delegateType'), t('orderCount')];
        const rows = finalFilteredDelegates.map(d => [
            d.name,
            d.displayId,
            d.phone,
            supervisors.find(s => s.id === d.supervisorId)?.name || 'N/A',
            d.joinDate || '-',
            d.terminationDate || '-',
            d.type,
            d.ordersDelivered || 0
        ]);
        exportToCsv(`comprehensive_delegates_report`, headers, rows);
    };

    const getHijriPart = (dateString?: string) => {
        if (!dateString) return '';
        const formatted = formatDateWithHijri(dateString);
        const match = formatted.match(/\((.*)\)/);
        return match ? `(${match[1]})` : '';
    };

    const filterButtons: { period: FilterPeriod, labelKey: string, icon: string }[] = [
        { period: 'daily', labelKey: 'daily', icon: 'fa-calendar-day' },
        { period: 'weekly', labelKey: 'weekly', icon: 'fa-calendar-week' },
        { period: 'monthly', labelKey: 'monthly', icon: 'fa-calendar-alt' },
        { period: 'custom', labelKey: 'custom', icon: 'fa-sliders-h' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-white">{t('comprehensiveReports')}</h1>
            
            <div className="glass-card p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-semibold text-white">{t('delegatePerformanceReport')}</h2>
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
                
                <div className="flex flex-col lg:flex-row gap-6 mb-4 pb-4 border-b border-gray-700">
                    <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-300 mb-2">{t('timePeriod')}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                            {filterButtons.map(({ period, labelKey, icon }) => (
                                <button
                                    key={period}
                                    onClick={() => handleFilterChange(period)}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                                        activeFilter === period
                                            ? 'bg-orange-500 text-white shadow-lg'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                                >
                                    <i className={`fas ${icon}`}></i>
                                    <span>{t(labelKey)}</span>
                                </button>
                            ))}
                        </div>
                        {activeFilter === 'custom' && (
                            <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-md mt-4 animate-fade-in">
                                <div className="flex flex-col items-center">
                                    <input 
                                        type="date" 
                                        value={dateRange.start}
                                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        className="input-styled text-sm p-1.5"
                                    />
                                    <span className="text-xs text-gray-400 mt-1">{getHijriPart(dateRange.start)}</span>
                                </div>
                                <span className="text-gray-400">{t('to')}</span>
                                <div className="flex flex-col items-center">
                                    <input 
                                        type="date" 
                                        value={dateRange.end}
                                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        className="input-styled text-sm p-1.5"
                                    />
                                    <span className="text-xs text-gray-400 mt-1">{getHijriPart(dateRange.end)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                     <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-300 mb-2">{t('filterBySupervisor')}</h3>
                        <div className="mb-4">
                            <select 
                                value={selectedSupervisorId} 
                                onChange={e => setSelectedSupervisorId(e.target.value)}
                                className="input-styled w-full"
                                disabled={currentUser?.role === UserRole.OpsSupervisor} // Supervisor sees only self
                            >
                                <option value="">{t('allSupervisors')}</option>
                                {supervisors.map(sup => (
                                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                                ))}
                            </select>
                        </div>

                        <h3 className="text-base font-semibold text-gray-300 mb-2">{t('delegateType')}</h3>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center text-white cursor-pointer">
                                <input type="checkbox" checked={showKafala} onChange={e => setShowKafala(e.target.checked)} className="w-5 h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"/>
                                <span className="ltr:ml-2 rtl:mr-2">{t('kafalaDelegates')}</span>
                            </label>
                             <label className="flex items-center text-white cursor-pointer">
                                <input type="checkbox" checked={showAjir} onChange={e => setShowAjir(e.target.checked)} className="w-5 h-5 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"/>
                                <span className="ltr:ml-2 rtl:mr-2">{t('ajirDelegates')}</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mb-6 p-3 bg-gray-900/50 rounded-md text-center">
                    <span className="text-gray-300 font-semibold">
                       {activeFilter === 'daily' ? `${t('reportForDate')}: ` : `${t('reportForPeriod')}: `}
                    </span>
                    <span className="text-orange-400 font-mono">
                        {formatDateWithHijri(periodStart.toISOString().split('T')[0])}
                    </span>
                    {activeFilter !== 'daily' && (
                        <>
                            <span className="text-gray-400 mx-2">{t('to')}</span>
                            <span className="text-orange-400 font-mono">
                                {formatDateWithHijri(periodEnd.toISOString().split('T')[0])}
                            </span>
                        </>
                    )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {showKafala && <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400">{t('totalKafalaOrders')}</p>
                        <p className="text-3xl font-bold text-orange-400">{kafalaTotalOrders}</p>
                    </div>}
                    {showAjir && <div className="bg-gray-800/50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400">{t('totalAjirOrders')}</p>
                        <p className="text-3xl font-bold text-cyan-400">{ajirTotalOrders}</p>
                    </div>}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-center">
                        <thead className="border-b border-gray-700 text-gray-400">
                            <tr>
                                <th scope="col" className="p-3 ltr:text-left rtl:text-right">{t('delegateName')}</th>
                                <th scope="col" className="p-3">{t('delegateID')}</th>
                                <th scope="col" className="p-3">{t('phoneNumber')}</th>
                                <th scope="col" className="p-3">{t('supervisorInCharge')}</th>
                                <th scope="col" className="p-3">{t('joinDate')}</th>
                                <th scope="col" className="p-3">{t('resignationDate')}</th>
                                <th scope="col" className="p-3">{t('orderCount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {finalFilteredDelegates.length > 0 ? finalFilteredDelegates.map(delegate => (
                                <tr key={delegate.id} className="border-b border-gray-800 hover:bg-orange-500/5">
                                    <td className="p-3 font-semibold ltr:text-left rtl:text-right flex items-center gap-3">
                                        <img src={delegate.imageUrl} alt={delegate.name} className="w-10 h-10 rounded-full object-cover"/>
                                        {delegate.name}
                                    </td>
                                    <td className="p-3">{delegate.displayId || '-'}</td>
                                    <td className="p-3 font-mono">{delegate.phone}</td>
                                    <td className="p-3">{supervisors.find(s => s.id === delegate.supervisorId)?.name || 'N/A'}</td>
                                    <td className="p-3 text-green-400">{formatDateWithHijri(delegate.joinDate)}</td>
                                    <td className="p-3 text-red-400">{formatDateWithHijri(delegate.terminationDate)}</td>
                                    <td className="p-3 font-bold text-lg text-white">{delegate.ordersDelivered || 0}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-gray-400">{t('noDataMatchingFilters')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
};

export default Reports;