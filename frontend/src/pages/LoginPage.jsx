import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Recycle, ArrowRight, Info, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Preserved destination from route protection redirect
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSignIn = (e) => {
    e.preventDefault();
    setError('');

    try {
      login(email, password);
      // Return user to their original requested destination
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-offwhite">
      <div className="max-w-md w-full space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest flex items-center justify-center text-white">
              <Recycle className="w-4 h-4 text-mintEco" />
            </div>
            <span className="text-xl font-bold tracking-tight text-charcoal">
              EcoCycle
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-charcoal tracking-tight">
            Sign in to your account
          </h2>
          <p className="text-xs text-gray-500">
            Access your private e-waste declarations, active dispatches, and certificates
          </p>
        </div>

        {/* Redirect Notice if user was stopped by route guard */}
        {location.state?.from && (
          <div className="p-3.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Authentication required to access <strong>{from}</strong>. Please sign in to continue.
            </span>
          </div>
        )}

        {/* Honest Prototype Notice */}
        <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <strong>Simulated Prototype Authentication:</strong> Sessions are managed client-side in browser storage without backend credentials or a database. Personal requests are scoped strictly to your entered email.
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@university.edu"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">
                  Password *
                </label>
                <span className="text-[11px] text-gray-400">
                  Any demo password
                </span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-white bg-forest hover:bg-forest-900 transition-colors shadow-sm"
            >
              <span>Sign in &amp; continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-forest font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
