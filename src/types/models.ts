
export interface Staff {
  id: number;
  name: string;
  phone: string;
  password?: string; // Optional for security in frontend
  role: string; // e.g., 'GeneralManager', 'HR', 'Ops'
  // Added to match root types.ts
  nationalId?: string;
  idExpiryDate?: string;
  joinDate?: string;
  requiresPasswordChange?: boolean;
  imageUrl?: string;
  iqamaPhotoUrl?: string;
  licensePhotoUrl?: string;
}

export interface Delegate {
  id: number;
  name: string;
  phone: string;
  password?: string;
  type: string; // 'كفالة' | 'أجير'
  employment_status: string; // 'نشط' | 'موقوف'
  // Added to match root types.ts
  nationalId?: string;
  displayId?: string;
  supervisorId?: number;
  ordersDelivered?: number;
  joinDate?: string;
  terminationDate?: string;
  carPlateNumber?: string;
  rentalCompany?: string;
  suspensionDate?: string;
  suspensionReturnDate?: string;
  lastShiftStartTime?: string;
  lastShiftFacePhoto?: string;
  lastShiftCarPhoto?: string;
  performanceStatus?: string;
  activity?: any[];
  weekendAbsence?: any;
  notes?: string;
  dailyReport?: string;
  ajirStatus?: string;
  imageUrl?: string;
  iqamaExpiryDate?: string;
  licenseExpiryDate?: string;
  requiresPasswordChange?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface AppUser {
  id: number;
  name: string;
  phone: string;
  kind: 'staff' | 'delegate';
  roleOrType: string; // stores 'role' for staff, 'type' for delegate
  // Added missing properties used in App.tsx/Login.tsx
  role?: any; 
  password?: string;
  requiresPasswordChange?: boolean;
}

export interface LoginResponse {
  user: AppUser | null;
  error: string | null;
}
