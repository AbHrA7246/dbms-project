import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, AlertCircle, PlusCircle, Info, ShieldCheck } from 'lucide-react';
import { useCentreAuth } from '../../context/CentreAuthContext';

export default function CentreLoginPage() {
  const { centresList, loginCentre, isCentreAuthenticated, currentCentre, logoutCentre } = useCentreAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preserved destination from route protection redirect; defaults to homepage after login
  const from = location.state?.from?.pathname || '/';

  const handleFacilityQuickSelect = (e) => {
    const selectedEmail = e.target.value;
    setEmail(selectedEmail);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Official facility contact email is required.');
      return;
    }

    if (!password) {
      setError('Account password is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      loginCentre(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to authenticate facility staff.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-offwhite dark:bg-[#0A0A0A] page-enter">
      <div className="max-w-md w-full space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43] shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
            <span>Recycling Centre Operations Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
            Facility Staff Sign-in
          </h1>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
            Intake inspection, appointment scheduling, and recycling certification
          </p>
        </div>

        {/* Facility Deletion feedback banner */}
        {new URLSearchParams(location.search).get('deleted') === 'centre' && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Facility Permanently Deregistered</p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-400 leading-relaxed">
                The recycling facility account, capacity configuration, and operational records have been permanently deleted from this device.
              </p>
            </div>
          </div>
        )}

        {/* Redirect Notice if stopped by route protection */}
        {location.state?.from && (
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs flex items-center gap-2.5 shadow-xs">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Authentication required to access <strong>{from}</strong>. Please sign in with your facility credentials.
            </span>
          </div>
        )}

        {/* If already authenticated, show convenient session status */}
        {isCentreAuthenticated && currentCentre && (
          <div className="p-4 rounded-xl bg-[#FFF3EB] dark:bg-[#202326] border border-[#FFE6D5] dark:border-[#3A3E43] text-charcoal dark:text-[#F5F5F5] text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#F45D16] dark:text-[#FF7028] shrink-0" />
              <span>Signed in as <strong>{currentCentre.name}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/centre/dashboard')}
                className="font-bold underline text-[#F45D16] dark:text-[#FF7028] hover:text-[#D94B0B] dark:hover:text-[#F45D16]"
              >
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span>{error}</span>
              {error.toLowerCase().includes('no registered') && (
                <div className="mt-1">
                  <Link to="/centre/register" className="font-bold text-red-900 dark:text-red-300 underline">
                    Register your facility here →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sign-in Form Card (Always renders, regardless of facility count) */}
        <div className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Optional Facility Quick-Select (Only shown when facilities are registered) */}
            {centresList.length > 0 && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3]">
                  Select Registered Facility (Quick Fill)
                </label>
                <select
                  value={email}
                  onChange={handleFacilityQuickSelect}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
                >
                  <option value="" className="dark:bg-[#202326]">-- Choose facility or type email below --</option>
                  {centresList.map((c) => (
                    <option key={c.id} value={c.email} className="dark:bg-[#202326]">
                      {c.name} — {c.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Official Facility Email Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3]">
                Official Facility Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@facility-domain.org"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3]">
                Account Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary text-sm py-2.5 font-semibold shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <span>Open Facility Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Prominent Register Facility CTA (Requirement 2) */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gray-600 dark:text-[#B8BDC3]">Need to onboard your recycling facility?</span>
            <Link
              to="/centre/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-forest dark:bg-[#FF7028] text-white hover:bg-forest-900 dark:hover:bg-[#F45D16] text-xs font-semibold transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Facility</span>
            </Link>
          </div>

          <div className="text-center pt-1 border-t border-gray-50 dark:border-[#3A3E43]/60">
            <Link
              to="/"
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] underline"
            >
              ← Return to Customer Website
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
