import React, { useState, useEffect } from 'react';
import { MessageSquare, Reply, Loader2, X, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

const Feedback: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingItem, setRespondingItem] = useState<any | null>(null);
  const [responseStatus, setResponseStatus] = useState<'reviewed' | 'resolved' | 'dismissed'>('resolved');
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeedbacks();

    const channel = supabase
      .channel('admin-feedback-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Feedback' }, () => {
        fetchFeedbacks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('Feedback')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      if (!rows || rows.length === 0) {
        setFeedbacks([]);
        return;
      }

      const userIds = [...new Set(rows.map((f: any) => f.userId).filter(Boolean))];
      const userMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('User')
          .select('id, username, email, role, avatarUrl')
          .in('id', userIds);
        (users || []).forEach((u: any) => {
          userMap[u.id] = u;
        });
      }

      setFeedbacks(
        rows.map((f: any) => ({
          ...f,
          User: f.userId
            ? userMap[f.userId] || { username: 'User', role: 'CITIZEN' }
            : { username: 'Anonymous', role: 'GUEST' },
        }))
      );
    } catch (err: any) {
      toastError(err?.message || 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const openRespondModal = (item: any) => {
    setRespondingItem(item);
    setResponseStatus(
      ['reviewed', 'resolved', 'dismissed'].includes(item.status) ? item.status : 'resolved'
    );
    setResponseText(item.response_text || '');
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingItem || !responseText.trim()) return;
    setSubmitting(true);
    try {
      const res = await adminService.respondFeedback(
        respondingItem.id,
        responseStatus,
        responseText.trim()
      );
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === respondingItem.id ? { ...f, ...res } : f))
      );
      setRespondingItem(null);
      success('Feedback response saved and logged.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to save response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <MessageSquare className="text-[#D4191F]" />
          User Feedback &amp; Inquiries
        </h1>
        <p className="text-gray-500 text-sm">Review bug reports and suggestions from readers and creators.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pb-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#D4191F]" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No feedback entries yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {feedbacks.map((item) => {
              const username = item.User?.username || item.User?.email || 'Anonymous';
              const role = item.User?.role || 'GUEST';
              const status = item.status || 'pending';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white shadow-sm border border-gray-200 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-[#D4191F] font-bold">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{username}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-gray-100 text-gray-700">
                            {role}
                          </span>
                          {item.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-700">
                              {item.category}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'dismissed'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {status}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-800 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {item.content || item.message}
                  </p>

                  {item.response_text && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Admin Response ({item.responded_at ? new Date(item.responded_at).toLocaleDateString() : 'Recorded'}):
                      </p>
                      <p>{item.response_text}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openRespondModal(item)}
                      className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Reply size={14} />
                      {item.response_text ? 'Update Response' : 'Respond'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {respondingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Respond to Feedback</h2>
              <button onClick={() => setRespondingItem(null)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
              {respondingItem.content || respondingItem.message}
            </p>
            <form onSubmit={handleSendResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                >
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Response Note *</label>
                <textarea
                  rows={4}
                  required
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write official resolution notes..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#D4191F]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRespondingItem(null)}
                  className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#D4191F] hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Save Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
