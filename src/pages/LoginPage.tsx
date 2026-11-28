import React, { useState } from 'react';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { AuthIllustration } from '../components/AuthIllustrations';

interface Props {
  onLogin: (success: boolean) => void;
}

const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        .from('User')
        .select('role, username')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Failed to verify account role.');
        await supabase.auth.signOut();
        return;
      }

      if (profile.role !== 'ADMIN') {
        setError('Access denied. This portal is for administrators only.');
        await supabase.auth.signOut();
        return;
      }

      // Store admin info for UI display
      localStorage.setItem('adminUser', JSON.stringify({
        id: authData.user.id,
        username: profile.username || authData.user.email?.split('@')[0] || 'Admin',
        email: authData.user.email,
        role: 'ADMIN',
      }));

      onLogin(true);
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col items-center justify-center p-6 font-sans selection:bg-red-100 selection:text-[#D4191F]">
      <div className="max-w-6xl w-full flex flex-col items-center justify-center">
        {/* Centered Logo & Badge directly above card */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <img src="/logo-postsapp-light.png" alt="PostsApp" className="h-10 object-contain" />
          <span className="px-2.5 py-0.5 rounded bg-[#D4191F] text-white text-[10px] font-extrabold tracking-widest uppercase">
            ADMIN
          </span>
        </div>

        {/* Center Stage with flanking red illustrations */}
        <div className="w-full flex items-end justify-center relative">
          <div className="hidden lg:block -mr-7 -mb-2 z-0">
            <AuthIllustration side="left" />
          </div>

          <div className="w-full max-w-[420px] bg-white rounded-[20px] px-8 py-9 shadow-[0_14px_32px_rgba(15,23,42,0.06)] border border-[#E5E7EB] relative z-10">
            <div className="mb-6">
              <h1 className="text-[28px] leading-[34px] font-extrabold text-[#111827] tracking-tight mb-2">
                Admin<br />Control Center
              </h1>
              <p className="text-[13px] text-[#6B7280]">
                Verify your administrator credentials to continue
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="flex items-center bg-[#F3F4F6] border border-[#E5E7EB] focus-within:border-[#D4191F] focus-within:bg-white rounded-xl h-[52px] px-3.5 transition-colors">
                <Mail size={18} className="text-[#18181B] mr-2.5 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-[#111827] placeholder:text-[#6B7280]"
                  placeholder="admin@postsapp.com"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center bg-[#F3F4F6] border border-[#E5E7EB] focus-within:border-[#D4191F] focus-within:bg-white rounded-xl h-[52px] px-3.5 transition-colors">
                <Lock size={18} className="text-[#18181B] mr-2.5 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-[#111827] placeholder:text-[#6B7280]"
                  placeholder="Your Password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="ml-2 text-gray-500 hover:text-gray-900 p-1 rounded-md focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#D4191F] text-xs font-semibold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4191F] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] mt-1 bg-[#D4191F] hover:bg-[#9E1111] text-white rounded-xl text-[15px] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          <div className="hidden lg:block -ml-5 -mb-2 z-0">
            <AuthIllustration side="right" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
