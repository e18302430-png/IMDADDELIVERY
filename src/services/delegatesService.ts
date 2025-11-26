import { supabase } from './supabaseClient';
import { Delegate } from '../../types';

export const delegatesService = {
  async loadDelegates(): Promise<Delegate[]> {
    const { data, error } = await supabase
      .from('delegates')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error loading delegates:', error);
      return [];
    }
    return data as unknown as Delegate[];
  },

  async getDelegateById(id: number): Promise<Delegate | null> {
    const { data, error } = await supabase
      .from('delegates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as unknown as Delegate;
  },

  async addDelegate(payload: any): Promise<{ success: boolean; data?: Delegate; error?: string }> {
    const { data, error } = await supabase
      .from('delegates')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as unknown as Delegate };
  },

  async updateDelegate(id: number, payload: any): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('delegates')
      .update(payload)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async deleteDelegate(id: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('delegates')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }
};
