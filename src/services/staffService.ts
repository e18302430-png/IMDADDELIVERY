
import { supabase } from './supabaseClient';
import { Staff } from '../types/models';

export const staffService = {
  /**
   * جلب قائمة الموظفين
   */
  async loadStaff(): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*');

    if (error) {
      console.error('Error loading staff:', error);
      return [];
    }
    return data as Staff[];
  }
};
