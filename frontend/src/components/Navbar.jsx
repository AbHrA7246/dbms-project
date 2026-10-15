import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Recycle, Menu, X, User, LogOut, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleSignOut = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest flex items-center justify-center text-white">
                <Recycle className="w-4 h-4 text-mintEco" />
              </div>
              <span className="text-base font-bold tracking-tight text-charcoal">
                EcoCycle
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-5">
              {isAuthenticated ? (
                /* Authenticated Application Links */
                <>
                  <Link
                    to="/dashboard"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/dashboard') ? 'text-forest font-bold border-b-2 border-forest pb-0.5' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/register"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/register') ? 'text-forest font-bold border-b-2 border-forest pb-0.5' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    Register Item
                  </Link>
                  <Link
                    to="/centers"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/centers') ? 'text-forest font-bold border-b-2 border-forest pb-0.5' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    Centers
                  </Link>
                  <Link
                    to="/requests"
                    className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive('/requests') ? 'text-forest font-bold border-b-2 border-forest pb-0.5' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    My Requests
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    to="/how-it-works"
                    className="text-xs text-gray-500 hover:text-charcoal transition-colors"
                  >
                    Workflow
                  </Link>
                  <Link
                    to="/accepted-waste"
                    className="text-xs text-gray-500 hover:text-charcoal transition-colors"
                  >
                    Accepted Items
                  </Link>
                </>
              ) : (
                /* Public Informational Navigation */
                <>
                  <Link
                    to="/"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/') ? 'text-forest font-semibold' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/how-it-works"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/how-it-works') ? 'text-forest font-semibold' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    How it works
                  </Link>
                  <Link
                    to="/about"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/about') ? 'text-forest font-semibold' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    About
                  </Link>
                  <Link
                    to="/accepted-waste"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/accepted-waste') ? 'text-forest font-semibold' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    Accepted Waste
                  </Link>
                  <Link
                    to="/faq"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/faq') ? 'text-forest font-semibold' : 'text-gray-600 hover:text-charcoal'
                    }`}
                  >
                    FAQ
                  </Link>
                  <Link
                    to="/contact"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/contact') ? 'text-forest font-semibold' : 'text-gray-600 hover:text-charcoal'
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
              <div className="flex items-center gap-3">
                <Link
                  to="/account"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    isActive('/account') ? 'bg-forest-50 text-forest' : 'text-charcoal hover:bg-gray-100'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-forest-100 text-forest flex items-center justify-center text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span>{user?.name}</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out of prototype session"
                  className="p-2 text-gray-500 hover:text-charcoal hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-charcoal hover:text-forest px-3 py-1.5 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="bg-forest text-white hover:bg-forest-900 text-sm font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
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
              className="p-2 rounded-md text-gray-600 hover:text-charcoal hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col space-y-1">
            {isAuthenticated ? (
              /* Mobile Authenticated Links */
              <>
                <div className="px-3 py-2 bg-forest-50 rounded-md text-xs font-medium text-forest-800 flex items-center justify-between mb-2">
                  <span>Signed in as <strong>{user?.name}</strong></span>
                  <span className="text-[10px] text-gray-500">{user?.userType}</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/dashboard') ? 'bg-forest text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/register') ? 'bg-forest text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Register E-Waste
                </Link>
                <Link
                  to="/centers"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/centers') ? 'bg-forest text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Collection Centers
                </Link>
                <Link
                  to="/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/requests') ? 'bg-forest text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  My Requests
                </Link>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/account') ? 'bg-forest text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Account Settings
                </Link>
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
                  <Link
                    to="/how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-charcoal"
                  >
                    Workflow
                  </Link>
                  <Link
                    to="/accepted-waste"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-charcoal"
                  >
                    Accepted Waste
                  </Link>
                </div>
              </>
            ) : (
              /* Mobile Public Links */
              <>
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/') ? 'bg-forest-50 text-forest font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/how-it-works') ? 'bg-forest-50 text-forest font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  How it works
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/about') ? 'bg-forest-50 text-forest font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  About
                </Link>
                <Link
                  to="/accepted-waste"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/accepted-waste') ? 'bg-forest-50 text-forest font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Accepted Waste
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/faq') ? 'bg-forest-50 text-forest font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  FAQ
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/contact') ? 'bg-forest-50 text-forest font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Contact
                </Link>
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-center px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-charcoal border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 text-sm font-medium text-white bg-forest rounded-md hover:bg-forest-900"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
