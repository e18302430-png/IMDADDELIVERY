import { supabase } from './supabaseClient';
import { Staff, UserRole } from '../../types'; 

// تعريف واجهة المستخدم للتطبيق
export interface AppUser {
    id: number;
    name: string;
    phone: string;
    kind: 'staff' | 'delegate';
    roleOrType: string;
    role?: UserRole;
    password?: string;
    requiresPasswordChange?: boolean;
    imageUrl?: string;
}

export interface LoginResponse {
    user: AppUser | null;
    error: string | null;
}

const USER_STORAGE_KEY = 'imdad_user';

export const authService = {
  async loginUser(
    userType: 'staff' | 'delegate',
    phone: string,
    pass: string
  ): Promise<LoginResponse> {
    try {
      const tableName = userType === 'staff' ? 'staff' : 'delegates';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('phone', phone)
        .eq('password', pass)
        .maybeSingle();

      if (error) {
        console.error('Supabase Error:', error.message);
        return { user: null, error: 'خطأ في الاتصال بقاعدة البيانات' };
      }

      if (!data) {
        return { user: null, error: 'بيانات الدخول غير صحيحة' };
      }

      const appUser: AppUser = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        kind: userType,
        roleOrType: userType === 'staff' ? data.role : data.type,
        role: userType === 'staff' ? (data.role as UserRole) : undefined,
        imageUrl: data.imageUrl,
        password: data.password,
        requiresPasswordChange: data.requiresPasswordChange
      };

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(appUser));
      return { user: appUser, error: null };
    } catch (err) {
      console.error('Login Exception:', err);
      return { user: null, error: 'حدث خطأ غير متوقع' };
    }
  },

  getCurrentUser(): AppUser | null {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AppUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(USER_STORAGE_KEY);
  },

  logout(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};
