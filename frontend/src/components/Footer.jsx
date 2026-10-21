import React from 'react';
import { Link } from 'react-router-dom';
import { Recycle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDirectory } from '../context/DirectoryContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuth();
  const { openDirectory } = useDirectory();

  return (
    <footer className="bg-white dark:bg-[#101010] border-t border-gray-200 dark:border-[#3A3E43] mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-forest flex items-center justify-center text-white">
                <Recycle className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                EcoCycle
              </span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-[#B8BDC3] max-w-sm leading-relaxed">
              E-Waste Management &amp; Recycling Optimization System. Enabling responsible electronic disposal, certified regional collection, and circular material recovery.
            </p>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Certified Regional Intake &amp; Circular Refining
            </p>
          </div>

          {/* Public Information Links */}
          <div>
            <h4 className="text-xs font-semibold text-charcoal dark:text-[#F5F5F5] uppercase tracking-wider mb-3">
              Information
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-[#B8BDC3]">
              <li>
                <Link to="/" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                  About EcoCycle
                </Link>
              </li>
              <li>
                <Link
                  to="/centers"
                  onClick={(e) => {
                    e.preventDefault();
                    openDirectory(isAuthenticated ? 'Dashboard' : 'Home Overview');
                  }}
                  className="hover:text-forest dark:hover:text-[#FF7028] transition-colors"
                >
                  Centres Directory
                </Link>
              </li>
              <li>
                <Link to="/accepted-waste" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                  Accepted Waste
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Application Portal Links */}
          <div>
            <h4 className="text-xs font-semibold text-charcoal dark:text-[#F5F5F5] uppercase tracking-wider mb-3">
              Application Portal
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-[#B8BDC3]">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/dashboard" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                      Personal Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                      Register E-Waste
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/centers"
                      onClick={(e) => {
                        e.preventDefault();
                        openDirectory('Personal Dashboard');
                      }}
                      className="hover:text-forest dark:hover:text-[#FF7028] transition-colors"
                    >
                      Centres Directory
                    </Link>
                  </li>
                  <li>
                    <Link to="/requests" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                      Track My Requests
                    </Link>
                  </li>
                  <li>
                    <Link to="/account" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                      Account Settings
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                      Sign in to Portal
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="hover:text-forest dark:hover:text-[#FF7028] transition-colors">
                      Create an Account
                    </Link>
                  </li>
                  <li>
                    <span className="text-xs text-gray-400 dark:text-[#B8BDC3] block pt-1">
                      (Sign in required for declaration &amp; tracking)
                    </span>
                  </li>
                </>
              )}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-[#3A3E43] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-[#B8BDC3]">
          <p>© {currentYear} EcoCycle E-Waste Management &amp; Recycling Optimization System.</p>
          <div className="flex items-center gap-6">
            <span>Sustainable Technology</span>
            <span>Zero-Landfill Initiative</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
