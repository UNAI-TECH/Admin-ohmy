import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../lib/adminService';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  Loader2,
  PlayCircle,
  Clock,
  Edit3,
  Trash2,
  Star,
  Flame,
  Award,
  X,
  Save,
  Eye,
} from 'lucide-react';

export default function Posts() {
  const { success, error: toastError } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterSearch, setFilterSearch] = useState('');
  const [filterLang, setFilterLang] = useState<'ALL' | 'en' | 'ta'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState('');

  // Quick Edit Drawer State
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editLanguage, setEditLanguage] = useState<'en' | 'ta'>('en');
  const [editStatus, setEditStatus] = useState('PUBLISHED');
  const [editCategory, setEditCategory] = useState('');
  const [editSeoTitle, setEditSeoTitle] = useState('');
  const [editSeoDesc, setEditSeoDesc] = useState('');
  const [editRobots, setEditRobots] = useState(true);
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await adminService.getRecentPosts(250);
      setPosts(data);
    } catch (err: any) {
      toastError(err?.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel('admin-posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Post' }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return posts.filter((post) => {
      if (filterLang !== 'ALL' && (post.language || 'en') !== filterLang) return false;
      if (filterStatus !== 'ALL' && (post.status || 'PUBLISHED') !== filterStatus) return false;
      if (filterType && (post.type || 'NEWS').toLowerCase() !== filterType.toLowerCase()) return false;
      if (q) {
        const hit =
          (post.title || '').toLowerCase().includes(q) ||
          (post.slug || '').toLowerCase().includes(q) ||
          (post.User?.username || '').toLowerCase().includes(q) ||
          (post.category || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [posts, filterSearch, filterLang, filterStatus, filterType]);

  const openEditor = (post: any) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditSubtitle(post.subtitle || '');
    setEditSlug(post.slug || '');
    setEditLanguage(post.language === 'ta' ? 'ta' : 'en');
    setEditStatus(post.status || 'PUBLISHED');
    setEditCategory(post.category || 'General');
    setEditSeoTitle(post.seo_title || '');
    setEditSeoDesc(post.seo_description || '');
    setEditRobots(post.robots_index !== false);
    setEditActive(post.is_active !== false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setSavingEdit(true);
    try {
      const updated = await adminService.adminUpdatePost(editingPost.id, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim() || null,
        slug: editSlug.trim() || undefined,
        language: editLanguage,
        status: editStatus,
        category: editCategory,
        seo_title: editSeoTitle.trim() || null,
        seo_description: editSeoDesc.trim() || null,
        robots_index: editRobots,
        is_active: editActive,
      });
      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? { ...p, ...updated } : p)));
      setEditingPost(null);
      success('Post updated & audited.');
    } catch (err: any) {
      toastError(err?.message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleFlag = async (post: any, field: 'is_breaking' | 'is_featured' | 'is_editors_pick' | 'is_active') => {
    const next = !post[field];
    try {
      await adminService.adminUpdatePost(post.id, { [field]: next });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, [field]: next } : p)));
      success('Editorial flag updated.');
    } catch (err: any) {
      toastError(err?.message || 'Flag update failed');
    }
  };

  const handleDelete = async (post: any) => {
    if (!window.confirm(`Permanently delete "${post.title}"? This action is audited.`)) return;
    try {
      await adminService.adminDeletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      success('Post permanently deleted.');
    } catch (err: any) {
      toastError(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <FileText className="text-[#D4191F]" />
            Global Content Management
          </h1>
          <p className="text-gray-500 text-sm">
            Moderate, edit SEO/slugs, toggle Breaking/Featured/Editor&apos;s Picks, publish, archive, or remove any story.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Search title, slug, creator..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl text-sm px-4 py-2 outline-none focus:border-[#D4191F] w-56"
          />
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-xl text-xs font-bold px-3 py-2.5 outline-none"
          >
            <option value="ALL">All Languages</option>
            <option value="en">EN</option>
            <option value="ta">TA</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl text-xs font-bold px-3 py-2.5 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl text-xs font-bold px-3 py-2.5 outline-none"
          >
            <option value="">All Types</option>
            <option value="NEWS">NEWS</option>
            <option value="BLOG">BLOG</option>
            <option value="VIDEO">VIDEO</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#FAFBFF] z-10 border-b border-gray-100">
              <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <th className="px-5 py-4">Story</th>
                <th className="px-4 py-4">Author</th>
                <th className="px-4 py-4">Lang / Status</th>
                <th className="px-4 py-4">Editorial Flags</th>
                <th className="px-4 py-4">Stats</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D4191F]" />
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-500">
                    No matching content found.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-11 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                          {post.thumbnail && <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />}
                          {post.type === 'VIDEO' && (
                            <PlayCircle size={14} className="text-white absolute bottom-1 right-1 drop-shadow" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 line-clamp-1">{post.title}</p>
                          <p className="text-[11px] font-mono text-gray-400 truncate">
                            {post.category} · /{post.language || 'en'}/article/{post.slug || post.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {post.User?.channel_name || post.User?.username || 'Unknown'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold uppercase">
                          {post.language || 'en'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            post.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : post.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-800'
                              : post.status === 'ARCHIVED'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {post.status || 'PUBLISHED'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFlag(post, 'is_breaking')}
                          title="Toggle Breaking Ticker"
                          className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                            post.is_breaking ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}
                        >
                          <Flame size={13} />
                        </button>
                        <button
                          onClick={() => toggleFlag(post, 'is_featured')}
                          title="Toggle Featured"
                          className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                            post.is_featured ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}
                        >
                          <Star size={13} />
                        </button>
                        <button
                          onClick={() => toggleFlag(post, 'is_editors_pick')}
                          title="Toggle Editor's Pick"
                          className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                            post.is_editors_pick ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}
                        >
                          <Award size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1"><Eye size={12} /> {post.views_count || 0}</span>
                      <span className="ml-2 text-gray-400">
                        <Clock size={11} className="inline mr-0.5" />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openEditor(post)}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg inline-flex items-center"
                        title="Delete permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editorial Edit Drawer */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Story &amp; SEO Metadata</h2>
              <button onClick={() => setEditingPost(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#D4191F]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Language</label>
                  <select
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value as 'en' | 'ta')}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  >
                    <option value="en">English (en)</option>
                    <option value="ta">Tamil (ta)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">URL Slug</label>
                <input
                  type="text"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">SEO Title</label>
                <input
                  type="text"
                  value={editSeoTitle}
                  onChange={(e) => setEditSeoTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">SEO Meta Description</label>
                <textarea
                  rows={3}
                  value={editSeoDesc}
                  onChange={(e) => setEditSeoDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                  Publicly Visible (is_active)
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                  <input type="checkbox" checked={editRobots} onChange={(e) => setEditRobots(e.target.checked)} />
                  Search Indexable
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-[#D4191F] hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
