
import { supabase } from './supabaseClient';
import { AppUser, LoginResponse } from '../types/models';

const USER_STORAGE_KEY = 'imdad_user';

export const authService = {
  /**
   * تسجيل الدخول عبر البحث في الجداول المخصصة
   */
  async loginUser(
    userType: 'staff' | 'delegate',
    phone: string,
    pass: string
  ): Promise<LoginResponse> {
    try {
      const tableName = userType === 'staff' ? 'staff' : 'delegates';

      // البحث عن المستخدم بمطابقة الهاتف وكلمة المرور
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('phone', phone)
        .eq('password', pass)
        .single();

      if (error || !data) {
        return { user: null, error: 'بيانات الدخول غير صحيحة، تأكد من رقم الجوال وكلمة المرور.' };
      }

      // تجهيز كائن المستخدم للتخزين
      const appUser: AppUser = {
        id: data.id,
        name: data.name,
        phone: data.phone,
        kind: userType,
        roleOrType: userType === 'staff' ? data.role : data.type,
        role: userType === 'staff' ? data.role : undefined,
        password: data.password,
        requiresPasswordChange: data.requiresPasswordChange,
      };

      // الحفظ في localStorage
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(appUser));

      return { user: appUser, error: null };
    } catch (err) {
      console.error('Login Error:', err);
      return { user: null, error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' };
    }
  },

  /**
   * جلب المستخدم الحالي من الذاكرة المحلية
   */
  getCurrentUser(): AppUser | null {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AppUser;
    } catch {
      return null;
    }
  },

  /**
   * التحقق هل المستخدم مسجل دخول أم لا
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(USER_STORAGE_KEY);
  },

  /**
   * تسجيل الخروج
   */
  logout(): void {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};
