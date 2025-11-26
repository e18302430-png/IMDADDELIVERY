import { createClient } from '@supabase/supabase-js';

// Fallback keys for immediate preview support
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://zjitopmxphrworqwpssu.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaXRvcG14cGhyd29ycXdwc3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzU2NTIsImV4cCI6MjA3OTc1MTY1Mn0.CdvqVV9oAkWvmzN3MOJznzGiAC3gQy2iY8re31xH7v8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
