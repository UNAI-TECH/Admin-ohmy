import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { PauseCircle, Target, Link, Calendar, IndianRupee, Play, Search, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

export default function PausedAds() {
  const { error: toastError } = useToast();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .in('status', ['paused', 'ended'])
        .order('created_at', { ascending: false });

      if (data) setAds(data);
      setLoading(false);
    };

    fetchAds();
  }, []);

  const handleResume = async (id: string, budget: number, total_spent: number) => {
    if (total_spent >= budget) {
      toastError("Budget limit reached. Please increase budget before resuming.");
      return;
    }
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    setAds(prev => prev.filter(ad => ad.id !== id));
  };

  const filtered = ads.filter(ad => ad.title.toLowerCase().includes(search.toLowerCase()) || ad.advertiser_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <PauseCircle className="text-amber-500" /> Paused/Ended Campaigns
          </h1>
          <p className="text-[#e7bdb8] opacity-60">Inactive ads that are no longer shown in the feed.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e7bdb8] opacity-40" size={16} />
          <input 
            type="text" 
            placeholder="Search campaigns..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0b1326] border border-[#ae88831a] rounded-full py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-[#E31E24] outline-none transition-all placeholder:text-[#e7bdb8] placeholder:opacity-20"
          />
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <p className="text-[#e7bdb8] opacity-60 text-center py-10">Loading campaigns...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-[#171f3366] border border-[#ae88831a] rounded-2xl p-10 text-center">
             <Target className="mx-auto text-[#e7bdb8] opacity-20 mb-4" size={48} />
             <p className="text-lg text-white font-bold mb-1">No inactive campaigns</p>
          </div>
        ) : (
          filtered.map(ad => (
            <motion.div 
              key={ad.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl p-6 flex flex-col md:flex-row gap-6 relative group ${ad.status === 'ended' ? 'opacity-70' : ''}`}
            >
              {/* Image Preview */}
              <div className="w-full md:w-64 aspect-video rounded-xl bg-[#0b1326] overflow-hidden border border-[#ae88831a] shrink-0 relative grayscale">
                 <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover opacity-60" />
                 <div className={`absolute top-2 left-2 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${ad.status === 'ended' ? 'bg-red-500' : 'bg-amber-500'}`}>
                   {ad.status}
                 </div>
              </div>

              {/* Ad Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 truncate">{ad.title}</h3>
                  <p className="text-sm font-semibold text-[#e7bdb8] mb-3 flex items-center gap-2">
                    <Target size={14} className="opacity-50" /> {ad.advertiser_name}
                  </p>
                  <p className="text-xs text-[#e7bdb8] opacity-60 line-clamp-2 mb-4 leading-relaxed max-w-2xl">{ad.description}</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-[#e7bdb8] font-bold">
                  <span className="flex items-center gap-1.5 opacity-80"><IndianRupee size={14} className="text-green-400" /> CPC: ₹{ad.cpc_amount}</span>
                  <span className="flex items-center gap-1.5 opacity-80"><CreditCard size={14} className="text-red-400" /> Spent: ₹{ad.total_spent} / ₹{ad.budget}</span>
                  <span className="flex items-center gap-1.5 opacity-80"><Calendar size={14} className="text-amber-400" /> Created {new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-between shrink-0">
                 <a 
                   href={ad.redirect_url} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/5 text-center flex items-center justify-center"
                   title="View Target URL"
                 >
                   <Link size={18} />
                 </a>
                 <button 
                   onClick={() => handleResume(ad.id, ad.budget, ad.total_spent)}
                   disabled={ad.status === 'ended' && ad.total_spent >= ad.budget}
                   className="p-3 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl transition-colors border border-green-500/10 text-center flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                   title="Resume Campaign"
                 >
                   <Play size={18} />
                 </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
