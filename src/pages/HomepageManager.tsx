import React, { useEffect, useState } from 'react';
import { LayoutList, Plus, ArrowUp, ArrowDown, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

export default function HomepageManager() {
  const { success, error: toastError } = useToast();
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [sections, setSections] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sectionKey, setSectionKey] = useState('');
  const [sectionType, setSectionType] = useState('featured');
  const [titleEn, setTitleEn] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [maxItems, setMaxItems] = useState(6);

  const load = async () => {
    setLoading(true);
    const [{ data: secs }, { data: postRows }] = await Promise.all([
      supabase
        .from('homepage_config')
        .select('*')
        .eq('language', lang)
        .order('display_order', { ascending: true }),
      supabase
        .from('Post')
        .select('id, title, language, is_breaking, is_featured, is_editors_pick')
        .eq('language', lang)
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })
        .limit(40),
    ]);
    setSections(secs || []);
    setPosts(postRows || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [lang]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionKey.trim() || !titleEn.trim()) return;
    try {
      const { error } = await supabase.from('homepage_config').insert({
        section_key: `${sectionKey.trim().toLowerCase().replace(/\s+/g, '_')}_${lang}`,
        section_type: sectionType,
        language: lang,
        title_en: titleEn.trim(),
        title_ta: titleTa.trim() || titleEn.trim(),
        display_order: sections.length + 1,
        max_items: Number(maxItems) || 6,
        is_active: true,
      });
      if (error) throw error;
      setSectionKey('');
      setTitleEn('');
      setTitleTa('');
      success('Homepage section added.');
      load();
    } catch (e: any) {
      toastError(e?.message || 'Failed to add section');
    }
  };

  const moveOrder = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setSections(copy);
    await Promise.all(
      copy.map((s, i) =>
        supabase.from('homepage_config').update({ display_order: i + 1 }).eq('id', s.id)
      )
    );
    success('Section order saved.');
  };

  const toggleActive = async (sec: any) => {
    const next = !sec.is_active;
    await supabase.from('homepage_config').update({ is_active: next }).eq('id', sec.id);
    setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, is_active: next } : s)));
  };

  const deleteSection = async (id: string) => {
    if (!window.confirm('Remove this section from homepage config?')) return;
    await supabase.from('homepage_config').delete().eq('id', id);
    load();
  };

  const togglePostPlacement = async (post: any, field: 'is_breaking' | 'is_featured' | 'is_editors_pick') => {
    const next = !post[field];
    try {
      await adminService.adminUpdatePost(post.id, { [field]: next });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, [field]: next } : p)));
      success('Homepage spotlight placement updated.');
    } catch (e: any) {
      toastError(e?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <LayoutList className="text-[#D4191F]" />
            Homepage Layout &amp; Curation
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure ordered homepage blocks and curate Breaking Ticker, Lead Featured, and Editor&apos;s Picks per language.
          </p>
        </div>
        <div className="flex bg-white border border-gray-200 p-1 rounded-xl gap-1">
          {(['en', 'ta'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase ${
                lang === l ? 'bg-[#D4191F] text-white' : 'text-gray-600'
              }`}
            >
              {l === 'en' ? 'English Edition' : 'Tamil Edition'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ordered Homepage Sections */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Ordered Sections ({lang.toUpperCase()})</h2>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
            ) : sections.length === 0 ? (
              <p className="text-xs text-gray-400">No custom sections configured for this language yet.</p>
            ) : (
              <div className="space-y-2.5">
                {sections.map((sec, idx) => (
                  <div key={sec.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900">{sec.title_en} / {sec.title_ta}</p>
                      <p className="text-[11px] font-mono text-gray-500">
                        {sec.section_type} · max {sec.max_items}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveOrder(idx, -1)} className="p-1 hover:bg-gray-200 rounded"><ArrowUp size={13} /></button>
                      <button onClick={() => moveOrder(idx, 1)} className="p-1 hover:bg-gray-200 rounded"><ArrowDown size={13} /></button>
                      <button
                        onClick={() => toggleActive(sec)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${sec.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}
                      >
                        {sec.is_active ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => deleteSection(sec.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAddSection} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Add Section Block</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <input required value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} placeholder="Key e.g. regional" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <select value={sectionType} onChange={(e) => setSectionType(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold">
                <option value="breaking">Breaking</option>
                <option value="featured">Featured</option>
                <option value="editors_pick">Editor&apos;s Pick</option>
                <option value="latest">Latest Grid</option>
                <option value="video_strip">Video Strip</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input required value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Heading EN" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <input value={titleTa} onChange={(e) => setTitleTa(e.target.value)} placeholder="Heading TA" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={24} value={maxItems} onChange={(e) => setMaxItems(Number(e.target.value))} className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <button type="submit" className="flex-1 py-2 bg-[#D4191F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                <Plus size={14} /> Add Section
              </button>
            </div>
          </form>
        </div>

        {/* Homepage Story Spotlights */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">Homepage Spotlight Placements ({lang.toUpperCase()})</h2>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {posts.map((p) => (
              <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs font-bold text-gray-900 line-clamp-1 flex-1">{p.title}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePostPlacement(p, 'is_breaking')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      p.is_breaking ? 'bg-red-100 text-red-800 border-red-300' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    Breaking
                  </button>
                  <button
                    onClick={() => togglePostPlacement(p, 'is_featured')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      p.is_featured ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    Featured
                  </button>
                  <button
                    onClick={() => togglePostPlacement(p, 'is_editors_pick')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      p.is_editors_pick ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    Editor Pick
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
