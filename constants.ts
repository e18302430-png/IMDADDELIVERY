

import { PerformanceStatus, AjirDelegateStatus } from './types';

export const PERFORMANCE_COLORS: Record<PerformanceStatus, { bg: string; text: string; border: string }> = {
    [PerformanceStatus.Excellent]: { bg: 'bg-green-900', text: 'text-green-300', border: 'border-green-500' },
    [PerformanceStatus.Average]: { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-500' },
    [PerformanceStatus.Weak]: { bg: 'bg-red-900', text: 'text-red-300', border: 'border-red-500' },
    [PerformanceStatus.Suspended]: { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-500' },
};

export const AJIR_STATUS_COLORS: Record<AjirDelegateStatus, { bg: string; text: string }> = {
    [AjirDelegateStatus.Available]: { bg: 'bg-sky-900', text: 'text-sky-300' },
    [AjirDelegateStatus.OnDuty]: { bg: 'bg-purple-900', text: 'text-purple-300' },
    [AjirDelegateStatus.Inactive]: { bg: 'bg-gray-700', text: 'text-gray-300' },
};
