import { useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [screen, setScreen] = useState('landing'); // landing | auth | app
  const [authMode, setAuthMode] = useState('signup'); // signup | login
  const [user, setUser] = useState(null);

  const goToSignup = () => { setAuthMode('signup'); setScreen('auth'); };
  const goToLogin = () => { setAuthMode('login'); setScreen('auth'); };
  const handleAuth = (userData) => { setUser(userData); setScreen('app'); };
  const handleLogout = () => { setUser(null); setScreen('landing'); };

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
          onLogout={handleLogout}
          onGoLanding={() => setScreen('landing')}
        />
      )}
    </>
  );
}
