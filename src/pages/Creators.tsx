import React, { useState, useEffect } from 'react';
import { adminService } from '../lib/adminService';
import { supabase } from '../lib/supabaseClient';
import { Users, Loader2, Key, LayoutTemplate, FileText, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Creators: React.FC = () => {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for viewing a profile
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [creatorPosts, setCreatorPosts] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);

  // States for revealing credentials
  const [revealedCredsId, setRevealedCredsId] = useState<string | null>(null);

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
    setFollowerCount(0);
    try {
      // Fetch posts for this creator
      const postsPromise = supabase
        .from('Post')
        .select('*')
        .eq('authorId', creator.id)
        .order('createdAt', { ascending: false });

      // Fetch follow count for this creator
      const followPromise = supabase
        .from('Follow')
        .select('*', { count: 'exact', head: true })
        .eq('followingId', creator.id);

      const [{ data: posts }, { count: followers }] = await Promise.all([
        postsPromise,
        followPromise
      ]);

      setCreatorPosts(posts || []);
      setFollowerCount(followers || 0);
    } catch(err) {
      console.error('Failed to load creator data:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleRevealCredentials = (creator: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening profile
    if (revealedCredsId === creator.id) {
      setRevealedCredsId(null); // toggle off
    } else {
      setRevealedCredsId(creator.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Users className="text-[#E31E24]" />
          Approved Creators
        </h1>
        <p className="text-gray-500 opacity-60">Directory of published analysts and creators. Manage their access and view their portfolios.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#E31E24]" />
        </div>
      ) : creators.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 opacity-60 italic">
          No approved creators found.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <motion.div 
                key={creator.id} 
                className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden border border-black/[0.04] cursor-pointer hover:border-red-500/30 transition-all group relative"
                onClick={() => handleViewProfile(creator)}
                whileHover={{ y: -4, scale: 1.01 }}
              >
                {/* Cover Image */}
                <div className="h-32 bg-[#FAFBFF] relative">
                  {creator.coverUrl ? (
                    <img src={creator.coverUrl} alt="Cover" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100" />
                  )}
                  {/* Badge */}
                  <div className="absolute top-3 right-3 bg-green-500 text-gray-900 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-green-900/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Approved
                  </div>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6 pt-0 relative">
                  {/* Avatar Avatar */}
                  <div className="w-20 h-20 rounded-full border-4 border-[#171f33] bg-[#FAFBFF] -mt-10 relative z-10 flex items-center justify-center overflow-hidden mb-3">
                    {creator.avatarUrl ? (
                      <img src={creator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#E31E24]">{creator.username?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-extrabold tracking-tight text-gray-900 leading-tight flex items-center gap-2">
                    {creator.username || 'Unnamed'}
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-8.1 7.9z"/></svg>
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium tracking-wide mb-4">{creator.email}</p>
                  
                  <p className="text-sm text-gray-500 opacity-80 line-clamp-2 min-h-[40px] mb-6">
                    {creator.bio || 'No bio provided.'}
                  </p>

                  <div className="border-t border-gray-200 pt-4 mt-auto">
                    {revealedCredsId === creator.id ? (
                      <div className="space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="bg-gray-100 p-3 rounded-xl border border-gray-200">
                          <p className="text-[10px] text-gray-500 opacity-60 uppercase tracking-widest mb-1">Email</p>
                          <p className="text-gray-900 text-sm font-mono truncate">{creator.email}</p>
                        </div>
                        <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20">
                          <p className="text-[10px] text-green-400 uppercase tracking-widest mb-1 font-bold">Initial Password</p>
                          <p className="text-gray-900 text-sm font-mono tracking-widest">
                            {creator.temporary_password || '********'}
                          </p>
                          {!creator.temporary_password && (
                            <p className="text-[9px] text-orange-400 mt-1 italic opacity-60">Not captured (legacy account)</p>
                          )}
                        </div>
                        <button 
                          onClick={(e) => handleRevealCredentials(creator, e)}
                          className="w-full text-xs text-gray-500 hover:text-gray-900 transition-colors py-1"
                        >
                          Hide Credentials
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => handleRevealCredentials(creator, e)}
                        className="w-full py-3 bg-gray-100 hover:bg-white/10 border border-gray-200 rounded-xl text-gray-900 font-bold text-sm transition-all flex items-center justify-center gap-2"
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
              className="w-full max-w-md ml-auto bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden relative"
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
                  <div className="h-40 bg-[#FAFBFF] w-full">
                    {selectedCreator.coverUrl && (
                      <img src={selectedCreator.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="px-6 relative pb-6 border-b border-gray-200">
                    <div className="w-24 h-24 rounded-full border-4 border-white bg-[#FAFBFF] -mt-12 mb-4 relative z-10 flex items-center justify-center overflow-hidden">
                      {selectedCreator.avatarUrl ? (
                        <img src={selectedCreator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-[#E31E24]">{selectedCreator.username?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                      {selectedCreator.username}
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-8.1 7.9z"/></svg>
                    </h2>
                    <p className="text-sm text-gray-500 opacity-60 mb-4">{selectedCreator.email}</p>
                    
                    <p className="text-sm text-gray-700 leading-relaxed mb-6">
                      {selectedCreator.bio}
                    </p>
                    
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-xl font-bold text-gray-900">{creatorPosts.length}</p>
                        <p className="text-xs text-gray-500 opacity-60 uppercase tracking-widest font-bold">Posts</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">{followerCount}</p>
                        <p className="text-xs text-gray-500 opacity-60 uppercase tracking-widest font-bold">Followers</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publications Feed */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <LayoutTemplate className="text-[#E31E24]" size={20} />
                    Publications
                  </h3>
                  
                  {postsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-8 h-8 animate-spin text-[#E31E24]" />
                    </div>
                  ) : creatorPosts.length === 0 ? (
                    <div className="text-center py-10 bg-[#FAFBFF] rounded-2xl border border-black/[0.04]">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 opacity-60 text-sm">No publications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {creatorPosts.map(post => (
                        <div key={post.id} className="bg-white border border-black/[0.04] shadow-sm rounded-2xl p-4 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="w-20 h-20 bg-[#FAFBFF] rounded-xl overflow-hidden flex-shrink-0">
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
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1 leading-tight">{post.title}</h4>
                            <p className="text-xs text-gray-500 opacity-50">{new Date(post.createdAt).toLocaleDateString()}</p>
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
