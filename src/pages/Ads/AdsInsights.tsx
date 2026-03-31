import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  BarChart2, 
  TrendingUp, 
  Trophy
} from 'lucide-react';

export default function AdsInsights() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchInsights = async () => {
    setLoading(true);
    const { data: allAds, error } = await supabase
      .from('ads')
      .select('*')
      .order('total_spent', { ascending: false });

    if (error) console.error('Error fetching insights:', error);
    if (allAds) setAds(allAds);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const filteredAds = filter === 'ALL' ? ads : ads.filter(a => a.status === filter.toLowerCase());

  const topAd = ads.length > 0 ? ads[0] : null;
  const avgCtr = ads.reduce((sum, a) => {
    const ctr = a.impressions_count > 0 ? (a.clicks_count / a.impressions_count) * 100 : 0;
    return sum + ctr;
  }, 0) / (ads.length || 1);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight flex items-center gap-3">
            Business Intelligence <BarChart2 className="text-blue-500" size={28} />
          </h1>
          <p className="text-[#e7bdb8] opacity-60 font-medium">Deep-dive analysis of campaign efficiency and reach metrics.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#171f3366] backdrop-blur-xl border border-[#ae88831a] p-1.5 rounded-2xl">
          {['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${filter === f ? 'bg-[#E31E24] text-white shadow-lg' : 'text-[#e7bdb8]/40 hover:text-[#e7bdb8]'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 p-8 rounded-3xl relative overflow-hidden group shadow-2xl">
          <Trophy className="absolute -right-4 -bottom-4 text-blue-500 opacity-10 group-hover:scale-110 transition-transform" size={120} />
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Top Performer</p>
          <h3 className="text-xl font-black text-white mb-1 truncate">{topAd?.title || 'N/A'}</h3>
          <p className="text-sm text-blue-400/60 font-bold mb-6">{topAd?.advertiser_name || 'No campaigns yet'}</p>
          <div className="flex items-center gap-4">
             <div>
               <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Spent</p>
               <p className="text-lg font-black text-white">₹{Number(topAd?.total_spent || 0).toLocaleString()}</p>
             </div>
             <div className="w-px h-8 bg-white/10" />
             <div>
               <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Clicks</p>
               <p className="text-lg font-black text-white">{topAd?.clicks_count || 0}</p>
             </div>
          </div>
        </div>

        <div className="bg-[#171f3366] backdrop-blur-xl border border-[#ae88831a] p-8 rounded-3xl flex flex-col justify-center shadow-2xl">
          <p className="text-[#e7bdb8] text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-40">Network Efficiency</p>
          <div className="flex items-end gap-3 mb-2">
            <h3 className="text-5xl font-black text-white tracking-tighter">{avgCtr.toFixed(2)}%</h3>
            <TrendingUp size={24} className="text-green-400 mb-2" />
          </div>
          <p className="text-xs text-[#e7bdb8] opacity-40 font-bold">Average CTR across all campaigns</p>
        </div>

        <div className="bg-[#171f3366] backdrop-blur-xl border border-[#ae88831a] p-8 rounded-3xl flex flex-col justify-center shadow-2xl">
          <p className="text-[#e7bdb8] text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-40">Total Ecosystem Value</p>
          <div className="flex items-end gap-3 mb-2">
            <h3 className="text-5xl font-black text-white tracking-tighter">
              ₹{ads.reduce((s, a) => s + Number(a.total_spent), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h3>
          </div>
          <p className="text-xs text-[#e7bdb8] opacity-40 font-bold">Accumulated advertiser spend</p>
        </div>
      </div>

      <div className="bg-[#171f3366] backdrop-blur-xl border border-[#ae88831a] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#ae88830d] bg-white/[0.02]">
                <th className="py-6 px-10 text-[10px] font-black text-[#e7bdb8] uppercase tracking-[0.2em] opacity-40">Campaign Detail</th>
                <th className="py-6 px-10 text-[10px] font-black text-[#e7bdb8] uppercase tracking-[0.2em] opacity-40 text-right">Reach</th>
                <th className="py-6 px-10 text-[10px] font-black text-[#e7bdb8] uppercase tracking-[0.2em] opacity-40 text-right">Conv.</th>
                <th className="py-6 px-10 text-[10px] font-black text-[#e7bdb8] uppercase tracking-[0.2em] opacity-40 text-right">CTR</th>
                <th className="py-6 px-10 text-[10px] font-black text-[#e7bdb8] uppercase tracking-[0.2em] opacity-40 text-right">Economics</th>
                <th className="py-6 px-10 text-[10px] font-black text-[#e7bdb8] uppercase tracking-[0.2em] opacity-40 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ae88830d]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="w-8 h-8 border-4 border-[#E31E24] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredAds.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-[#e7bdb8] opacity-40 italic font-medium">No campaign data matching your intelligence filter.</td>
                </tr>
              ) : (
                filteredAds.map(ad => {
                  const ctr = ad.impressions_count > 0 ? (ad.clicks_count / ad.impressions_count) * 100 : 0;
                  return (
                    <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-6 px-10">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#0b1326] shrink-0 border border-white/5 overflow-hidden shadow-lg">
                            <img src={ad.media_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={ad.title} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white group-hover:text-[#E31E24] transition-colors">{ad.title}</p>
                            <p className="text-[10px] font-bold text-[#e7bdb8] opacity-40 uppercase tracking-widest">{ad.advertiser_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-10 text-right font-black text-white tracking-tighter text-lg">
                        {(ad.impressions_count || 0).toLocaleString()}
                      </td>
                      <td className="py-6 px-10 text-right font-black text-white tracking-tighter text-lg">
                        {(ad.clicks_count || 0).toLocaleString()}
                      </td>
                      <td className="py-6 px-10 text-right">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${ctr > 2 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {ctr.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-6 px-10 text-right">
                        <p className="text-sm font-black text-white">₹{Number(ad.total_spent).toLocaleString()}</p>
                        <p className="text-[9px] font-black text-[#e7bdb8] opacity-20 uppercase tracking-widest">{ad.pricing_model} Rate: ₹{ad.pricing_model === 'cpc' ? ad.cpc_amount : ad.cpm_amount}</p>
                      </td>
                      <td className="py-6 px-10 text-right">
                         <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                           ad.status === 'active' ? 'bg-green-500/10 text-green-400' :
                           ad.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                           'bg-amber-500/10 text-amber-500'
                         }`}>
                           {ad.status}
                         </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
