import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  FileText, 
  PieChart, 
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
  X,
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
import AdsLayout from './Ads/AdsLayout';


interface Props {
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('Overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastOverviewFetch = useRef<number>(0);
  const OVERVIEW_COOLDOWN = 60000; // 60 seconds

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
        lastOverviewFetch.current = Date.now();
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only re-fetch Overview data if cooldown has passed
    if (activeTab === 'Overview' && (Date.now() - lastOverviewFetch.current > OVERVIEW_COOLDOWN)) {
      fetchData();
    }
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
    { label: 'Total Users', value: stats?.totalUsers ?? '...', change: '+12%', icon: <Users size={20} />, color: '#2563EB' },
    { label: 'Active Creators', value: stats?.totalCreators ?? '...', change: '+8%', icon: <TrendingUp size={20} />, color: '#D4191F' },
    { label: 'Total Posts', value: stats?.totalPosts ?? '...', change: '+15%', icon: <FileText size={20} />, color: '#059669' },
    { label: 'Total Comments', value: stats?.totalComments ?? '...', change: '+22%', icon: <MessageSquare size={20} />, color: '#D97706' },
  ];

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-[#111827] overflow-hidden font-jakarta">
      {/* Sidebar Placeholder for absolute positioning */}
      {activeTab === 'Advertisement' && <div className="w-[88px] shrink-0 md:block hidden" />}

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Side Navigation (Dark PostsApp Studio Rail) */}
      <aside 
        className={`bg-[#141414] border-r border-[#262626] flex flex-col transition-all duration-300 z-50 group overflow-hidden whitespace-nowrap shadow-[4px_0_24px_rgba(0,0,0,0.18)] ${
          mobileSidebarOpen
            ? 'fixed inset-y-0 left-0 w-[248px] flex'
            : activeTab === 'Advertisement'
              ? 'hidden md:flex w-[88px] hover:w-[248px] absolute h-full'
              : 'hidden md:flex w-[248px] relative'
        }`}
      >
        <div className="py-0 px-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="flex items-center justify-between h-[72px] px-[16px] shrink-0 border-b border-[#262626] mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo-postsapp-dark.png" alt="PostsApp Admin" className="h-7 shrink-0 object-contain" />
              <span className={`px-2 py-0.5 rounded bg-[#D4191F] text-white text-[9px] font-extrabold tracking-widest uppercase transition-opacity duration-300 ${activeTab === 'Advertisement' && !mobileSidebarOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                ADMIN
              </span>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#262626]"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1 w-full px-[12px]">
            <NavItem icon={<PieChart size={18} strokeWidth={2.2} />} label="Overview" active={activeTab === 'Overview'} onClick={() => handleSelectTab('Overview')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Users size={18} strokeWidth={2.2} />} label="Creator Requests" active={activeTab === 'Creator Requests'} onClick={() => handleSelectTab('Creator Requests')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Users size={18} strokeWidth={2.2} />} label="Creators" active={activeTab === 'Creators'} onClick={() => handleSelectTab('Creators')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<FileText size={18} strokeWidth={2.2} />} label="Posts" active={activeTab === 'Posts'} onClick={() => handleSelectTab('Posts')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<BarChart3 size={18} strokeWidth={2.2} />} label="Analytics" active={activeTab === 'Analytics'} onClick={() => handleSelectTab('Analytics')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Megaphone size={18} strokeWidth={2.2} />} label="Advertisement" active={activeTab === 'Advertisement'} onClick={() => handleSelectTab('Advertisement')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<IndianRupee size={18} strokeWidth={2.2} />} label="Payments" active={activeTab === 'Payments'} onClick={() => handleSelectTab('Payments')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Bell size={18} strokeWidth={2.2} />} label="Notifications" active={activeTab === 'Notifications'} onClick={() => handleSelectTab('Notifications')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<MessageSquare size={18} strokeWidth={2.2} />} label="Feedback" active={activeTab === 'Feedback'} onClick={() => handleSelectTab('Feedback')} activeTab={activeTab} mobileOpen={mobileSidebarOpen} />
          </nav>
        </div>

        <div className="mt-auto px-[12px] py-[14px] space-y-[2px] border-t border-[#262626] shrink-0 w-full">
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 w-full px-[14px] h-[44px] rounded-[8px] text-[#F87171] hover:bg-[#262626] transition-all duration-150 font-semibold font-jakarta text-sm overflow-hidden whitespace-nowrap"
          >
            <LogOut size={18} strokeWidth={2} className="shrink-0" />
            <span className={`transition-opacity duration-300 ${activeTab === 'Advertisement' && !mobileSidebarOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-[68px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-10 z-10 shrink-0 sticky top-0 transition-colors">
          <div className="flex items-center gap-4 sm:gap-8 flex-1">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-[#111827] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="max-w-[480px] w-full relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors group-focus-within:text-[#D4191F]" size={16} strokeWidth={2} />
              <input 
                type="text" 
                placeholder="Search intelligence..." 
                className="w-full bg-[#F5F5F7] border border-[#E5E7EB] rounded-[8px] py-2 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4191F] focus:border-[#D4191F] focus:bg-white transition-all font-jakarta text-[#111827] placeholder:text-[#9CA3AF] placeholder:font-mono"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <button 
              onClick={() => setActiveTab('Notifications')}
              className="relative p-2 rounded-full hover:bg-red-50 transition-colors text-[#6B7280] hover:text-[#D4191F]"
            >
              <Bell size={20} strokeWidth={2} />
              {stats?.pendingRequests > 0 && (
                <span className="absolute top-1 right-1 w-[8px] h-[8px] bg-[#D4191F] rounded-full shadow-[0_0_0_2px_#FFFFFF]"></span>
              )}
            </button>
            <div className="h-8 w-px bg-[#E5E7EB]"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[14px] font-semibold font-jakarta text-[#111827] leading-tight">Administrator</p>
                <p className="text-[9px] font-mono text-[#6B7280] uppercase tracking-[0.05em]">Super Admin</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#D4191F] flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-bold font-jakarta text-[13px]">AD</span>
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
                  <div className="bg-gradient-to-br from-[#D4191F] to-[#9E1111] rounded-2xl p-8 shadow-xl shadow-red-900/20">
                    <ShieldAlert className="text-white/85 mb-4" size={32} />
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
              <div className="w-20 h-20 bg-gradient-to-br from-[#D4191F] to-[#9E1111] rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-red-900/30">
                <IndianRupee size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Payments Infrastructure</h2>
              <p className="text-gray-500 opacity-60 max-w-md text-center">Global payout integrations, creator monetization, and finance dashboards are coming in the next platform update.</p>
              <span className="mt-8 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest text-gray-400">Coming Soon</span>
            </div>
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

const NavItem = ({
  icon,
  label,
  active = false,
  onClick,
  activeTab,
  mobileOpen = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
  activeTab?: string;
  mobileOpen?: boolean;
}) => {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-[14px] w-full px-[14px] h-[44px] rounded-[8px] transition-all duration-150 ease-in-out font-semibold text-[14px] overflow-hidden whitespace-nowrap shrink-0 group/pill ${
        active 
        ? 'bg-[#D4191F] text-white shadow-sm' 
        : 'text-[#A3A3A3] hover:text-white hover:bg-[#1F1F1F]'
      }`}>
      <div className={`shrink-0 flex items-center justify-center transition-colors duration-150 ${active ? 'text-white' : 'text-[#A3A3A3] group-hover/pill:text-white'}`}>{icon}</div>
      <span className={`font-jakarta transition-opacity duration-200 ${activeTab === 'Advertisement' && !mobileOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>{label}</span>
    </button>
  );
};

export default Dashboard;
