import { useState } from 'react';
import { FileText } from 'lucide-react';
import './AuthScreen.css';

export default function AuthScreen({ onAuth, isLogin, onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth({
      name: name || email.split('@')[0],
      email,
      plan: 'Pro',
    });
  };

  return (
    <div className="auth">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <FileText size={22} color="#fff" />
          </div>
          <h1 className="auth-title">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Log in to your DocPull account'
              : 'Start extracting invoice data for free'}
          </p>
        </div>

        <div className="card auth-card">
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
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              {isLogin ? 'Log In' : 'Create Account'}
            </button>
          </form>

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
