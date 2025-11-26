

import { AppData, PerformanceStatus, AjirDelegateStatus, DelegateType, RequestType, RequestStatus, UserRole, DelegateRequestTopic, Request, Staff } from '../types';

const HOURS = [
    '12:00 م - ذروة الغداء',
    '07:00 م - ذروة الوجبات',
    '11:00 م - ذروة العشاء'
];

export const generateRequestNumber = (type: RequestType, existingRequests: Request[]): string => {
    let prefix = '';
    switch (type) {
        case RequestType.Internal:
            prefix = 'D0';
            break;
        case RequestType.DirectDirective:
            prefix = 'T0';
            break;
        case RequestType.Employee:
            prefix = 'M0';
            break;
        default:
            prefix = 'R0';
    }

    const relevantRequests = existingRequests.filter(r => r.requestNumber.startsWith(prefix));
    const maxId = relevantRequests.reduce((max, r) => {
        // Extract the numeric part after the prefix (e.g., "M01" -> 1)
        const numStr = r.requestNumber.slice(prefix.length);
        const num = parseInt(numStr, 10);
        return !isNaN(num) && num > max ? num : max;
    }, 0);
    
    return `${prefix}${maxId + 1}`;
};


export const initialData: AppData = {
    staff: [
        { id: 1, name: 'المدير العام', phone: '0510000001', password: 'gm123', requiresPasswordChange: true, nationalId: '1111111111', idExpiryDate: '2030-01-01', role: UserRole.GeneralManager, imageUrl: 'https://placehold.co/100x100/3498DB/FFFFFF/png?text=GM' },
        { id: 2, name: 'مدير الحركه والتشغيل', phone: '0510000002', password: 'em123', requiresPasswordChange: true, nationalId: '2222222222', idExpiryDate: '2030-01-01', role: UserRole.MovementManager, imageUrl: 'https://placehold.co/100x100/9B59B6/FFFFFF/png?text=EM' },
        { id: 20, name: 'اداره الموارد البشريه', phone: '0510000020', password: 'hr123', requiresPasswordChange: true, nationalId: '4444444444', idExpiryDate: '2030-01-01', role: UserRole.HR, imageUrl: 'https://placehold.co/100x100/1ABC9C/FFFFFF/png?text=HR' },
        { id: 30, name: 'الادارة المالية', phone: '0510000030', password: 'fin123', requiresPasswordChange: true, nationalId: '5555555555', idExpiryDate: '2030-01-01', role: UserRole.Finance, imageUrl: 'https://placehold.co/100x100/F1C40F/FFFFFF/png?text=FN' },
        { id: 40, name: 'الشوؤن القانونية', phone: '0510000040', password: 'legal123', requiresPasswordChange: true, nationalId: '6666666666', idExpiryDate: '2030-01-01', role: UserRole.Legal, imageUrl: 'https://placehold.co/100x100/E74C3C/FFFFFF/png?text=LG' },
    ],
    delegates: [],
    settings: {
        weekendDeduction: 200,
    },
    requests: [
        {
            id: 1,
            requestNumber: 'D01',
            title: 'مراجعة مستحقات نهاية الأسبوع',
            description: 'الرجاء مراجعة وحساب مستحقات نهاية الأسبوع للمناديب المتميزين حسب سياسة الشركة الجديدة ورفعها للاعتماد.',
            type: RequestType.Internal,
            status: RequestStatus.PendingApproval,
            fromRole: UserRole.MovementManager,
            createdAt: '2024-05-20T10:00:00Z',
            lastActionTimestamp: '2024-05-20T10:00:00Z',
            history: [
                { actor: UserRole.MovementManager, actorName: 'مدير الحركه والتشغيل', action: 'Created', timestamp: '2024-05-20T10:00:00Z', comment: 'تم رفع الطلب.' }
            ],
            workflow: [UserRole.Finance],
            currentStageIndex: 0,
        }
    ],
    dailyReports: [],
    circulars: [],
    notifications: [],
};

export const getHours = () => HOURS;