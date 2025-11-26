import React from 'react';
import { PerformanceStatus } from '../types';
import { PERFORMANCE_COLORS } from '../constants';
import { useTranslation } from '../hooks/useTranslation';

interface PerformanceIndicatorProps {
    status: PerformanceStatus;
}

const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({ status }) => {
    const { t } = useTranslation();
    const color = PERFORMANCE_COLORS[status] || PERFORMANCE_COLORS[PerformanceStatus.Suspended];
    
    // Create a key from the status enum value, e.g., 'ممتاز' -> 'perfStatus_ممتاز'
    const translationKey = `perfStatus_${status.replace(/\s/g, '')}`;

    return (
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${color.bg} ${color.text}`}>
            {t(translationKey, status)}
        </span>
    );
};

export default PerformanceIndicator;