import { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, Clock, ExternalLink, 
  Info, Loader2, RefreshCw, UserPlus, Copy, Check
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService, type CreatorRequest, type CreateCreatorPayload } from '../lib/adminService';

export default function CreatorRequests() {
  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<CreatorRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{email: string; password: string} | null>(null);
  const [showApproveCredModal, setShowApproveCredModal] = useState(false);
  const [approvePassword, setApprovePassword] = useState('');
  const [requestToApprove, setRequestToApprove] = useState<CreatorRequest | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Create Creator form state
  const [newCreator, setNewCreator] = useState<CreateCreatorPayload>({
    email: '',
    password: '',
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
      // Create the creator account with the admin-set password
      await adminService.createCreatorAccount({
        email: requestToApprove.email,
        password: approvePassword,
        fullName: requestToApprove.name,
        bio: requestToApprove.bio,
      });

      // Update the request status to approved
      await adminService.approveRequestStatus(requestToApprove.id, adminMessage);

      setCreatedCredentials({
        email: requestToApprove.email,
        password: approvePassword,
      });
      setShowApproveCredModal(false);
      setRequestToApprove(null);
      setAdminMessage('');
      setApprovePassword('');
      fetchRequests();
    } catch (err: any) {
      alert('Failed to approve: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await adminService.rejectCreatorRequest(selectedRequest.id, adminMessage);
      setAdminMessage('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      alert('Failed to reject: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await adminService.createCreatorAccount(newCreator);
      setCreatedCredentials({
        email: newCreator.email,
        password: newCreator.password,
      });
      setShowCreateModal(false);
      setNewCreator({ email: '', password: '', fullName: '', bio: '' });
      fetchRequests();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create creator account');
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredRequests = filter === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Creator Management</h1>
            <p className="text-[#e7bdb8] opacity-60">Manage creator applications and directly create new creator accounts.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[#E31E24] text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
            >
              <UserPlus size={18} /> Create Creator
            </button>
            <button 
              onClick={fetchRequests}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <RefreshCw className={`w-5 h-5 text-[#e7bdb8] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total" count={requests.length} icon={Users} color="blue" />
          <StatCard title="Pending" count={requests.filter(r => r.status === 'pending').length} icon={Clock} color="orange" />
          <StatCard title="Approved" count={requests.filter(r => r.status === 'approved').length} icon={CheckCircle} color="green" />
          <StatCard title="Rejected" count={requests.filter(r => r.status === 'rejected').length} icon={XCircle} color="red" />
        </div>

        {/* Filter + Table */}
        <div className="bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#ae88830d] flex gap-4">
            <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')} label="Pending" />
            <FilterButton active={filter === 'approved'} onClick={() => setFilter('approved')} label="Approved" />
            <FilterButton active={filter === 'rejected'} onClick={() => setFilter('rejected')} label="Rejected" />
            <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#ae88830d]">
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Creator</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Status</th>
                  <th className="px-8 py-4 text-left text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Applied On</th>
                  <th className="px-8 py-4 text-right text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ae88830d]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-[#e7bdb8] opacity-50">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      Loading requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-[#e7bdb8] opacity-50">
                      No applications found.
                    </td>
                  </tr>
                ) : filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center font-bold text-xl">
                          {request.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{request.name}</h4>
                          <p className="text-sm text-[#e7bdb8] opacity-60">{request.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-8 py-6 text-sm text-[#e7bdb8] opacity-60">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 bg-white/5 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 border border-white/10"
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
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#131b2e] rounded-2xl w-full max-w-2xl shadow-2xl border border-[#ae88831a] relative overflow-hidden">
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center font-bold text-2xl">
                    {selectedRequest.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedRequest.name}</h2>
                    <p className="text-[#e7bdb8] opacity-60">{selectedRequest.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-[#e7bdb8] opacity-40 hover:opacity-100 transition-opacity">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div>
                  <h4 className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                    <Info className="w-4 h-4" /> About
                  </h4>
                  <p className="text-white/80 leading-relaxed">{selectedRequest.bio}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                    <ExternalLink className="w-4 h-4" /> Portfolio
                  </h4>
                  {selectedRequest.portfolio_url ? (
                    <a href={selectedRequest.portfolio_url} target="_blank" rel="noreferrer" className="text-red-500 font-bold hover:underline flex items-center gap-1">
                      View Portfolio <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <p className="text-[#e7bdb8] opacity-40 italic">No link provided</p>
                  )}
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="space-y-6">
                  <textarea 
                    placeholder="Add a message for the creator (optional)..."
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    className="w-full p-6 bg-white/5 border border-white/10 focus:border-[#E31E24] rounded-xl outline-none transition-all min-h-[100px] text-white placeholder-[#e7bdb8]/30"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={handleOpenApproveCredentials}
                      disabled={actionLoading}
                      className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                  <p className="text-white/60 italic">"{selectedRequest.admin_message || 'No message provided'}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Creator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#131b2e] rounded-2xl w-full max-w-lg shadow-2xl border border-[#ae88831a] relative overflow-hidden">
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Creator Account</h2>
                  <p className="text-[#e7bdb8] opacity-60 text-sm mt-1">Manually provision a new creator</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-[#e7bdb8] opacity-40 hover:opacity-100">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleCreateCreator} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Full Name</label>
                  <input 
                    type="text" required
                    className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#E31E24] rounded-xl outline-none text-white placeholder-[#e7bdb8]/30"
                    placeholder="Creator's full name"
                    value={newCreator.fullName}
                    onChange={e => setNewCreator({...newCreator, fullName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Email</label>
                  <input 
                    type="email" required
                    className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#E31E24] rounded-xl outline-none text-white placeholder-[#e7bdb8]/30"
                    placeholder="creator@email.com"
                    value={newCreator.email}
                    onChange={e => setNewCreator({...newCreator, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Password</label>
                  <input 
                    type="text" required minLength={8}
                    className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#E31E24] rounded-xl outline-none text-white placeholder-[#e7bdb8]/30"
                    placeholder="Minimum 8 characters"
                    value={newCreator.password}
                    onChange={e => setNewCreator({...newCreator, password: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Bio (optional)</label>
                  <textarea 
                    className="w-full p-3 bg-white/5 border border-white/10 focus:border-[#E31E24] rounded-xl outline-none text-white placeholder-[#e7bdb8]/30 min-h-[80px]"
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
                  className="w-full py-4 bg-[#E31E24] text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus size={18} /> Create Account</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Approve Credentials Modal — Admin sets password before approving */}
      {showApproveCredModal && requestToApprove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#131b2e] rounded-2xl w-full max-w-lg shadow-2xl border border-green-500/20 relative overflow-hidden">
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">Create Login Credentials</h2>
                  <p className="text-[#e7bdb8] opacity-60 text-sm mt-1">Set a password for <strong className="text-white">{requestToApprove.name}</strong></p>
                </div>
                <button onClick={() => { setShowApproveCredModal(false); setRequestToApprove(null); }} className="text-[#e7bdb8] opacity-40 hover:opacity-100">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center font-bold text-xl">
                    {requestToApprove.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-bold">{requestToApprove.name}</p>
                    <p className="text-[#e7bdb8] opacity-60 text-sm">{requestToApprove.email}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleConfirmApprove} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Email (auto-filled)</label>
                  <input 
                    type="email" disabled
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white/50 cursor-not-allowed"
                    value={requestToApprove.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Set Password</label>
                  <input 
                    type="text" required minLength={8}
                    className="w-full p-3 bg-white/5 border border-white/10 focus:border-green-500 rounded-xl outline-none text-white placeholder-[#e7bdb8]/30"
                    placeholder="Minimum 8 characters"
                    value={approvePassword}
                    onChange={e => setApprovePassword(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e7bdb8] opacity-60 mb-2">Admin Message (optional)</label>
                  <textarea 
                    className="w-full p-3 bg-white/5 border border-white/10 focus:border-green-500 rounded-xl outline-none text-white placeholder-[#e7bdb8]/30 min-h-[80px]"
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
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle size={18} /> Approve & Create Account</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Display Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#131b2e] rounded-2xl w-full max-w-md shadow-2xl border border-green-500/20 relative overflow-hidden">
            <div className="p-10">
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Creator Account Created!</h2>
                <p className="text-[#e7bdb8] opacity-60 text-sm mt-1">Share these credentials securely with the creator</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-60 mb-1">Email</p>
                    <p className="text-white font-mono text-sm">{createdCredentials.email}</p>
                  </div>
                  <button onClick={() => copyToClipboard(createdCredentials.email, 'email')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {copiedField === 'email' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-[#e7bdb8]" />}
                  </button>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-60 mb-1">Password</p>
                    <p className="text-white font-mono text-sm">{createdCredentials.password}</p>
                  </div>
                  <button onClick={() => copyToClipboard(createdCredentials.password, 'password')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {copiedField === 'password' ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-[#e7bdb8]" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs mb-6">
                ⚠️ This password won't be shown again. Make sure to copy it now.
              </div>

              <button 
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] p-6 rounded-2xl flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">{title}</p>
        <h3 className="text-3xl font-bold text-white">{count}</h3>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
        active ? 'bg-[#E31E24] text-white shadow-lg shadow-red-900/20' : 'text-[#e7bdb8]/60 hover:text-[#e7bdb8] hover:bg-white/5'
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
    <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${styles[status] || 'bg-white/5'}`}>
      {status.toUpperCase()}
    </span>
  );
}
