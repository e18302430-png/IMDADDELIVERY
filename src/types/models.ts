
export interface Staff {
  id: number;
  name: string;
  phone: string;
  password?: string; // Optional for security in frontend
  role: string; // e.g., 'GeneralManager', 'HR', 'Ops'
}

export interface Delegate {
  id: number;
  name: string;
  phone: string;
  password?: string;
  type: string; // 'كفالة' | 'أجير'
  employment_status: string; // 'نشط' | 'موقوف'
}

export interface AppUser {
  id: number;
  name: string;
  phone: string;
  kind: 'staff' | 'delegate';
  roleOrType: string; // stores 'role' for staff, 'type' for delegate
}

export interface LoginResponse {
  user: AppUser | null;
  error: string | null;
}
