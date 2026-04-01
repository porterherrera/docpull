import { useState } from 'react';
import { FileText, Check, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import './AuthScreen.css';

export default function AuthScreen({ onAuth, isLogin, onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onAuth(data.user);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          onAuth(data.user);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setSocialLoading(provider);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Redirect happens automatically
    } catch (err) {
      setError(err.message);
      setSocialLoading(null);
    }
  };

  return (
    <div className="auth">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <FileText size={22} color="#fff" />
          </div>
          <h1 className="auth-title">
            {isLogin ? 'Welcome back' : 'Try your first extraction free'}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Log in to your DocPull account'
              : 'Create an account to get 3 free extractions — see the magic before you pay a cent.'}
          </p>
        </div>

        <div className="card auth-card">
          {!isLogin && (
            <div className="auth-demo-badge">
              <Check size={14} /> 3 free extractions included — no credit card needed
            </div>
          )}

          {error && (
            <div className="auth-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="social-buttons">
            <button
              className="btn social-btn google"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </button>

            <button
              className="btn social-btn facebook"
              onClick={() => handleSocialLogin('facebook')}
              disabled={socialLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {socialLoading === 'facebook' ? 'Connecting...' : 'Continue with Facebook'}
            </button>
          </div>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="auth-field">
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Porter Herrera"
                />
              </div>
            )}
            <div className="auth-field">
              <label className="label">Email</label>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="auth-field" style={{ marginBottom: 24 }}>
              <label className="label">Password</label>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account & Try Free'}
            </button>
          </form>

          {!isLogin && (
            <div className="auth-guarantee">
              <Shield size={13} /> 30-day money-back guarantee on all paid plans
            </div>
          )}

          <div className="auth-toggle">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span className="auth-toggle-link" onClick={onToggle}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
