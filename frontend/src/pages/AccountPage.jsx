import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, CheckCircle2, Trash2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user, logout, updateUserProfile, clearUserRequests } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [userType, setUserType] = useState(user?.userType || 'Individual Resident');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleUpdate = (e) => {
    e.preventDefault();
    updateUserProfile({ name, userType });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const handleClearData = () => {
    if (user && window.confirm('Clear all your locally saved e-waste requests? This will reset your dashboard to empty state.')) {
      clearUserRequests();
      navigate('/dashboard');
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8 page-enter">

      {/* Header */}
      <div className="pb-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
            Account Settings
          </h1>
          <p className="text-sm text-gray-600">
            Manage your personal profile and client-side persistence options.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-gray-300 text-charcoal hover:bg-gray-50 text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5 text-gray-500" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Saved banner */}
      {savedNotice && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes updated successfully.</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
        <h2 className="text-base font-bold text-charcoal pb-2 border-b border-gray-100 flex items-center gap-2">
          <User className="w-4 h-4 text-forest" />
          <span>Personal Information</span>
        </h2>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email Address (Account Identifier)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Used to associate your manually submitted requests in browser localStorage.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Account Affiliation
            </label>
            <select
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-forest focus:border-forest"
            >
              <option value="Individual Resident">Individual Resident</option>
              <option value="Student / Faculty">Student / Faculty</option>
              <option value="Department / Lab">Academic Department / Lab</option>
              <option value="Commercial Business">Commercial Business</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary text-xs px-5 py-2.5 font-semibold shadow-sm"
          >
            Save Profile Changes
          </button>
        </form>
      </div>

      {/* Temporary Persistence & Data Controls */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-charcoal pb-2 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-forest" />
          <span>Storage Persistence Controls</span>
        </h2>

        <p className="text-xs text-gray-600 leading-relaxed">
          Your e-waste dispatches are stored locally in your browser. All records originate strictly from your form submissions.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleClearData}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear My Saved Requests</span>
          </button>
        </div>
      </div>

    </div>
  );
}
