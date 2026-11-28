import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../lib/adminService';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useConfirmModal } from '../context/ConfirmModalContext';
import { logAndGetFriendlyError } from '../lib/errorHandler';
import {
  Users,
  Loader2,
  Mail,
  LayoutTemplate,
  FileText,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Search,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Creators: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const { prompt } = useConfirmModal();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'suspended'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [creatorPosts, setCreatorPosts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [otpModal, setOtpModal] = useState<{ email: string; oneTimePassword: string } | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [sendingOtpEmail, setSendingOtpEmail] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllCreators();
      setCreators(data);
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while loading creators.', 'Creators:fetch'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (creator: any) => {
    setSelectedCreator(creator);
    setPostsLoading(true);
    setFollowerCount(0);
    try {
      const postsPromise = supabase
        .from('Post')
        .select('id, title, thumbnail, type, status, language, views_count, createdAt')
        .eq('authorId', creator.id)
        .order('createdAt', { ascending: false });

      const followPromise = supabase
        .from('Follow')
        .select('*', { count: 'exact', head: true })
        .eq('followingId', creator.id);

      const [{ data: posts }, { count: followers }] = await Promise.all([
        postsPromise,
        followPromise,
      ]);

      setCreatorPosts(posts || []);
      setFollowerCount(followers || 0);
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while loading this creator profile.', 'Creators:portfolio'));
    } finally {
      setPostsLoading(false);
    }
  };

  const handleIssueCreatorOtp = async (creator: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!creator.email) {
      toastError('This account has no email address configured.');
      return;
    }
    setActionBusyId(creator.id);
    try {
      const res = await adminService.issueCreatorOtp(creator.email);
      setOtpModal({ email: creator.email, oneTimePassword: res.oneTimePassword });
      toastSuccess('One-Time Password generated.');
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while generating a One-Time Password.', 'Creators:otp'));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleToggleAccountStatus = async (creator: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyActive = (creator.account_status || 'active') === 'active';
    const nextStatus = isCurrentlyActive ? 'suspended' : 'active';
    const reason = isCurrentlyActive
      ? await prompt({
          title: 'Suspend Creator Account',
          message: `Provide a reason for suspending ${creator.channel_name || creator.username}.`,
          confirmText: 'Suspend',
          variant: 'danger',
          inputLabel: 'Reason',
          inputPlaceholder: 'Policy review',
          defaultInputValue: 'Policy review',
        })
      : 'Reactivated by administrator';

    if (isCurrentlyActive && reason === null) return;

    setActionBusyId(creator.id);
    try {
      await adminService.updateUserStatus(creator.id, nextStatus, reason || undefined);
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, account_status: nextStatus } : c))
      );
      if (selectedCreator?.id === creator.id) {
        setSelectedCreator((prev: any) => (prev ? { ...prev, account_status: nextStatus } : prev));
      }
      toastSuccess(`Creator account ${nextStatus === 'active' ? 'reactivated' : 'suspended'}.`);
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while updating creator status.', 'Creators:status'));
    } finally {
      setActionBusyId(null);
    }
  };

  const filteredCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return creators.filter((c) => {
      const status = c.account_status || 'active';
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!q) return true;
      return (
        (c.channel_name || '').toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    });
  }, [creators, statusFilter, searchQuery]);

  const copyOtp = () => {
    if (!otpModal?.oneTimePassword) return;
    navigator.clipboard.writeText(otpModal.oneTimePassword);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const sendOtpByEmail = async () => {
    if (!otpModal) return;
    setSendingOtpEmail(true);
    try {
      const res = await adminService.sendCreatorOtpEmail(otpModal.email, otpModal.oneTimePassword, 'otp_reset');
      if (res?.sent === false) {
        toastError(res?.message || 'Email relay is unconfigured. Copy and share the One-Time Password directly.');
      } else {
        toastSuccess(`One-Time Password emailed to ${otpModal.email}`);
        setOtpModal(null);
      }
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while emailing the One-Time Password.', 'Creators:emailOtp'));
    } finally {
      setSendingOtpEmail(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Users className="text-[#D4191F]" />
            Approved Creators
          </h1>
          <p className="text-gray-500">
            Directory of creators and analysts. Manage account status, recovery links, and portfolios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, @username, email..."
              className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-[#D4191F] w-64"
            />
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {(['ALL', 'active', 'suspended'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === tab
                    ? 'bg-[#D4191F] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#D4191F]" />
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 italic">
          No creators match the current filter.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator) => {
              const status = creator.account_status || 'active';
              const isBusy = actionBusyId === creator.id;
              return (
                <motion.div
                  key={creator.id}
                  className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden border border-black/[0.04] cursor-pointer hover:border-red-500/30 transition-all group relative flex flex-col"
                  onClick={() => handleViewProfile(creator)}
                  whileHover={{ y: -4, scale: 1.01 }}
                >
                  <div className="h-32 bg-[#FAFBFF] relative">
                    {creator.coverUrl ? (
                      <img src={creator.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100" />
                    )}
                    <div
                      className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${
                        status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                        }`}
                      />
                      {status}
                    </div>
                    <div className="absolute top-3 left-3 bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-gray-200">
                      {creator.role}
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-0 relative flex-1 flex flex-col">
                    <div className="w-20 h-20 rounded-full border-4 border-white bg-[#FAFBFF] -mt-10 relative z-10 flex items-center justify-center overflow-hidden mb-3 shadow-sm">
                      {creator.avatarUrl ? (
                        <img src={creator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-[#D4191F]">
                          {(creator.channel_name || creator.username || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-extrabold tracking-tight text-gray-900 leading-tight flex items-center gap-2">
                      {creator.channel_name || creator.username || 'Unnamed'}
                      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-8.1 7.9z" />
                      </svg>
                    </h3>
                    <p className="text-xs text-gray-500 font-medium tracking-wide mb-3 truncate">
                      @{creator.username} · {creator.email}
                    </p>

                    <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px] mb-5">
                      {creator.bio || 'No bio provided.'}
                    </p>

                    <div className="border-t border-gray-100 pt-4 mt-auto flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleIssueCreatorOtp(creator, e)}
                        disabled={isBusy}
                        className="flex-1 min-w-[110px] py-2.5 px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        title="Generate One-Time Password for Creator Studio"
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        Issue OTP
                      </button>
                      <button
                        onClick={(e) => handleToggleAccountStatus(creator, e)}
                        disabled={isBusy}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border disabled:opacity-50 ${
                          status === 'active'
                            ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {status === 'active' ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                        {status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Creator Profile Slide-over */}
      <AnimatePresence>
        {selectedCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCreator(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md ml-auto bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden relative"
            >
              <button
                onClick={() => setSelectedCreator(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              >
                <XCircle size={22} />
              </button>

              <div className="overflow-y-auto custom-scrollbar flex-1 pb-10">
                <div className="relative">
                  <div className="h-40 bg-[#FAFBFF] w-full">
                    {selectedCreator.coverUrl && (
                      <img src={selectedCreator.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="px-6 relative pb-6 border-b border-gray-200">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-[#FAFBFF] -mt-12 mb-4 relative z-10 flex items-center justify-center overflow-hidden shadow">
                      {selectedCreator.avatarUrl ? (
                        <img src={selectedCreator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-[#D4191F]">
                          {selectedCreator.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                      {selectedCreator.channel_name || selectedCreator.username}
                    </h2>
                    <p className="text-sm text-gray-500 mb-3">
                      @{selectedCreator.username} · {selectedCreator.email}
                    </p>

                    <p className="text-sm text-gray-700 leading-relaxed mb-5">
                      {selectedCreator.bio || 'No bio provided.'}
                    </p>

                    <div className="flex items-center gap-6 mb-5">
                      <div>
                        <p className="text-xl font-bold text-gray-900">{creatorPosts.length}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Posts</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">{followerCount}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Followers</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">
                          {creatorPosts.reduce((s, p) => s + (p.views_count || 0), 0)}
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Views</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => handleIssueCreatorOtp(selectedCreator, e)}
                        className="flex-1 min-w-[140px] py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-900 flex items-center justify-center gap-1.5"
                      >
                        <KeyRound size={14} /> Issue One-Time Password
                      </button>
                      <button
                        onClick={(e) => handleToggleAccountStatus(selectedCreator, e)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
                          (selectedCreator.account_status || 'active') === 'active'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {(selectedCreator.account_status || 'active') === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <LayoutTemplate className="text-[#D4191F]" size={20} />
                    Publications
                  </h3>

                  {postsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-8 h-8 animate-spin text-[#D4191F]" />
                    </div>
                  ) : creatorPosts.length === 0 ? (
                    <div className="text-center py-10 bg-[#FAFBFF] rounded-2xl border border-black/[0.04]">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No publications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creatorPosts.map((post) => (
                        <div
                          key={post.id}
                          className="bg-white border border-black/[0.05] shadow-sm rounded-2xl p-4 flex gap-4"
                        >
                          <div className="w-16 h-16 bg-[#FAFBFF] rounded-xl overflow-hidden flex-shrink-0">
                            {post.thumbnail ? (
                              <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <FileText size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#D4191F]/10 text-[#D4191F] uppercase">
                                {post.type}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 uppercase">
                                {post.language || 'en'}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                                {post.status || 'PUBLISHED'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1 leading-tight">
                              {post.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()} · {post.views_count || 0} views
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* One-Time Password Modal */}
      <AnimatePresence>
        {otpModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <KeyRound size={18} className="text-[#D4191F]" />
                  Creator One-Time Password
                </h3>
                <button onClick={() => setOtpModal(null)} className="text-gray-400 hover:text-gray-700">
                  <XCircle size={22} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Generated for <strong>{otpModal.email}</strong>. The creator must verify this one-time password at Creator Studio login and set a new personal password.
              </p>
              <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 flex items-center gap-2 mb-4">
                <p className="text-base font-mono font-bold tracking-wider text-gray-900 truncate flex-1">{otpModal.oneTimePassword}</p>
                <button
                  onClick={copyOtp}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  {copiedOtp ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedOtp ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setOtpModal(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={sendOtpByEmail}
                  disabled={sendingOtpEmail}
                  className="flex-1 py-2.5 bg-[#D4191F] text-white rounded-xl font-bold text-sm hover:bg-red-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {sendingOtpEmail ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  Email OTP
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Creators;
