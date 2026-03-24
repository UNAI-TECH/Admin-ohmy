import { createClient } from '@supabase/supabase-js';

// Admin client — service_role key, no session persistence
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface CreateCreatorPayload {
  email: string;
  password: string;
  fullName: string;
  bio?: string;
}

export interface CreatorRequest {
  id: string;
  name: string;
  email: string;
  bio: string;
  portfolio_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_message?: string;
  created_at: string;
  updated_at: string;
}

export const adminService = {
  /**
   * Create a new creator account using the service role key.
   * Uses supabaseAdmin to bypass RLS and handle auth.users creation.
   */
  async createCreatorAccount(payload: CreateCreatorPayload) {
    // First attempt: normal createUser
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
        username: payload.email.split('@')[0],
      },
    });

    if (!error && data.user) {
      // Success! Update role to creator.
      await supabaseAdmin
        .from('User')
        .upsert({
          id: data.user.id,
          email: payload.email,
          username: payload.email.split('@')[0],
          bio: payload.bio || '',
          role: 'ANALYST',
        }, { onConflict: 'id' });
      return data.user;
    }

    // If createUser fails (e.g. database trigger error or email exists)
    console.warn('createUser failed:', error?.message);
    throw new Error(error?.message || 'Database error creating new user');
  },

  /**
   * Ensure a profile exists for the given user ID
   */
  async _ensureProfile(userId: string, payload: CreateCreatorPayload) {
    const { error } = await supabaseAdmin
      .from('User')
      .upsert({
        id: userId,
        email: payload.email,
        username: payload.email.split('@')[0],
        bio: payload.bio || '',
        role: 'ANALYST',
      }, { onConflict: 'id' });

    if (error) {
      console.error('Profile creation error:', error);
    }
  },

  /**
   * Get all creator requests — uses service role to bypass RLS
   */
  async getCreatorRequests(filter?: string) {
    let query = supabaseAdmin
      .from('creator_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter && filter !== 'ALL') {
      query = query.eq('status', filter.toLowerCase());
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CreatorRequest[];
  },

  /**
   * Update request status to approved — uses service role to bypass RLS
   */
  async approveRequestStatus(requestId: string, adminMessage?: string) {
    const { error } = await supabaseAdmin
      .from('creator_requests')
      .update({
        status: 'approved',
        admin_message: adminMessage || 'Your application has been approved! Login with the credentials shared by admin.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Reject a creator request — uses service role to bypass RLS
   */
  async rejectCreatorRequest(requestId: string, adminMessage?: string) {
    const { error } = await supabaseAdmin
      .from('creator_requests')
      .update({
        status: 'rejected',
        admin_message: adminMessage || 'Your application has been rejected.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Platform analytics — uses service role to bypass RLS
   */
  async getOverviewStats() {
    const [
      { count: totalUsers },
      { count: totalCreators },
      { count: totalPosts },
      { count: totalComments },
      { count: pendingRequests },
    ] = await Promise.all([
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }).eq('role', 'ANALYST'),
      supabaseAdmin.from('Post').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Comment').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('creator_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    return {
      totalUsers: totalUsers || 0,
      totalCreators: totalCreators || 0,
      totalPosts: totalPosts || 0,
      totalComments: totalComments || 0,
      pendingRequests: pendingRequests || 0,
    };
  },

  async getRecentPosts(limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('Post')
      .select('*, User(username, email)')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getAllCreators() {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('role', 'ANALYST')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
