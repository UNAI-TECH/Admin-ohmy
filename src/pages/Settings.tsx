import React, { useState, useEffect } from 'react';
import { Globe, Shield, Save, Loader2, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { useToast } from '../context/ToastContext';

export default function SettingsView() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [siteName, setSiteName] = useState('PostsApp');
  const [taglineEn, setTaglineEn] = useState('Independent Bilingual Journalism · English & தமிழ்');
  const [taglineTa, setTaglineTa] = useState('சுயாதீன இருமொழி செய்தித் தளம் · English & தமிழ்');
  const [contactEmail, setContactEmail] = useState('editorial@postsapp.com');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [gscVerification, setGscVerification] = useState('');
  const [defaultSeoDescEn, setDefaultSeoDescEn] = useState('');
  const [defaultSeoDescTa, setDefaultSeoDescTa] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('site_settings').select('key, value');
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        map[r.key] = r.value;
      });
      if (map.site_name) setSiteName(String(map.site_name));
      if (map.tagline_en) setTaglineEn(String(map.tagline_en));
      if (map.tagline_ta) setTaglineTa(String(map.tagline_ta));
      if (map.contact_email) setContactEmail(String(map.contact_email));
      if (map.ga4_measurement_id) setGa4MeasurementId(String(map.ga4_measurement_id));
      if (map.gsc_verification) setGscVerification(String(map.gsc_verification));
      if (map.default_seo_description_en) setDefaultSeoDescEn(String(map.default_seo_description_en));
      if (map.default_seo_description_ta) setDefaultSeoDescTa(String(map.default_seo_description_ta));
      if (map.maintenance_mode !== undefined) setMaintenanceMode(Boolean(map.maintenance_mode));
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const rows = [
        { key: 'site_name', value: siteName.trim(), updated_at: now },
        { key: 'tagline_en', value: taglineEn.trim(), updated_at: now },
        { key: 'tagline_ta', value: taglineTa.trim(), updated_at: now },
        { key: 'contact_email', value: contactEmail.trim(), updated_at: now },
        { key: 'ga4_measurement_id', value: ga4MeasurementId.trim(), updated_at: now },
        { key: 'gsc_verification', value: gscVerification.trim(), updated_at: now },
        { key: 'default_seo_description_en', value: defaultSeoDescEn.trim(), updated_at: now },
        { key: 'default_seo_description_ta', value: defaultSeoDescTa.trim(), updated_at: now },
        { key: 'maintenance_mode', value: maintenanceMode, updated_at: now },
      ];
      const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      await adminService.writeAudit('settings.update', 'site_settings', null, null, { siteName, maintenanceMode }).catch(() => {});
      success('Global site settings persisted to PostgreSQL.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4191F]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Global Site Settings</h1>
          <p className="text-gray-500 text-sm mt-1">
            Authoritative configuration saved to PostgreSQL (`site_settings`).
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#D4191F] hover:bg-red-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Settings
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><Globe size={18} className="text-[#D4191F]" /> Brand &amp; Bilingual Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Brand Name</label>
            <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Newsroom Contact Email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Tagline (English)</label>
          <input value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Tagline (Tamil / தமிழ்)</label>
          <input value={taglineTa} onChange={(e) => setTaglineTa(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><BarChart2 size={18} className="text-blue-600" /> SEO, GA4 &amp; Search Console Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Google Analytics 4 Measurement ID</label>
            <input value={ga4MeasurementId} onChange={(e) => setGa4MeasurementId(e.target.value)} placeholder="G-XXXXXXXXXX" className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Google Search Console Verification Token</label>
            <input value={gscVerification} onChange={(e) => setGscVerification(e.target.value)} placeholder="google-site-verification token" className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Default Meta Description (EN)</label>
          <textarea rows={2} value={defaultSeoDescEn} onChange={(e) => setDefaultSeoDescEn(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Default Meta Description (TA)</label>
          <textarea rows={2} value={defaultSeoDescTa} onChange={(e) => setDefaultSeoDescTa(e.target.value)} className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-amber-600" />
          <div>
            <p className="text-sm font-bold text-gray-900">Maintenance Banner Mode</p>
            <p className="text-xs text-gray-500">Show public maintenance notice across portals when scheduled work occurs.</p>
          </div>
        </div>
        <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} className="w-5 h-5 accent-[#D4191F]" />
      </div>
    </form>
  );
}
