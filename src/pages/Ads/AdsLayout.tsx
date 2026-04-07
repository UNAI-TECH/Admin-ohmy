import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, BarChart2, PlayCircle, PauseCircle, ChevronLeft } from 'lucide-react';
import AdsOverview from './AdsOverview';
import CreateAd from './CreateAd';
import AdsInsights from './AdsInsights';
import ActiveAds from './ActiveAds';
import PausedAds from './PausedAds';

interface Props {
  onBack: () => void;
}

const AdsLayout: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="flex h-full bg-[#FAFBFF]">
      {/* Ads Manager Sidebar */}
      <aside className="w-64 bg-[#FAFBFF] border-r border-gray-200 flex flex-col pt-6">
        <div className="px-6 mb-6">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 opacity-60 hover:opacity-100 transition-opacity uppercase tracking-widest mb-6"
          >
            <ChevronLeft size={14} /> Back to Sentinel
          </button>
          <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Ads Manager</h2>
          <p className="text-[10px] font-bold text-[#E31E24] uppercase tracking-[0.2em]">Campaign Hub</p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <AdsNavItem icon={<LayoutDashboard size={18} />} label="Overview" active={activeTab === 'Overview'} onClick={() => setActiveTab('Overview')} />
          <AdsNavItem icon={<PlusCircle size={18} />} label="Create Ad" active={activeTab === 'Create Ad'} onClick={() => setActiveTab('Create Ad')} />
          <AdsNavItem icon={<BarChart2 size={18} />} label="Insights" active={activeTab === 'Insights'} onClick={() => setActiveTab('Insights')} />
          <AdsNavItem icon={<PlayCircle size={18} />} label="Active Ads" active={activeTab === 'Active Ads'} onClick={() => setActiveTab('Active Ads')} />
          <AdsNavItem icon={<PauseCircle size={18} />} label="Paused Ads" active={activeTab === 'Paused Ads'} onClick={() => setActiveTab('Paused Ads')} />
        </nav>
      </aside>

      {/* Ads Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-10 relative">
        {activeTab === 'Overview' && <AdsOverview />}
        {activeTab === 'Create Ad' && <CreateAd onAdCreated={() => setActiveTab('Active Ads')} />}
        {activeTab === 'Insights' && <AdsInsights />}
        {activeTab === 'Active Ads' && <ActiveAds />}
        {activeTab === 'Paused Ads' && <PausedAds />}
      </main>
    </div>
  );
};

const AdsNavItem = ({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 w-full p-3 rounded-xl transition-all font-semibold text-sm ${
      active 
      ? 'bg-white text-gray-900 border shadow-sm border-gray-200' 
      : 'text-gray-500/60 hover:text-gray-900 hover:bg-gray-100'
    }`}>
    {icon}
    {label}
  </button>
);

export default AdsLayout;
