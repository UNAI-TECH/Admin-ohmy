import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Target, 
  IndianRupee, 
  Pause, 
  Search, 
  CreditCard, 
  MousePointerClick, 
  Eye, 
  Activity,
  ArrowUpRight,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ActiveAds() {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAds = async () => {
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) setAds(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAds();

    const channel = supabase.channel('active-ads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, fetchAds)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePause = async (id: string) => {
    await supabase.from('ads').update({ status: 'paused' }).eq('id', id);
  };

  const filtered = ads.filter(ad => 
    ad.title.toLowerCase().includes(search.toLowerCase()) || 
    ad.advertiser_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight flex items-center gap-3">
            Live Campaigns <Activity className="text-green-500" size={28} />
          </h1>
          <p className="text-gray-500 opacity-60 font-medium">Currently active ads circulating in the mobile ecosystem.</p>
        </div>
        <div className="relative group max-w-md w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 opacity-20 group-focus-within:opacity-100 transition-opacity" size={20} />
          <input 
            type="text" 
            placeholder="Search campaigns..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white shadow-sm backdrop-blur-xl border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all placeholder:text-gray-500 placeholder:opacity-20"
          />
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm font-bold animate-pulse">Syncing with network...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white shadow-sm backdrop-blur-xl border border-gray-200 rounded-3xl p-20 text-center shadow-2xl">
              <Target className="mx-auto text-gray-500 opacity-10 mb-6" size={80} />
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No Active Output</h2>
              <p className="text-gray-500 opacity-40 max-w-sm mx-auto">All ad relays are currently idle. Deploy a new campaign to start serving content.</p>
          </div>
        ) : (
          filtered.map(ad => {
            const spentPercent = (ad.total_spent / ad.budget_total) * 100;
            
            return (
              <motion.div 
                key={ad.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white shadow-sm backdrop-blur-xl border border-gray-200 rounded-3xl p-8 flex flex-col xl:flex-row gap-10 relative group hover:border-[#ae888333] transition-colors shadow-xl"
              >
                {/* Media Preview */}
                <div className="w-full xl:w-72 aspect-video rounded-2xl bg-[#FAFBFF] overflow-hidden border border-gray-200 shrink-0 relative shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                   <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-green-500 text-gray-900 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Live
                      </span>
                      <span className="bg-white/10 backdrop-blur-md text-gray-900 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-200 shadow-lg">
                        {ad.pricing_model}
                      </span>
                   </div>
                </div>

                {/* Campaign Insights */}
                <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight group-hover:text-[#E31E24] transition-colors">{ad.title}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-gray-500 opacity-60 flex items-center gap-2 uppercase tracking-widest">
                            <Target size={14} className="text-[#E31E24]" /> {ad.advertiser_name}
                          </span>
                          <span className="text-xs font-black text-gray-500 opacity-60 flex items-center gap-2 uppercase tracking-widest">
                            <Calendar size={14} /> {new Date(ad.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-gray-500 opacity-20 uppercase tracking-widest mb-1">Price per unit</p>
                        <p className="text-lg font-black text-gray-900">₹{ad.pricing_model === 'cpc' ? ad.cpc_amount : ad.cpm_amount}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 opacity-60 line-clamp-2 mb-8 leading-relaxed max-w-2xl font-medium">{ad.description}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-500 opacity-20 uppercase tracking-widest flex items-center gap-1.5"><Eye size={10} /> Impressions</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">{(ad.impressions_count || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-500 opacity-20 uppercase tracking-widest flex items-center gap-1.5"><MousePointerClick size={10} /> Clicks</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">{(ad.clicks_count || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-500 opacity-20 uppercase tracking-widest flex items-center gap-1.5"><IndianRupee size={10} /> Remaining</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">₹{Number(ad.budget_remaining).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-gray-500 opacity-20 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={10} /> Total Spent</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">₹{Number(ad.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {/* Budget Progress */}
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-gray-500 opacity-40 uppercase tracking-widest">Budget Exhaustion</span>
                      <span className="text-[10px] font-black text-gray-900">{spentPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#FAFBFF] rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${spentPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${spentPercent > 80 ? 'bg-amber-400' : 'bg-[#E31E24]'} shadow-[0_0_10px_rgba(227,30,36,0.3)]`}
                      />
                    </div>
                  </div>
                </div>

                {/* Vertical Control Bar */}
                <div className="flex xl:flex-col gap-4 shrink-0 xl:border-l border-gray-100 xl:pl-8">
                   <a 
                     href={ad.redirect_url} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex-1 xl:flex-none p-4 bg-gray-100 hover:bg-white/10 text-gray-900 rounded-2xl transition-all border border-white/5 shadow-lg group/link"
                     title="Audit Target URL"
                   >
                     <ArrowUpRight size={20} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                   </a>
                   <button 
                     onClick={() => handlePause(ad.id)}
                     className="flex-1 xl:flex-none p-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-2xl transition-all border border-amber-500/10 shadow-lg group/pause"
                     title="Suspend Relay"
                   >
                     <Pause size={20} className="group-hover/pause:scale-110 transition-transform" />
                   </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
