import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { adminService } from '../../lib/adminService';
import { Link as LinkIcon, IndianRupee, Target, AlignLeft, Type, Save, Upload, X, MousePointerClick, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CreateAd({ onAdCreated }: { onAdCreated: () => void }) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    redirect_url: '',
    advertiser_name: '',
    pricing_model: 'cpc', // 'cpc' or 'cpm'
    cpc_amount: '2.50',
    cpm_amount: '150.00',
    budget_total: '5000.00'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!imageFile) throw new Error("Please upload a campaign asset.");

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = fileName;

      // Use the admin service to upload — it uses service_role and bypasses RLS
      const uploadData = await adminService.uploadAdImage(imageFile, filePath);
      if (!uploadData) throw new Error("Upload failed: No data returned from storage.");

      const { data: pubUrlData } = supabase.storage.from('ads').getPublicUrl(filePath);
      const finalImageUrl = pubUrlData.publicUrl;

      const budget = parseFloat(formData.budget_total);

      const { error: insertError } = await supabase.from('ads').insert({
        title: formData.title,
        description: formData.description,
        media_url: finalImageUrl,
        redirect_url: formData.redirect_url,
        advertiser_name: formData.advertiser_name,
        pricing_model: formData.pricing_model,
        cpc_amount: formData.pricing_model === 'cpc' ? parseFloat(formData.cpc_amount) : 0,
        cpm_amount: formData.pricing_model === 'cpm' ? parseFloat(formData.cpm_amount) : 0,
        budget_total: budget,
        budget_remaining: budget,
        total_spent: 0,
        status: 'active'
      });

      if (insertError) throw insertError;
      
      success('Campaign deployed successfully!');
      onAdCreated();
    } catch (err: any) {
      toastError(err.message || 'Failed to deploy campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Deploy Campaign</h1>
        <p className="text-gray-500 opacity-60">Initialize a new advertisement into the creator ecosystem.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm backdrop-blur-md border border-gray-200 rounded-3xl p-10 shadow-2xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-4 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Creative Asset</label>
            <div className="relative">
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center w-full h-48 bg-[#FAFBFF] border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#E31E24] hover:bg-white transition-all cursor-pointer group">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="text-gray-500" size={24} />
                    </div>
                    <span className="text-sm font-bold text-gray-500 opacity-60">Drop campaign media here or click to browse</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              ) : (
                <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-gray-200 shadow-2xl">
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <button 
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 rounded-xl text-white shadow-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Ad Headline</label>
            <div className="relative flex items-center">
              <Type className="absolute left-5 text-gray-500 opacity-40" size={20} />
              <input 
                required type="text" name="title" value={formData.title} onChange={handleChange}
                className="w-full bg-[#FAFBFF] border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 text-lg font-medium focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all placeholder:text-gray-500 placeholder:opacity-20"
                placeholder="Unstoppable Growth Starts Here"
              />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Description Copy</label>
            <div className="relative flex">
              <AlignLeft className="absolute left-5 top-5 text-gray-500 opacity-40" size={20} />
              <textarea 
                required name="description" value={formData.description} onChange={handleChange} rows={3}
                className="w-full bg-[#FAFBFF] border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all resize-none placeholder:text-gray-500 placeholder:opacity-20"
                placeholder="Hook your audience with a compelling story..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Advertiser</label>
            <div className="relative flex items-center">
              <Target className="absolute left-5 text-gray-500 opacity-40" size={20} />
              <input 
                required type="text" name="advertiser_name" value={formData.advertiser_name} onChange={handleChange}
                className="w-full bg-[#FAFBFF] border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all"
                placeholder="Brand Identity"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Redirect URL</label>
            <div className="relative flex items-center">
              <LinkIcon className="absolute left-5 text-gray-500 opacity-40" size={20} />
              <input 
                required type="url" name="redirect_url" value={formData.redirect_url} onChange={handleChange}
                className="w-full bg-[#FAFBFF] border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all"
                placeholder="https://brand.com/promo"
              />
            </div>
          </div>

          <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-100">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Economic Strategy</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, pricing_model: 'cpc' }))}
                className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${formData.pricing_model === 'cpc' ? 'bg-[#E31E24]/10 border-[#E31E24] shadow-[0_0_20px_rgba(227,30,36,0.1)]' : 'bg-[#FAFBFF] border-gray-200 opacity-40 hover:opacity-100'}`}
              >
                <MousePointerClick size={32} className={formData.pricing_model === 'cpc' ? 'text-[#E31E24]' : 'text-gray-900'} />
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-lg">CPC</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Cost Per Click</p>
                </div>
              </button>
              <button 
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, pricing_model: 'cpm' }))}
                className={`p-6 rounded-2xl border flex flex-col items-center gap-3 transition-all ${formData.pricing_model === 'cpm' ? 'bg-[#E31E24]/10 border-[#E31E24] shadow-[0_0_20px_rgba(227,30,36,0.1)]' : 'bg-[#FAFBFF] border-gray-200 opacity-40 hover:opacity-100'}`}
              >
                <Eye size={32} className={formData.pricing_model === 'cpm' ? 'text-[#E31E24]' : 'text-gray-900'} />
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-lg">CPM</p>
                  <p className="text-[10px] uppercase font-black opacity-60">Cost Per 1K Views</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">
              {formData.pricing_model === 'cpc' ? 'CPC Bid (INR)' : 'CPM Rate (INR)' }
            </label>
            <div className="relative flex items-center">
              <IndianRupee className="absolute left-5 text-[#E31E24]" size={20} />
              <input 
                required type="number" step="0.01" min="0" 
                name={formData.pricing_model === 'cpc' ? 'cpc_amount' : 'cpm_amount'} 
                value={formData.pricing_model === 'cpc' ? formData.cpc_amount : formData.cpm_amount} 
                onChange={handleChange}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 text-xl font-black focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-60">Total Budget (INR)</label>
            <div className="relative flex items-center">
              <IndianRupee className="absolute left-5 text-[#E31E24]" size={20} />
              <input 
                required type="number" step="0.01" min="0" name="budget_total" value={formData.budget_total} onChange={handleChange}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-14 pr-6 text-gray-900 text-xl font-black focus:ring-2 focus:ring-[#E31E24]/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-[#E31E24] shadow-[0_10px_30px_rgba(227,30,36,0.2)] hover:bg-red-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Deploying Campaign...
            </div>
          ) : (
            <>
              <Save size={24} /> Deploy Ad Campaign
            </>
          )}
        </button>
      </form>
    </div>
  );
}
