import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  PieChart, 
  Settings, 
  LogOut, 
  Bell, 
  Menu,
  MessageSquare,
  ShieldAlert,
  Search,
  ChevronRight,
  LifeBuoy,
  DollarSign,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import CreatorRequests from './CreatorRequests';

interface Props {
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('Overview');
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, postsData, creatorsData] = await Promise.all([
          adminService.getOverviewStats(),
          adminService.getRecentPosts(5),
          adminService.getAllCreators(),
        ]);
        setStats(statsData);
        setRecentPosts(postsData);
        setCreators(creatorsData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'Overview') fetchData();
  }, [activeTab]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Post' }, (payload) => {
        setRecentPosts(prev => [payload.new, ...prev].slice(0, 5));
        setStats((prev: any) => prev ? { ...prev, totalPosts: prev.totalPosts + 1 } : prev);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'User' }, () => {
        setStats((prev: any) => prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : prev);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Comment' }, () => {
        setStats((prev: any) => prev ? { ...prev, totalComments: prev.totalComments + 1 } : prev);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'CreatorRequest' }, () => {
        setStats((prev: any) => prev ? { ...prev, pendingRequests: prev.pendingRequests + 1 } : prev);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'CreatorRequest' }, (payload: any) => {
        // When a request is approved/rejected, decrement pendingRequests if it was pending
        if (payload.old?.status === 'PENDING' && payload.new?.status !== 'PENDING') {
          setStats((prev: any) => prev ? { ...prev, pendingRequests: Math.max(0, prev.pendingRequests - 1) } : prev);
        }
        // If a creator was just approved, increment totalCreators
        if (payload.new?.status === 'APPROVED' && payload.old?.status !== 'APPROVED') {
          setStats((prev: any) => prev ? { ...prev, totalCreators: prev.totalCreators + 1 } : prev);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '...', change: '+12%', icon: <Users size={20} />, color: '#8ecdff' },
    { label: 'Active Creators', value: stats?.totalCreators ?? '...', change: '+8%', icon: <TrendingUp size={20} />, color: '#E31E24' },
    { label: 'Total Posts', value: stats?.totalPosts ?? '...', change: '+15%', icon: <FileText size={20} />, color: '#10B981' },
    { label: 'Total Comments', value: stats?.totalComments ?? '...', change: '+22%', icon: <MessageSquare size={20} />, color: '#F59E0B' },
  ];

  return (
    <div className="flex h-screen bg-[#0b1326] text-[#dae2fd] overflow-hidden">
      {/* Side Navigation */}
      <aside className="w-64 bg-[#131b2e] border-r border-[#ae88831a] hidden md:flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-[#E31E24] to-[#93000d] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <ShieldAlert size={24} color="white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">OMH Sentinel</h2>
              <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-[0.2em] opacity-60">Enterprise Control</p>
            </div>
          </div>

          <nav className="space-y-1">
            <NavItem icon={<PieChart size={18} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
            <NavItem icon={<Users size={18} />} label="Creator Requests" active={activeTab === 'Creator Requests'} onClick={() => setActiveTab('Creator Requests')} />
            <NavItem icon={<FileText size={18} />} label="Posts" active={activeTab === 'Posts'} onClick={() => setActiveTab('Posts')} />
            <NavItem icon={<BarChart3 size={18} />} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} />
            <NavItem icon={<DollarSign size={18} />} label="Payments" active={activeTab === 'Payments'} onClick={() => setActiveTab('Payments')} />
            <NavItem icon={<Settings size={18} />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-2 border-t border-[#ae88830d]">
          <NavItem icon={<LifeBuoy size={18} />} label="Support" />
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm group"
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-[#0b1326]/80 backdrop-blur-xl border-b border-[#ae88831a] flex items-center justify-between px-10 z-10">
          <div className="flex items-center gap-8 flex-1">
            <Menu className="md:hidden text-[#e7bdb8]" />
            <div className="max-w-md w-full relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e7bdb8] opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
              <input 
                type="text" 
                placeholder="Search intelligence..." 
                className="w-full bg-[#131b2e] border-none rounded-full py-2.5 pl-12 pr-4 text-sm focus:ring-1 ring-[#E31E24] transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors text-[#e7bdb8]">
              <Bell size={20} />
              {stats?.pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E31E24] rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#0b1326]">
                  {stats.pendingRequests}
                </span>
              )}
            </button>
            <div className="flex items-center gap-4 pl-4 border-l border-[#ae88831a]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">Administrator</p>
                <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-wider opacity-60">Super Admin</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#E31E24] to-[#93000d] border border-white/10 shadow-xl" />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0b1326] to-[#060e20] flex-1">
          {activeTab === 'Overview' ? (
            <>
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
                <p className="text-[#e7bdb8] opacity-60">Real-time intelligence and system performance metrics.</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {statCards.map((stat, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ y: -5 }}
                    className="bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] p-6 rounded-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.06] transition-opacity" style={{ backgroundImage: `linear-gradient(to bottom right, ${stat.color}, transparent)` }} />
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 rounded-xl bg-white/5 text-white/80" style={{ color: stat.color }}>
                        {stat.icon}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.change.includes('+') ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-[#e7bdb8] text-[11px] font-bold uppercase tracking-widest mb-1 opacity-60">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Recent Posts */}
                <div className="lg:col-span-2 bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Recent Content</h3>
                      <p className="text-xs text-[#e7bdb8] opacity-50">Latest published content across the platform</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('Posts')}
                      className="flex items-center gap-2 text-[10px] font-bold text-[#E31E24] hover:opacity-80 uppercase tracking-widest transition-all"
                    >
                      View All <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#ae88830d]">
                          <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Title</th>
                          <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Author</th>
                          <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Type</th>
                          <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ae88830d]">
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-[#e7bdb8] opacity-50 italic">
                              Loading...
                            </td>
                          </tr>
                        ) : recentPosts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-[#e7bdb8] opacity-50 italic">
                              No content published yet.
                            </td>
                          </tr>
                        ) : recentPosts.map((post, i) => (
                          <tr key={post.id || i} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-5 pr-4">
                              <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors line-clamp-1">{post.title}</p>
                            </td>
                            <td className="py-5">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10" />
                                <span className="text-xs text-[#e7bdb8]/70">{post.User?.username || post.User?.email || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="py-5">
                              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 text-[#e7bdb8]/60 uppercase tracking-wider">{post.type}</span>
                            </td>
                            <td className="py-5 text-right">
                              <span className="text-xs text-[#e7bdb8]/40">{new Date(post.createdAt).toLocaleDateString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-10">
                  {/* Creator List */}
                  <div className="bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl p-8">
                    <h3 className="text-lg font-bold text-white mb-6">Active Creators</h3>
                    <div className="space-y-4">
                      {creators.length === 0 ? (
                        <p className="text-[#e7bdb8] opacity-40 text-sm italic">No creators yet</p>
                      ) : creators.slice(0, 5).map((creator: any) => (
                        <div key={creator.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 text-sm font-bold">
                            {(creator.username || creator.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{creator.username}</p>
                            <p className="text-[10px] text-[#e7bdb8] opacity-40 truncate">{creator.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {creators.length > 5 && (
                      <button 
                        onClick={() => setActiveTab('Creator Requests')}
                        className="mt-4 text-xs text-[#E31E24] font-bold hover:opacity-80 transition-all"
                      >
                        View all {creators.length} creators →
                      </button>
                    )}
                  </div>

                  {/* Status Card */}
                  <div className="bg-gradient-to-br from-[#E31E24] to-[#93000d] rounded-2xl p-8 shadow-2xl shadow-red-900/20">
                    <ShieldAlert className="text-white/40 mb-4" size={32} />
                    <h4 className="text-white font-bold mb-2">System Operational</h4>
                    <p className="text-white/70 text-xs leading-relaxed mb-6">Real-time sync active. All services connected to Supabase.</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-white/60 text-xs">Live Connection</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'Creator Requests' ? (
            <CreatorRequests />
          ) : (
            <div className="flex items-center justify-center h-full text-[#e7bdb8] opacity-60">
              <p className="text-xl italic">The {activeTab} module is initializing...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 w-full p-3.5 rounded-xl transition-all font-semibold text-sm ${
      active 
      ? 'bg-[#E31E24] text-white shadow-lg shadow-red-900/20' 
      : 'text-[#e7bdb8]/60 hover:text-[#e7bdb8] hover:bg-white/5'
    }`}>
    {icon}
    {label}
  </button>
);

export default Dashboard;
