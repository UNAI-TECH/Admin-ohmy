import { supabase } from './supabaseClient';
import { getMemCache, setMemCache, invalidateMemCache } from './cache';

export interface CreateCreatorPayload {
  email: string;
  password?: string;
  fullName: string;
  bio?: string;
  redirectTo?: string;
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

async function invokeAdminApi<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Administrator session expired. Please sign in again.');
  }

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action, payload },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || `Admin action "${action}" failed`);
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data as T;
}

export const adminService = {
  async invoke<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    return invokeAdminApi<T>(action, payload);
  },

  async createCreatorAccount(payload: CreateCreatorPayload, _isOrganization: boolean = false) {
    const res = await invokeAdminApi<{ userId: string; email: string; username: string; actionLink: string | null }>(
      'createCreatorAccount',
      { ...payload }
    );
    invalidateMemCache('admin:overview:stats');
    invalidateMemCache('admin:all:creators');
    return res;
  },

  async getCreatorRequests(filter?: string) {
    const res = await invokeAdminApi<{ data: CreatorRequest[] }>('getCreatorRequests', { filter: filter || 'ALL' });
    return res.data || [];
  },

  async approveRequestStatus(requestId: string, adminMessage?: string) {
    await invokeAdminApi('approveCreatorRequest', { requestId, adminMessage });
    invalidateMemCache('admin:overview:stats');
    invalidateMemCache('admin:all:creators');
  },

  async rejectCreatorRequest(requestId: string, adminMessage?: string) {
    await invokeAdminApi('rejectCreatorRequest', { requestId, adminMessage });
    invalidateMemCache('admin:overview:stats');
    invalidateMemCache('admin:all:creators');
  },

  async sendPasswordReset(email: string, redirectTo?: string) {
    return await invokeAdminApi<{ actionLink: string | null }>('sendPasswordReset', { email, redirectTo });
  },

  async sendCreatorInviteEmail(email: string, actionLink: string, type: 'invite' | 'recovery' = 'invite') {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('send-credentials', {
      body: { email, actionLink, type },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) throw error;
    return data;
  },

  async getOverviewStats() {
    const cacheKey = 'admin:overview:stats';
    const cached = getMemCache<any>(cacheKey);
    if (cached) return cached;

    const stats = await invokeAdminApi('getOverviewStats');
    setMemCache(cacheKey, stats, 60000);
    return stats;
  },

  async getRecentPosts(limit = 100) {
    const cacheKey = `admin:recent:posts:${limit}`;
    const cached = getMemCache<any[]>(cacheKey);
    if (cached) return cached;

    const res = await invokeAdminApi<{ data: any[] }>('getAllPosts', { limit });
    const result = res.data || [];
    setMemCache(cacheKey, result, 30000);
    return result;
  },

  async getAllCreators() {
    const cacheKey = 'admin:all:creators';
    const cached = getMemCache<any[]>(cacheKey);
    if (cached) return cached;

    const res = await invokeAdminApi<{ data: any[] }>('getUsers', { roleFilter: 'CREATORS' });
    const result = res.data || [];
    setMemCache(cacheKey, result, 120000);
    return result;
  },

  async getAllReaders() {
    const res = await invokeAdminApi<{ data: any[] }>('getUsers', { roleFilter: 'READERS' });
    return res.data || [];
  },

  async updateUserStatus(userId: string, account_status: 'active' | 'suspended' | 'deactivated', reason?: string) {
    const res = await invokeAdminApi('updateUserStatus', { userId, account_status, reason });
    invalidateMemCache('admin:overview:stats');
    invalidateMemCache('admin:all:creators');
    return res;
  },

  async deleteUserAccount(userId: string) {
    const res = await invokeAdminApi('deleteUserAccount', { userId });
    invalidateMemCache('admin:overview:stats');
    invalidateMemCache('admin:all:creators');
    return res;
  },

  async adminUpdatePost(postId: string, updates: Record<string, unknown>) {
    const res = await invokeAdminApi<{ data: any }>('adminUpdatePost', { postId, updates });
    invalidateMemCache('admin:recent:posts:100');
    invalidateMemCache('admin:recent:posts:5');
    return res.data;
  },

  async adminDeletePost(postId: string) {
    const res = await invokeAdminApi('adminDeletePost', { postId });
    invalidateMemCache('admin:recent:posts:100');
    invalidateMemCache('admin:recent:posts:5');
    invalidateMemCache('admin:overview:stats');
    return res;
  },

  async respondFeedback(feedbackId: string, status: string, response_text: string) {
    return await invokeAdminApi<{ data: any }>('respondFeedback', { feedbackId, status, response_text });
  },

  async uploadAdImage(file: File, fileName: string) {
    const { data, error } = await supabase.storage
      .from('ads')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
    if (error) throw error;
    return data;
  },

  async getVideoPosts() {
    const { data, error } = await supabase
      .from('Post')
      .select('id, title, thumbnail, videoDuration, ads_enabled, authorId, createdAt, author:User!authorId(username, avatarUrl)')
      .eq('type', 'VIDEO')
      .not('videoUrl', 'is', null)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async toggleVideoAds(postId: string, enabled: boolean, durationSeconds: number) {
    return await invokeAdminApi('toggleVideoAds', { postId, enabled, durationSeconds });
  },

  async getVideoAdSlots(postId: string) {
    const { data, error } = await supabase
      .from('video_ad_slots')
      .select('*')
      .eq('post_id', postId)
      .order('ad_position_seconds', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getAuditLogs(params: { limit?: number; offset?: number; actionFilter?: string; resourceFilter?: string } = {}) {
    return await invokeAdminApi<{ data: any[]; total: number }>('getAuditLogs', params);
  },

  async writeAudit(auditAction: string, resourceType: string, resourceId: string | null, previousValues?: unknown, updatedValues?: unknown) {
    return await invokeAdminApi('writeAudit', { auditAction, resourceType, resourceId, previousValues, updatedValues });
  },
};
