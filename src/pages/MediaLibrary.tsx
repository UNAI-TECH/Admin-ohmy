import { useEffect, useState, useMemo } from 'react';
import { Image as ImageIcon, Film, Search, Trash2, Copy, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

export default function MediaLibrary() {
  const { success, error: toastError } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*, owner:User!owner_id(username, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toastError(error.message);
    setAssets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (asset: any) => {
    const { count } = await supabase
      .from('Post')
      .select('id', { count: 'exact', head: true })
      .or(`thumbnail.eq.${asset.public_url},og_image.eq.${asset.public_url}`);
    if ((count || 0) > 0) {
      toastError(`Blocked: referenced by ${count} post(s).`);
      return;
    }
    if (!window.confirm(`Delete "${asset.file_name}" permanently?`)) return;
    await supabase.storage.from(asset.bucket).remove([asset.storage_path]);
    const { error } = await supabase.from('media_assets').delete().eq('id', asset.id);
    if (error) {
      toastError(error.message);
      return;
    }
    await adminService.writeAudit('media.delete', 'media_assets', asset.id, asset, null).catch(() => {});
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    success('Asset deleted.');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter(
      (a) =>
        !q ||
        (a.file_name || '').toLowerCase().includes(q) ||
        (a.alt_text || '').toLowerCase().includes(q) ||
        (a.owner?.username || '').toLowerCase().includes(q)
    );
  }, [assets, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ImageIcon className="text-[#D4191F]" />
            Global Media Library
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Inspect uploaded images and videos across creators with safe usage checks before deletion.
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename, alt, creator..."
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-sm text-gray-500">
          No tracked media assets uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                {String(a.mime_type || '').startsWith('video/') ? (
                  <Film size={28} className="text-gray-400" />
                ) : (
                  <img src={a.public_url} alt={a.alt_text || a.file_name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-900 truncate">{a.file_name}</p>
                  <p className="text-[11px] text-gray-500">
                    {a.owner?.username ? `@${a.owner.username}` : 'System'} · {(a.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(a.public_url);
                      success('URL copied');
                    }}
                    className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Copy size={12} /> Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                    title="Delete unused asset"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
