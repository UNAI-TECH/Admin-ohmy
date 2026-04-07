import React, { useState, useEffect } from 'react';
import { MessageSquare, Reply, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const Feedback: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();

    const channel = supabase
      .channel('admin-feedback-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Feedback' }, async (payload) => {
        const newFb = payload.new as any;
        if (newFb.userId) {
          try {
            const { data: user } = await supabase.from('User').select('username, email, role, avatarUrl').eq('id', newFb.userId).single();
            newFb.User = user || { username: 'Unknown User', role: 'CITIZEN' };
          } catch(e) {
            newFb.User = { username: 'Unknown User', role: 'CITIZEN' };
          }
        } else {
          newFb.User = { username: 'Anonymous', role: 'GUEST' };
        }
        setFeedbacks(prev => [newFb, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedbacks = async () => {
    try {
      // Fetch feedbacks without join (no FK relationship exists)
      const { data: feedbacks, error } = await supabase
        .from('Feedback')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('not found')) {
          setFeedbacks([]);
          return;
        }
        throw error;
      }

      if (!feedbacks || feedbacks.length === 0) {
        setFeedbacks([]);
        return;
      }

      // Manually fetch associated users
      const userIds = [...new Set(feedbacks.map((f: any) => f.userId).filter(Boolean))];

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('User')
          .select('id, username, email, role, avatarUrl')
          .in('id', userIds);

        const userMap: Record<string, any> = {};
        (users || []).forEach((u: any) => { userMap[u.id] = u; });

        const merged = feedbacks.map((f: any) => ({
          ...f,
          User: f.userId ? (userMap[f.userId] || { username: 'Unknown User', role: 'CITIZEN' }) : { username: 'Anonymous', role: 'GUEST' }
        }));
        setFeedbacks(merged);
      } else {
        setFeedbacks(feedbacks);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      const diff = (new Date(dateStr).getTime() - new Date().getTime()) / 1000;
      
      if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
      if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
      if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
      return rtf.format(Math.round(diff / 86400), 'day');
    } catch (e) {
      return new Date(dateStr).toLocaleDateString();
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <MessageSquare className="text-blue-400" />
          User Feedback
        </h1>
        <p className="text-gray-500 opacity-60">Insights, bug reports, and suggestions from application users.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-4 pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-100 rounded-2xl border border-white/5">
            <MessageSquare className="w-12 h-12 text-gray-500 opacity-30 mb-4" />
            <p className="text-gray-500 opacity-60">No feedback entries yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {feedbacks.map((item) => {
              const username = item.User?.username || item.User?.email || 'Anonymous';
              const role = item.User?.role || 'GUEST';
              
              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white shadow-sm backdrop-blur-md border border-gray-200 rounded-2xl p-6 hover:bg-[#171f3399] transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {item.User?.avatarUrl ? (
                        <img src={item.User.avatarUrl} alt="avatar" className="w-12 h-12 rounded-full object-cover border border-blue-500/20" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-lg">
                          {username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-0.5">{username}</h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            (role === 'ANALYST' || role === 'CREATOR') ? 'bg-[#E31E24]/10 border-[#E31E24]/20 text-[#E31E24]' : 
                            role === 'ADMIN' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                            'bg-gray-100 border-gray-200 text-gray-500'
                          }`}>
                            {role}
                          </span>
                          {item.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border bg-blue-500/10 border-blue-500/20 text-blue-400">
                              {item.category}
                            </span>
                          )}
                          <span className="text-gray-500 opacity-50 text-xs">
                            {getTimeAgo(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 text-sm leading-relaxed mb-5 mt-2 bg-black/20 p-4 rounded-xl border border-white/5 font-medium">
                    {item.content || item.message}
                  </p>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase tracking-wider">
                      <Reply size={14} />
                      Respond
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Feedback;
