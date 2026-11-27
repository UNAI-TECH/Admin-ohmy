import { useEffect, useState, useMemo } from 'react';
import { Users, Search, Loader2, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

export default function Readers() {
  const { success, error: toastError } = useToast();
  const [readers, setReaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReaders = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllReaders();
      setReaders(data);
    } catch (e: any) {
      toastError(e?.message || 'Failed to load readers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReaders();
  }, []);

  const handleToggleStatus = async (reader: any) => {
    const curr = reader.account_status || 'active';
    const next = curr === 'active' ? 'suspended' : 'active';
    const reason =
      curr === 'active'
        ? window.prompt(`Reason for suspending @${reader.username}?`, 'Community guidelines violation')
        : 'Reactivated by administrator';
    if (curr === 'active' && reason === null) return;

    setBusyId(reader.id);
    try {
      await adminService.updateUserStatus(reader.id, next, reason || undefined);
      setReaders((prev) => prev.map((r) => (r.id === reader.id ? { ...r, account_status: next } : r)));
      success(`Reader account ${next === 'active' ? 'reactivated' : 'suspended'}.`);
    } catch (e: any) {
      toastError(e?.message || 'Status update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (reader: any) => {
    if (!window.confirm(`Permanently deactivate & anonymize reader "${reader.email}"?`)) return;
    setBusyId(reader.id);
    try {
      await adminService.deleteUserAccount(reader.id);
      setReaders((prev) => prev.filter((r) => r.id !== reader.id));
      success('Reader account deactivated and anonymized.');
    } catch (e: any) {
      toastError(e?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return readers.filter((r) => {
      const st = r.account_status || 'active';
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.username || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.preferred_language || '').toLowerCase().includes(q)
      );
    });
  }, [readers, search, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-[#2563EB]" />
            Reader Accounts
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage registered CITIZEN accounts, language preferences, suspensions, and deletions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, email..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#D4191F]"
            />
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {(['ALL', 'active', 'suspended'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setStatusFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                  statusFilter === t ? 'bg-[#D4191F] text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4191F]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">No reader accounts match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#FAFBFF] border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-4">Reader</th>
                  <th className="px-6 py-4">Language</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filtered.map((r) => {
                  const st = r.account_status || 'active';
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {r.avatarUrl ? (
                            <img src={r.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                              {(r.username || r.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">@{r.username || 'user'}</p>
                            <p className="text-xs text-gray-500">{r.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold uppercase text-gray-600">
                        {r.preferred_language || 'en'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            st === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          disabled={busy}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 border ${
                            st === 'active'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {st === 'active' ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
                          {st === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={busy}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 inline-flex items-center"
                          title="Deactivate & Anonymize"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
