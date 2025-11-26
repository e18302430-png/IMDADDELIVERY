


import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { UserRole, Delegate } from '../types';
import { generatePerformanceAnalysis, PerformanceAnalysisPayload, generateSingleDelegateAnalysis, SingleDelegatePayload } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';


const AdviceCard: React.FC<{
  icon: string;
  title: string;
  advice: string;
}> = ({ icon, title, advice }) => {
  return (
    <div className="flip-card">
      <div className="flip-card-inner">
        <div className="flip-card-front">
          <i className={`fas ${icon} text-4xl text-orange-400 mb-2`}></i>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <div className="flip-card-back">
          <p className="font-semibold">{advice}</p>
        </div>
      </div>
    </div>
  );
};

type PerfFilter = '7d' | '30d' | 'month';
type PerformanceTier = 'Excellent' | 'Average' | 'Weak';

interface StatCardProps {
    title: string;
    value: string;
    icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
    <div className="glass-card p-4 flex items-center gap-4">
        <div className="bg-orange-500/10 text-orange-400 h-12 w-12 rounded-lg flex items-center justify-center text-xl">
            <i className={`fas ${icon}`}></i>
        </div>
        <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const OrdersTrendChart: React.FC<{ data: { date: string, orders: number }[] }> = ({ data }) => {
    if (data.length < 2) return <div className="flex items-center justify-center h-full text-gray-500">{/* Not enough data for a trend */}</div>;
    
    const width = 500;
    const height = 200;
    const padding = 30;

    const maxOrders = Math.max(...data.map(d => d.orders), 0);
    const minDate = new Date(data[0].date);
    const maxDate = new Date(data[data.length - 1].date);
    
    const getX = (date: Date) => {
        return padding + (date.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime()) * (width - 2 * padding);
    };
    
    const getY = (orders: number) => {
        return height - padding - (orders / (maxOrders || 1)) * (height - 2 * padding);
    };

    const pathData = data.map(d => `${getX(new Date(d.date))},${getY(d.orders)}`).join(' L ');
    const areaPathData = `M ${getX(minDate)},${height-padding} L ${pathData} L ${getX(maxDate)},${height-padding} Z`;
    
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Orders trend chart">
            <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.05"/>
                </linearGradient>
            </defs>
            <path d={areaPathData} fill="url(#areaGradient)" />
            <path d={`M ${pathData}`} fill="none" stroke="var(--primary-color)" strokeWidth="2" />
             {data.map((d, i) => (
                <circle key={i} cx={getX(new Date(d.date))} cy={getY(d.orders)} r="3" fill="var(--primary-color)" />
            ))}
        </svg>
    );
};


const TopDelegatesChart: React.FC<{ delegates: { name: string, totalOrders: number }[] }> = ({ delegates }) => {
    const { t } = useTranslation();
    const maxOrders = Math.max(...delegates.map(d => d.totalOrders), 0);
    
    return (
        <div className="space-y-3">
            {delegates.map((d, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-20 truncate text-gray-300 ltr:text-right rtl:text-left">{d.name}</span>
                    <div className="flex-1 bg-gray-700/50 rounded-full h-4">
                        <div 
                            className="bg-orange-500 h-4 rounded-full flex items-center justify-end px-2"
                            style={{ width: `${(d.totalOrders / (maxOrders || 1)) * 100}%` }}
                        >
                           <span className="text-xs font-bold text-white">{d.totalOrders}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TierIndicator: React.FC<{ tier: PerformanceTier }> = ({ tier }) => {
    const { t } = useTranslation();
    const tierInfo = {
        Excellent: { textKey: 'tier_Excellent', color: 'bg-green-500/20 text-green-300' },
        Average: { textKey: 'tier_Average', color: 'bg-yellow-500/20 text-yellow-300' },
        Weak: { textKey: 'tier_Weak', color: 'bg-red-500/20 text-red-300' },
    }[tier];

    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${tierInfo.color}`}>
            {t(tierInfo.textKey)}
        </span>
    );
};

const DelegateDetailModal: React.FC<{
    delegate: any;
    reports: { date: string, entries: any[] }[];
    onClose: () => void;
}> = ({ delegate, reports, onClose }) => {
    const { t } = useTranslation();
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const analyzeDelegate = async () => {
            setIsLoading(true);
            const payload: SingleDelegatePayload = {
                name: delegate.name,
                avgOrders: delegate.avgOrders,
                performanceTier: t(`tier_${delegate.tier}`),
                attendanceRate: `${delegate.attendanceRate.toFixed(0)}%`,
                efficiency: delegate.efficiency,
            };
            try {
                const result = await generateSingleDelegateAnalysis(payload);
                setAiAnalysis(result);
            } catch (error) {
                setAiAnalysis(t('error_ai_analysis_failed'));
            } finally {
                setIsLoading(false);
            }
        };
        analyzeDelegate();
    }, [delegate, t]);

    const delegateDailyData = useMemo(() => {
        const dailyTotals: { [date: string]: number } = {};
        reports.forEach(report => {
            const delegateEntry = report.entries.find(e => e.delegateId === delegate.id);
            if (delegateEntry) {
                dailyTotals[report.date] = (dailyTotals[report.date] || 0) + delegateEntry.ordersDelivered;
            }
        });
        return Object.entries(dailyTotals)
            .map(([date, orders]) => ({ date, orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [delegate.id, reports]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex items-center gap-4">
                    <img src={delegate.imageUrl} alt={delegate.name} className="w-16 h-16 rounded-full object-cover border-4 border-orange-500"/>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{delegate.name}</h2>
                        <p className="text-orange-400 font-semibold">{t('delegatePerformanceAnalysis')}</p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-gray-800/50 p-3 rounded-lg"><p className="text-xs text-gray-400">{t('table_totalOrders')}</p><p className="text-xl font-bold">{delegate.totalOrders}</p></div>
                        <div className="bg-gray-800/50 p-3 rounded-lg"><p className="text-xs text-gray-400">{t('table_avgOrders')}</p><p className="text-xl font-bold">{delegate.avgOrders}</p></div>
                        <div className="bg-gray-800/50 p-3 rounded-lg"><p className="text-xs text-gray-400">{t('table_attendanceRate')}</p><p className="text-xl font-bold">{delegate.attendanceRate.toFixed(0)}%</p></div>
                        <div className="bg-gray-800/50 p-3 rounded-lg"><p className="text-xs text-gray-400">{t('efficiency_orders_per_hour')}</p><p className="text-xl font-bold text-cyan-400">{delegate.efficiency}</p></div>
                    </div>

                    <div className="bg-gray-900/30 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-orange-400 mb-2">{t('aiPerformanceSummary')}</h3>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-gray-400">
                                <LoadingSpinner />
                                <span>{t('generatingAnalysis')}</span>
                            </div>
                        ) : (
                            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }}></div>
                        )}
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{t('dailyPerformance')}</h3>
                        {delegateDailyData.length > 1 ? <OrdersTrendChart data={delegateDailyData} /> : <div className="text-center py-8 text-gray-500">{t('noDataForPeriod')}</div>}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 text-center flex-shrink-0">
                    <button onClick={onClose} className="btn-secondary">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
    const { data, currentUser } = useContext(AppContext);
    const { t } = useTranslation();
    const [perfFilter, setPerfFilter] = useState<PerfFilter>('7d');
    const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [selectedDelegate, setSelectedDelegate] = useState<any | null>(null);

    const finalReports = useMemo(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        let startDate = new Date();

        switch (perfFilter) {
            case '7d':
                startDate.setDate(today.getDate() - 6);
                break;
            case '30d':
                startDate.setDate(today.getDate() - 29);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
        }
        startDate.setHours(0, 0, 0, 0);

        const relevantReports = data.dailyReports.filter(report => {
            const reportDate = new Date(report.date);
            return reportDate >= startDate && reportDate <= today;
        });

        const reportDataByDate: { [date: string]: { date: string, entries: any[] } } = {};
        relevantReports.forEach(r => {
            reportDataByDate[r.date] = r;
        });
        
        if (new Date(todayStr) >= startDate && !reportDataByDate[todayStr]) {
            const liveEntries = data.delegates
                .filter(d => d.employmentStatus === 'نشط')
                .map(d => ({
                    delegateId: d.id,
                    ordersDelivered: d.ordersDelivered || 0,
                    activity: d.activity || [],
                    weekendAbsence: d.weekendAbsence,
                }));
            
            if (liveEntries.some(e => e.activity && e.activity.some(a => a.status === 'Present' || a.status === 'Absent'))) {
                 reportDataByDate[todayStr] = { date: todayStr, entries: liveEntries };
            }
        }

        return Object.values(reportDataByDate);
    }, [data.dailyReports, data.delegates, perfFilter]);
    
    const performanceData = useMemo(() => {
        if (finalReports.length === 0) {
            return {
                delegates: [],
                totalOrders: 0,
                avgDailyOrders: '0.0',
                overallAttendance: '0%',
                topPerformer: '-',
                tierDistribution: { excellent: 0, average: 0, weak: 0 },
            };
        }

        const delegateStats: { [id: number]: { name: string, imageUrl: string, totalOrders: number, daysWorked: number, attendedHours: number, totalHours: number, weekendAbsences: number } } = {};
        
        data.delegates.forEach(d => {
             delegateStats[d.id] = { name: d.name, imageUrl: d.imageUrl || '', totalOrders: 0, daysWorked: 0, attendedHours: 0, totalHours: 0, weekendAbsences: 0 };
        });

        finalReports.forEach(report => {
            report.entries.forEach(entry => {
                if (delegateStats[entry.delegateId]) {
                    delegateStats[entry.delegateId].totalOrders += entry.ordersDelivered;
                    delegateStats[entry.delegateId].daysWorked += 1;
                    
                    const attended = entry.activity.filter(a => a.status === 'Present').length;
                    const absent = entry.activity.filter(a => a.status === 'Absent').length;
                    delegateStats[entry.delegateId].attendedHours += attended;
                    delegateStats[entry.delegateId].totalHours += (attended + absent);

                    if(entry.weekendAbsence?.thursday) delegateStats[entry.delegateId].weekendAbsences++;
                    if(entry.weekendAbsence?.friday) delegateStats[entry.delegateId].weekendAbsences++;
                    if(entry.weekendAbsence?.saturday) delegateStats[entry.delegateId].weekendAbsences++;
                }
            });
        });
        
        const getTier = (avgOrders: number): PerformanceTier => {
            if (avgOrders >= 15) return 'Excellent';
            if (avgOrders >= 12) return 'Average';
            return 'Weak';
        };

        const processedDelegates = Object.entries(delegateStats)
            .map(([id, stats]) => {
                const avgOrdersNum = stats.daysWorked > 0 ? (stats.totalOrders / stats.daysWorked) : 0;
                return {
                    id: parseInt(id),
                    ...stats,
                    avgOrders: avgOrdersNum.toFixed(1),
                    attendanceRate: stats.totalHours > 0 ? ((stats.attendedHours / stats.totalHours) * 100) : 0,
                    efficiency: stats.attendedHours > 0 ? (stats.totalOrders / stats.attendedHours).toFixed(2) : '0.00',
                    tier: getTier(avgOrdersNum),
                };
            })
            .filter(d => d.daysWorked > 0)
            .sort((a, b) => b.totalOrders - a.totalOrders);

        if (processedDelegates.length === 0) {
            return {
                delegates: [],
                totalOrders: 0,
                avgDailyOrders: '0.0',
                overallAttendance: '0%',
                topPerformer: '-',
                tierDistribution: { excellent: 0, average: 0, weak: 0 },
            };
        }
            
        const totalOrders = processedDelegates.reduce((sum, d) => sum + d.totalOrders, 0);
        const totalDays = finalReports.length;
        const avgDailyOrders = (totalOrders / (processedDelegates.length || 1) / (totalDays || 1)).toFixed(1);

        const totalAttendedHours = processedDelegates.reduce((sum, d) => sum + d.attendedHours, 0);
        const totalPossibleHours = processedDelegates.reduce((sum, d) => sum + d.totalHours, 0);
        const totalAttendanceRate = totalPossibleHours > 0 ? (totalAttendedHours / totalPossibleHours) * 100 : 0;
        
        const tierDistribution = processedDelegates.reduce((acc, d) => {
            if (d.tier === 'Excellent') acc.excellent++;
            else if (d.tier === 'Average') acc.average++;
            else if (d.tier === 'Weak') acc.weak++;
            return acc;
        }, { excellent: 0, average: 0, weak: 0 });

        return {
            delegates: processedDelegates,
            totalOrders,
            avgDailyOrders: avgDailyOrders,
            overallAttendance: isNaN(totalAttendanceRate) ? '0%' : totalAttendanceRate.toFixed(0) + '%',
            topPerformer: processedDelegates[0]?.name || '-',
            tierDistribution,
        };
    }, [data.delegates, finalReports]);
    
    const ordersTrendData = useMemo(() => {
        const dailyTotals: { [date: string]: number } = {};
        finalReports.forEach(report => {
            const total = report.entries.reduce((sum, entry) => sum + entry.ordersDelivered, 0);
            dailyTotals[report.date] = (dailyTotals[report.date] || 0) + total;
        });
        
        return Object.entries(dailyTotals)
            .map(([date, orders]) => ({ date, orders }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [finalReports]);

    useEffect(() => {
        const analyze = async () => {
            if (isAnalysisVisible && performanceData && performanceData.delegates.length > 0) {
                setIsAnalysisLoading(true);
                setAiAnalysis('');
                
                const payload: PerformanceAnalysisPayload = {
                    totalOrders: performanceData.totalOrders,
                    avgDailyOrders: performanceData.avgDailyOrders,
                    overallAttendance: performanceData.overallAttendance,
                    topPerformer: performanceData.topPerformer,
                    tierDistribution: performanceData.tierDistribution,
                    delegates: performanceData.delegates.map(d => ({
                        name: d.name,
                        totalOrders: d.totalOrders,
                        avgOrders: d.avgOrders,
                        attendanceRate: d.attendanceRate,
                    })),
                };
                
                try {
                    const result = await generatePerformanceAnalysis(payload);
                    setAiAnalysis(result);
                } catch (error) {
                    console.error("AI analysis failed:", error);
                    setAiAnalysis(t('error_ai_analysis_failed', "AI analysis failed. Please try again later."));
                } finally {
                    setIsAnalysisLoading(false);
                }
            }
        };
        analyze();
    }, [isAnalysisVisible, performanceData, t]);
    
    const adviceCards = useMemo(() => {
        const role = currentUser?.role;
        switch (role) {
            case UserRole.HR:
                return [
                    { icon: "fa-user-plus", title: t('hr_primaryGoal'), advice: t('hr_primaryGoalAdvice') },
                    { icon: "fa-heart", title: t('hr_tipOfTheDay'), advice: t('hr_tipOfTheDayAdvice') },
                    { icon: "fa-file-shield", title: t('hr_successIndicator'), advice: t('hr_successIndicatorAdvice') }
                ];
            case UserRole.GeneralManager:
                 return [
                    { icon: "fa-chart-pie", title: t('gm_primaryGoal'), advice: t('gm_primaryGoalAdvice') },
                    { icon: "fa-sitemap", title: t('gm_tipOfTheDay'), advice: t('gm_tipOfTheDayAdvice') },
                    { icon: "fa-brain", title: t('gm_successIndicator'), advice: t('gm_successIndicatorAdvice') }
                ];
            case UserRole.MovementManager:
                 return [
                    { icon: "fa-tachometer-alt", title: t('mm_primaryGoal'), advice: t('mm_primaryGoalAdvice') },
                    { icon: "fa-headset", title: t('mm_tipOfTheDay'), advice: t('mm_tipOfTheDayAdvice') },
                    { icon: "fa-bolt", title: t('mm_successIndicator'), advice: t('mm_successIndicatorAdvice') }
                ];
            case UserRole.Finance:
                 return [
                    { icon: "fa-file-invoice-dollar", title: t('fin_primaryGoal'), advice: t('fin_primaryGoalAdvice') },
                    { icon: "fa-search-dollar", title: t('fin_tipOfTheDay'), advice: t('fin_tipOfTheDayAdvice') },
                    { icon: "fa-balance-scale", title: t('fin_successIndicator'), advice: t('fin_successIndicatorAdvice') }
                ];
            case UserRole.Legal:
                 return [
                    { icon: "fa-gavel", title: t('legal_primaryGoal'), advice: t('legal_primaryGoalAdvice') },
                    { icon: "fa-file-contract", title: t('legal_tipOfTheDay'), advice: t('legal_tipOfTheDayAdvice') },
                    { icon: "fa-shield-alt", title: t('legal_successIndicator'), advice: t('legal_successIndicatorAdvice') }
                ];
            default: // OpsSupervisor and others
                return [
                    { icon: "fa-bullseye", title: t('primaryGoal'), advice: t('primaryGoalAdvice') },
                    { icon: "fa-lightbulb", title: t('tipOfTheDay'), advice: t('tipOfTheDayAdvice') },
                    { icon: "fa-chart-line", title: t('successIndicator'), advice: t('successIndicatorAdvice') }
                ];
        }
    }, [currentUser, t]);
    
    const filterButtons: { id: PerfFilter; label: string; }[] = [
        { id: '7d', label: t('last7Days') },
        { id: '30d', label: t('last30Days') },
        { id: 'month', label: t('thisMonth') },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {selectedDelegate && <DelegateDetailModal delegate={selectedDelegate} reports={finalReports} onClose={() => setSelectedDelegate(null)} />}
            <h1 className="text-4xl font-bold text-white">{t('strategicGuidanceBoard')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {adviceCards.map(card => <AdviceCard key={card.title} {...card} />)}
            </div>
            
             <div className="text-center py-4">
                <button 
                    onClick={() => setIsAnalysisVisible(prev => !prev)}
                    className="btn-primary"
                >
                    <i className={`fas ${isAnalysisVisible ? 'fa-chevron-up' : 'fa-chart-bar'} ltr:mr-2 rtl:ml-2`}></i>
                    {isAnalysisVisible ? t('hideAdvancedPerformanceAnalysis') : t('showAdvancedPerformanceAnalysis')}
                </button>
            </div>

            {isAnalysisVisible && (
                <div className="glass-card p-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                        <h2 className="text-2xl font-semibold text-white">{t('advancedPerformanceAnalysis')}</h2>
                        <div className="flex items-center gap-2 p-1 bg-gray-900/50 rounded-lg">
                            {filterButtons.map(btn => (
                                <button key={btn.id} onClick={() => setPerfFilter(btn.id)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${perfFilter === btn.id ? 'bg-orange-500 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {!performanceData || performanceData.delegates.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-chart-bar text-5xl text-gray-500 mb-4"></i>
                            <h3 className="text-xl text-gray-300">{t('noDataForPeriod')}</h3>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title={t('totalOrders')} value={performanceData.totalOrders.toString()} icon="fa-box-open" />
                            <StatCard title={t('avgDailyOrders')} value={performanceData.avgDailyOrders} icon="fa-chart-line" />
                            <StatCard title={t('overallAttendance')} value={performanceData.overallAttendance} icon="fa-user-check" />
                            <StatCard title={t('topPerformer')} value={performanceData.topPerformer} icon="fa-trophy" />
                            </div>

                            <div className="bg-gray-900/30 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-orange-400 mb-2">{t('aiPerformanceSummary')}</h3>
                                {isAnalysisLoading ? (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <LoadingSpinner />
                                        <span>{t('generatingAnalysis')}</span>
                                    </div>
                                ) : (
                                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                <div className="lg:col-span-3 bg-gray-900/30 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-white mb-4">{t('ordersTrend')}</h3>
                                    <OrdersTrendChart data={ordersTrendData} />
                                </div>
                                <div className="lg:col-span-2 bg-gray-900/30 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-white mb-4">{t('topDelegatesByOrders')}</h3>
                                    <TopDelegatesChart delegates={performanceData.delegates.slice(0, 5)} />
                                </div>
                            </div>
                            
                            <div className="bg-gray-900/30 p-4 rounded-lg overflow-x-auto">
                                <table className="w-full text-sm text-center">
                                    <thead className="text-gray-400">
                                        <tr>
                                            <th className="p-2 ltr:text-left rtl:text-right">{t('table_delegate')}</th>
                                            <th className="p-2">{t('table_totalOrders')}</th>
                                            <th className="p-2">{t('table_avgOrders')}</th>
                                            <th className="p-2">{t('performanceTier')}</th>
                                            <th className="p-2">{t('table_attendanceRate')}</th>
                                            <th className="p-2">{t('efficiency_orders_per_hour')}</th>
                                            <th className="p-2">{t('table_weekendAbsences')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performanceData.delegates.map(d => (
                                            <tr key={d.id} className="border-t border-gray-700/50 hover:bg-orange-500/5 cursor-pointer transition-colors" onClick={() => setSelectedDelegate(d)}>
                                                <td className="p-2 font-semibold ltr:text-left rtl:text-right text-white flex items-center gap-2">
                                                    <img src={d.imageUrl} alt={d.name} className="w-8 h-8 rounded-full object-cover"/>
                                                    {d.name}
                                                </td>
                                                <td className="p-2 font-mono text-white">{d.totalOrders}</td>
                                                <td className="p-2 font-mono text-gray-300">{d.avgOrders}</td>
                                                <td className="p-2"><TierIndicator tier={d.tier} /></td>
                                                <td className="p-2 font-mono">
                                                    <span className={`${d.attendanceRate > 85 ? 'text-green-400' : d.attendanceRate > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                        {d.attendanceRate.toFixed(0)}%
                                                    </span>
                                                </td>
                                                 <td className="p-2 font-mono text-cyan-400">{d.efficiency}</td>
                                                <td className="p-2 font-mono text-gray-300">{d.weekendAbsences}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
