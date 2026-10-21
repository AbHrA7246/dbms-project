import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Recycle, ArrowRight, Info, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Preserved destination from route protection redirect; defaults to homepage after login
  const from = location.state?.from?.pathname || '/';

  const isAccountDeleted = new URLSearchParams(location.search).get('deleted') === 'customer';

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
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-offwhite dark:bg-[#0A0A0A] page-enter">
      <div className="max-w-md w-full space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest dark:bg-[#FF7028] flex items-center justify-center text-white">
              <Recycle className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              EcoCycle
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
            Sign in to your account
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
            Access your private e-waste declarations, active dispatches, and certificates
          </p>
        </div>

        {/* Deletion feedback banner */}
        {isAccountDeleted && (
          <div className="p-3.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Account Permanently Deleted</p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Your customer account and associated personal data have been completely erased from this device.
              </p>
            </div>
          </div>
        )}

        {/* Redirect Notice if user was stopped by route guard */}
        {location.state?.from && (
          <div className="p-3.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Authentication required to access <strong>{from}</strong>. Please sign in to continue.
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-lg p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Email address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@university.edu"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-white bg-forest hover:bg-forest-900 dark:bg-[#FF7028] dark:hover:bg-[#F45D16] transition-colors shadow-sm"
            >
              <span>Sign in &amp; continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#3A3E43] text-center text-xs text-gray-500 dark:text-[#B8BDC3]">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-forest dark:text-[#FF7028] font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
