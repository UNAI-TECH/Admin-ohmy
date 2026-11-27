import React, { useState, useEffect } from 'react';
import { BarChart3, Users, FileText, Loader2, Eye, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

const Analytics: React.FC = () => {
  const { error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [creatorsByMonth, setCreatorsByMonth] = useState<any[]>([]);
  const [postsByMonth, setPostsByMonth] = useState<any[]>([]);
  const [topPosts, setTopPosts] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [ov, creatorsRes, postsRes] = await Promise.all([
        adminService.getOverviewStats(),
        supabase.from('User').select('createdAt').in('role', ['ANALYST', 'CREATOR']),
        supabase
          .from('Post')
          .select('id, title, language, category, status, views_count, likes_count, comments_count, createdAt')
          .order('views_count', { ascending: false }),
      ]);

      setOverview(ov);
      setCreatorsByMonth(processMonthlyData(creatorsRes.data || []));
      setPostsByMonth(processMonthlyData(postsRes.data || []));
      setTopPosts((postsRes.data || []).slice(0, 12));
    } catch (err: any) {
      toastError(err?.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (records: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyCounts = months.map((m) => ({ month: m, count: 0 }));

    records.forEach((r) => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === currentYear) {
        monthlyCounts[d.getMonth()].count += 1;
      }
    });
    return monthlyCounts;
  };

  const exportCsv = () => {
    const headers = ['ID', 'Title', 'Language', 'Category', 'Status', 'Views', 'Likes', 'Comments', 'CreatedAt'];
    const rows = topPosts.map((p) => [
      p.id,
      `"${String(p.title || '').replace(/"/g, '""')}"`,
      p.language || 'en',
      p.category || '',
      p.status || 'PUBLISHED',
      p.views_count || 0,
      p.likes_count || 0,
      p.comments_count || 0,
      p.createdAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `postsapp_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxCreatorCount = Math.max(...creatorsByMonth.map((d) => d.count), 5);
  const maxPostCount = Math.max(...postsByMonth.map((d) => d.count), 5);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4191F]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
            <BarChart3 className="text-[#D4191F]" />
            Platform Growth Analytics
          </h1>
          <p className="text-gray-500 text-sm">
            Real database counts across English &amp; Tamil publishing, views, reactions, and ad delivery ({new Date().getFullYear()}).
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <Download size={14} /> Export CSV Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Creators</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{overview?.activeCreators ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">{overview?.totalCreators ?? 0} total onboarded</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Published Content</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{overview?.publishedPosts ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            EN: {overview?.englishPosts ?? 0} · TA: {overview?.tamilPosts ?? 0}
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Article Views</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{overview?.totalViews ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            {overview?.totalLikes ?? 0} likes · {overview?.totalComments ?? 0} comments
          </p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ad Delivery</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{overview?.adImpressions ?? 0} imp</p>
          <p className="text-xs text-gray-500 mt-1">
            {overview?.adClicks ?? 0} clicks · ₹{Number(overview?.adSpend || 0).toFixed(2)} spend
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Users className="text-[#D4191F]" size={18} />
            Creators Onboarded ({new Date().getFullYear()})
          </h3>
          <div className="h-[260px] flex items-end gap-2 relative pt-8">
            <div className="flex-1 flex items-end justify-between h-full">
              {creatorsByMonth.map((data, idx) => {
                const h = data.count === 0 ? 3 : Math.max(10, (data.count / maxCreatorCount) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center w-full group">
                    <div className="w-full max-w-[32px] h-full flex items-end relative">
                      <div
                        className={`w-full rounded-t-lg ${data.count === 0 ? 'bg-gray-100' : 'bg-[#D4191F]'}`}
                        style={{ height: `${h}%` }}
                        title={`${data.month}: ${data.count}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-2 font-bold">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <FileText className="text-[#10B981]" size={18} />
            Stories Created ({new Date().getFullYear()})
          </h3>
          <div className="h-[260px] flex items-end gap-2 relative pt-8">
            <div className="flex-1 flex items-end justify-between h-full">
              {postsByMonth.map((data, idx) => {
                const h = data.count === 0 ? 3 : Math.max(10, (data.count / maxPostCount) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center w-full group">
                    <div className="w-full max-w-[32px] h-full flex items-end relative">
                      <div
                        className={`w-full rounded-t-lg ${data.count === 0 ? 'bg-gray-100' : 'bg-emerald-600'}`}
                        style={{ height: `${h}%` }}
                        title={`${data.month}: ${data.count}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-2 font-bold">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top Articles Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900">Top Stories by Views</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBFF] border-b border-gray-100 text-[10px] font-bold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-4 py-3">Lang</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Likes</th>
                <th className="px-6 py-3 text-right">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topPosts.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 font-bold text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 uppercase font-mono">{p.language || 'en'}</td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    <Eye size={12} className="inline mr-1 text-gray-400" />
                    {p.views_count || 0}
                  </td>
                  <td className="px-4 py-3 text-right">{p.likes_count || 0}</td>
                  <td className="px-6 py-3 text-right">{p.comments_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
