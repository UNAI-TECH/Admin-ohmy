import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, GitMerge, Loader2, Pencil, Check, X, Flame } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/^#+/, '')
    .replace(/['’`]/g, '')
    .replace(/[^\w\u0B80-\u0BFF]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function Tags() {
  const { success, error: toastError } = useToast();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameEn, setNameEn] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isPopular, setIsPopular] = useState<boolean>(true);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEn, setEditEn] = useState('');
  const [editTa, setEditTa] = useState('');
  const [editOrder, setEditOrder] = useState<number>(0);
  const [editPopular, setEditPopular] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    let { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name_en', { ascending: true });

    if (error) {
      const fb = await supabase.from('tags').select('*').order('name_en', { ascending: true });
      data = fb.data;
      error = fb.error;
    }

    if (error) toastError(error.message);
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-tags-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => {
        load(true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEn = nameEn.trim().replace(/^#+/, '');
    const cleanTa = (nameTa.trim() || cleanEn).replace(/^#+/, '');
    if (!cleanEn) return;
    try {
      const payload: Record<string, any> = {
        name_en: cleanEn,
        name_ta: cleanTa,
        slug_en: slugify(cleanEn),
        slug_ta: slugify(cleanTa),
        is_popular: isPopular,
        display_order: Number(displayOrder) || 0,
      };
      let { error } = await supabase.from('tags').insert(payload);
      if (error && error.message?.includes('is_popular')) {
        const legacyPayload = {
          name_en: cleanEn,
          name_ta: cleanTa,
          slug_en: slugify(cleanEn),
          slug_ta: slugify(cleanTa),
        };
        const retry = await supabase.from('tags').insert(legacyPayload);
        error = retry.error;
      }
      if (error) throw error;
      setNameEn('');
      setNameTa('');
      setDisplayOrder((prev) => prev + 1);
      setIsPopular(true);
      success('Tag created and synced.');
      load(true);
    } catch (e: any) {
      toastError(e?.message || 'Failed to create tag');
    }
  };

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditEn(t.name_en || '');
    setEditTa(t.name_ta || '');
    setEditOrder(Number(t.display_order) || 0);
    setEditPopular(t.is_popular !== false);
  };

  const handleSaveEdit = async (id: string) => {
    const cleanEn = editEn.trim().replace(/^#+/, '');
    const cleanTa = (editTa.trim() || cleanEn).replace(/^#+/, '');
    if (!cleanEn) {
      toastError('English tag label is required.');
      return;
    }
    setSavingId(id);
    try {
      const payload: Record<string, any> = {
        name_en: cleanEn,
        name_ta: cleanTa,
        slug_en: slugify(cleanEn),
        slug_ta: slugify(cleanTa),
        is_popular: editPopular,
        display_order: Number(editOrder) || 0,
      };
      const { error } = await supabase.from('tags').update(payload).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      success('Tag updated in realtime.');
      load(true);
    } catch (e: any) {
      toastError(e?.message || 'Failed to update tag');
    } finally {
      setSavingId(null);
    }
  };

  const handleTogglePopular = async (t: any) => {
    const nextPopular = !(t.is_popular !== false);
    setSavingId(t.id);
    try {
      const { error } = await supabase
        .from('tags')
        .update({ is_popular: nextPopular })
        .eq('id', t.id);
      if (error) throw error;
      success(nextPopular ? `#${t.name_en} added to Popular Tags.` : `#${t.name_en} hidden from Popular Tags.`);
      load(true);
    } catch (e: any) {
      toastError(e?.message || 'Failed to toggle Popular status (run migration 008 if missing column).');
    } finally {
      setSavingId(null);
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) {
      toastError('Select two different tags to merge.');
      return;
    }
    if (!window.confirm('Reassign all articles from source tag to target tag and delete source?')) return;
    try {
      const { data: rows } = await supabase.from('post_tags').select('post_id').eq('tag_id', mergeSourceId);
      if (rows && rows.length > 0) {
        await supabase
          .from('post_tags')
          .upsert(rows.map((r: any) => ({ post_id: r.post_id, tag_id: mergeTargetId })), { onConflict: 'post_id,tag_id' });
      }
      await supabase.from('tags').delete().eq('id', mergeSourceId);
      await adminService.writeAudit('tag.merge', 'tags', mergeTargetId, { mergedFrom: mergeSourceId }, null).catch(() => {});
      setMergeSourceId('');
      setMergeTargetId('');
      success('Tags merged cleanly.');
      load(true);
    } catch (e: any) {
      toastError(e?.message || 'Merge failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete tag permanently?')) return;
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) toastError(error.message);
    else {
      success('Tag deleted.');
      load(true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Tag className="text-[#D4191F]" />
          Tags &amp; Popular Tags Manager
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Add, edit, reorder, or remove Popular Tags shown below the public website navbar in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">Create / Add Popular Tag</h2>
          <div className="grid grid-cols-2 gap-3">
            <input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English label (e.g. Budget2026)" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={nameTa} onChange={(e) => setNameTa(e.target.value)} placeholder="Tamil label (தமிழ்)" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="rounded border-gray-300 text-[#D4191F] focus:ring-[#D4191F]"
              />
              Show in Public Popular Tags bar
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              Order:
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              />
            </label>
          </div>
          <button type="submit" className="px-4 py-2 bg-[#D4191F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Plus size={14} /> Add Tag
          </button>
        </form>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><GitMerge size={16} /> Merge Duplicate Tags</h2>
          <div className="grid grid-cols-2 gap-3">
            <select value={mergeSourceId} onChange={(e) => setMergeSourceId(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold">
              <option value="">Source tag (delete)</option>
              {tags.map((t) => <option key={t.id} value={t.id}>{t.name_en}</option>)}
            </select>
            <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold">
              <option value="">Target tag (keep)</option>
              {tags.map((t) => <option key={t.id} value={t.id}>{t.name_en}</option>)}
            </select>
          </div>
          <button onClick={handleMerge} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold">
            Merge Source Into Target
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-sm">All Tags ({tags.length})</h2>
          <span className="text-xs text-gray-500">
            Active Popular Tags: {tags.filter((t) => t.is_popular !== false).length}
          </span>
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No tags yet. Add one above to populate the Popular Tags bar.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {tags.map((t) => {
              const isEditing = editingId === t.id;
              const popular = t.is_popular !== false;
              return (
                <div key={t.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <input
                        value={editEn}
                        onChange={(e) => setEditEn(e.target.value)}
                        placeholder="English"
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                      />
                      <input
                        value={editTa}
                        onChange={(e) => setEditTa(e.target.value)}
                        placeholder="Tamil"
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        value={editOrder}
                        onChange={(e) => setEditOrder(Number(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                        title="Display Order"
                      />
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPopular}
                          onChange={(e) => setEditPopular(e.target.checked)}
                          className="rounded border-gray-300 text-[#D4191F]"
                        />
                        Popular
                      </label>
                      <button
                        onClick={() => handleSaveEdit(t.id)}
                        disabled={savingId === t.id}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Check size={13} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-gray-400 font-mono w-6">#{t.display_order ?? 0}</span>
                        <span className="font-semibold text-sm text-gray-900">#{t.name_en}</span>
                        {t.name_ta && t.name_ta !== t.name_en && (
                          <span className="text-xs text-gray-500">({t.name_ta})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePopular(t)}
                          disabled={savingId === t.id}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border transition ${
                            popular
                              ? 'bg-red-50 text-[#D4191F] border-red-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          <Flame size={11} />
                          {popular ? 'Popular' : 'Hidden'}
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                          title="Edit tag"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Delete tag"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
