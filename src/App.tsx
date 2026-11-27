import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { ToastProvider } from './context/ToastContext';
import './index.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Verify admin role
        const { data: profile } = await supabase
          .from('User')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role === 'ADMIN') {
          setIsLoggedIn(true);
        } else {
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          localStorage.removeItem('adminUser');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
      <div className="app-container">
        {isLoggedIn ? (
          <Dashboard onLogout={handleLogout} />
        ) : (
          <LoginPage onLogin={(success) => setIsLoggedIn(success)} />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
