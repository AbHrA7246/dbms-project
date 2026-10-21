import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Recycle, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'Individual Resident',
  });
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError('');

    try {
      signup(formData);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create account.');
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
            Create an account
          </h2>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3]">
            Register for private e-waste declarations and personal manifest tracking
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Signup Form Card */}
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-lg p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Alex Morgan"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="alex@university.edu"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Account Type
              </label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              >
                <option value="Individual Resident" className="dark:bg-[#202326]">Individual Resident</option>
                <option value="Student / Faculty" className="dark:bg-[#202326]">Student / Faculty</option>
                <option value="Department / Lab" className="dark:bg-[#202326]">Academic Department / Lab</option>
                <option value="Commercial Business" className="dark:bg-[#202326]">Commercial Business</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-[#F5F5F5] mb-1">
                Create Password *
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-white bg-forest hover:bg-forest-900 dark:bg-[#FF7028] dark:hover:bg-[#F45D16] transition-colors shadow-sm"
            >
              <span>Create account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#3A3E43] text-center text-xs text-gray-500 dark:text-[#B8BDC3]">
            Already have an account?{' '}
            <Link to="/login" className="text-forest dark:text-[#FF7028] font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

