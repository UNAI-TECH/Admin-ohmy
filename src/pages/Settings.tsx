import React, { useState, useEffect } from 'react';
import { User, Bell, Palette, Shield, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Profile');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings State
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@omhat.com',
    role: 'Super Admin'
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: false,
    dailyDigest: true,
    newCreatorAlerts: true
  });

  const [theme, setTheme] = useState({
    darkMode: true,
    accentColor: '#E31E24'
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('omh_admin_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.notifications) setNotifications(parsed.notifications);
      if (parsed.theme) setTheme(parsed.theme);
    }
  }, []);

  const handleSave = () => {
    setLoading(true);
    // Simulate API call and save to local storage
    setTimeout(() => {
      localStorage.setItem('omh_admin_settings', JSON.stringify({ profile, notifications, theme }));
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Settings</h1>
          <p className="text-[#e7bdb8] opacity-60">Manage your administrative preferences and system configurations.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#E31E24] hover:bg-[#ff3a40] text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 space-y-2">
          {[
            { id: 'Profile', icon: <User size={18} /> },
            { id: 'Notifications', icon: <Bell size={18} /> },
            { id: 'Appearance', icon: <Palette size={18} /> },
            { id: 'Security', icon: <Shield size={18} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full p-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-[#e7bdb8]/60 hover:bg-white/5 hover:text-[#e7bdb8]'
              }`}
            >
              {tab.icon}
              {tab.id}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl p-8 overflow-y-auto custom-scrollbar pb-20">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'Profile' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-6">Profile Settings</h3>
                  <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/5">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#E31E24] to-[#93000d] border-2 border-white/10 shadow-xl flex items-center justify-center text-3xl font-bold text-white">
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors mb-2">
                        Change Avatar
                      </button>
                      <p className="text-xs text-[#e7bdb8] opacity-50">JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#e7bdb8] uppercase tracking-wider opacity-60">Full Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E31E24] transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#e7bdb8] uppercase tracking-wider opacity-60">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-[#0b1326] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E31E24] transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#e7bdb8] uppercase tracking-wider opacity-60">Role</label>
                    <input
                      type="text"
                      value={profile.role}
                      disabled
                      className="w-full bg-[#0b1326]/50 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Notifications' && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-white mb-6">Notification Preferences</h3>
                
                <div className="space-y-4">
                  {[
                    { key: 'emailAlerts', title: 'Email Alerts', desc: 'Receive daily system performance reports' },
                    { key: 'pushNotifications', title: 'Push Notifications', desc: 'Instant alerts for critical system events' },
                    { key: 'dailyDigest', title: 'Daily Digest', desc: 'Summary of platform activity and growth' },
                    { key: 'newCreatorAlerts', title: 'New Creator Alerts', desc: 'Notify when a new creator applies' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                        <p className="text-xs text-[#e7bdb8] opacity-60">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [item.key]: !(notifications as any)[item.key] })}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${
                          (notifications as any)[item.key] ? 'bg-[#E31E24]' : 'bg-black/40'
                        }`}
                      >
                        <motion.div
                          layout
                          className={`w-4 h-4 rounded-full bg-white shadow-sm ${(notifications as any)[item.key] ? 'ml-auto' : ''}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Appearance' && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-white mb-6">Theme Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-[#e7bdb8] uppercase tracking-wider opacity-60 mb-4 block">Mode</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setTheme({ ...theme, darkMode: true })}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-colors ${
                          theme.darkMode ? 'border-[#E31E24] bg-[#E31E24]/10' : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="w-16 h-12 bg-[#0b1326] rounded-md border border-white/10 flex items-center justify-center">
                          <div className="w-8 h-2 bg-white/20 rounded-full" />
                        </div>
                        <span className="text-sm font-bold text-white">Dark Mode</span>
                      </button>
                      <button
                        onClick={() => setTheme({ ...theme, darkMode: false })}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-colors opacity-50 cursor-not-allowed ${
                          !theme.darkMode ? 'border-[#E31E24] bg-[#E31E24]/10' : 'border-white/10 bg-white/5'
                        }`}
                        title="Light mode coming soon"
                      >
                        <div className="w-16 h-12 bg-white rounded-md border border-gray-200 flex items-center justify-center">
                          <div className="w-8 h-2 bg-gray-200 rounded-full" />
                        </div>
                        <span className="text-sm font-bold text-white">Light Mode (Soon)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold text-white mb-6">Security Settings</h3>
                
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Password</h4>
                      <p className="text-xs text-[#e7bdb8] opacity-60">Last changed 3 months ago</p>
                    </div>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold text-white transition-colors">
                      Change Password
                    </button>
                  </div>

                  <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">Two-Factor Authentication</h4>
                      <p className="text-xs text-[#e7bdb8] opacity-60">Protect your account with an extra layer of security</p>
                    </div>
                    <button className="px-4 py-2 bg-[#E31E24]/20 text-[#E31E24] hover:bg-[#E31E24]/30 rounded-lg text-sm font-bold transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
