import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient'; // anon-key client (same as mobile app uses)

// Admin client — service_role key, no session persistence (for admin-only operations)
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'sb-admin-auth-token',
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
   * Create a new creator account.
  /**
   * Fix the broken DB trigger (one-time). The existing trigger inserts into
   * `public.profiles` with `user_role` type, but our app uses `public."User"` 
   * with `public."Role"` type. This replaces the trigger function.
   */
  async fixTriggerIfNeeded() {
    try {
      // Replace the trigger function to insert into public."User" instead of profiles
      await supabaseAdmin.rpc('exec_sql', {
        query: `
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS trigger
          LANGUAGE plpgsql
          SECURITY DEFINER SET search_path = public
          AS $$
          BEGIN
            INSERT INTO public."User" (id, email, username, role)
            VALUES (
              NEW.id::text,
              NEW.email,
              COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
              'CITIZEN'::"Role"
            )
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
          END;
          $$;
        `
      });
      console.log('[Admin] Trigger function updated successfully');
    } catch (e) {
      // RPC might not exist — we'll handle the trigger failure in createCreatorAccount
      console.warn('[Admin] Could not update trigger via RPC:', e);
    }
  },

  /**
   * Create the Feedback table if it doesn't exist
   */
  async createFeedbackTable() {
    try {
      await supabaseAdmin.rpc('exec_sql', {
        query: `
          create table if not exists public."Feedback" (
            id uuid not null default gen_random_uuid(),
            "userId" text null,
            content text not null,
            category text null,
            "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
            status text default 'pending',
            constraint Feedback_pkey primary key (id),
            constraint Feedback_userId_fkey foreign KEY ("userId") references "User" (id) on update CASCADE on delete SET NULL
          ) TABLESPACE pg_default;
        `
      });
    } catch (e) {
      console.warn('[Admin] Could not create feedback table:', e);
    }
  },

  /**
   * Migrate the Post table to add status and scheduledFor columns
   */
  async migratePostTable() {
    try {
      await supabaseAdmin.rpc('exec_sql', {
        query: `
          ALTER TABLE public."Post" 
          ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PUBLISHED',
          ADD COLUMN IF NOT EXISTS "scheduledFor" timestamp with time zone;
          NOTIFY pgrst, 'reload schema';
        `
      });
      console.log('[Admin] Post table migrated successfully');
    } catch (e) {
      console.warn('[Admin] Could not migrate Post table:', e);
    }
  },

  /**
   * Create a new creator account.
   * Uses admin.createUser() then manually creates the User row.
   * The trigger may fail (500) but the auth user is sometimes still created.
   */
  async createCreatorAccount(payload: CreateCreatorPayload) {
    const rawUsername = payload.email.split('@')[0];
    const now = new Date().toISOString();

    // Step 1: Check if this email already exists in auth (from previous failed attempts)
    let existingAuthUser = null;
    try {
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      existingAuthUser = usersList?.users?.find((u: any) => u.email === payload.email);
    } catch (e) {
      console.warn('[Admin] Could not list users:', e);
    }

    if (existingAuthUser) {
      console.log('[Admin] Auth user already exists, updating profile...');
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password: payload.password,
        email_confirm: true,
      });

      await supabaseAdmin.from('User').upsert({
        id: existingAuthUser.id,
        email: payload.email,
        username: rawUsername,
        bio: payload.bio || '',
        role: 'ANALYST',
        updatedAt: now,
      }, { onConflict: 'id' });

      return existingAuthUser;
    }

    // To prevent the `handle_new_user` DB trigger from crashing due to a unique
    // constraint violation in `public.profiles` (which happens if there are orphaned rows),
    // we pass a highly unique dummy username in the metadata. The trigger will use
    // this to insert into `profiles` successfully.
    const uniqueDummyUsername = rawUsername + '_' + Date.now();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          username: uniqueDummyUsername, // Passes trigger's unique username constraint
        },
      },
    });

    if (signUpError) {
      console.error('[Admin] SignUp error:', signUpError.message);
      throw new Error(signUpError.message || 'Failed to create user');
    }

    if (!signUpData.user) {
      throw new Error('SignUp returned no user data');
    }

    const userId = signUpData.user.id;
    console.log('[Admin] Auth user created:', userId);

    // Wait for the trigger to finish its work
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now create the correct row in public."User" with the real username and correct role
    let { error: upsertError } = await supabaseAdmin.from('User').upsert({
      id: userId,
      email: payload.email,
      username: rawUsername,
      bio: payload.bio || '',
      role: 'ANALYST',
      updatedAt: now,
    }, { onConflict: 'id' });

    if (upsertError) {
      // If the real username is taken in `public.User`, try with a 4-digit suffix
      console.warn('[Admin] Upsert error, trying unique username in User table:', upsertError);
      const fallbackUsername = rawUsername + '_' + Date.now().toString().slice(-4);
      await supabaseAdmin.from('User').upsert({
        id: userId,
        email: payload.email,
        username: fallbackUsername,
        bio: payload.bio || '',
        role: 'ANALYST',
        updatedAt: now,
      }, { onConflict: 'id' });
    }

    // Confirm email so creator can login immediately
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    // Clean up anon session
    await supabase.auth.signOut();

    console.log('[Admin] Creator account created for:', payload.email);
    return signUpData.user;
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
