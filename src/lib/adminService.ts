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
  portfolioUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminMessage?: string;
  createdAt: string;
  updatedAt: string;
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
          role: 'CREATOR',
        }, { onConflict: 'id' });
      return data.user;
    }

    // If the error is "Database error creating new user", the trigger may be broken.
    console.warn('createUser failed, trying manual approach:', error?.message);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const dropTriggerSQL = `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`;
    const createTriggerSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public."User" (id, email, username, role)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          'VIEWER'
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    try {
      // Drop the broken trigger
      await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
        body: JSON.stringify({ query: dropTriggerSQL }),
      });

      // Now create the user without the trigger
      const { data: data2, error: error2 } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
          username: payload.email.split('@')[0],
        },
      });

      if (error2) {
        throw new Error(error2.message || 'Failed to create user after dropping trigger');
      }

      if (data2?.user) {
        // Manually create the profile since trigger was dropped
        await this._ensureProfile(data2.user.id, payload);
      }

      // Recreate the fixed trigger
      await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
        body: JSON.stringify({ query: createTriggerSQL }),
      });

      return data2?.user || { id: '', email: payload.email };
    } catch (retryError: any) {
      throw new Error(retryError.message || 'Failed to create creator account');
    }
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
        role: 'CREATOR',
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
      .from('CreatorRequest')
      .select('*')
      .order('createdAt', { ascending: false });

    if (filter && filter !== 'ALL') {
      query = query.eq('status', filter.toUpperCase());
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
      .from('CreatorRequest')
      .update({
        status: 'APPROVED',
        adminMessage: adminMessage || 'Your application has been approved! Login with the credentials shared by admin.',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
  },

  /**
   * Reject a creator request — uses service role to bypass RLS
   */
  async rejectCreatorRequest(requestId: string, adminMessage?: string) {
    const { error } = await supabaseAdmin
      .from('CreatorRequest')
      .update({
        status: 'REJECTED',
        adminMessage: adminMessage || 'Your application has been rejected.',
        updatedAt: new Date().toISOString(),
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
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }).eq('role', 'CREATOR'),
      supabaseAdmin.from('Post').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Comment').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('CreatorRequest').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
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
      .eq('role', 'CREATOR')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
