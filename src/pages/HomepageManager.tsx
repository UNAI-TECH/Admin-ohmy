import React, { useEffect, useState } from 'react';
import { LayoutList, Plus, ArrowUp, ArrowDown, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

interface HomepageSection {
  key: string;
  title: string;
  visible: boolean;
  limit: number;
  order: number;
}

const DEFAULT_SECTIONS: Record<'en' | 'ta', HomepageSection[]> = {
  en: [
    { key: 'breaking', title: 'Breaking News', visible: true, limit: 5, order: 1 },
    { key: 'hero', title: 'Main News & Picks', visible: true, limit: 8, order: 2 },
    { key: 'featured', title: 'Featured Stories', visible: true, limit: 4, order: 3 },
    { key: 'latest', title: 'Latest News', visible: true, limit: 10, order: 4 },
    { key: 'trending', title: 'Trending Now', visible: true, limit: 6, order: 5 },
    { key: 'most_read', title: 'Most Read', visible: true, limit: 6, order: 6 },
    { key: 'videos', title: 'Video Reports', visible: true, limit: 6, order: 7 },
  ],
  ta: [
    { key: 'breaking', title: 'முக்கிய செய்திகள்', visible: true, limit: 5, order: 1 },
    { key: 'hero', title: 'பிரதான செய்திகள்', visible: true, limit: 8, order: 2 },
    { key: 'featured', title: 'சிறப்புக் கட்டுரைகள்', visible: true, limit: 4, order: 3 },
    { key: 'latest', title: 'அண்மைச் செய்திகள்', visible: true, limit: 10, order: 4 },
    { key: 'trending', title: 'டிரெண்டிங்', visible: true, limit: 6, order: 5 },
    { key: 'most_read', title: 'அதிகம் வாசிக்கப்பட்டவை', visible: true, limit: 6, order: 6 },
    { key: 'videos', title: 'காணொளிச் செய்திகள்', visible: true, limit: 6, order: 7 },
  ],
};

export default function HomepageManager() {
  const { success, error: toastError } = useToast();
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sectionKey, setSectionKey] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [maxItems, setMaxItems] = useState(6);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: cfg, error: cfgErr }, { data: postRows }] = await Promise.all([
        supabase.from('homepage_config').select('*').eq('language', lang).maybeSingle(),
        supabase
          .from('Post')
          .select('id, title, language, is_breaking, is_featured, is_editors_pick')
          .eq('language', lang)
          .eq('status', 'PUBLISHED')
          .order('published_at', { ascending: false })
          .limit(40),
      ]);
      if (cfgErr) throw cfgErr;
      const loadedSections = Array.isArray(cfg?.sections) && cfg.sections.length > 0
        ? [...cfg.sections].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        : DEFAULT_SECTIONS[lang];
      setSections(loadedSections);
      setPosts(postRows || []);
    } catch (e: any) {
      toastError(e?.message || 'Failed to load homepage config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`admin-homepage-manager-${lang}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'homepage_config', filter: `language=eq.${lang}` },
        (payload) => {
          const next = (payload?.new as any)?.sections;
          if (Array.isArray(next) && next.length > 0) {
            setSections([...next].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Post' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lang]);

  const persistSections = async (nextSections: HomepageSection[], msg?: string) => {
    const normalized = nextSections.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSections(normalized);
    const { error } = await supabase
      .from('homepage_config')
      .upsert(
        {
          language: lang,
          sections: normalized,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'language' }
      );
    if (error) throw error;
    await adminService.writeAudit('homepage.sections_update', 'homepage_config', lang, null, normalized).catch(() => {});
    if (msg) success(msg);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionKey.trim() || !sectionTitle.trim()) return;
    try {
      const cleanKey = sectionKey.trim().toLowerCase().replace(/\s+/g, '_');
      if (sections.some((s) => s.key === cleanKey)) {
        toastError('Section key already exists.');
        return;
      }
      const next: HomepageSection[] = [
        ...sections,
        {
          key: cleanKey,
          title: sectionTitle.trim(),
          visible: true,
          limit: Number(maxItems) || 6,
          order: sections.length + 1,
        },
      ];
      await persistSections(next, 'Homepage section added.');
      setSectionKey('');
      setSectionTitle('');
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
    try {
      await persistSections(copy, 'Section order saved.');
    } catch (e: any) {
      toastError(e?.message || 'Failed to save order');
    }
  };

  const toggleActive = async (key: string) => {
    const next = sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s));
    try {
      await persistSections(next);
    } catch (e: any) {
      toastError(e?.message || 'Failed to toggle visibility');
    }
  };

  const deleteSection = async (key: string) => {
    if (!window.confirm('Remove this section from homepage config?')) return;
    const next = sections.filter((s) => s.key !== key);
    try {
      await persistSections(next, 'Section removed.');
    } catch (e: any) {
      toastError(e?.message || 'Failed to delete section');
    }
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
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900 text-sm">Ordered Sections ({lang.toUpperCase()})</h2>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
            ) : sections.length === 0 ? (
              <p className="text-xs text-gray-400">No sections configured yet.</p>
            ) : (
              <div className="space-y-2.5">
                {sections.map((sec, idx) => (
                  <div key={sec.key} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900">{sec.title}</p>
                      <p className="text-[11px] font-mono text-gray-500">
                        {sec.key} · max {sec.limit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveOrder(idx, -1)} className="p-1 hover:bg-gray-200 rounded"><ArrowUp size={13} /></button>
                      <button onClick={() => moveOrder(idx, 1)} className="p-1 hover:bg-gray-200 rounded"><ArrowDown size={13} /></button>
                      <button
                        onClick={() => toggleActive(sec.key)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${sec.visible ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}
                      >
                        {sec.visible ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => deleteSection(sec.key)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
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
              <input required value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} placeholder="Heading Title" className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={24} value={maxItems} onChange={(e) => setMaxItems(Number(e.target.value))} className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
              <button type="submit" className="flex-1 py-2 bg-[#D4191F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                <Plus size={14} /> Add Section
              </button>
            </div>
          </form>
        </div>

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
