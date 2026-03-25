import React, { useState, useEffect } from 'react';
import { adminService } from '../lib/adminService';
import { supabase } from '../lib/supabaseClient';
import { FileText, Loader2, PlayCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Posts: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await adminService.getRecentPosts(100);
        setPosts(data);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();

    const channel = supabase
      .channel('admin-posts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Post' }, async (payload) => {
        const newPost = payload.new as any;
        try {
          const { data: user } = await supabase.from('User').select('username, email').eq('id', newPost.authorId).single();
          newPost.User = user || { username: 'Unknown' };
        } catch(e) {}
        setPosts(prev => [newPost, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <FileText className="text-[#10B981]" />
          Content Posts
        </h1>
        <p className="text-[#e7bdb8] opacity-60">All published posts, news, blogs, and videos across the platform.</p>
      </div>

      <div className="flex-1 bg-[#171f3366] backdrop-blur-md border border-[#ae88831a] rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0b1326]/90 backdrop-blur-sm z-10">
              <tr className="border-b border-[#ae88830d]">
                <th className="px-6 py-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Thumbnail</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Title & Content</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Author</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40">Type/Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#e7bdb8] uppercase tracking-widest opacity-40 text-right">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ae88830d]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-[#e7bdb8] opacity-50">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    Loading posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-[#e7bdb8] opacity-50 italic">
                    No posts have been published yet.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {posts.map(post => (
                    <motion.tr 
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-6 py-4 w-32">
                        <div className="w-24 h-16 bg-[#0b1326] rounded-xl overflow-hidden relative border border-white/5">
                          {post.thumbnail ? (
                            <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                          ) : post.type === 'VIDEO' || post.videoUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/50 text-white/50">
                              <PlayCircle size={20} />
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-[#131b2e] text-white/20">
                              <FileText size={20} />
                            </div>
                          )}
                          {post.type === 'VIDEO' && post.videoDuration && (
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {post.videoDuration}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{post.title}</h4>
                        <p className="text-xs text-[#e7bdb8] opacity-60 line-clamp-2">{post.subtitle || post.content}</p>
                        {post.isTrending && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded-sm uppercase tracking-wider border border-yellow-500/20">
                            Trending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm border border-red-500/20">
                            {(post.User?.username || post.User?.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-white/90 font-medium">{post.User?.username || 'Unknown'}</span>
                            <span className="text-[10px] text-[#e7bdb8] opacity-50">{post.User?.email || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/5 text-[#e7bdb8]/80 uppercase tracking-widest border border-white/5">
                            {post.type || 'NEWS'}
                          </span>
                          {post.category && (
                            <span className="text-xs text-[#e7bdb8]/50 capitalize">{post.category.toLowerCase()}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1 text-[#e7bdb8] opacity-60">
                          <div className="flex items-center gap-1 text-sm text-white/80">
                            <Clock size={12} />
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                          <span className="text-xs">{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Posts;
