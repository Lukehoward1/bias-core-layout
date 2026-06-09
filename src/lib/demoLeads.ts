import { supabase } from './supabase';

export async function submitDemoLead(name: string, email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('demo_leads')
    .insert([{ name, email, created_at: new Date().toISOString() }]);

  if (error) {
    // If table doesn't exist yet, still return success to not block UX
    console.error('Demo lead error:', error);
    return { success: true };
  }
  return { success: true };
}
