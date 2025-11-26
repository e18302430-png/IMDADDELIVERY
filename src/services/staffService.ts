import { supabase } from './supabaseClient';
import { Staff } from '../../types';

export const staffService = {
  async loadStaff(): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*');

    if (error) {
      console.error('Error loading staff:', error);
      return [];
    }
    return data as unknown as Staff[];
  },

  async addStaff(payload: any): Promise<{ success: boolean; data?: Staff; error?: string }> {
    const { data, error } = await supabase
      .from('staff')
      .insert([payload])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as unknown as Staff };
  },

  async updateStaff(id: number, payload: any): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('staff').update(payload).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async deleteStaff(id: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
};
