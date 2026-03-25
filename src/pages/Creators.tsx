import React, { useState, useEffect } from 'react';
import { adminService } from '../lib/adminService';
import { supabase } from '../lib/supabaseClient';
import { Users, Loader2, Key, Eye, EyeOff, LayoutTemplate, FileText, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Creators: React.FC = () => {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for viewing a profile
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [creatorPosts, setCreatorPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // States for revealing/resetting credentials
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [revealedCreds, setRevealedCreds] = useState<{id: string, email: string, password?: string} | null>(null);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllCreators();
      setCreators(data);
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (creator: any) => {
    setSelectedCreator(creator);
    setPostsLoading(true);
    try {
      // Fetch posts for this creator
      const { data } = await supabase
        .from('Post')
        .select('*')
        .eq('authorId', creator.id)
        .order('createdAt', { ascending: false });
      setCreatorPosts(data || []);
    } catch(err) {
      console.error('Failed to load creator posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleRevealCredentials = (creator: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening profile
    // Since we don't store plaintext passwords, we can only reveal the email by default.
    // We offer a quick reset option to generate a temporary password if needed.
    if (revealedCreds?.id === creator.id) {
      setRevealedCreds(null); // toggle off
    } else {
      setRevealedCreds({ id: creator.id, email: creator.email });
    }
  };

  const handleResetPassword = async (creator: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newPassword || newPassword.length < 8) return alert("Password must be at least 8 characters");
    
    setResettingId(creator.id);
    try {
      // Update password using admin service
      const { error } = await supabase.auth.admin.updateUserById(creator.id, {
        password: newPassword
      });
      if (error) throw error;
      
      setRevealedCreds({ id: creator.id, email: creator.email, password: newPassword });
      setNewPassword('');
    } catch (err: any) {
      alert("Failed to reset password: " + err.message);
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Users className="text-[#E31E24]" />
          Approved Creators
        </h1>
        <p className="text-[#e7bdb8] opacity-60">Directory of published analysts and creators. Manage their access and view their portfolios.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#E31E24]" />
        </div>
      ) : creators.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#e7bdb8] opacity-60 italic">
          No approved creators found.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <motion.div 
                key={creator.id} 
                className="bg-[#171f3366] backdrop-blur-md rounded-2xl overflow-hidden border border-[#ae88831a] cursor-pointer hover:border-[#E31E24]/50 transition-colors group relative"
                onClick={() => handleViewProfile(creator)}
                whileHover={{ y: -4 }}
              >
                {/* Cover Image */}
                <div className="h-32 bg-[#0b1326] relative">
                  {creator.coverUrl ? (
                    <img src={creator.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#131b2e] to-[#0b1326]" />
                  )}
                  {/* Badge */}
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-green-900/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Approved
                  </div>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6 pt-0 relative">
                  {/* Avatar Avatar */}
                  <div className="w-20 h-20 rounded-full border-4 border-[#171f33] bg-[#0b1326] -mt-10 relative z-10 flex items-center justify-center overflow-hidden mb-3">
                    {creator.avatarUrl ? (
                      <img src={creator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#E31E24]">{creator.username?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white leading-tight flex items-center gap-2">
                    {creator.username || 'Unnamed'}
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-8.1 7.9z"/></svg>
                  </h3>
                  <p className="text-xs text-[#e7bdb8] opacity-60 mb-4">{creator.email}</p>
                  
                  <p className="text-sm text-[#e7bdb8] opacity-80 line-clamp-2 min-h-[40px] mb-6">
                    {creator.bio || 'No bio provided.'}
                  </p>

                  <div className="border-t border-[#ae88831a] pt-4 mt-auto">
                    {revealedCreds?.id === creator.id ? (
                      <div className="space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                          <p className="text-[10px] text-[#e7bdb8] opacity-60 uppercase tracking-widest mb-1">Email</p>
                          <p className="text-white text-sm font-mono truncate">{creator.email}</p>
                        </div>
                        {revealedCreds.password ? (
                          <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                            <p className="text-[10px] text-green-400 uppercase tracking-widest mb-1 font-bold">New Password Extracted</p>
                            <p className="text-white text-sm font-mono tracking-widest">{revealedCreds.password}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text" 
                              placeholder="Reset password..." 
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full bg-[#0b1326] border border-[#ae88831a] rounded-lg px-3 py-2 text-sm text-white focus:border-[#E31E24] outline-none"
                            />
                            <button 
                              onClick={(e) => handleResetPassword(creator, e)}
                              disabled={resettingId === creator.id}
                              className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              {resettingId === creator.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set New Password"}
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={(e) => handleRevealCredentials(creator, e)}
                          className="w-full text-xs text-[#e7bdb8] hover:text-white transition-colors py-1"
                        >
                          Hide Credentials
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => handleRevealCredentials(creator, e)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <Key size={16} /> Reveal Credentials
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Creator Profile Modal (Same layout as the app) */}
      <AnimatePresence>
        {selectedCreator && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex"
          >
            {/* Slide-in panel to simulate mobile view */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md ml-auto bg-[#131b2e] h-full shadow-2xl border-l border-[#ae88831a] flex flex-col overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedCreator(null)}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              >
                <XCircle size={24} />
              </button>

              <div className="overflow-y-auto custom-scrollbar flex-1 pb-10">
                {/* Profile Header Block */}
                <div className="relative">
                  <div className="h-40 bg-[#0b1326] w-full">
                    {selectedCreator.coverUrl && (
                      <img src={selectedCreator.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="px-6 relative pb-6 border-b border-[#ae88831a]">
                    <div className="w-24 h-24 rounded-full border-4 border-[#131b2e] bg-[#0b1326] -mt-12 mb-4 relative z-10 flex items-center justify-center overflow-hidden">
                      {selectedCreator.avatarUrl ? (
                        <img src={selectedCreator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-[#E31E24]">{selectedCreator.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
                      {selectedCreator.username}
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-8.1 7.9z"/></svg>
                    </h2>
                    <p className="text-sm text-[#e7bdb8] opacity-60 mb-4">{selectedCreator.email}</p>
                    
                    <p className="text-sm text-white/80 leading-relaxed mb-6">
                      {selectedCreator.bio}
                    </p>
                    
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xl font-bold text-white">{creatorPosts.length}</p>
                        <p className="text-xs text-[#e7bdb8] opacity-60 uppercase tracking-widest font-bold">Posts</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">0</p>
                        <p className="text-xs text-[#e7bdb8] opacity-60 uppercase tracking-widest font-bold">Followers</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publications Feed */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <LayoutTemplate className="text-[#E31E24]" size={20} />
                    Publications
                  </h3>
                  
                  {postsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-8 h-8 animate-spin text-[#E31E24]" />
                    </div>
                  ) : creatorPosts.length === 0 ? (
                    <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5">
                      <FileText className="w-10 h-10 text-[#e7bdb8] opacity-30 mx-auto mb-3" />
                      <p className="text-[#e7bdb8] opacity-60 text-sm">No publications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {creatorPosts.map(post => (
                        <div key={post.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 hover:bg-white/10 transition-colors cursor-pointer">
                          <div className="w-20 h-20 bg-[#0b1326] rounded-xl overflow-hidden flex-shrink-0">
                            {post.thumbnail ? (
                              <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20">
                                <FileText size={20} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E31E24]/20 text-[#E31E24] uppercase tracking-wider mb-1 inline-block">
                              {post.type}
                            </span>
                            <h4 className="text-sm font-bold text-white line-clamp-2 mb-1 leading-tight">{post.title}</h4>
                            <p className="text-xs text-[#e7bdb8] opacity-50">{new Date(post.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Creators;
