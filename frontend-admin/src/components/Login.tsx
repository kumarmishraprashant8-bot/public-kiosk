import { useState } from 'react';

interface LoginProps {
  onLogin: (password: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    if (password === 'admin123') {
      localStorage.setItem('admin_authenticated', 'true');
      onLogin(password);
    } else {
      setError('Invalid password. Demo password: admin123');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-accent flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-4xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CivicPulse</h1>
          <p className="text-white/60">Admin Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-lg"
                placeholder="Enter admin password"
                autoFocus
                aria-describedby={error ? 'password-error' : undefined}
              />
              {error && (
                <p id="password-error" className="mt-2 text-sm text-danger flex items-center gap-1">
                  <span>⚠️</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>Sign In →</>
              )}
            </button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 p-4 bg-accent/10 rounded-xl border border-accent/20">
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium">Demo Mode:</span> Use password{' '}
              <code className="px-2 py-0.5 bg-gray-100 rounded text-primary font-mono">
                admin123
              </code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-sm mt-6">
          Smart Urban Helpdesk Kiosk System • SUVIDHA 2026
        </p>
      </div>
    </div>
  );
}
