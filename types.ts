

export enum PerformanceStatus {
    Excellent = 'ممتاز',
    Average = 'متوسط',
    Weak = 'ضعيف',
    Suspended = 'موقوف'
}

export enum AjirDelegateStatus {
    Available = 'متاح',
    OnDuty = 'في مهمة',
    Inactive = 'غير نشط',
}

export enum DelegateType {
    Kafala = 'كفالة',
    Ajir = 'أجير'
}

export type HourActivity = 'Present' | 'Absent' | 'OnLeave' | null;

export interface DelegateActivity {
    hour: string;
    status: HourActivity;
}

export interface WeekendAbsence {
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
}

export interface Delegate {
    id: number;
    name: string;
    phone: string;
    password: string;
    requiresPasswordChange?: boolean; // New property
    nationalId?: string;
    imageUrl?: string; // Personal Photo (Reference)
    iqamaPhotoUrl?: string;
    licensePhotoUrl?: string;
    iqamaExpiryDate?: string;
    licenseExpiryDate?: string;
    supervisorId: number; // Will point to a Staff member with OpsSupervisor role
    type: DelegateType;
    latitude: number;
    longitude: number;
    currentAssignment?: string;
    displayId?: string;
    ordersDelivered?: number;
    joinDate?: string; 
    terminationDate?: string;
    employmentStatus: 'نشط' | 'مستقيل';
    
    // Vehicle Details
    carPlateNumber?: string;
    rentalCompany?: string;
    
    // Suspension Details
    suspensionDate?: string;
    suspensionReturnDate?: string; // Optional, if undefined it is indefinite

    // Live Shift Verification Data
    lastShiftStartTime?: string;
    lastShiftFacePhoto?: string; // The live selfie taken at start
    lastShiftCarPhoto?: string;  // The live car photo taken at start

    // Kafala-specific properties
    performanceStatus?: PerformanceStatus;
    activity?: DelegateActivity[];
    weekendAbsence?: WeekendAbsence;
    notes?: string;
    dailyReport?: string;
    
    // Ajir-specific properties
    ajirStatus?: AjirDelegateStatus;
}

export enum UserRole {
    GeneralManager = 'GeneralManager',
    MovementManager = 'MovementManager',
    OpsSupervisor = 'OpsSupervisor',
    HR = 'HR',
    Finance = 'Finance',
    Legal = 'Legal'
}

export interface Staff {
    id: number;
    name: string;
    phone: string;
    password: string;
    requiresPasswordChange?: boolean; // New property
    nationalId: string;
    idExpiryDate: string;
    joinDate?: string; // Added Join Date
    role: UserRole;
    imageUrl?: string;
    iqamaPhotoUrl?: string;
    licensePhotoUrl?: string;
}


export interface AppSettings {
    weekendDeduction: number;
}


export enum RequestType {
    Internal = 'Internal',
    Employee = 'Employee',
    DirectDirective = 'DirectDirective' // New type for Directives from Admin to Delegate
}

export enum RequestStatus {
    PendingApproval = 'PendingApproval',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export enum DelegateRequestTopic {
    Leave = 'Leave',
    Financial = 'Financial',
    Clearance = 'Clearance',
    ConfidentialComplaint = 'ConfidentialComplaint',
    ContactSupervisor = 'ContactSupervisor', // Renamed from TechnicalProblem
    Other = 'Other' // Added Other
}

export type RequestAction = 'Created' | 'Approved' | 'Rejected' | 'Commented' | 'ResolvedAndClosed' | 'Cancelled' | 'ResolvedAndDirected' | 'DirectiveViewed' | 'DirectiveReplied';

export interface RequestHistoryEvent {
    actor: UserRole | 'Delegate' | 'System';
    actorName: string;
    action: RequestAction;
    comment?: string;
    directedTo?: UserRole;
    timestamp: string;
}

export interface Request {
    id: number;
    requestNumber: string;
    title: string;
    description: string;
    type: RequestType;
    status: RequestStatus;
    fromRole?: UserRole;
    fromDelegateId?: number;
    
    // For Directives, we need to know who it's sent TO (Delegate)
    toDelegateId?: number; 

    createdAt: string;
    lastActionTimestamp: string;
    history: RequestHistoryEvent[];
    imageUrl?: string; 
    topic?: DelegateRequestTopic;
    
    // Workflow Engine
    workflow: UserRole[];
    currentStageIndex: number; // Index in the workflow array
    
    // Directive Response Data
    directiveResponse?: {
        type: 'Viewed' | 'Replied';
        comment: string;
        imageUrl?: string;
    };
}

export interface Circular {
    id: number;
    title: string;
    content: string;
    authorRole: UserRole;
    authorName: string;
    audience: 'all' | 'delegates';
    createdAt: string;
}


export interface DailyReportEntry {
    delegateId: number;
    ordersDelivered: number;
    activity: DelegateActivity[];
    weekendAbsence?: WeekendAbsence;
    // We store a snapshot of the name/id for historical accuracy in reports
    delegateName: string; 
    delegateDisplayId?: string;
}

export interface DailyOperationalReport {
    date: string; // YYYY-MM-DD
    supervisorId: number;
    entries: DailyReportEntry[];
}

export interface Notification {
    id: number;
    supervisorId: number;
    messageKey: 'delegate_online' | 'delegate_offline';
    messageParams: { delegateName: string };
    createdAt: string;
    read: boolean;
}

export interface AppData {
    staff: Staff[];
    delegates: Delegate[];
    settings: AppSettings;
    requests: Request[];
    dailyReports: DailyOperationalReport[];
    circulars: Circular[];
    notifications: Notification[];
}

export type CurrentUser = Staff;