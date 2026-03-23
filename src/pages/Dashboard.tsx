import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Activity,
  ChevronRight,
  LifeBuoy
} from 'lucide-react';
import { motion } from 'framer-motion';
import CreatorRequests from './CreatorRequests';

interface Props {
  onLogout: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('Overview');
  const [statsData, setStatsData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStatsData(response.data.stats);
        setRecentActivity(response.data.recentActivity);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    if (activeTab === 'Overview') fetchData();
  }, [activeTab]);

  const stats = [
    { label: 'Total Users', value: statsData?.totalUsers || '...', change: '+12%', icon: <Users size={20} />, color: '#8ecdff' },
    { label: 'Daily Posts', value: statsData?.dailyPosts || '...', change: '+8%', icon: <FileText size={20} />, color: '#E31E24' },
    { label: 'Engagement Rate', value: statsData?.engagementRate || '68.4%', change: '+5.2%', icon: <Activity size={20} />, color: '#10B981' },
    { label: 'Active Analysts', value: statsData?.activeAnalysts || '...', change: 'Steady', icon: <MessageSquare size={20} />, color: '#F59E0B' },
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
            <NavItem 
              icon={<PieChart size={18} />} 
              label="Overview" 
              active={activeTab === 'Overview'} 
              onClick={() => setActiveTab('Overview')} 
            />
            <NavItem 
              icon={<Users size={18} />} 
              label="Creator Requests" 
              active={activeTab === 'Creator Requests'} 
              onClick={() => setActiveTab('Creator Requests')} 
            />
            <NavItem icon={<FileText size={18} />} label="Posts" />
            <NavItem icon={<Activity size={18} />} label="Analytics" />
            <NavItem icon={<Settings size={18} />} label="Settings" />
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
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#E31E24] rounded-full border-2 border-[#0b1326]"></span>
            </button>
            <div className="flex items-center gap-4 pl-4 border-l border-[#ae88831a]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">Administrator</p>
                <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-wider opacity-60">Super Administrator</p>
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

              {/* High-Impact Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, i) => (
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

              {/* Grid Layout for Analytics & Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Live Feed */}
                <div className="lg:col-span-2 bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Recent Content Activity</h3>
                            <p className="text-xs text-[#e7bdb8] opacity-50">Showing last 5 active intelligence entries</p>
                        </div>
                        <button className="flex items-center gap-2 text-[10px] font-bold text-[#E31E24] hover:opacity-80 uppercase tracking-widest transition-all">
                            View Database <ChevronRight size={14} />
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#ae88830d]">
                                    <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Intelligence Title</th>
                                    <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Source</th>
                                    <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Timestamp</th>
                                    <th className="pb-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40 text-right">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ae88830d]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-[#e7bdb8] opacity-50 italic">
                                            Decrypting secure feed...
                                        </td>
                                    </tr>
                                ) : recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-[#e7bdb8] opacity-50 italic">
                                            No recent intelligence reported.
                                        </td>
                                    </tr>
                                ) : recentActivity.map((post, i) => (
                                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-5 pr-4">
                                            <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors line-clamp-1">{post.title}</p>
                                        </td>
                                        <td className="py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10" />
                                                <span className="text-xs text-[#e7bdb8]/70">{post.author}</span>
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <span className="text-xs text-[#e7bdb8]/40">{new Date(post.date).toLocaleDateString()}</span>
                                        </td>
                                        <td className="py-5 text-right">
                                            <span className={`status-badge ${
                                                post.status === 'Approved' ? 'status-approved' : 
                                                post.status === 'Pending' ? 'status-pending' : 'status-rejected'
                                            }`}>
                                                {post.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Insights */}
                <div className="space-y-10">
                    <div className="bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl p-8">
                        <h3 className="text-lg font-bold text-white mb-6">User Growth Dynamics</h3>
                        <div className="h-40 flex items-end gap-2 mb-6">
                            {[40, 60, 45, 78, 55, 90, 70].map((h, i) => (
                                <div key={i} className="flex-1 bg-white/5 rounded-t-md relative group">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${h}%` }}
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#E31E24]/40 to-[#E31E24] rounded-t-md"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-[#e7bdb8]/60 leading-relaxed text-center">
                            Growth projection based on current user acquisition patterns.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#E31E24] to-[#93000d] rounded-2xl p-8 shadow-2xl shadow-red-900/20">
                        <ShieldAlert className="text-white/40 mb-4" size={32} />
                        <h4 className="text-white font-bold mb-2">Secure Link Active</h4>
                        <p className="text-white/70 text-xs leading-relaxed mb-6">Your session is encrypted and connected to the Production Cluster.</p>
                        <button className="w-full py-3 bg-white text-[#E31E24] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all">
                            Security Logs
                        </button>
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
