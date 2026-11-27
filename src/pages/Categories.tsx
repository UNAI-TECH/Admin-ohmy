import React, { useEffect, useState } from 'react';
import { FolderTree, Plus, Trash2, Save, Loader2 } from 'lucide-react';
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

export default function Categories() {
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [nameEn, setNameEn] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [slugEn, setSlugEn] = useState('');
  const [slugTa, setSlugTa] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descTa, setDescTa] = useState('');
  const [displayOrder, setDisplayOrder] = useState(10);
  const [navVisible, setNavVisible] = useState(true);
  const [homeVisible, setHomeVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name_en', { ascending: true });
    if (error) toastError(error.message);
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setNameEn('');
    setNameTa('');
    setSlugEn('');
    setSlugTa('');
    setDescEn('');
    setDescTa('');
    setDisplayOrder(10);
    setNavVisible(true);
    setHomeVisible(true);
    setIsActive(true);
  };

  const selectForEdit = (cat: any) => {
    setEditing(cat);
    setNameEn(cat.name_en || '');
    setNameTa(cat.name_ta || '');
    setSlugEn(cat.slug_en || '');
    setSlugTa(cat.slug_ta || '');
    setDescEn(cat.description_en || '');
    setDescTa(cat.description_ta || '');
    setDisplayOrder(cat.display_order ?? 10);
    setNavVisible(cat.nav_visible !== false);
    setHomeVisible(cat.home_visible !== false);
    setIsActive(cat.is_active !== false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameTa.trim()) {
      toastError('Both English and Tamil names are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name_en: nameEn.trim(),
        name_ta: nameTa.trim(),
        slug_en: slugify(slugEn || nameEn),
        slug_ta: slugify(slugTa || nameTa),
        description_en: descEn.trim() || null,
        description_ta: descTa.trim() || null,
        display_order: Number(displayOrder) || 0,
        nav_visible: navVisible,
        home_visible: homeVisible,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
        if (error) throw error;
        await adminService.writeAudit('category.update', 'categories', editing.id, editing, payload).catch(() => {});
        success('Category updated.');
      } else {
        const { data, error } = await supabase.from('categories').insert(payload).select().single();
        if (error) throw error;
        await adminService.writeAudit('category.create', 'categories', data?.id || null, null, payload).catch(() => {});
        success('Category created.');
      }
      resetForm();
      load();
    } catch (e: any) {
      toastError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: any) => {
    const { count } = await supabase
      .from('post_categories')
      .select('post_id', { count: 'exact', head: true })
      .eq('category_id', cat.id);

    if ((count || 0) > 0) {
      toastError(`Cannot delete: ${count} article(s) reference this category. Deactivate it instead.`);
      return;
    }
    if (!window.confirm(`Delete category "${cat.name_en}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) {
      toastError(error.message);
      return;
    }
    await adminService.writeAudit('category.delete', 'categories', cat.id, cat, null).catch(() => {});
    success('Category deleted.');
    load();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FolderTree className="text-[#D4191F]" />
          Bilingual Categories
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure English &amp; Tamil news sections, URL slugs, display order, and navigation visibility.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">{editing ? 'Edit Category' : 'Add Bilingual Category'}</h2>
            {editing && (
              <button type="button" onClick={resetForm} className="text-xs font-bold text-[#D4191F]">
                + New Category
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">English Name *</label>
              <input
                required
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value);
                  if (!editing) setSlugEn(slugify(e.target.value));
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tamil Name (தமிழ்) *</label>
              <input
                required
                value={nameTa}
                onChange={(e) => {
                  setNameTa(e.target.value);
                  if (!editing) setSlugTa(slugify(e.target.value));
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">English Slug</label>
              <input
                value={slugEn}
                onChange={(e) => setSlugEn(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Tamil Slug</label>
              <input
                value={slugTa}
                onChange={(e) => setSlugTa(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">English Description</label>
            <textarea rows={2} value={descEn} onChange={(e) => setDescEn(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Tamil Description</label>
            <textarea rows={2} value={descTa} onChange={(e) => setDescTa(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Display Order</label>
              <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5 pt-3 text-xs font-semibold text-gray-700">
              <label className="flex items-center gap-2"><input type="checkbox" checked={navVisible} onChange={(e) => setNavVisible(e.target.checked)} /> Show in Nav</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={homeVisible} onChange={(e) => setHomeVisible(e.target.checked)} /> Show on Home</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#D4191F] hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Save size={16} /> : <Plus size={16} />}
            {editing ? 'Update Category' : 'Create Category'}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFBFF] border-b border-gray-100 text-[10px] font-bold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">English / Tamil</th>
                  <th className="px-4 py-3">Visibility</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.display_order}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{c.name_en} / {c.name_ta}</p>
                      <p className="text-[11px] font-mono text-gray-400">/{c.slug_en}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => selectForEdit(c)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg inline-flex">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
