import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase.js';
import LandingPage from './components/LandingPage.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [authMode, setAuthMode] = useState('signup');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
        setScreen('app');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
        setScreen('app');
      } else {
        setUser(null);
        setProfile(null);
        setScreen('landing');
      }
    });

    // Check for Stripe checkout result in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', '/');
    }

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  }

  const goToSignup = () => { setAuthMode('signup'); setScreen('auth'); };
  const goToLogin = () => { setAuthMode('login'); setScreen('auth'); };

  const handleAuth = (userData) => {
    setUser(userData);
    fetchProfile(userData.id);
    setScreen('app');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setScreen('landing');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#F7F8FA',
        fontFamily: 'Inter, system-ui, sans-serif', color: '#6B7280',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      {screen === 'landing' && (
        <LandingPage onGetStarted={goToSignup} onLogin={goToLogin} />
      )}
      {screen === 'auth' && (
        <AuthScreen
          onAuth={handleAuth}
          isLogin={authMode === 'login'}
          onToggle={() => setAuthMode((m) => (m === 'login' ? 'signup' : 'login'))}
        />
      )}
      {screen === 'app' && (
        <Dashboard
          user={user}
          profile={profile}
          onProfileUpdate={setProfile}
          onLogout={handleLogout}
          onGoLanding={() => setScreen('landing')}
        />
      )}
    </>
  );
}
