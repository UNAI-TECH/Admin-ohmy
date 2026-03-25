import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart3, Users, FileText, Loader2, Calendar } from 'lucide-react';

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [creatorsByMonth, setCreatorsByMonth] = useState<any[]>([]);
  const [postsByMonth, setPostsByMonth] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();

    // Set up realtime subscriptions for automatic updates
    const channel = supabase
      .channel('admin-analytics-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Post' }, () => {
        fetchAnalyticsData(); // Refetch to update charts
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'User' }, () => {
        fetchAnalyticsData(); // Refetch to update charts
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch all creators and posts to calculate monthly distribution
      const [creatorsData, postsData] = await Promise.all([
        supabase.from('User').select('createdAt').eq('role', 'ANALYST').order('createdAt', { ascending: true }),
        supabase.from('Post').select('createdAt').order('createdAt', { ascending: true })
      ]);

      const cData = processMonthlyData(creatorsData.data || []);
      const pData = processMonthlyData(postsData.data || []);

      setCreatorsByMonth(cData);
      setPostsByMonth(pData);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (records: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    // Initialize array with 0 for all 12 months
    const monthlyCounts = months.map(m => ({ month: m, count: 0 }));

    records.forEach(r => {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === currentYear) {
        monthlyCounts[d.getMonth()].count += 1;
      }
    });

    return monthlyCounts;
  };

  const maxCreatorCount = Math.max(...creatorsByMonth.map(d => d.count), 10);
  const maxPostCount = Math.max(...postsByMonth.map(d => d.count), 20);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#E31E24]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="text-[#3b82f6]" />
            Growth Analytics
          </h1>
          <p className="text-[#e7bdb8] opacity-60">Real-time metrics for creator onboarding and content volume ({new Date().getFullYear()}).</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm text-[#e7bdb8] opacity-80">
          <Calendar size={16} /> Year To Date
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Creators Chart */}
        <div className="bg-[#171f3366] backdrop-blur-md rounded-2xl border border-[#ae88831a] p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <Users className="text-[#E31E24]" size={20} />
                Creators Onboarded
              </h3>
              <p className="text-xs text-[#e7bdb8] opacity-50">Total validated creators joining the platform per month.</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] flex items-end gap-2 sm:gap-4 relative pt-10">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-[#e7bdb8] opacity-40 text-right pr-2">
              <span>{maxCreatorCount}</span>
              <span>{Math.round(maxCreatorCount / 2)}</span>
              <span>0</span>
            </div>
            
            {/* Grid lines */}
            <div className="absolute left-8 right-0 top-2 border-t border-[#ae888308]" />
            <div className="absolute left-8 right-0 top-1/2 border-t border-[#ae888308]" />
            <div className="absolute left-8 right-0 bottom-6 border-t border-[#ae88831a]" />

            {/* Bars */}
            <div className="flex-1 flex items-end justify-between ml-8 relative z-10 pb-6 h-full">
              {creatorsByMonth.map((data, idx) => {
                const heightPercentage = data.count === 0 ? 0 : Math.max(5, (data.count / maxCreatorCount) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center w-full group">
                    <div className="w-full max-w-[40px] px-1 h-full flex items-end relative">
                      {data.count > 0 && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          {data.count}
                        </span>
                      )}
                      <div 
                        className="w-full bg-gradient-to-t from-[#E31E24]/20 to-[#E31E24] rounded-t-sm transition-all duration-700 ease-out group-hover:to-[#ff3a40]"
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#e7bdb8] opacity-50 mt-3 font-medium uppercase tracking-wider">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Posts Chart */}
        <div className="bg-[#171f3366] backdrop-blur-md rounded-2xl border border-[#ae88831a] p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <FileText className="text-[#10B981]" size={20} />
                Content Published
              </h3>
              <p className="text-xs text-[#e7bdb8] opacity-50">Total posts, news, and videos published globally per month.</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] flex items-end gap-2 sm:gap-4 relative pt-10">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-[#e7bdb8] opacity-40 text-right pr-2">
              <span>{maxPostCount}</span>
              <span>{Math.round(maxPostCount / 2)}</span>
              <span>0</span>
            </div>
            
            {/* Grid lines */}
            <div className="absolute left-8 right-0 top-2 border-t border-[#ae888308]" />
            <div className="absolute left-8 right-0 top-1/2 border-t border-[#ae888308]" />
            <div className="absolute left-8 right-0 bottom-6 border-t border-[#ae88831a]" />

            {/* Bars */}
            <div className="flex-1 flex items-end justify-between ml-8 relative z-10 pb-6 h-full">
              {postsByMonth.map((data, idx) => {
                const heightPercentage = data.count === 0 ? 0 : Math.max(5, (data.count / maxPostCount) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center w-full group">
                    <div className="w-full max-w-[40px] px-1 h-full flex items-end relative">
                      {data.count > 0 && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          {data.count}
                        </span>
                      )}
                      <div 
                        className="w-full bg-gradient-to-t from-[#10B981]/20 to-[#10B981] rounded-t-sm transition-all duration-700 ease-out group-hover:to-[#34d399]"
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#e7bdb8] opacity-50 mt-3 font-medium uppercase tracking-wider">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
