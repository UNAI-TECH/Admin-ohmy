import { createClient } from '@supabase/supabase-js';
// anon-key client (same as mobile app uses) removed as unused

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
  request_type: 'personal' | 'organization';
  name: string;
  username: string;
  email: string;
  bio: string;
  social_link?: string;
  channel_name?: string;
  channel_email?: string;
  category?: string[];
  employee_size?: number;
  channel_bio?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_message?: string;
  created_at: string;
  updated_at: string;
}

export const adminService = {
  /**
   * Fix the broken DB trigger (one-time). The existing trigger inserts into
   * `public.profiles` with `user_role` type, but our app uses `public."User"` 
   * with `public."Role"` type. This replaces the trigger function.
   */
  async fixTriggerIfNeeded() {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
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
      if (error) {
        console.warn('[Admin] Could not update trigger via RPC:', error.message);
      } else {
        console.log('[Admin] Trigger function updated successfully');
      }
    } catch (e: any) {
      console.warn('[Admin] Unexpected error in fixTriggerIfNeeded:', e.message);
    }
  },

  /**
   * Create the Feedback table if it doesn't exist
   */
  async createFeedbackTable() {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
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
      if (error) {
        console.warn('[Admin] Could not create feedback table:', error.message);
      } else {
        console.log('[Admin] Feedback table ensured');
      }
    } catch (e: any) {
      console.warn('[Admin] Unexpected error in createFeedbackTable:', e.message);
    }
  },

  /**
   * Migrate the Post table to add status and scheduledFor columns
   */
  async migratePostTable() {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        query: `
          ALTER TABLE public."Post" 
          ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PUBLISHED',
          ADD COLUMN IF NOT EXISTS "scheduledFor" timestamp with time zone;
          NOTIFY pgrst, 'reload schema';
        `
      });
      if (error) {
        console.warn('[Admin] Could not migrate Post table:', error.message);
      } else {
        console.log('[Admin] Post table migrated successfully');
      }
    } catch (e: any) {
      console.warn('[Admin] Unexpected error in migratePostTable:', e.message);
    }
  },

  /**
   * Migrate the User table to add temporary_password column
   */
  async migrateUserTable() {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        query: `
          ALTER TABLE public."User" 
          ADD COLUMN IF NOT EXISTS "temporary_password" text;
          NOTIFY pgrst, 'reload schema';
        `
      });
      if (error) {
        console.warn('[Admin] Could not migrate User table:', error.message);
      } else {
        console.log('[Admin] User table migrated successfully');
      }
    } catch (e: any) {
      console.warn('[Admin] Unexpected error in migrateUserTable:', e.message);
    }
  },

  /**
   * Create a new creator account.
   * Uses admin.createUser() then manually creates the User row.
   * The trigger may fail (500) but the auth user is sometimes still created.
   */
  async createCreatorAccount(payload: CreateCreatorPayload, _isOrganization: boolean = false) {
    const rawUsername = payload.email.split('@')[0];

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

      // Update the User table explicitly to store temporary_password
      await supabaseAdmin.from('User').update({ temporary_password: payload.password }).eq('id', existingAuthUser.id);

      return existingAuthUser;
    }

    // To prevent the `handle_new_user` DB trigger from crashing due to a unique
    // constraint violation in `public.profiles` (which happens if there are orphaned rows),
    // we pass a highly unique dummy username in the metadata. The trigger will use
    // this to insert into `profiles` successfully.
    const uniqueDummyUsername = rawUsername + '_' + Date.now();

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
        username: uniqueDummyUsername, // Passes trigger's unique username constraint
      },
    });

    if (createError) {
      console.error('[Admin] CreateUser error:', createError.message);
      throw new Error(createError.message || 'Failed to create user');
    }

    if (!createData.user) {
      throw new Error('CreateUser returned no user data');
    }

    const userId = createData.user.id;
    console.log('[Admin] Auth user created:', userId);

    // The DB triggers handle migrating this Auth user into the public."User" table
    // (via handle_new_user and the handle_creator_approval trigger).
    // Now we must update the User record with the plaintext password so the Admin can view it.
    const { error: pwdErr } = await supabaseAdmin
      .from('User')
      .update({ temporary_password: payload.password })
      .eq('id', userId);

    if (pwdErr) {
      console.warn('[Admin] Could not save temporary_password to User table:', pwdErr.message);
    }

    console.log('[Admin] Creator auth account created for:', payload.email);
    return createData.user;
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
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }).in('role', ['ANALYST', 'CREATOR']),
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
      .select('*, User(username, email, avatarUrl)')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getAllCreators() {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .in('role', ['ANALYST', 'CREATOR'])
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Send the email credentials using the Supabase Edge Function via the Service Role Key.
   */
  async sendCreatorCredentialsEmail(email: string, password: string) {
    const { data, error } = await supabaseAdmin.functions.invoke('send-credentials', {
      body: { email, password }
    });
    if (error) throw error;
    return data;
  },

  /**
   * Ensure the 'ads' storage bucket exists.
   * Note: Policies must be applied manually via SQL if automated ones fail.
   */
  async ensureAdsBucket() {
    try {
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (listError) throw listError;

      const adsBucket = buckets?.find(b => b.name === 'ads');
      if (!adsBucket) {
        console.log('[Admin] Ads bucket not found, creating...');
        await supabaseAdmin.storage.createBucket('ads', {
          public: true,
        });
      }
      
      // Removed applyAdsBucketPolicies to avoid 403 Forbidden errors.
      // These must be applied manually via the provided SQL script.
    } catch (e: any) {
      console.warn('[Admin] Error in ensureAdsBucket:', e.message);
    }
  },

  /**
   * Manual policy application (Disabled to prevent console noise).
   */
  async applyAdsBucketPolicies() {
    // This is now disabled. Please run the SQL script provided in the documentation.
    return;
  },

  /**
   * Ensure the full Custom Advertisement System (Ads, Impressions, Clicks) and RPCs exist.
   */
  async ensureAdsTable() {
    try {
      const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
        query: `
          DO $$
          BEGIN
            -- 1. ADS TABLE
            IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ads') THEN
              CREATE TABLE public.ads (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                advertiser_name text,
                title text,
                description text,
                media_url text, -- supports images/videos
                redirect_url text,
                pricing_model text CHECK (pricing_model IN ('cpc', 'cpm')),
                cpc_amount numeric DEFAULT 0,
                cpm_amount numeric DEFAULT 0,
                budget_total numeric NOT NULL,
                budget_remaining numeric NOT NULL,
                impressions_count integer DEFAULT 0,
                clicks_count integer DEFAULT 0,
                total_spent numeric DEFAULT 0,
                status text DEFAULT 'active', -- active, paused, completed
                created_at timestamp with time zone DEFAULT now()
              );
              CREATE INDEX idx_ads_status ON ads(status);
              CREATE INDEX idx_ads_budget ON ads(budget_remaining);
            END IF;

            -- 2. AD IMPRESSIONS (with unique constraint for fraud prevention)
            IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ad_impressions') THEN
              CREATE TABLE public.ad_impressions (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ad_id uuid REFERENCES ads(id) ON DELETE CASCADE,
                user_id text,
                viewed_at timestamp with time zone DEFAULT now(),
                UNIQUE (ad_id, user_id)
              );
              CREATE INDEX idx_impressions_ad ON ad_impressions(ad_id);
            END IF;

            -- 3. AD CLICKS (with unique constraint for fraud prevention)
            IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ad_clicks') THEN
              CREATE TABLE public.ad_clicks (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ad_id uuid REFERENCES ads(id) ON DELETE CASCADE,
                user_id text,
                clicked_at timestamp with time zone DEFAULT now(),
                cost numeric,
                UNIQUE (ad_id, user_id)
              );
              CREATE INDEX idx_clicks_ad ON ad_clicks(ad_id);
            END IF;

            -- 4. PERMISSIONS & RLS
            ALTER TABLE public.ads DISABLE ROW LEVEL SECURITY;
            ALTER TABLE public.ad_impressions DISABLE ROW LEVEL SECURITY;
            ALTER TABLE public.ad_clicks DISABLE ROW LEVEL SECURITY;
            GRANT ALL ON TABLE public.ads TO anon, authenticated, service_role;
            GRANT ALL ON TABLE public.ad_impressions TO anon, authenticated, service_role;
            GRANT ALL ON TABLE public.ad_clicks TO anon, authenticated, service_role;

            -- 5. RPC: track_ad_impression
            CREATE OR REPLACE FUNCTION public.track_ad_impression(p_ad_id uuid, p_user_id text)
            RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $f$
            DECLARE
              v_cpm numeric;
            BEGIN
              -- Avoid duplicate impressions
              IF EXISTS (SELECT 1 FROM ad_impressions WHERE ad_id = p_ad_id AND user_id = p_user_id) THEN
                RETURN;
              END IF;

              INSERT INTO ad_impressions (ad_id, user_id) VALUES (p_ad_id, p_user_id);

              SELECT cpm_amount INTO v_cpm FROM ads WHERE id = p_ad_id;

              UPDATE ads SET 
                impressions_count = impressions_count + 1,
                total_spent = total_spent + (v_cpm / 1000.0),
                budget_remaining = budget_remaining - (v_cpm / 1000.0)
              WHERE id = p_ad_id;

              -- Auto-stop check
              UPDATE ads SET status = 'completed' WHERE id = p_ad_id AND budget_remaining <= 0;
            END;
            $f$;

            -- 6. RPC: track_ad_click
            CREATE OR REPLACE FUNCTION public.track_ad_click(p_ad_id uuid, p_user_id text)
            RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $f$
            DECLARE
              v_cpc numeric;
            BEGIN
              -- Avoid duplicate clicks
              IF EXISTS (SELECT 1 FROM ad_clicks WHERE ad_id = p_ad_id AND user_id = p_user_id) THEN
                RETURN;
              END IF;

              SELECT cpc_amount INTO v_cpc FROM ads WHERE id = p_ad_id;

              INSERT INTO ad_clicks (ad_id, user_id, cost) VALUES (p_ad_id, p_user_id, v_cpc);

              UPDATE ads SET 
                clicks_count = clicks_count + 1,
                total_spent = total_spent + v_cpc,
                budget_remaining = budget_remaining - v_cpc
              WHERE id = p_ad_id;

              -- Auto-stop check
              UPDATE ads SET status = 'completed' WHERE id = p_ad_id AND budget_remaining <= 0;
            END;
            $f$;

          END
          $$;
        `
      });

      if (sqlError) {
        console.warn('[Admin] Error ensuring full ads ecosystem:', sqlError.message);
      } else {
        console.log('[Admin] Full ads ecosystem and RPCs ensured');
      }
    } catch (e: any) {
      console.warn('[Admin] Unexpected error in ensureAdsTable:', e.message);
    }
  },

  /**
   * Upload an ad image using the service role to bypass RLS.
   */
  async uploadAdImage(file: File, fileName: string) {
    const { data, error } = await supabaseAdmin.storage
      .from('ads')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    return data;
  },
};
