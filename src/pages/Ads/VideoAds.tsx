import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { adminService } from '../../lib/adminService';
import { Film, ToggleLeft, ToggleRight, Zap, AlertTriangle, Plus, X, PlayCircle, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// --- existing helpers ---
function parseDurationToSeconds(duration: string | null | undefined): number {
  if (!duration) return 0;
  const trimmed = duration.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const parts = trimmed.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}



interface VideoPost {
  id: string;
  title: string;
  thumbnail: string | null;
  videoDuration: string | null;
  ads_enabled: boolean;
  authorId: string;
  createdAt: string;
  author: { username: string; avatarUrl: string | null } | { username: string; avatarUrl: string | null }[];
}

interface VideoAdCampaign {
  id: string;
  ad_video_url: string;
  title: string;
  is_active: boolean;
  created_at: string;
  revenue_per_view: number;
  views: number;
  revenue: number;
}

export default function VideoAds() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'posts'>('campaigns');
  const [loading, setLoading] = useState(true);
  
  // --- Posts State ---
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  
  // --- Campaigns State ---
  const [campaigns, setCampaigns] = useState<VideoAdCampaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<VideoAdCampaign | null>(null);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [newAdRevenue, setNewAdRevenue] = useState('0.1');
  const [newAdActive, setNewAdActive] = useState(true);
  const [newAdType, setNewAdType] = useState<'both'|'pre'|'mid'>('both');
  const [newAdSkippable, setNewAdSkippable] = useState(true);
  const [newAdSkipAfter, setNewAdSkipAfter] = useState(5);
  const [newAdPriority, setNewAdPriority] = useState(5);
  const [newAdDuration, setNewAdDuration] = useState(0);
  const [newAdDescription, setNewAdDescription] = useState('');
  const [newAdLink, setNewAdLink] = useState('');
  const [newAdLogoFile, setNewAdLogoFile] = useState<File | null>(null);
  const [newAdLogoPreview, setNewAdLogoPreview] = useState<string>('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { success, error: toastError } = useToast();

  const fetchPosts = async () => {
    try {
      await adminService.ensureVideoAdsTable();
      const data = await adminService.getVideoPosts();
      setVideos(data as VideoPost[]);
    } catch (err: any) {
      console.error('Failed to fetch video posts:', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase.from('video_ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err: any) {
      console.error('Failed to fetch campaigns:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchCampaigns()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Real-time updates
    const channel = supabase
      .channel('video-ads-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Post' }, () => {
        fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_ads' }, () => {
        fetchCampaigns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleTogglePostAds = async (video: VideoPost) => {
    const durationSec = parseDurationToSeconds(video.videoDuration);
    if (!video.ads_enabled && durationSec < 30) {
      toastError('Cannot enable ads for videos shorter than 30 seconds');
      return;
    }
    setToggling(`post-${video.id}`);
    try {
      const newState = !video.ads_enabled;
      await adminService.toggleVideoAds(video.id, newState, durationSec);
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, ads_enabled: newState } : v));
      success(newState ? 'Mid-roll ads enabled' : 'Mid-roll ads disabled');
    } catch (err: any) {
      toastError(err.message || 'Failed to update video ads');
    } finally {
      setToggling(null);
    }
  };

  const handleToggleCampaignAd = async (campaign: VideoAdCampaign) => {
    setToggling(`camp-${campaign.id}`);
    try {
      const newState = !campaign.is_active;
      const { error } = await supabase.from('video_ads').update({ is_active: newState }).eq('id', campaign.id);
      if (error) throw error;
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, is_active: newState } : c));
      success(newState ? 'Campaign activated' : 'Campaign paused');
    } catch (err: any) {
      toastError(err.message || 'Failed to toggle campaign');
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteCampaign = (campaign: VideoAdCampaign) => {
    setCampaignToDelete(campaign);
    setShowDeleteModal(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    try {
      const { error } = await supabase.from('video_ads').delete().eq('id', campaignToDelete.id);
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== campaignToDelete.id));
      success('Campaign deleted successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to delete campaign');
    } finally {
      setShowDeleteModal(false);
      setCampaignToDelete(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        toastError('File size must be less than 100MB');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setNewAdDuration(Math.round(video.duration));
      };
      video.src = url;
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toastError('Logo size must be less than 5MB');
        return;
      }
      setNewAdLogoFile(file);
      setNewAdLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateAd = async () => {
    if (!newAdTitle || !selectedFile) {
      toastError('Title and Video File are required');
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
      const filePath = `ads/${Date.now()}-${cleanName}`;

      setUploadProgress(40);
      const { error: uploadError } = await supabase.storage
        .from('ad-videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setUploadProgress(80);

      const { data: publicUrlData } = supabase.storage
        .from('ad-videos')
        .getPublicUrl(filePath);

      const adVideoUrl = publicUrlData.publicUrl;

      let finalLogoUrl = '';
      if (newAdLogoFile) {
        const logoCleanName = newAdLogoFile.name.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const logoPath = `ads/logo-${Date.now()}-${logoCleanName}`;
        const { error: logoUploadError } = await supabase.storage
          .from('ad-videos')
          .upload(logoPath, newAdLogoFile, { cacheControl: '3600', upsert: false });
        if (!logoUploadError) {
          const { data: logoUrlData } = supabase.storage.from('ad-videos').getPublicUrl(logoPath);
          finalLogoUrl = logoUrlData.publicUrl;
        }
      }

      const { error } = await supabase.from('video_ads').insert([
        {
          title: newAdTitle,
          ad_video_url: adVideoUrl,
          revenue_per_view: parseFloat(newAdRevenue) || 0,
          is_active: newAdActive,
          type: newAdType === 'both' ? ['pre', 'mid'] : [newAdType],
          is_skippable: newAdSkippable,
          skip_after: newAdSkipAfter,
          priority: newAdPriority,
          duration: newAdDuration,
          description: newAdDescription,
          link: newAdLink,
          logo_url: finalLogoUrl
        }
      ]);
      if (error) throw error;
      setUploadProgress(100);
      success('Video Ad Campaign created successfully');
      setShowCreateModal(false);
      setNewAdTitle('');
      setSelectedFile(null);
      setPreviewUrl('');
      setNewAdRevenue('0.1');
      setNewAdType('both');
      setNewAdSkippable(true);
      setNewAdSkipAfter(5);
      setNewAdPriority(5);
      setNewAdDuration(0);
      setNewAdActive(true);
      setNewAdDescription('');
      setNewAdLink('');
      setNewAdLogoFile(null);
      setNewAdLogoPreview('');
      fetchCampaigns();
    } catch (err: any) {
      toastError(err.message || 'Failed to create campaign');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const totalEnabled = videos.filter(v => v.ads_enabled).length;
  const eligibleVideos = videos.filter(v => parseDurationToSeconds(v.videoDuration) >= 30).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#E31E24] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight flex items-center gap-3">
            Video Ads <Film className="text-[#E31E24]" size={28} />
          </h1>
          <p className="text-gray-500 opacity-60 font-medium">Manage actual video ads and creator content mid-roll slots.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-[#E31E24] text-white rounded-xl shadow-md hover:bg-red-700 transition flex items-center gap-2 font-bold uppercase tracking-wide text-xs"
        >
          <Plus size={16} strokeWidth={3} /> Create Video Ad
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-4 px-2 font-black uppercase tracking-widest text-xs transition-colors ${
            activeTab === 'campaigns' ? 'border-b-2 border-[#E31E24] text-[#E31E24]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Ad Campaigns
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-4 px-2 font-black uppercase tracking-widest text-xs transition-colors ${
            activeTab === 'posts' ? 'border-b-2 border-[#E31E24] text-[#E31E24]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Creator Video Placements
        </button>
      </div>

      {activeTab === 'posts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Film size={18} className="text-[#E31E24]" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Total Videos</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{videos.length}</p>
            </div>
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={18} className="text-green-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Ads Enabled</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{totalEnabled}<span className="text-sm font-bold text-gray-400 ml-1">/ {eligibleVideos} eligible</span></p>
            </div>
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Too Short</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{videos.length - eligibleVideos}<span className="text-sm font-bold text-gray-400 ml-1">under 30s</span></p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#FAFBFF]">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Video</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Creator</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Duration</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 text-center">Mid-Rolls</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => {
                  const authorObj = Array.isArray(video.author) ? video.author[0] : video.author;
                  const durationSec = parseDurationToSeconds(video.videoDuration);
                  const isTooShort = durationSec < 30;
                  const isToggling = toggling === `post-${video.id}`;
                  return (
                    <tr key={video.id} className="border-b border-gray-50 hover:bg-[#FAFBFF] transition-colors group">
                      <td className="px-6 py-4 flex items-center gap-4">
                        <div className="w-16 h-10 rounded-lg bg-black/10 overflow-hidden shrink-0">
                          {video.thumbnail && <img src={video.thumbnail} className="w-full h-full object-cover" />}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm line-clamp-2 max-w-[240px]">{video.title}</p>
                      </td>
                      <td className="px-6 py-4"><span className="text-sm text-gray-600 font-medium">{authorObj?.username || 'Unknown'}</span></td>
                      <td className="px-6 py-4 font-mono font-bold text-sm text-gray-700">{video.videoDuration || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          disabled={isTooShort || isToggling}
                          onClick={() => handleTogglePostAds(video)}
                          className={isTooShort ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                        >
                          {isToggling ? <div className="w-5 h-5 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin inline-block" /> 
                            : video.ads_enabled ? <ToggleRight size={32} className="text-[#E31E24]" /> : <ToggleLeft size={32} className="text-gray-300" />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'campaigns' && (
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#FAFBFF]">
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">Campaign Content</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 text-center">Views</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 text-center">Rev / View</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 text-center">Total Rev</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id} className="border-b border-gray-50 hover:bg-[#FAFBFF] transition-colors">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className="w-16 h-10 rounded-lg bg-black flex items-center justify-center shrink-0">
                      <PlayCircle size={16} className="text-white opacity-80" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm max-w-[240px] truncate">{camp.title}</p>
                      <p className="text-[10px] font-mono text-gray-400 truncate max-w-[200px]">{camp.ad_video_url}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-gray-900 text-sm">{camp.views.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center font-mono text-[#E31E24] text-xs font-bold">₹{camp.revenue_per_view.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center font-mono text-green-600 text-sm font-bold">₹{camp.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        disabled={toggling === `camp-${camp.id}`}
                        onClick={() => handleToggleCampaignAd(camp)}
                        className="cursor-pointer"
                        title={camp.is_active ? 'Pause Campaign' : 'Activate Campaign'}
                      >
                        {toggling === `camp-${camp.id}` ? <div className="w-5 h-5 border-2 border-[#E31E24] border-t-transparent rounded-full animate-spin inline-block" />
                          : camp.is_active ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-300" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp)}
                        className="p-1.5 text-gray-400 hover:text-[#E31E24] hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <Film size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No ad campaigns found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-gray-900 mb-6">Create Video Ad</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Campaign Title</label>
                <input
                  type="text"
                  value={newAdTitle}
                  onChange={e => setNewAdTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24]"
                  placeholder="e.g. Diwali Mega Sale Ad"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ad Description</label>
                <input
                  type="text"
                  value={newAdDescription}
                  onChange={e => setNewAdDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24]"
                  placeholder="Additional details about the ad..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ad Link</label>
                  <input
                    type="url"
                    value={newAdLink}
                    onChange={e => setNewAdLink(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24]"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ad Logo</label>
                  {!newAdLogoFile ? (
                    <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-center cursor-pointer hover:bg-gray-100 relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-gray-500">Upload Image</span>
                    </div>
                  ) : (
                    <div className="w-full h-11 border border-gray-200 rounded-xl overflow-hidden bg-gray-100 relative flex items-center px-2">
                       <img src={newAdLogoPreview} className="h-8 w-8 object-cover rounded shadow-sm mr-2" />
                       <span className="text-xs font-mono text-gray-600 truncate flex-1">{newAdLogoFile.name}</span>
                       <button
                         onClick={() => { setNewAdLogoFile(null); setNewAdLogoPreview(''); }}
                         className="p-1 bg-gray-200 rounded-full hover:bg-gray-300 ml-2"
                         title="Remove Logo"
                       >
                         <X size={14} />
                       </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Upload Ad Video</label>
                {!selectedFile ? (
                  <div className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-4 py-8 text-center hover:bg-gray-100 transition relative">
                    <input
                      type="file"
                      accept="video/mp4, video/mov"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <PlayCircle size={32} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-700">Click or drag video to upload</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">MP4 or MOV up to 100MB</p>
                  </div>
                ) : (
                  <div className="w-full border border-gray-200 rounded-xl overflow-hidden bg-black relative">
                    <video src={previewUrl} className="w-full h-40 object-contain" controls />
                    {!uploading && (
                      <button
                        onClick={() => { setSelectedFile(null); setPreviewUrl(''); }}
                        className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs font-mono font-bold max-w-[200px] truncate">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Revenue Per View (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAdRevenue}
                      onChange={e => setNewAdRevenue(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ad Type</label>
                    <select
                      value={newAdType}
                      onChange={e => setNewAdType(e.target.value as 'both'|'pre'|'mid')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24]"
                    >
                      <option value="both">Both (Pre & Mid)</option>
                      <option value="pre">Pre-roll Only</option>
                      <option value="mid">Mid-roll Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Skippable?</label>
                    <button
                      onClick={() => setNewAdSkippable(!newAdSkippable)}
                      className={`w-full py-3 px-4 flex justify-between items-center rounded-xl border ${newAdSkippable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      <span className="font-semibold text-sm">{newAdSkippable ? 'Yes, Skippable' : 'No (Unskippable)'}</span>
                      {newAdSkippable ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                  {newAdSkippable && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Skip After (sec)</label>
                      <input
                        type="number"
                        min="1"
                        value={newAdSkipAfter}
                        onChange={e => setNewAdSkipAfter(parseInt(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Priority (1-10)</label>
                    <input
                      type="number"
                      min="1" max="10"
                      value={newAdPriority}
                      onChange={e => setNewAdPriority(parseInt(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-[#E31E24] font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-center items-center">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Active</label>
                    <button
                      onClick={() => setNewAdActive(!newAdActive)}
                      className="flex items-center gap-2"
                    >
                      {newAdActive ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-gray-300" />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreateAd}
                disabled={uploading}
                className="w-full bg-[#E31E24] text-white rounded-xl py-4 font-black uppercase tracking-widest text-xs mt-4 hover:bg-red-700 transition relative overflow-hidden"
              >
                {uploading && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-red-800 transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }} 
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading Video... {uploadProgress}%
                    </>
                  ) : 'Launch Campaign'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#E31E24] flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2 tracking-tight">Delete Campaign?</h3>
            <p className="text-sm text-gray-500 text-center mb-6 font-medium">
              Are you sure you want to delete <span className="font-bold text-gray-700">"{campaignToDelete?.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setCampaignToDelete(null); }}
                className="flex-1 py-3 bg-gray-100 font-bold text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCampaign}
                className="flex-1 py-3 bg-[#E31E24] font-bold text-white rounded-xl hover:bg-red-700 transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
