import React, { useState } from 'react';
import { LogIn, ShieldAlert, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

interface Props {
  onLogin: (success: boolean) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Authenticate via Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!authData.user) {
        setError('Login failed. Please try again.');
        return;
      }

      // Verify user has admin role in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setError('Failed to verify account role.');
        await supabase.auth.signOut();
        return;
      }

      if (profile.role !== 'admin') {
        setError('Access denied. This portal is for administrators only.');
        await supabase.auth.signOut();
        return;
      }

      // Store admin info for UI display
      localStorage.setItem('adminUser', JSON.stringify({
        id: authData.user.id,
        username: profile.full_name || 'Admin',
        email: authData.user.email,
        role: 'admin',
      }));

      onLogin(true);
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b1326] text-[#dae2fd]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-morphism w-full max-w-md p-10 rounded-2xl shadow-2xl border-[#ae88831a]"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-[#E31E24] to-[#93000d] rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-red-900/40 border border-white/10">
            <ShieldAlert size={40} color="white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">OMH Sentinel</h1>
          <p className="text-[10px] font-bold text-[#e7bdb8] uppercase tracking-[0.2em] opacity-60">Enterprise Control Center</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">Email Address</label>
            <input 
              type="email" 
              className="input-field"
              placeholder="admin@ohmyhindustan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">Password</label>
            <input 
              type="password" 
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            className="btn-primary w-full text-lg disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <LogIn size={20} />}
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-sm text-[#94A3B8]">
            Authorized personnel only. All activities are monitored.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
