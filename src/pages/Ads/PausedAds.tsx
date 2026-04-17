import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { PauseCircle, Target, Link, Calendar, IndianRupee, Play, Search, CreditCard, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

export default function PausedAds() {
  const { success, error: toastError } = useToast();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      const { data } = await supabase
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

  const handleDelete = (ad: any) => {
    setCampaignToDelete(ad);
    setShowDeleteModal(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    try {
      const { error } = await supabase.from('ads').delete().eq('id', campaignToDelete.id);
      if (error) throw error;
      setAds(prev => prev.filter(c => c.id !== campaignToDelete.id));
      success('Campaign deleted successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to delete campaign');
    } finally {
      setShowDeleteModal(false);
      setCampaignToDelete(null);
    }
  };

  const filtered = ads.filter(ad => ad.title.toLowerCase().includes(search.toLowerCase()) || ad.advertiser_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <PauseCircle className="text-amber-500" /> Paused/Ended Campaigns
          </h1>
          <p className="text-gray-500 opacity-60">Inactive ads that are no longer shown in the feed.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 opacity-40" size={16} />
          <input 
            type="text" 
            placeholder="Search campaigns..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#FAFBFF] border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm text-gray-900 focus:ring-1 focus:ring-[#E31E24] outline-none transition-all placeholder:text-gray-500 placeholder:opacity-20"
          />
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <p className="text-gray-500 opacity-60 text-center py-10">Loading campaigns...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-10 text-center">
             <Target className="mx-auto text-gray-500 opacity-20 mb-4" size={48} />
             <p className="text-lg text-gray-900 font-bold mb-1">No inactive campaigns</p>
          </div>
        ) : (
          filtered.map(ad => (
            <motion.div 
              key={ad.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white shadow-sm backdrop-blur-md border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 relative group ${ad.status === 'ended' ? 'opacity-70' : ''}`}
            >
              {/* Image Preview */}
              <div className="w-full md:w-64 aspect-video rounded-xl bg-[#FAFBFF] overflow-hidden border border-gray-200 shrink-0 relative grayscale">
                 <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover opacity-60" />
                 <div className={`absolute top-2 left-2 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${ad.status === 'ended' ? 'bg-red-500' : 'bg-amber-500'}`}>
                   {ad.status}
                 </div>
              </div>

              {/* Ad Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">{ad.title}</h3>
                  <p className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                    <Target size={14} className="opacity-50" /> {ad.advertiser_name}
                  </p>
                  <p className="text-xs text-gray-500 opacity-60 line-clamp-2 mb-4 leading-relaxed max-w-2xl">{ad.description}</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-500 font-bold">
                  <span className="flex items-center gap-1.5 opacity-80"><IndianRupee size={14} className="text-green-400" /> CPC: ₹{ad.cpc_amount}</span>
                  <span className="flex items-center gap-1.5 opacity-80"><CreditCard size={14} className="text-red-400" /> Spent: ₹{ad.total_spent} / ₹{ad.budget}</span>
                  <span className="flex items-center gap-1.5 opacity-80"><Calendar size={14} className="text-amber-400" /> Created {new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col justify-between shrink-0 gap-3">
                 <a 
                   href={ad.redirect_url} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="p-3 bg-gray-100 hover:bg-white/10 text-gray-900 rounded-xl transition-colors border border-white/5 text-center flex items-center justify-center"
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
                 <button 
                   onClick={() => handleDelete(ad)}
                   className="p-3 bg-red-500/10 hover:bg-red-500/20 text-[#E31E24] rounded-xl transition-colors border border-red-500/10 text-center flex items-center justify-center"
                   title="Delete Campaign"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2 tracking-tight">Delete Campaign?</h3>
            <p className="text-sm text-gray-500 text-center mb-6 font-medium">
              Are you sure you want to delete <span className="font-bold text-gray-700">"{campaignToDelete?.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setCampaignToDelete(null); }}
                className="flex-1 py-3 bg-gray-100 font-bold text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCampaign}
                className="flex-1 py-3 bg-[#E31E24] font-bold text-white rounded-xl hover:bg-red-700 transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
