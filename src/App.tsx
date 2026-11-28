import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { ToastProvider } from './context/ToastContext';
import { ConfirmModalProvider } from './context/ConfirmModalContext';
import { clearMemCache } from './lib/cache';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount and refresh if near expiry
    const checkSession = async () => {
      try {
        let { data: { session } } = await supabase.auth.getSession();
        const expiresAtMs = (session?.expires_at || 0) * 1000;
        if (session?.access_token && expiresAtMs && expiresAtMs <= Date.now() + 60_000) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed.session;
        }

        if (session?.user) {
          const { data: profile } = await supabase
            .from('User')
            .select('role, account_status')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role === 'ADMIN' && (profile?.account_status || 'active') === 'active') {
            setIsLoggedIn(true);
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('[Admin Auth] Session check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
          clearMemCache();
          setIsLoggedIn(false);
          localStorage.removeItem('adminUser');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearMemCache();
    localStorage.removeItem('adminUser');
    setIsLoggedIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F5F5F7]">
        <img src="/logo-postsapp-light.png" alt="PostsApp" className="h-10 object-contain" />
        <div className="animate-pulse text-gray-700 text-sm font-semibold tracking-wide">Loading PostsApp Admin...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ConfirmModalProvider>
        <div className="app-container">
          {isLoggedIn ? (
            <Dashboard onLogout={handleLogout} />
          ) : (
            <LoginPage onLogin={(success) => setIsLoggedIn(success)} />
          )}
        </div>
      </ConfirmModalProvider>
    </ToastProvider>
  );
}

export default App;
