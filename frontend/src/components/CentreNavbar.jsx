import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Menu, 
  X, 
  LogOut, 
  ExternalLink,
  PlusCircle
} from 'lucide-react';
import { useCentreAuth } from '../context/CentreAuthContext';

export default function CentreNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { centreSession, currentCentre, isCentreAuthenticated, logoutCentre } = useCentreAuth();

  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleOpenSignOutModal = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    setMobileMenuOpen(false);
    logoutCentre();
    navigate('/centre/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#101010] border-b border-gray-200 dark:border-[#3A3E43] shadow-xs transition-colors">
      {/* Top Banner Notice */}
      <div className="bg-[#F5F5F5] dark:bg-[#0A0A0A] text-[#171717] dark:text-[#F5F5F5] text-[11px] py-1 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-[#E3E5E8] dark:border-[#3A3E43]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F45D16] dark:bg-[#FF7028] animate-pulse"></span>
          <span><strong>Recycling Facility Portal:</strong> Managing intake inspection, appointments &amp; material recovery</span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-[#F45D16] dark:text-[#FF7028] hover:underline inline-flex items-center gap-1 font-medium"
          >
            <span>Customer Website</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Brand + Active Facility Selector (when authenticated) */}
          <div className="flex items-center gap-6">
            <Link 
              to={isCentreAuthenticated ? "/centre/dashboard" : "/centre/login"} 
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-forest dark:bg-[#FF7028] text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] leading-none">
                  EcoCycle
                </span>
                <span className="text-[10px] uppercase font-bold text-forest dark:text-[#FF7028] tracking-wider mt-0.5">
                  Centre Operations
                </span>
              </div>
            </Link>

            {/* Non-interactive Authenticated Facility Identity Badge */}
            {isCentreAuthenticated && currentCentre && (
              <div 
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#3A3E43] bg-gray-50/70 dark:bg-[#202326] text-xs font-semibold text-charcoal dark:text-[#F5F5F5]"
                data-testid="centre-identity-badge"
              >
                <span className="w-2 h-2 rounded-full bg-forest dark:bg-[#FF7028] shrink-0" />
                <span className="truncate max-w-[200px]" title={currentCentre.name}>
                  {currentCentre.name}
                </span>
              </div>
            )}

            {/* Navigation Links (Only shown when authenticated) */}
            {isCentreAuthenticated && (
              <nav className="hidden md:flex items-center gap-5">
                <Link
                  to="/"
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive('/')
                      ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5'
                      : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/centre/dashboard"
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive('/centre/dashboard')
                      ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5'
                      : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/centre/requests"
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive('/centre/requests')
                      ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5'
                      : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                  }`}
                >
                  Requests
                </Link>
                <Link
                  to="/centre/appointments"
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive('/centre/appointments')
                      ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5'
                      : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                  }`}
                >
                  Appointments
                </Link>
                <Link
                  to="/centre/settings"
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive('/centre/settings') || isActive('/centre/profile')
                      ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5'
                      : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                  }`}
                >
                  Facility Settings
                </Link>
              </nav>
            )}
          </div>

          {/* Right: Authenticated Staff Info & Sign Out OR Unauthenticated Links */}
          <div className="hidden md:flex items-center gap-3">
            {isCentreAuthenticated ? (
              <>
                <div className="text-right">
                  <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">{centreSession?.staffName || 'Facility Staff'}</div>
                  <div className="text-[10px] text-gray-500 dark:text-[#B8BDC3]">{centreSession?.staffRole || 'Operations'}</div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenSignOutModal}
                  title="Sign out of facility session"
                  className="p-2 text-gray-500 dark:text-[#B8BDC3] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="text-xs font-medium text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] flex items-center gap-1 transition-colors px-2.5 py-1.5"
                >
                  <span>Customer Website</span>
                  <ExternalLink className="w-3 h-3 text-gray-400 dark:text-[#B8BDC3]" />
                </Link>
                <Link
                  to="/centre/login"
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                    isActive('/centre/login')
                      ? 'text-forest dark:text-[#FF7028] bg-forest-50 dark:bg-[#202326]'
                      : 'text-gray-700 dark:text-[#B8BDC3] hover:text-forest dark:hover:text-[#FF7028] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/centre/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-forest dark:bg-[#FF7028] text-white hover:bg-forest-900 dark:hover:bg-[#F45D16] text-xs font-semibold transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Facility</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326] focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#101010] px-4 pt-3 pb-5 space-y-3">
          {isCentreAuthenticated ? (
            <>
              <div className="p-3 bg-forest-50 dark:bg-[#202326] rounded-lg text-xs space-y-1">
                <div className="font-bold text-forest dark:text-[#FF7028]">{currentCentre?.name}</div>
                <div className="text-gray-600 dark:text-[#B8BDC3]">{centreSession?.staffName} ({centreSession?.staffRole})</div>
              </div>

              <nav className="flex flex-col space-y-1 pt-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/') ? 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/centre/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/centre/dashboard') ? 'bg-forest dark:bg-[#FF7028] text-white' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/centre/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/centre/requests') ? 'bg-forest dark:bg-[#FF7028] text-white' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Requests
                </Link>
                <Link
                  to="/centre/appointments"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/centre/appointments') ? 'bg-forest dark:bg-[#FF7028] text-white' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Appointments
                </Link>
                <Link
                  to="/centre/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/centre/settings') || isActive('/centre/profile') ? 'bg-forest dark:bg-[#FF7028] text-white' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Facility Settings
                </Link>
                <Link
                  to="/centre/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-forest dark:text-[#FF7028] hover:bg-forest-50 dark:hover:bg-[#202326]"
                >
                  + Register Another Facility
                </Link>
              </nav>

              <div className="pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenSignOutModal();
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/centre/login"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-semibold ${
                  isActive('/centre/login') ? 'bg-forest dark:bg-[#FF7028] text-white' : 'text-gray-800 dark:text-[#F5F5F5] hover:bg-gray-50 dark:hover:bg-[#202326]'
                }`}
              >
                Facility Sign In
              </Link>
              <Link
                to="/centre/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-semibold text-forest dark:text-[#FF7028] bg-forest-50 dark:bg-[#202326] hover:bg-forest-100 dark:hover:bg-[#292D31]"
              >
                Register New Facility
              </Link>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]"
              >
                Customer Website →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: Centre Navbar Sign Out Confirmation Dialog ── */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-charcoal dark:text-[#F5F5F5]">
              <LogOut className="w-5 h-5 text-forest dark:text-[#FF7028] shrink-0" />
              <h3 className="text-base font-bold">
                Sign Out of Facility Console
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to sign out of the facility operations console for <strong>{currentCentre?.name || 'this facility'}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
