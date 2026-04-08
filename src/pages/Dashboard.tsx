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
  IndianRupee,
  BarChart3,
  TrendingUp,
  Megaphone,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import CreatorRequests from './CreatorRequests';
import Notifications from './Notifications';
import Feedback from './Feedback';
import Posts from './Posts';
import Creators from './Creators';
import Analytics from './Analytics';
import SettingsView from './Settings';
import AdsLayout from './Ads/AdsLayout';


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
        await adminService.createFeedbackTable(); // Ensure Feedback table exists
        await adminService.migratePostTable(); // Migrate Post table for new statuses
        await adminService.ensureAdsBucket(); // Ensure ads storage exists
        await adminService.ensureAdsTable(); // Ensure ads table exists

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creator_requests' }, () => {
        setStats((prev: any) => prev ? { ...prev, pendingRequests: prev.pendingRequests + 1 } : prev);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'creator_requests' }, (payload: any) => {
        // When a request is approved/rejected, decrement pendingRequests if it was pending
        if (payload.old?.status === 'pending' && payload.new?.status !== 'pending') {
          setStats((prev: any) => prev ? { ...prev, pendingRequests: Math.max(0, prev.pendingRequests - 1) } : prev);
        }
        // If a creator was just approved, increment totalCreators
        if (payload.new?.status === 'approved' && payload.old?.status !== 'approved') {
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
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden font-jakarta">
      {/* Sidebar Placeholder for absolute positioning */}
      {activeTab === 'Advertisement' && <div className="w-[88px] shrink-0 md:block hidden" />}

      {/* Side Navigation */}
      <aside 
        className={`bg-brand-sidebar border-r border-brand-divider hidden md:flex flex-col transition-all duration-300 z-50 group overflow-hidden whitespace-nowrap shadow-[4px_0_24px_rgba(0,0,0,0.04)] ${
          activeTab === 'Advertisement' ? 'w-[88px] hover:w-[248px] absolute h-full shadow-[0_8px_30px_rgba(0,0,0,0.08)]' : 'w-[248px] relative'
        }`}
      >
        <div className="py-0 px-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="flex items-center gap-3 h-[72px] px-[16px] shrink-0">
            <img src="/logo%20omh.png" alt="Admin HUB Logo" className="w-10 h-10 shrink-0 object-contain" />
            <div className={`transition-opacity duration-300 min-w-[150px] ${activeTab === 'Advertisement' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              <h2 className="text-lg font-bold font-jakarta text-brand-text leading-none">Admin HUB</h2>
              <p className="text-[9px] font-mono font-medium text-brand-muted mt-1 uppercase tracking-[0.2em]">Enterprise Control</p>
            </div>
          </div>

          <nav className="space-y-[2px] w-full px-[16px]">
            <NavItem icon={<PieChart size={18} strokeWidth={2.5} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} activeTab={activeTab} />
            <NavItem icon={<Users size={18} strokeWidth={2.5} />} label="Creator Requests" active={activeTab === 'Creator Requests'} onClick={() => setActiveTab('Creator Requests')} activeTab={activeTab} />
            <NavItem icon={<Users size={18} strokeWidth={2.5} />} label="Creators" active={activeTab === 'Creators'} onClick={() => setActiveTab('Creators')} activeTab={activeTab} />
            <NavItem icon={<FileText size={18} strokeWidth={2.5} />} label="Posts" active={activeTab === 'Posts'} onClick={() => setActiveTab('Posts')} activeTab={activeTab} />
            <NavItem icon={<BarChart3 size={18} strokeWidth={2.5} />} label="Analytics" active={activeTab === 'Analytics'} onClick={() => setActiveTab('Analytics')} activeTab={activeTab} />
            <NavItem icon={<Megaphone size={18} strokeWidth={2.5} />} label="Advertisement" active={activeTab === 'Advertisement'} onClick={() => setActiveTab('Advertisement')} activeTab={activeTab} />
            <NavItem icon={<IndianRupee size={18} strokeWidth={2.5} />} label="Payments" active={activeTab === 'Payments'} onClick={() => setActiveTab('Payments')} activeTab={activeTab} />
            <NavItem icon={<Bell size={18} strokeWidth={2.5} />} label="Notifications" active={activeTab === 'Notifications'} onClick={() => setActiveTab('Notifications')} activeTab={activeTab} />
            <NavItem icon={<MessageSquare size={18} strokeWidth={2.5} />} label="Feedback" active={activeTab === 'Feedback'} onClick={() => setActiveTab('Feedback')} activeTab={activeTab} />
            <NavItem icon={<Settings size={18} strokeWidth={2.5} />} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} activeTab={activeTab} />
          </nav>
        </div>

        <div className="mt-auto px-[16px] py-[16px] space-y-[2px] border-t border-brand-divider shrink-0 w-full">

          <button 
            onClick={onLogout}
            className={`flex items-center gap-4 w-full px-[16px] h-[46px] rounded-[6px] text-brand-red hover:bg-brand-redUltraLight transition-all duration-150 font-medium font-jakarta text-sm group/logout overflow-hidden whitespace-nowrap`}
          >
            <LogOut size={18} strokeWidth={2} className="shrink-0" />
            <span className={`transition-opacity duration-300 ${activeTab === 'Advertisement' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-[68px] bg-brand-card border-b border-brand-divider shadow-[0_1px_0_#F0F1F5] flex items-center justify-between px-10 z-10 shrink-0 sticky top-0 transition-colors">
          <div className="flex items-center gap-8 flex-1">
            <button className="md:hidden p-2 rounded-xl hover:bg-brand-redUltraLight text-brand-secondary transition-colors"><Menu size={20} /></button>
            <div className="max-w-[480px] w-full relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted transition-colors group-focus-within:text-brand-red" size={16} strokeWidth={2} />
              <input 
                type="text" 
                placeholder="Search intelligence..." 
                className="w-full bg-brand-bg border border-brand-border rounded-[10px] py-2 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-red transition-all font-jakarta text-brand-text placeholder:text-brand-muted placeholder:font-mono"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('Notifications')}
              className="relative p-2 rounded-full hover:bg-brand-redUltraLight transition-colors text-brand-secondary hover:text-brand-red"
            >
              <Bell size={20} strokeWidth={2} />
              {stats?.pendingRequests > 0 && (
                <span className="absolute top-1 right-1 w-[8px] h-[8px] bg-brand-red rounded-full shadow-[0_0_0_2px_#FFFFFF]"></span>
              )}
            </button>
            <div className="h-8 w-px bg-brand-divider"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[14px] font-medium font-jakarta text-brand-text leading-tight">Administrator</p>
                <p className="text-[9px] font-mono text-brand-muted uppercase tracking-[0.05em]">Super Admin</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-brand-red flex items-center justify-center shrink-0 shadow-sm border border-brand-redLight">
                <span className="text-white font-medium font-jakarta text-[14px]">AD</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className={`p-10 overflow-y-auto custom-scrollbar flex-1 ${activeTab === 'Advertisement' ? '!p-0' : ''}`}>
          {activeTab === 'Overview' ? (
            <>
              <div className="mb-[40px]">
                <h1 className="text-[32px] font-bold font-jakarta text-brand-text mb-1 tracking-tight">Platform Overview</h1>
                <p className="text-[14px] font-outfit text-brand-secondary">Real-time intelligence and system performance metrics.</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-[40px]">
                {statCards.map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    whileHover={{ y: -2 }}
                    className="bg-brand-card border border-brand-border p-6 rounded-[14px] relative group cursor-pointer hover:shadow-[0_8px_32px_rgba(232,70,42,0.08)] transition-all duration-200 ease-out flex flex-col justify-between"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-red to-transparent opacity-100 rounded-t-[14px]"></div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-[44px] h-[44px] rounded-[10px] bg-brand-bg flex items-center justify-center shrink-0" style={{ color: stat.color }}>
                        {stat.icon}
                      </div>
                      <span className="bg-[#ECFDF5] text-brand-success font-mono text-[11px] px-2 py-0.5 rounded-full inline-block group-hover:scale-105 transition-transform">
                        {stat.change}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-[40px] font-extrabold font-jakarta text-brand-text leading-none mb-1">{stat.value}</h3>
                      <p className="font-mono text-[10px] text-brand-muted uppercase tracking-[0.08em] mt-2">{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Posts */}
                <div className="lg:col-span-2 bg-brand-card border border-brand-border rounded-[14px] p-6 lg:p-[24px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-[20px] font-bold font-jakarta text-brand-text mb-1">Recent Content</h3>
                      <p className="font-outfit text-[13px] text-brand-secondary">Latest published content across the platform</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('Posts')}
                      className="flex items-center gap-1 font-mono text-[11px] text-brand-red uppercase font-semibold hover:opacity-80 transition-opacity"
                    >
                      VIEW ALL <span className="text-[14px]">→</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-divider">
                          <th className="pb-3 pr-4 text-[10px] font-mono text-brand-muted uppercase tracking-[0.05em] font-normal">Title</th>
                          <th className="pb-3 pr-6 text-[10px] font-mono text-brand-muted uppercase tracking-[0.05em] font-normal">Author</th>
                          <th className="pb-3 pr-6 text-[10px] font-mono text-brand-muted uppercase tracking-[0.05em] font-normal">Type</th>
                          <th className="pb-3 text-[10px] font-mono text-brand-muted uppercase tracking-[0.05em] font-normal text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={4} className="h-[52px] text-center text-brand-secondary text-[13px] italic border-b border-brand-bg font-outfit">
                              Loading...
                            </td>
                          </tr>
                        ) : recentPosts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="h-[52px] text-center text-brand-secondary text-[13px] italic border-b border-brand-bg font-outfit">
                              No content published yet.
                            </td>
                          </tr>
                        ) : recentPosts.map((post, i) => (
                          <tr key={post.id || i} className="group hover:bg-brand-redUltraLight transition-colors duration-120 border-b border-brand-bg last:border-0 h-[52px] cursor-pointer">
                            <td className="pr-6 py-2">
                              <p className="font-outfit text-[14px] font-medium text-brand-text line-clamp-1 group-hover:text-brand-red transition-colors">{post.title}</p>
                            </td>
                            <td className="pr-6 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2 min-w-[120px]">
                                {post.User?.avatarUrl ? (
                                  <img src={post.User.avatarUrl} alt="avatar" className="w-[24px] h-[24px] rounded-full object-cover bg-brand-bg border border-brand-divider" />
                                ) : (
                                  <div className="w-[24px] h-[24px] rounded-full bg-brand-divider flex items-center justify-center text-[10px] font-bold text-brand-secondary">
                                    {(post.User?.username || post.User?.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-outfit text-[13px] font-medium text-brand-text">{post.User?.username || post.User?.email || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="pr-6 py-2 whitespace-nowrap">
                              <span className="border border-brand-border font-mono text-[10px] text-brand-secondary rounded-[4px] px-[8px] py-[4px] uppercase">{post.type}</span>
                            </td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <span className="font-mono text-[12px] text-brand-muted">{new Date(post.createdAt).toLocaleDateString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                  {/* Creator List */}
                  <div className="bg-brand-card border border-brand-border rounded-[14px] p-6 lg:p-[24px]">
                    <h3 className="text-[20px] font-bold font-jakarta text-brand-text mb-6">Active Creators</h3>
                    <div className="flex flex-col">
                      {creators.length === 0 ? (
                        <p className="text-brand-muted text-[13px] font-outfit italic">No creators yet</p>
                      ) : creators.slice(0, 5).map((creator: any) => (
                        <div key={creator.id} className="flex items-center gap-3 h-[48px] px-2 -mx-2 hover:bg-brand-redUltraLight hover:rounded-[6px] transition-colors cursor-pointer group">
                          {creator.avatarUrl ? (
                            <img src={creator.avatarUrl} alt={creator.username} className="w-[38px] h-[38px] rounded-full object-cover bg-brand-divider shrink-0" />
                          ) : (
                            <div className="w-[38px] h-[38px] rounded-full bg-brand-divider flex items-center justify-center text-brand-secondary text-sm font-bold shrink-0">
                              {(creator.username || creator.email || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium font-jakarta text-brand-text truncate flex items-center gap-2">
                              {creator.username}
                              <span className="w-[8px] h-[8px] bg-brand-success rounded-full block"></span>
                            </p>
                            <p className="text-[11px] font-mono text-brand-muted truncate mt-0.5">{creator.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {creators.length > 5 && (
                      <button 
                        onClick={() => setActiveTab('Creators')}
                        className="mt-6 text-xs text-brand-red font-mono uppercase tracking-wide hover:opacity-80 transition-opacity w-full text-left"
                      >
                        View all {creators.length} creators →
                      </button>
                    )}
                  </div>

                  {/* Status Card */}
                  <div className="bg-gradient-to-br from-[#E31E24] to-[#93000d] rounded-2xl p-8 shadow-2xl shadow-red-900/20">
                    <ShieldAlert className="text-white/80 mb-4" size={32} />
                    <h4 className="text-white font-bold mb-2">System Operational</h4>
                    <p className="text-white/80 text-xs leading-relaxed mb-6">Real-time sync active. All services connected to Supabase.</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-white/80 text-xs">Live Connection</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'Creator Requests' ? (
            <CreatorRequests />
          ) : activeTab === 'Creators' ? (
            <Creators />
          ) : activeTab === 'Posts' ? (
            <Posts />
          ) : activeTab === 'Analytics' ? (
            <Analytics />
          ) : activeTab === 'Notifications' ? (
            <Notifications />
          ) : activeTab === 'Feedback' ? (
            <Feedback />
          ) : activeTab === 'Advertisement' ? (
            <AdsLayout onBack={() => setActiveTab('Overview')} />
          ) : activeTab === 'Payments' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 bg-gradient-to-br from-[#E31E24] to-[#93000d] rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-red-900/40">
                <IndianRupee size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Payments Infrastructure</h2>
              <p className="text-gray-500 opacity-60 max-w-md text-center">Global payout integrations, creator monetization, and finance dashboards are coming in the next platform update.</p>
              <span className="mt-8 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest text-gray-400">Coming Soon</span>
            </div>
          ) : activeTab === 'Settings' ? (
            <SettingsView />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 opacity-60">
              <p className="text-xl italic">The {activeTab} module is initializing...</p>
            </div>
          )}
        </div>
      </main>
    </div>

  );
};

const NavItem = ({ icon, label, active = false, onClick, activeTab }: { icon: any, label: string, active?: boolean, onClick?: () => void, activeTab?: string }) => {
  const iconColor = active ? 'text-brand-red' : 'text-[#C4C9D4] group-hover/pill:text-brand-red';
  const labelColor = active ? 'text-brand-red font-bold' : 'text-brand-secondary group-hover/pill:text-brand-text';
  
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-[16px] w-full px-[16px] h-[46px] transition-all duration-180 ease-in-out font-medium text-[14px] overflow-hidden whitespace-nowrap shrink-0 group/pill ${
        active 
        ? 'bg-brand-redLight border-l-[3px] border-brand-red rounded-r-[6px]' 
        : 'hover:bg-brand-redUltraLight rounded-[6px]'
      }`}>
      <div className={`shrink-0 flex items-center justify-center transition-colors duration-180 ${iconColor}`}>{icon}</div>
      <span className={`font-jakarta transition-colors duration-180 ${labelColor} ${activeTab === 'Advertisement' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>{label}</span>
    </button>
  );
};

export default Dashboard;
