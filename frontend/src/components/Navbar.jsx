import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Recycle, 
  Menu, 
  X, 
  User, 
  LogOut, 
  PlusCircle, 
  Building2, 
  Settings, 
  ChevronDown, 
  Calendar, 
  ClipboardList, 
  Home, 
  MapPin, 
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCentreAuth } from '../context/CentreAuthContext';
import { useDirectory } from '../context/DirectoryContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuth();
  const { isCentreAuthenticated, currentCentre } = useCentreAuth();
  const { openDirectory, isDirectoryOpen } = useDirectory();

  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleOpenCustomerSignOut = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  // Generate user avatar initials or letter
  const userInitials = (user?.name || user?.email || 'U').trim().slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#101010] border-b border-gray-200 dark:border-[#3A3E43] shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-forest dark:bg-[#FF7028] flex items-center justify-center text-white shadow-xs group-hover:bg-forest-900 dark:group-hover:bg-[#F45D16] transition-colors">
                <Recycle className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-charcoal dark:text-[#F5F5F5] leading-none">
                  EcoCycle
                </span>
                <span className="text-[10px] text-gray-500 dark:text-[#B8BDC3] font-medium tracking-wide">
                  E-Waste Recovery Network
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-5">
              {/* Common Home Link for everyone */}
              <Link
                to="/"
                className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive('/') ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                }`}
              >
                Home
              </Link>

              {isAuthenticated ? (
                /* Authenticated Customer Navigation */
                <>
                  <Link
                    to="/dashboard"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/dashboard') ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/register"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/register') ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    Register Item
                  </Link>
                  <Link
                    to="/centers"
                    onClick={(e) => {
                      e.preventDefault();
                      openDirectory('Dashboard');
                    }}
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isDirectoryOpen || isActive('/centers') ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    Centres Directory
                  </Link>
                  <Link
                    to="/requests"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/requests') ? 'text-forest dark:text-[#FF7028] font-bold border-b-2 border-forest dark:border-[#FF7028] pb-0.5' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    My Requests
                  </Link>
                </>
              ) : (
                /* Public Informational Navigation */
                <>
                  <Link
                    to="/centers"
                    onClick={(e) => {
                      e.preventDefault();
                      openDirectory('Home Overview');
                    }}
                    className={`text-sm font-medium transition-colors ${
                      isDirectoryOpen || isActive('/centers') ? 'text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    Centres Directory
                  </Link>
                  <Link
                    to="/how-it-works"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/how-it-works') ? 'text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    How it works
                  </Link>
                  <Link
                    to="/about"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/about') ? 'text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    About
                  </Link>
                  <Link
                    to="/contact"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/contact') ? 'text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]'
                    }`}
                  >
                    Contact
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              /* Customer Identity & Dropdown */
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Link
                    to="/settings"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                      isActive('/settings') || isActive('/account')
                        ? 'border-forest bg-forest-50 dark:bg-[#202326] dark:border-[#FF7028] text-forest dark:text-[#FF7028]'
                        : 'border-gray-200 dark:border-[#3A3E43] text-charcoal dark:text-[#F5F5F5] hover:bg-gray-50 dark:hover:bg-[#202326]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-forest dark:bg-[#FF7028] text-white flex items-center justify-center text-[10px] font-bold">
                      {userInitials}
                    </div>
                    <span className="text-xs font-semibold">{user?.name}</span>
                    <Settings className="w-3.5 h-3.5 text-gray-400 dark:text-[#B8BDC3]" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleOpenCustomerSignOut}
                    title="Sign out of customer account"
                    className="p-2 text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326] rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Public Visitor Actions */
              <>
                <Link
                  to="/centre/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-forest-200 dark:border-[#3A3E43] text-forest dark:text-[#FF7028] text-xs font-semibold bg-forest-50/70 dark:bg-[#202326] hover:bg-forest-100 dark:hover:bg-[#292D31] transition-colors"
                  title="Access Recycling Facility Operations Portal"
                >
                  <Building2 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                  <span>Centre Portal</span>
                </Link>

                <Link
                  to="/login"
                  className="text-sm font-medium text-charcoal dark:text-[#F5F5F5] hover:text-forest dark:hover:text-[#FF7028] px-3 py-1.5 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="bg-forest dark:bg-[#FF7028] text-white hover:bg-forest-900 dark:hover:bg-[#F45D16] text-sm font-semibold px-4 py-2 rounded-md transition-colors shadow-xs"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] hover:bg-gray-100 dark:hover:bg-[#202326] focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#101010] px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/') ? 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
              }`}
            >
              Home
            </Link>

            {isAuthenticated ? (
              /* Customer Mobile Links */
              <>
                <div className="px-3 py-2 bg-forest-50 dark:bg-[#202326] rounded-md text-xs font-medium text-forest-800 dark:text-[#FF7028] flex items-center justify-between mb-2">
                  <span>Signed in as <strong>{user?.name}</strong></span>
                  <span className="text-[10px] text-gray-500 dark:text-[#B8BDC3]">{user?.userType}</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/dashboard') ? 'bg-forest dark:bg-[#FF7028] text-white font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/register') ? 'bg-forest dark:bg-[#FF7028] text-white font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Register Item
                </Link>
                <Link
                  to="/centers"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    openDirectory('Dashboard');
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isDirectoryOpen || isActive('/centers') ? 'bg-forest dark:bg-[#FF7028] text-white font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Centres Directory
                </Link>
                <Link
                  to="/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/requests') ? 'bg-forest dark:bg-[#FF7028] text-white font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  My Requests
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/settings') || isActive('/account') ? 'bg-forest dark:bg-[#FF7028] text-white font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Account Settings
                </Link>
              </>
            ) : (
              /* Public Mobile Links */
              <>
                <Link
                  to="/centers"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    openDirectory('Home Overview');
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isDirectoryOpen || isActive('/centers') ? 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Centres Directory
                </Link>
                <Link
                  to="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/how-it-works') ? 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  How it works
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/about') ? 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/contact') ? 'bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] font-semibold' : 'text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]'
                  }`}
                >
                  Contact
                </Link>
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-gray-200 dark:border-[#3A3E43] flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleOpenCustomerSignOut}
                className="w-full text-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  to={isCentreAuthenticated ? "/centre/dashboard" : "/centre/login"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 text-xs font-semibold text-forest dark:text-[#FF7028] bg-forest-50 dark:bg-[#202326] border border-forest-200 dark:border-[#3A3E43] rounded-md flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isCentreAuthenticated ? (currentCentre?.name ? `Facility: ${currentCentre.name}` : 'Centre Portal') : 'Recycling Centre Portal'}</span>
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-charcoal dark:text-[#F5F5F5] border border-gray-300 dark:border-[#3A3E43] rounded-md hover:bg-gray-50 dark:hover:bg-[#202326]"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-forest dark:bg-[#FF7028] rounded-md hover:bg-forest-900 dark:hover:bg-[#F45D16] shadow-xs"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Navbar Sign Out Confirmation Dialog ── */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-charcoal dark:text-[#F5F5F5]">
              <LogOut className="w-5 h-5 text-forest dark:text-[#FF7028] shrink-0" />
              <h3 className="text-base font-bold">
                Sign Out of Customer Account
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to sign out of your customer account?
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
