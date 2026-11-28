import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
  BarChart3,
  TrendingUp,
  Megaphone,
  X,
  FolderTree,
  Tag,
  Image as ImageIcon,
  LayoutList,
  Globe,
  ShieldCheck,
  Settings as SettingsIcon,
  UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { invalidateMemCache } from '../lib/cache';
import CreatorRequests from './CreatorRequests';
import Notifications from './Notifications';
import Feedback from './Feedback';
import Posts from './Posts';
import Creators from './Creators';
import Readers from './Readers';
import Categories from './Categories';
import Tags from './Tags';
import MediaLibrary from './MediaLibrary';
import HomepageManager from './HomepageManager';
import SeoCenter from './SeoCenter';
import Analytics from './Analytics';
import AuditLogs from './AuditLogs';
import SettingsView from './Settings';
import AdsLayout from './Ads/AdsLayout';

interface Props {
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastOverviewFetch = useRef<number>(0);

  const isAdsRoute = location.pathname.startsWith('/ads');

  useEffect(() => {
    const fetchData = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [statsData, postsData, creatorsData] = await Promise.all([
          adminService.getOverviewStats(),
          adminService.getRecentPosts(6),
          adminService.getAllCreators(),
        ]);
        setStats(statsData);
        setRecentPosts(postsData);
        setCreators(creatorsData);
        lastOverviewFetch.current = Date.now();
      } catch (err) {
        console.error('[Admin Dashboard] Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if ((location.pathname === '/' || location.pathname === '/overview') && Date.now() - lastOverviewFetch.current > 15000) {
      fetchData(Boolean(stats));
    }
  }, [location.pathname]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const refreshLive = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        invalidateMemCache('admin:overview:stats');
        invalidateMemCache('admin:recent:posts:6');
        invalidateMemCache('admin:all:creators');
        Promise.all([
          adminService.getOverviewStats().then(setStats),
          adminService.getRecentPosts(6).then(setRecentPosts),
          adminService.getAllCreators().then(setCreators),
        ]).catch((err) => console.error('[Admin Dashboard] Realtime sync error:', err));
      }, 250);
    };

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Post' }, refreshLive)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_requests' }, refreshLive)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'User' }, refreshLive)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    {
      label: 'Readers (CITIZEN)',
      value: stats?.totalReaders ?? '...',
      sub: 'Registered public accounts',
      icon: <Users size={20} />,
      color: '#2563EB',
    },
    {
      label: 'Creators & Analysts',
      value: stats?.activeCreators ?? stats?.totalCreators ?? '...',
      sub: `${stats?.pendingRequests ?? 0} pending requests`,
      icon: <TrendingUp size={20} />,
      color: '#D4191F',
    },
    {
      label: 'Published Stories',
      value: stats?.publishedPosts ?? stats?.totalPosts ?? '...',
      sub: `EN: ${stats?.englishPosts ?? 0} · TA: ${stats?.tamilPosts ?? 0}`,
      icon: <FileText size={20} />,
      color: '#059669',
    },
    {
      label: 'Total Views',
      value: stats?.totalViews ?? '...',
      sub: `${stats?.totalComments ?? 0} comments · ${stats?.totalLikes ?? 0} likes`,
      icon: <MessageSquare size={20} />,
      color: '#D97706',
    },
  ];

  const goTo = (path: string) => {
    navigate(path);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-[#111827] overflow-hidden font-jakarta">
      {isAdsRoute && <div className="w-[88px] shrink-0 md:block hidden" />}

      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside
        className={`bg-[#141414] border-r border-[#262626] flex flex-col transition-all duration-300 z-50 group overflow-hidden whitespace-nowrap shadow-[4px_0_24px_rgba(0,0,0,0.18)] ${
          mobileSidebarOpen
            ? 'fixed inset-y-0 left-0 w-[248px] flex'
            : isAdsRoute
            ? 'hidden md:flex w-[88px] hover:w-[248px] absolute h-full'
            : 'hidden md:flex w-[248px] relative'
        }`}
      >
        <div className="py-0 px-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="flex items-center justify-between h-[72px] px-[16px] shrink-0 border-b border-[#262626] mb-3">
            <div onClick={() => goTo('/overview')} className="flex items-center gap-2.5 min-w-0 cursor-pointer">
              <img src="/logo-postsapp-dark.png" alt="PostsApp Admin" className="h-7 shrink-0 object-contain" />
              <span
                className={`px-2 py-0.5 rounded bg-[#D4191F] text-white text-[9px] font-extrabold tracking-widest uppercase transition-opacity duration-300 ${
                  isAdsRoute && !mobileSidebarOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                }`}
              >
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

          <nav className="space-y-0.5 w-full px-[12px] pb-4">
            <NavItem icon={<PieChart size={17} />} label="Overview" active={location.pathname === '/' || location.pathname === '/overview'} onClick={() => goTo('/overview')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<UserCheck size={17} />} label="Creator Requests" active={location.pathname === '/creator-requests'} onClick={() => goTo('/creator-requests')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Users size={17} />} label="Creators" active={location.pathname === '/creators'} onClick={() => goTo('/creators')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Users size={17} />} label="Readers" active={location.pathname === '/readers'} onClick={() => goTo('/readers')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<FileText size={17} />} label="Content Posts" active={location.pathname === '/posts'} onClick={() => goTo('/posts')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<FolderTree size={17} />} label="Categories" active={location.pathname === '/categories'} onClick={() => goTo('/categories')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Tag size={17} />} label="Tags" active={location.pathname === '/tags'} onClick={() => goTo('/tags')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<ImageIcon size={17} />} label="Media Library" active={location.pathname === '/media'} onClick={() => goTo('/media')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<LayoutList size={17} />} label="Homepage" active={location.pathname === '/homepage'} onClick={() => goTo('/homepage')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Globe size={17} />} label="SEO Center" active={location.pathname === '/seo'} onClick={() => goTo('/seo')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<BarChart3 size={17} />} label="Analytics" active={location.pathname === '/analytics'} onClick={() => goTo('/analytics')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Megaphone size={17} />} label="Advertisement" active={isAdsRoute} onClick={() => goTo('/ads')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<ShieldCheck size={17} />} label="Audit Logs" active={location.pathname === '/audit-logs'} onClick={() => goTo('/audit-logs')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<Bell size={17} />} label="Notifications" active={location.pathname === '/notifications'} onClick={() => goTo('/notifications')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<MessageSquare size={17} />} label="Feedback" active={location.pathname === '/feedback'} onClick={() => goTo('/feedback')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
            <NavItem icon={<SettingsIcon size={17} />} label="Site Settings" active={location.pathname === '/settings'} onClick={() => goTo('/settings')} compact={isAdsRoute} mobileOpen={mobileSidebarOpen} />
          </nav>
        </div>

        <div className="mt-auto px-[12px] py-[12px] border-t border-[#262626] shrink-0 w-full">
          <button
            onClick={onLogout}
            className="flex items-center gap-4 w-full px-[14px] h-[42px] rounded-[8px] text-[#F87171] hover:bg-[#262626] transition-all font-semibold font-jakarta text-sm overflow-hidden whitespace-nowrap"
          >
            <LogOut size={17} className="shrink-0" />
            <span className={`transition-opacity duration-300 ${isAdsRoute && !mobileSidebarOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <header className="h-[68px] bg-white border-b border-[#E5E7EB] flex items-center justify-between gap-3 px-4 sm:px-8 z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-[#111827] shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="max-w-[420px] w-full relative min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input
                type="text"
                placeholder="Jump to posts, users, audit..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goTo('/posts');
                }}
                className="w-full bg-[#F5F5F7] border border-[#E5E7EB] rounded-[8px] py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-[#D4191F] focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <button
              onClick={() => goTo('/creator-requests')}
              className="relative p-2 rounded-full hover:bg-red-50 text-[#6B7280] hover:text-[#D4191F]"
              title="Pending Creator Requests"
            >
              <Bell size={20} />
              {(stats?.pendingRequests || 0) > 0 && (
                <span className="absolute top-1 right-1 w-[8px] h-[8px] bg-[#D4191F] rounded-full shadow-[0_0_0_2px_#FFFFFF]" />
              )}
            </button>
            <div className="h-8 w-px bg-[#E5E7EB]" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[14px] font-semibold text-[#111827] leading-tight">Administrator</p>
                <p className="text-[9px] font-mono text-[#6B7280] uppercase tracking-[0.05em]">ADMIN</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#D4191F] flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-bold text-[13px]">AD</span>
              </div>
            </div>
          </div>
        </header>

        <div className={`p-4 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar flex-1 min-w-0 ${isAdsRoute ? '!p-0' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route
              path="/overview"
              element={
                <>
                  <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-[30px] font-bold text-[#111827] mb-1 tracking-tight">Platform Overview</h1>
                    <p className="text-xs sm:text-[14px] text-[#6B7280]">
                      Live operational totals across readers, bilingual newsroom articles, ads, and moderation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    {statCards.map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white border border-gray-200 p-6 rounded-[14px] relative shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center" style={{ color: stat.color }}>
                            {stat.icon}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-extrabold text-gray-900 leading-none mb-1">{stat.value}</h3>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mt-2">{stat.label}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{stat.sub}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="w-full lg:flex-[2] min-w-0 bg-white border border-gray-200 rounded-[14px] p-5 sm:p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-gray-900">Recent Content</h3>
                          <p className="text-xs text-gray-500">Latest articles, drafts, and videos across PostsApp</p>
                        </div>
                        <button onClick={() => goTo('/posts')} className="text-xs font-bold text-[#D4191F] uppercase hover:underline shrink-0">
                          View All →
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[540px] text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-400">
                              <th className="pb-3 pr-4">Title</th>
                              <th className="pb-3 pr-4">Author</th>
                              <th className="pb-3 pr-4">Lang / Status</th>
                              <th className="pb-3 text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                              <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading...</td></tr>
                            ) : recentPosts.length === 0 ? (
                              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No stories yet.</td></tr>
                            ) : (
                              recentPosts.map((post) => (
                                <tr key={post.id} onClick={() => goTo('/posts')} className="hover:bg-gray-50 cursor-pointer">
                                  <td className="py-3 pr-4 font-semibold text-gray-900 line-clamp-1">{post.title}</td>
                                  <td className="py-3 pr-4 text-xs text-gray-600 whitespace-nowrap">
                                    {post.User?.channel_name || post.User?.username || 'Unknown'}
                                  </td>
                                  <td className="py-3 pr-4 whitespace-nowrap text-[10px] font-bold uppercase">
                                    <span className="px-1.5 py-0.5 bg-gray-900 text-white rounded mr-1">{post.language || 'en'}</span>
                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{post.status || 'PUBLISHED'}</span>
                                  </td>
                                  <td className="py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-6">
                      <div className="bg-white border border-gray-200 rounded-[14px] p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Creators</h3>
                        <div className="space-y-3">
                          {creators.slice(0, 5).map((creator: any) => (
                            <div
                              key={creator.id}
                              onClick={() => goTo('/creators')}
                              className="flex items-center gap-3 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer"
                            >
                              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700 overflow-hidden shrink-0">
                                {creator.avatarUrl ? (
                                  <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (creator.username || '?').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{creator.channel_name || creator.username}</p>
                                <p className="text-[11px] text-gray-500 truncate">{creator.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => goTo('/creators')} className="mt-4 text-xs font-bold text-[#D4191F] hover:underline">
                          Manage {creators.length} Creators →
                        </button>
                      </div>

                      <div className="bg-gradient-to-br from-[#D4191F] to-[#9E1111] rounded-2xl p-6 text-white shadow-lg">
                        <ShieldAlert className="text-white/90 mb-3" size={28} />
                        <h4 className="font-bold mb-1">Security &amp; RLS Active</h4>
                        <p className="text-white/80 text-xs leading-relaxed">
                          Privileged operations run via audited Edge Functions and strict PostgreSQL RLS.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              }
            />
            <Route path="/creator-requests" element={<CreatorRequests />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/readers" element={<Readers />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/media" element={<MediaLibrary />} />
            <Route path="/homepage" element={<HomepageManager />} />
            <Route path="/seo" element={<SeoCenter />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ads/*" element={<AdsLayout onBack={() => goTo('/overview')} />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
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
  compact,
  mobileOpen = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
  mobileOpen?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-[14px] w-full px-[14px] h-[40px] rounded-[8px] transition-all font-semibold text-[13.5px] overflow-hidden whitespace-nowrap shrink-0 group/pill ${
      active ? 'bg-[#D4191F] text-white shadow-sm' : 'text-[#A3A3A3] hover:text-white hover:bg-[#1F1F1F]'
    }`}
  >
    <div className="shrink-0 flex items-center justify-center">{icon}</div>
    <span className={`font-jakarta transition-opacity duration-200 ${compact && !mobileOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
      {label}
    </span>
  </button>
);

export default Dashboard;
