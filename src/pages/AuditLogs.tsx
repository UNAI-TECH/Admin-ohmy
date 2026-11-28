import { useEffect, useState } from 'react';
import { ShieldCheck, Search, Loader2 } from 'lucide-react';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';
import { logAndGetFriendlyError } from '../lib/errorHandler';

export default function AuditLogs() {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAuditLogs({
        limit: 100,
        actionFilter: actionFilter.trim() || undefined,
        resourceFilter: resourceFilter || undefined,
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      toastError(logAndGetFriendlyError(e, 'Something went wrong while loading audit logs.', 'AuditLogs:load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [resourceFilter]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3 flex-wrap">
            <ShieldCheck className="text-[#D4191F] shrink-0" />
            <span>Security &amp; Editorial Audit Logs</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Immutable record of publishing transitions, account moderation, credential invites, and config updates ({total} entries).
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex flex-wrap gap-2 items-center"
        >
          <div className="relative flex-1 sm:flex-initial min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action (e.g. post.publish)"
              className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none w-full sm:w-52"
            />
          </div>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
          >
            <option value="">All Resources</option>
            <option value="Post">Post</option>
            <option value="User">User</option>
            <option value="creator_requests">Creator Requests</option>
            <option value="categories">Categories</option>
            <option value="Feedback">Feedback</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-[#D4191F] text-white rounded-xl text-xs font-bold">
            Apply
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#D4191F]" /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">No audit entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#FAFBFF] border-b border-gray-100 text-[10px] font-bold uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Resource</th>
                  <th className="px-4 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-gray-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#D4191F]">{l.action}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {l.resource_type} {l.resource_id ? `(${String(l.resource_id).slice(0, 8)})` : ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">
                      {l.actor_role} · {String(l.actor_id || 'system').slice(0, 8)}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-gray-500 max-w-md truncate">
                      {l.updated_values ? JSON.stringify(l.updated_values) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
