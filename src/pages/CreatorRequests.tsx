import { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, Clock, ExternalLink, 
  Info, Loader2, RefreshCw, UserPlus, Copy, Check
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService, type CreatorRequest, type CreateCreatorPayload } from '../lib/adminService';
import { useToast } from '../context/ToastContext';
import { logAndGetFriendlyError } from '../lib/errorHandler';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreatorRequests() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<CreatorRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    oneTimePassword: string;
    type: 'otp' | 'otp_reset';
  } | null>(null);
  const [showApproveCredModal, setShowApproveCredModal] = useState(false);
  const [approvePassword, setApprovePassword] = useState('');
  const [requestToApprove, setRequestToApprove] = useState<CreatorRequest | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentMsg, setEmailSentMsg] = useState('');

  // Create Creator form state
  const [newCreator, setNewCreator] = useState<CreateCreatorPayload>({
    email: '',
    oneTimePassword: '',
    fullName: '',
    bio: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await adminService.getCreatorRequests(filter);
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // Real-time subscription for live updates on creator_requests
  useEffect(() => {
    const channel = supabase
      .channel('admin-creator-requests-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'creator_requests',
      }, (payload: any) => {
        // A new request was submitted — add it to the top of the list
        setRequests(prev => {
          const exists = prev.some(r => r.id === payload.new.id);
          if (exists) return prev;
          return [payload.new as CreatorRequest, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'creator_requests',
      }, (payload: any) => {
        // A request was updated (approved/rejected) — update it in the list
        setRequests(prev =>
          prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } as CreatorRequest : r)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Step 1: Admin clicks Approve → opens credential creation popup
  const handleOpenApproveCredentials = () => {
    if (!selectedRequest) return;
    setRequestToApprove(selectedRequest);
    setApprovePassword('');
    setSelectedRequest(null);
    setShowApproveCredModal(true);
  };

  // Step 2: Admin sets password and confirms → creates the account
  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestToApprove) return;
    setActionLoading(true);
    try {
      const isOrg = requestToApprove.request_type === 'organization';
      const userEmail = isOrg ? (requestToApprove.channel_email || '') : requestToApprove.email;
      const userName = isOrg ? (requestToApprove.channel_name || '') : requestToApprove.name;
      const userBio = isOrg ? (requestToApprove.channel_bio || '') : requestToApprove.bio;

      // Provision creator account with an admin-issued or auto-generated One-Time Password
      const created = await adminService.createCreatorAccount({
        email: userEmail,
        ...(approvePassword.trim().length >= 6 ? { oneTimePassword: approvePassword.trim() } : {}),
        fullName: userName,
        bio: userBio,
      }, isOrg);

      await adminService.approveRequestStatus(requestToApprove.id, adminMessage);

      setCreatedCredentials({
        email: userEmail,
        oneTimePassword: created.oneTimePassword,
        type: 'otp',
      });
      toastSuccess('Creator account provisioned with a One-Time Password.');
      setShowApproveCredModal(false);
      setRequestToApprove(null);
      setAdminMessage('');
      setApprovePassword('');
      fetchRequests();
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while approving the creator request.', 'CreatorRequests:approve'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await adminService.rejectCreatorRequest(selectedRequest.id, adminMessage);
      toastSuccess('Application rejected');
      setAdminMessage('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while rejecting the application.', 'CreatorRequests:reject'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      const otpInput = (newCreator.oneTimePassword || '').trim();
      if (otpInput && otpInput.length < 6) {
        setCreateError('One-Time Password must be at least 6 characters (or leave blank to auto-generate).');
        setCreateLoading(false);
        return;
      }

      const created = await adminService.createCreatorAccount({
        email: newCreator.email,
        fullName: newCreator.fullName,
        bio: newCreator.bio,
        ...(otpInput ? { oneTimePassword: otpInput } : {}),
      });

      setCreatedCredentials({
        email: newCreator.email,
        oneTimePassword: created.oneTimePassword,
        type: 'otp',
      });
      setShowCreateModal(false);
      setNewCreator({ email: '', oneTimePassword: '', fullName: '', bio: '' });
      fetchRequests();
    } catch (err: any) {
      setCreateError(logAndGetFriendlyError(err, 'Something went wrong while creating the creator account.', 'CreatorRequests:create'));
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendEmail = async () => {
    if (!createdCredentials?.oneTimePassword) return;
    setIsSendingEmail(true);
    setEmailSentMsg('');
    try {
      const res = await adminService.sendCreatorOtpEmail(
        createdCredentials.email,
        createdCredentials.oneTimePassword,
        createdCredentials.type
      );

      if (res?.sent === false) {
        toastError(res?.message || 'Email relay is unavailable. Copy and share the One-Time Password directly.');
        return;
      }

      toastSuccess('One-Time Password sent to creator via email.');
      setEmailSentMsg('Credentials email sent successfully');
      setTimeout(() => {
        setCreatedCredentials(null);
        setEmailSentMsg('');
      }, 2000);
    } catch (err: any) {
      toastError(logAndGetFriendlyError(err, 'Something went wrong while sending the credentials email.', 'CreatorRequests:email'));
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCloseCredentials = () => {
    setCreatedCredentials(null);
    setEmailSentMsg('');
  };

  const filteredRequests = filter === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div>
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Creator Management</h1>
            <p className="text-sm text-gray-500">Manage creator applications and provision accounts with one-time passwords.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#D4191F] text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
            >
              <UserPlus size={18} /> Create Creator
            </button>
            <button 
              onClick={fetchRequests}
              className="p-2.5 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition-all"
              title="Refresh applications"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard title="Total" count={requests.length} icon={Users} color="blue" />
          <StatCard title="Pending" count={requests.filter(r => r.status === 'pending').length} icon={Clock} color="orange" />
          <StatCard title="Approved" count={requests.filter(r => r.status === 'approved').length} icon={CheckCircle} color="green" />
          <StatCard title="Rejected" count={requests.filter(r => r.status === 'rejected').length} icon={XCircle} color="red" />
        </div>

        {/* Filter + Table */}
        <div className="bg-white shadow-sm backdrop-blur-md border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-wrap gap-2 sm:gap-4">
            <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')} label="Pending" />
            <FilterButton active={filter === 'approved'} onClick={() => setFilter('approved')} label="Approved" />
            <FilterButton active={filter === 'rejected'} onClick={() => setFilter('rejected')} label="Rejected" />
            <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-40">Creator Info</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-40">Status</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-40">Applied On</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-500 opacity-50">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      Loading requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-500 opacity-50">
                      No applications found.
                    </td>
                  </tr>
                ) : filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center font-bold text-xl uppercase">
                          {(request.request_type === 'organization' ? request.channel_name : request.name)?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-gray-900">{request.request_type === 'organization' ? request.channel_name : request.name}</h4>
                            {request.username && (
                              <span className="text-gray-500 opacity-80 text-xs font-semibold">@{request.username}</span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-white/10 rounded ml-2">
                              {request.request_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 opacity-60 mt-1">
                            {request.request_type === 'organization' ? request.channel_email : request.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500 opacity-60">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 bg-gray-100 text-gray-900 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all border border-gray-200"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 relative overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center font-bold text-2xl uppercase">
                      {(selectedRequest.request_type === 'organization' ? selectedRequest.channel_name : selectedRequest.name)?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedRequest.request_type === 'organization' ? selectedRequest.channel_name : selectedRequest.name}
                        </h2>
                        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-white/10 rounded-md">
                          {selectedRequest.request_type}
                        </span>
                      </div>
                      <p className="text-gray-500 opacity-60 mt-1">
                        {selectedRequest.request_type === 'organization' ? selectedRequest.channel_email : selectedRequest.email}
                        {selectedRequest.request_type === 'personal' && selectedRequest.username && ` • @${selectedRequest.username}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedRequest(null)} className="text-gray-500 opacity-40 hover:opacity-100 transition-opacity">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {selectedRequest.request_type === 'organization' ? (
                    <>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                          <Info className="w-4 h-4" /> Organization Details
                        </h4>
                        <p className="text-gray-700 leading-relaxed text-sm"><span className="font-bold opacity-60">Bio:</span> {selectedRequest.channel_bio}</p>
                        <p className="text-gray-700 leading-relaxed text-sm mt-2"><span className="font-bold opacity-60">Categories:</span> {selectedRequest.category?.join(', ')}</p>
                        <p className="text-gray-700 leading-relaxed text-sm mt-2"><span className="font-bold opacity-60">Team Size:</span> {selectedRequest.employee_size}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                          <ExternalLink className="w-4 h-4" /> Links
                        </h4>
                        {selectedRequest.social_link ? (
                          <a href={selectedRequest.social_link} target="_blank" rel="noreferrer" className="text-red-500 font-bold hover:underline flex items-center gap-1 text-sm">
                            View Social Link <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <p className="text-gray-500 opacity-40 italic text-sm">No link provided</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                          <Info className="w-4 h-4" /> About
                        </h4>
                        <p className="text-gray-700 leading-relaxed text-sm">{selectedRequest.bio}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                          <ExternalLink className="w-4 h-4" /> Links
                        </h4>
                        {selectedRequest.social_link ? (
                          <a href={selectedRequest.social_link} target="_blank" rel="noreferrer" className="text-red-500 font-bold hover:underline flex items-center gap-1 text-sm">
                            View Social Link <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <p className="text-gray-500 opacity-40 italic text-sm">No social link provided</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="space-y-6">
                    <textarea 
                      placeholder="Add a message for the creator (optional)..."
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      className="w-full p-6 bg-gray-100 border border-gray-200 focus:border-[#D4191F] rounded-xl outline-none transition-all min-h-[100px] text-gray-900 placeholder-[#e7bdb8]/30"
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={handleOpenApproveCredentials}
                        disabled={actionLoading}
                        className="flex-1 py-4 bg-green-600 text-gray-900 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-5 h-5" /> Approve
                      </button>
                      <button 
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-5 h-5" /> Reject</>}
                      </button>
                    </div>
                  </div>
                )}

                {selectedRequest.status !== 'pending' && (
                  <div className={`p-6 rounded-xl ${selectedRequest.status === 'approved' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <h4 className={`text-sm font-bold uppercase mb-2 ${selectedRequest.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                      Decision: {selectedRequest.status}
                    </h4>
                    <p className="text-gray-500 italic">"{selectedRequest.admin_message || 'No message provided'}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Creator Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 relative overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Creator Account</h2>
                    <p className="text-gray-500 opacity-60 text-sm mt-1">Manually provision a new creator</p>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-500 opacity-40 hover:opacity-100">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>

                <form onSubmit={handleCreateCreator} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 opacity-60 mb-2">Full Name</label>
                    <input 
                      type="text" required
                      className="w-full p-3 bg-gray-100 border border-gray-200 focus:border-[#D4191F] rounded-xl outline-none text-gray-900 placeholder-[#e7bdb8]/30"
                      placeholder="Creator's full name"
                      value={newCreator.fullName}
                      onChange={e => setNewCreator({...newCreator, fullName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 opacity-60 mb-2">Email</label>
                    <input 
                      type="email" required
                      className="w-full p-3 bg-gray-100 border border-gray-200 focus:border-[#D4191F] rounded-xl outline-none text-gray-900 placeholder-[#e7bdb8]/30"
                      placeholder="creator@email.com"
                      value={newCreator.email}
                      onChange={e => setNewCreator({...newCreator, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">One-Time Password (optional — leave blank to auto-generate)</label>
                    <input 
                      type="text" minLength={6}
                      className="w-full p-3 bg-gray-100 border border-gray-200 focus:border-[#D4191F] rounded-xl outline-none text-gray-900 font-mono placeholder:text-gray-400"
                      placeholder="Auto-generated if left blank (min 6 chars)"
                      value={newCreator.oneTimePassword || ''}
                      onChange={e => setNewCreator({...newCreator, oneTimePassword: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 opacity-60 mb-2">Bio (optional)</label>
                    <textarea 
                      className="w-full p-3 bg-gray-100 border border-gray-200 focus:border-[#D4191F] rounded-xl outline-none text-gray-900 placeholder-[#e7bdb8]/30 min-h-[80px]"
                      placeholder="About this creator..."
                      value={newCreator.bio}
                      onChange={e => setNewCreator({...newCreator, bio: e.target.value})}
                    />
                  </div>

                  {createError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                      {createError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={createLoading}
                    className="w-full py-4 bg-[#D4191F] text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {createLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus size={18} /> Create Account</>}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve Credentials Modal — Admin sets password before approving */}
      <AnimatePresence>
        {showApproveCredModal && requestToApprove && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-green-500/20 relative overflow-hidden"
            >
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Login Credentials</h2>
                    <p className="text-gray-500 opacity-60 text-sm mt-1">Set a password for <strong className="text-gray-900">{requestToApprove.request_type === 'organization' ? requestToApprove.channel_name : requestToApprove.name}</strong></p>
                  </div>
                  <button onClick={() => { setShowApproveCredModal(false); setRequestToApprove(null); }} className="text-gray-500 opacity-40 hover:opacity-100">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>

                <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center font-bold text-xl uppercase">
                      {(requestToApprove.request_type === 'organization' ? requestToApprove.channel_name : requestToApprove.name)?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold">{requestToApprove.request_type === 'organization' ? requestToApprove.channel_name : requestToApprove.name}</p>
                      <p className="text-gray-500 opacity-60 text-sm">{requestToApprove.request_type === 'organization' ? requestToApprove.channel_email : requestToApprove.email}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleConfirmApprove} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 opacity-60 mb-2">Email (auto-filled)</label>
                    <input 
                      type="email" disabled
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                      value={requestToApprove.request_type === 'organization' ? requestToApprove.channel_email : requestToApprove.email}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">One-Time Password (optional — leave blank to auto-generate)</label>
                    <input 
                      type="text" minLength={6}
                      className="w-full p-3 bg-gray-100 border border-gray-200 focus:border-green-500 rounded-xl outline-none text-gray-900 font-mono placeholder:text-gray-400"
                      placeholder="Auto-generated if left blank (min 6 chars)"
                      value={approvePassword}
                      onChange={e => setApprovePassword(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 opacity-60 mb-2">Admin Message (optional)</label>
                    <textarea 
                      className="w-full p-3 bg-gray-100 border border-gray-200 focus:border-green-500 rounded-xl outline-none text-gray-900 placeholder-[#e7bdb8]/30 min-h-[80px]"
                      placeholder="Congratulations! Your application has been approved..."
                      value={adminMessage}
                      onChange={e => setAdminMessage(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle size={18} /> Approve & Provision Account</>}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* One-Time Password Provisioned Modal */}
      <AnimatePresence>
        {createdCredentials && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-green-500/20 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 sm:p-8">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 text-center">Creator Provisioned</h2>
                  <p className="text-gray-500 text-sm mt-2 text-center leading-relaxed">
                    Share this email and one-time password so the creator can sign in to Creator Studio and create their personal password.
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-gray-900 font-mono text-sm truncate">{createdCredentials.email}</p>
                    </div>
                    <button onClick={() => copyToClipboard(createdCredentials.email, 'email')} className="p-2 hover:bg-white rounded-lg transition-colors shrink-0">
                      {copiedField === 'email' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
                    </button>
                  </div>
                  <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">One-Time Password</p>
                      <p className="text-gray-900 font-mono text-base font-bold tracking-wider truncate">
                        {createdCredentials.oneTimePassword}
                      </p>
                    </div>
                    <button onClick={() => copyToClipboard(createdCredentials.oneTimePassword, 'otp')} className="p-2 hover:bg-white rounded-lg transition-colors shrink-0">
                      {copiedField === 'otp' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
                    </button>
                  </div>
                </div>

                {emailSentMsg ? (
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-sm mb-6 text-center font-bold">
                    {emailSentMsg}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs mb-6 leading-relaxed">
                    Stored securely in the database. On first login in Creator Studio, the creator must verify this one-time password and set a new password.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handleCloseCredentials}
                    className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || !!emailSentMsg}
                    className="flex-1 py-3 bg-[#D4191F] text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : "Email Credentials"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-500/10 text-blue-400',
    orange: 'bg-orange-500/10 text-orange-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400'
  };
  return (
    <div className="bg-white shadow-sm backdrop-blur-md border border-gray-200 p-6 rounded-2xl flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-40">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{count}</h3>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
        active ? 'bg-[#D4191F] text-white shadow-lg shadow-red-900/20' : 'text-gray-500/60 hover:text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20'
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${styles[status] || 'bg-gray-100'}`}>
      {status.toUpperCase()}
    </span>
  );
}
