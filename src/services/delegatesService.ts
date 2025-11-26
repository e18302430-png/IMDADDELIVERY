
import { supabase } from './supabaseClient';
import { Delegate } from '../types/models';

export const delegatesService = {
  /**
   * جلب جميع المناديب
   */
  async loadDelegates(): Promise<Delegate[]> {
    const { data, error } = await supabase
      .from('delegates')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error loading delegates:', error);
      return [];
    }
    return data as Delegate[];
  },

  /**
   * جلب مندوب واحد (لصفحة المندوب مثلاً)
   */
  async getDelegateById(id: number): Promise<Delegate | null> {
    const { data, error } = await supabase
      .from('delegates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Delegate;
  },

  /**
   * إضافة مندوب جديد
   */
  async addDelegate(payload: Omit<Delegate, 'id'>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('delegates')
      .insert([payload]);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  /**
   * تحديث بيانات مندوب
   */
  async updateDelegate(id: number, payload: Partial<Delegate>): Promise<boolean> {
    const { error } = await supabase
      .from('delegates')
      .update(payload)
      .eq('id', id);

    return !error;
  }
};
