import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../lib/adminService';
import { Bell, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial notifications (using recent posts as base)
    const fetchPosts = async () => {
      try {
        const posts = await adminService.getRecentPosts(20);
        // Map posts to a notification structure
        setNotifications(posts.map(post => ({
          id: post.id,
          title: 'New Post Published',
          message: `${post.User?.username || post.User?.email || 'A creator'} published a new ${post.type.toLowerCase()} post: "${post.title}"`,
          date: post.createdAt,
          type: post.type,
          isNew: false
        })));
      } catch (error) {
        console.error('Error fetching posts for notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Subscribe to new posts being inserted in real-time
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Post' }, async (payload) => {
        const newPost = payload.new as any;
        
        // Fetch author details since they aren't fully embedded in the insert payload
        let username = 'A creator';
        try {
          const { data: user } = await supabase
            .from('User')
            .select('username, email')
            .eq('id', newPost.authorId)
            .single();
          
          if (user) {
            username = user.username || user.email;
          }
        } catch (err) {
          console.error("Could not fetch author details for real-time post", err);
        }

        const newNotification = {
          id: newPost.id,
          title: 'New Post Published',
          message: `${username} published a new ${newPost.type?.toLowerCase() || 'content'} post: "${newPost.title}"`,
          date: newPost.createdAt || new Date().toISOString(),
          type: newPost.type || 'NEWS',
          isNew: true
        };

        setNotifications(prev => [newNotification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#e7bdb8] opacity-60">
        <p className="text-xl italic">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Bell className="text-[#E31E24]" />
          Live Notifications
        </h1>
        <p className="text-[#e7bdb8] opacity-60">Real-time alerts for creator activity and new content publications.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-4">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <p className="text-center text-[#e7bdb8] opacity-50 italic py-10">No notifications yet.</p>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${notif.isNew ? 'bg-[#E31E24]/10 border-[#E31E24]/30' : 'bg-[#171f3366] border-[#ae88831a]'} backdrop-blur-md flex items-start gap-4 transition-colors`}
              >
                <div className={`p-3 rounded-xl ${notif.isNew ? 'bg-[#E31E24] text-white' : 'bg-white/5 text-[#E31E24]'}`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-white font-bold text-lg">
                      {notif.title}
                      {notif.isNew && <span className="ml-3 text-[10px] bg-[#E31E24] text-white px-2 py-0.5 rounded-full font-bold uppercase">New</span>}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-[#e7bdb8] opacity-50">
                      <Clock size={12} />
                      {new Date(notif.date).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-[#e7bdb8] opacity-80 mb-3">{notif.message}</p>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/5 text-[#e7bdb8]/60 uppercase tracking-wider border border-white/5">
                    {notif.type}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Notifications;
