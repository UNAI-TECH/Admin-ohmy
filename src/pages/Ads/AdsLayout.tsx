import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, BarChart2, PlayCircle, PauseCircle, ChevronLeft, Film } from 'lucide-react';
import AdsOverview from './AdsOverview';
import CreateAd from './CreateAd';
import AdsInsights from './AdsInsights';
import ActiveAds from './ActiveAds';
import PausedAds from './PausedAds';
import VideoAds from './VideoAds';

interface Props {
  onBack: () => void;
}

const AdsLayout: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#F5F5F7] min-w-0">
      {/* Ads Manager Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E5E7EB] flex flex-col pt-4 md:pt-6 shrink-0">
        <div className="px-4 sm:px-6 mb-3 md:mb-6">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-[#6B7280] hover:text-[#D4191F] transition-colors uppercase tracking-widest mb-3 md:mb-6"
          >
            <ChevronLeft size={14} /> Back to PostsApp Admin
          </button>
          <h2 className="text-lg sm:text-xl font-black text-[#111827] tracking-tight leading-tight">Ads Manager</h2>
          <p className="text-[10px] font-bold text-[#D4191F] uppercase tracking-[0.2em]">Campaign Hub</p>
        </div>

        <nav className="flex md:flex-col gap-1 px-3 sm:px-4 pb-3 md:pb-4 overflow-x-auto md:overflow-visible">
          <AdsNavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <AdsNavItem icon={<PlusCircle size={18} />} label="Create Ad" active={activeTab === 'Create Ad'} onClick={() => setActiveTab('Create Ad')} />
          <AdsNavItem icon={<BarChart2 size={18} />} label="Insights" active={activeTab === 'Insights'} onClick={() => setActiveTab('Insights')} />
          <AdsNavItem icon={<PlayCircle size={18} />} label="Active Ads" active={activeTab === 'Active Ads'} onClick={() => setActiveTab('Active Ads')} />
          <AdsNavItem icon={<PauseCircle size={18} />} label="Paused Ads" active={activeTab === 'Paused Ads'} onClick={() => setActiveTab('Paused Ads')} />
          <AdsNavItem icon={<Film size={18} />} label="Video Ads" active={activeTab === 'Video Ads'} onClick={() => setActiveTab('Video Ads')} />
        </nav>
      </aside>

      {/* Ads Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-10 relative min-w-0">
        {activeTab === 'Overview' && <AdsOverview />}
        {activeTab === 'Create Ad' && <CreateAd onAdCreated={() => setActiveTab('Active Ads')} />}
        {activeTab === 'Insights' && <AdsInsights />}
        {activeTab === 'Active Ads' && <ActiveAds />}
        {activeTab === 'Paused Ads' && <PausedAds />}
        {activeTab === 'Video Ads' && <VideoAds />}
      </main>
    </div>
  );
};

const AdsNavItem = ({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 md:w-full px-3.5 py-2.5 md:p-3 rounded-xl transition-all font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 ${
      active 
      ? 'bg-white text-gray-900 border shadow-sm border-gray-200' 
      : 'text-gray-500/80 hover:text-gray-900 hover:bg-gray-100'
    }`}>
    {icon}
    <span>{label}</span>
  </button>
);

export default AdsLayout;
