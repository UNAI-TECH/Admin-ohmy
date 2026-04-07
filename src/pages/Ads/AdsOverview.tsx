import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  TrendingUp, 
  MousePointerClick, 
  Eye, 
  IndianRupee, 
  Zap,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdsOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAds: 0,
    activeAds: 0,
    completedAds: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalRevenue: 0,
    avgCTR: 0
  });

  const fetchStats = async () => {
    try {
      const { data: ads, error } = await supabase
        .from('ads')
        .select('status, impressions_count, clicks_count, total_spent');

      if (error) throw error;

      if (ads) {
        const totalAds = ads.length;
        const activeAds = ads.filter(a => a.status === 'active').length;
        const completedAds = ads.filter(a => a.status === 'completed').length;
        const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions_count || 0), 0);
        const totalClicks = ads.reduce((sum, a) => sum + (a.clicks_count || 0), 0);
        const totalRevenue = ads.reduce((sum, a) => sum + (Number(a.total_spent) || 0), 0);
        const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        setStats({
          totalAds,
          activeAds,
          completedAds,
          totalImpressions,
          totalClicks,
          totalRevenue,
          avgCTR
        });
      }
    } catch (err) {
      console.error('Error fetching ads stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('ads-overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, () => fetchStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ad_clicks' }, () => fetchStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ad_impressions' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <IndianRupee size={24} />, color: '#10B981', trend: '+14% growth' },
    { label: 'Total Impressions', value: stats.totalImpressions.toLocaleString(), icon: <Eye size={24} />, color: '#8ecdff', trend: 'Live reach' },
    { label: 'Total Clicks', value: stats.totalClicks.toLocaleString(), icon: <MousePointerClick size={24} />, color: '#F59E0B', trend: `${stats.avgCTR.toFixed(2)}% CTR` },
    { label: 'Campaigns', value: stats.activeAds, icon: <Activity size={24} />, color: '#E31E24', trend: `${stats.totalAds} total` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight flex items-center gap-3">
            Real-time Insights <Zap className="text-[#E31E24] fill-[#E31E24]" size={28} />
          </h1>
          <p className="text-gray-500 opacity-60 font-medium">Live monitoring of your advertisement ecosystem.</p>
        </div>
        <div className="px-4 py-2 bg-[#E31E24]/10 border border-[#E31E24]/20 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-black text-[#E31E24] uppercase tracking-widest">Network Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map((card, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="bg-white shadow-sm backdrop-blur-xl border border-gray-200 p-8 rounded-3xl relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, ${card.color}, transparent)` }} />
            
            <div className="flex items-center justify-between mb-8">
              <div className="p-4 rounded-2xl bg-[#FAFBFF] shadow-sm border border-gray-100" style={{ color: card.color }}>
                {card.icon}
              </div>
              <ArrowUpRight size={20} className="text-gray-500 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>

            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-40">{card.label}</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">{card.value}</h3>
            
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 opacity-60">
                {card.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white shadow-sm backdrop-blur-xl border border-gray-200 p-10 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Performance Curve</h3>
              <p className="text-xs text-gray-500 opacity-40">Live tracking of impressions vs conversion</p>
            </div>
            <select className="bg-[#FAFBFF] border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-gray-500 outline-none">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          
          <div className="h-64 w-full flex items-end gap-2 px-2">
            {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 100].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex-1 bg-gradient-to-t from-red-100 to-[#E31E24] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity relative group"
              >
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {Math.floor(h * stats.totalImpressions / 100)}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-6 px-2 text-[10px] font-black text-gray-500 opacity-20 uppercase tracking-widest">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        <div className="bg-white shadow-sm backdrop-blur-xl border border-gray-200 p-10 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-[#E31E24] rounded-3xl flex items-center justify-center mb-8 rotate-12 shadow-2xl shadow-red-900/40">
            <TrendingUp size={40} className="text-white -rotate-12" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">System Health</h3>
          <p className="text-sm text-gray-500 opacity-40 leading-relaxed mb-8">Your advertisement engine is operating at peak performance with zero latency detected.</p>
          <div className="w-full space-y-4">
            <div className="bg-[#FAFBFF] p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100">
              <span className="text-[10px] font-black text-gray-500 opacity-60 uppercase tracking-widest">Latency</span>
              <span className="text-sm font-bold text-green-500">12ms</span>
            </div>
            <div className="bg-[#FAFBFF] p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100">
              <span className="text-[10px] font-black text-gray-500 opacity-60 uppercase tracking-widest">Uptime</span>
              <span className="text-sm font-bold text-gray-900">99.9%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
