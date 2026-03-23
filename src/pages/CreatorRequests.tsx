import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, CheckCircle, XCircle, Clock, ExternalLink, 
  Info, Loader2, RefreshCw 
} from 'lucide-react';

interface CreatorRequest {
  id: string;
  name: string;
  email: string;
  bio: string;
  portfolioUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminMessage?: string;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export default function CreatorRequests() {
  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<CreatorRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/creator/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (err: any) {
      setError('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${API_BASE_URL}/creator/requests/${id}`, {
        status,
        adminMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminMessage('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      alert('Failed to update request');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = filter === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === filter);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Creator Applications</h1>
            <p className="text-gray-500">Review and manage creators joining the platform.</p>
          </div>
          <button 
            onClick={fetchRequests}
            className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total" count={requests.length} icon={Users} color="blue" />
          <StatCard title="Pending" count={requests.filter(r => r.status === 'PENDING').length} icon={Clock} color="orange" />
          <StatCard title="Approved" count={requests.filter(r => r.status === 'APPROVED').length} icon={CheckCircle} color="green" />
          <StatCard title="Rejected" count={requests.filter(r => r.status === 'REJECTED').length} icon={XCircle} color="red" />
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex gap-4">
            <FilterButton active={filter === 'PENDING'} onClick={() => setFilter('PENDING')} label="Pending" />
            <FilterButton active={filter === 'APPROVED'} onClick={() => setFilter('APPROVED')} label="Approved" />
            <FilterButton active={filter === 'REJECTED'} onClick={() => setFilter('REJECTED')} label="Rejected" />
            <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-8 py-4 text-left">Creator</th>
                  <th className="px-8 py-4 text-left">Status</th>
                  <th className="px-8 py-4 text-left">Applied On</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      Loading requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center text-gray-400">
                      No applications found for this filter.
                    </td>
                  </tr>
                ) : filteredRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                          {request.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{request.name}</h4>
                          <p className="text-sm text-gray-500">{request.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 opacity-0 group-hover:opacity-100"
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

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden">
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center font-bold text-2xl">
                    {selectedRequest.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold text-gray-900">{selectedRequest.name}</h2>
                    <p className="text-gray-500">{selectedRequest.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-black transition-colors">
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> About the Creator
                  </h4>
                  <p className="text-gray-700 leading-relaxed font-medium">{selectedRequest.bio}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Portfolio / Work
                  </h4>
                  {selectedRequest.portfolioUrl ? (
                    <a href={selectedRequest.portfolioUrl} target="_blank" rel="noreferrer" className="text-red-600 font-bold hover:underline flex items-center gap-1">
                      View Portfolio <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <p className="text-gray-400 italic">No link provided</p>
                  )}
                </div>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="space-y-6">
                  <textarea 
                    placeholder="Add a message for the creator (optional)..."
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    className="w-full p-6 bg-gray-50 border border-transparent focus:bg-white focus:border-red-500 rounded-2xl outline-none transition-all min-h-[100px]"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleAction(selectedRequest.id, 'APPROVED')}
                      disabled={actionLoading}
                      className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Approve</>}
                    </button>
                    <button 
                      onClick={() => handleAction(selectedRequest.id, 'REJECTED')}
                      disabled={actionLoading}
                      className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><XCircle className="w-5 h-5" /> Reject</>}
                    </button>
                  </div>
                </div>
              )}

              {(selectedRequest.status === 'APPROVED' || selectedRequest.status === 'REJECTED') && (
                <div className={`p-6 rounded-2xl ${selectedRequest.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <h4 className={`text-sm font-bold uppercase mb-2 ${selectedRequest.status === 'APPROVED' ? 'text-green-700' : 'text-red-700'}`}>
                    Decision Summary
                  </h4>
                  <p className="text-gray-600 italic">"{selectedRequest.adminMessage || 'No message provided'}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-extrabold text-gray-900">{count}</h3>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
        active ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    PENDING: 'bg-orange-100 text-orange-600',
    APPROVED: 'bg-green-100 text-green-600',
    REJECTED: 'bg-red-100 text-red-600'
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}
