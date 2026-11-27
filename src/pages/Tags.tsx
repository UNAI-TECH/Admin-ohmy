import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, GitMerge, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['’`]/g, '')
    .replace(/[^\w\u0B80-\u0BFF]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function Tags() {
  const { success, error: toastError } = useToast();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameEn, setNameEn] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tags').select('*').order('name_en', { ascending: true });
    if (error) toastError(error.message);
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;
    try {
      const payload = {
        name_en: nameEn.trim(),
        name_ta: nameTa.trim() || nameEn.trim(),
        slug_en: slugify(nameEn),
        slug_ta: slugify(nameTa || nameEn),
      };
      const { error } = await supabase.from('tags').insert(payload);
      if (error) throw error;
      setNameEn('');
      setNameTa('');
      success('Tag created.');
      load();
    } catch (e: any) {
      toastError(e?.message || 'Failed to create tag');
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
      load();
    } catch (e: any) {
      toastError(e?.message || 'Merge failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete tag?')) return;
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) toastError(error.message);
    else {
      success('Tag deleted.');
      load();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Tag className="text-[#D4191F]" />
          Tags &amp; Topic Taxonomy
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage bilingual English &amp; Tamil tags or merge duplicate tags.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">Create New Tag</h2>
          <div className="grid grid-cols-2 gap-3">
            <input required value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English label" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            <input value={nameTa} onChange={(e) => setNameTa(e.target.value)} placeholder="Tamil label (தமிழ்)" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
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
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {tags.map((t) => (
              <div key={t.id} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full flex items-center gap-2 text-xs font-semibold text-gray-800">
                <span>#{t.name_en}</span>
                {t.name_ta && t.name_ta !== t.name_en && <span className="text-gray-500">({t.name_ta})</span>}
                <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
