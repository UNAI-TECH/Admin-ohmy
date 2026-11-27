import React, { useEffect, useState } from 'react';
import { Globe, Plus, Trash2, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

export default function SeoCenter() {
  const { success, error: toastError } = useToast();
  const [audit, setAudit] = useState<any>(null);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [sourcePath, setSourcePath] = useState('');
  const [targetPath, setTargetPath] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [auditRes, redRes] = await Promise.all([
        supabase.rpc('get_seo_audit_report'),
        supabase.from('seo_redirects').select('*').order('created_at', { ascending: false }),
      ]);
      if (auditRes.data) setAudit(auditRes.data);
      setRedirects(redRes.data || []);
    } catch (e: any) {
      toastError(e?.message || 'Failed to run SEO audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePath.trim() || !targetPath.trim()) return;
    try {
      const src = sourcePath.trim().startsWith('/') ? sourcePath.trim() : `/${sourcePath.trim()}`;
      const dst = targetPath.trim().startsWith('/') || targetPath.trim().startsWith('http')
        ? targetPath.trim()
        : `/${targetPath.trim()}`;
      const { error } = await supabase.from('seo_redirects').upsert(
        { source_path: src, target_path: dst, status_code: 301, is_active: true },
        { onConflict: 'source_path' }
      );
      if (error) throw error;
      await adminService.writeAudit('seo.redirect_upsert', 'seo_redirects', null, null, { src, dst }).catch(() => {});
      setSourcePath('');
      setTargetPath('');
      success('301 redirect rule saved.');
      load();
    } catch (e: any) {
      toastError(e?.message || 'Failed to add redirect');
    }
  };

  const handleDeleteRedirect = async (id: string) => {
    await supabase.from('seo_redirects').delete().eq('id', id);
    load();
  };

  const counts = audit?.summary || {};
  const issues = audit?.issues || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Globe className="text-[#D4191F]" />
          Technical SEO Center &amp; 301 Redirects
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Live metadata health checks, bilingual coverage telemetry, and managed URL redirects.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Published Total', val: counts.totalPublished ?? 0 },
              { label: 'Indexable URLs', val: counts.indexableCount ?? 0 },
              { label: 'Missing SEO Title', val: counts.missingSeoTitle ?? 0, warn: true },
              { label: 'Missing Meta Desc', val: counts.missingMetaDescription ?? 0, warn: true },
              { label: 'Missing Image Alt', val: counts.missingAltText ?? 0, warn: true },
              { label: 'Untranslated Posts', val: counts.untranslatedPosts ?? 0 },
              { label: 'English Published', val: counts.englishPublished ?? 0 },
              { label: 'Tamil Published', val: counts.tamilPublished ?? 0 },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{k.label}</p>
                <p className={`text-2xl font-extrabold mt-1 ${k.warn && k.val > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {k.val}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SEO Audit Queue */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle size={17} className="text-amber-500" />
                Articles Needing SEO Attention
              </h2>
              {issues.length === 0 ? (
                <p className="text-xs text-emerald-700 font-semibold py-6">All published articles have complete SEO metadata!</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {issues.map((item: any) => (
                    <div key={item.id} className="py-3 space-y-1">
                      <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.title}</p>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 bg-gray-900 text-white rounded uppercase">{item.language}</span>
                        {item.missingSeoTitle && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded">Missing SEO Title</span>}
                        {item.missingMetaDescription && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded">Missing Meta Desc</span>}
                        {item.missingAltText && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded">Missing Alt Text</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 301 Redirects Manager */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-900">301 Redirect Rules</h2>
              <form onSubmit={handleAddRedirect} className="flex flex-col sm:flex-row gap-2">
                <input
                  required
                  value={sourcePath}
                  onChange={(e) => setSourcePath(e.target.value)}
                  placeholder="/en/article/old-slug"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                />
                <input
                  required
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="/en/article/new-slug"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                />
                <button type="submit" className="px-4 py-2 bg-[#D4191F] text-white rounded-xl text-xs font-bold flex items-center gap-1">
                  <Plus size={14} /> Add
                </button>
              </form>

              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {redirects.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex items-center gap-1.5 font-mono truncate">
                      <span className="text-gray-700 truncate">{r.source_path}</span>
                      <ArrowRight size={12} className="text-gray-400 shrink-0" />
                      <span className="text-emerald-700 truncate">{r.target_path}</span>
                    </div>
                    <button onClick={() => handleDeleteRedirect(r.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
