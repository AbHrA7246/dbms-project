import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Shield,
  Bell,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  ChevronRight,
  LogOut,
  Info,
  ArrowRight,
  PackageCheck,
  Calendar,
  Sparkles,
  X,
  Sun,
  Moon,
  Monitor,
  Navigation,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeSelector from '../components/ThemeSelector';
import { geocodeAddress, formatCoordinates, isValidCoordinate, buildAddressGeocodeQuery } from '../services/geocodingService';

const AVATAR_COLORS = [
  { name: 'Vibrant Orange', bg: 'bg-[#FF7028]', text: 'text-white' },
  { name: 'Warm Charcoal', bg: 'bg-[#292D31]', text: 'text-white' },
  { name: 'Deep Amber', bg: 'bg-[#F45D16]', text: 'text-white' },
  { name: 'Charcoal Minimal', bg: 'bg-[#202326]', text: 'text-white' },
  { name: 'Dark Slate', bg: 'bg-[#101010]', text: 'text-white' },
];

export default function AccountPage() {
  const {
    user,
    logout,
    updateUserProfile,
    getUserAddresses,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
    verifyAddress,
    getUserPreferences,
    saveUserPreferences,
    updatePassword,
    clearNonEssentialCache,
    getUserRequests,
    checkDeletionEligibility,
    deleteAccount,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const validTabs = ['overview', 'personal', 'addresses', 'security', 'notifications', 'privacy'];
  const queryTab = new URLSearchParams(location.search).get('tab');
  const initialTab = queryTab && validTabs.includes(queryTab) ? queryTab : 'overview';

  // Navigation tab: 'overview' | 'personal' | 'addresses' | 'security' | 'notifications' | 'privacy'
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab');
    if (t && validTabs.includes(t)) {
      setActiveTab(t);
    }
  }, [location.search]);

  // Personal Information State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [userType, setUserType] = useState(user?.userType || 'Individual Resident');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || AVATAR_COLORS[0].bg);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Address Book State
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressCoords, setAddressCoords] = useState(null);
  const [geocodingStatus, setGeocodingStatus] = useState('idle'); // 'idle' | 'loading' | 'verified' | 'unconfigured' | 'not_found' | 'error' | 'ambiguous'
  const [geocodingFeedback, setGeocodingFeedback] = useState('');
  const [candidateMatches, setCandidateMatches] = useState([]);
  const [verifyingAddressId, setVerifyingAddressId] = useState(null);
  const [retroactiveFeedback, setRetroactiveFeedback] = useState({});
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    pickupInstructions: '',
    isDefault: false,
  });
  const [addressError, setAddressError] = useState('');
  const [addressSuccessMsg, setAddressSuccessMsg] = useState('');

  // Security & Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    appointmentConfirmations: true,
    statusUpdates: true,
    cancellationAlerts: true,
  });
  const [notifSuccessMsg, setNotifSuccessMsg] = useState('');

  // Cache & Privacy State
  const [cacheSuccessMsg, setCacheSuccessMsg] = useState('');
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteEligibility, setDeleteEligibility] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDeleteModal = () => {
    const eligibility = checkDeletionEligibility();
    setDeleteEligibility(eligibility);
    setDeleteConfirmationText('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteAccount = () => {
    if (deleteConfirmationText !== 'DELETE' || isDeleting) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      deleteAccount();
      navigate('/login?deleted=customer');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete customer account.');
      setIsDeleting(false);
    }
  };

  // Address Deletion Confirmation State
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [showDeleteAddressModal, setShowDeleteAddressModal] = useState(false);

  // Requests count for quick links
  const [userRequestsCount, setUserRequestsCount] = useState(0);

  // Sync state from auth on mount
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setUserType(user.userType || 'Individual Resident');
      setAvatarColor(user.avatarColor || AVATAR_COLORS[0].bg);
      setAddresses(getUserAddresses());
      setNotifications(getUserPreferences());
      const reqs = getUserRequests();
      setUserRequestsCount(reqs.length);
    }
  }, [user]);

  const refreshAddresses = () => {
    const list = getUserAddresses();
    setAddresses(list);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    try {
      updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        userType,
        avatarColor,
      });
      setProfileSuccessMsg('Profile information updated successfully.');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    }
  };

  const handleLookupCoordinates = async () => {
    const line = addressForm.addressLine.trim();
    if (!line || line.length < 3) {
      setGeocodingStatus('error');
      setGeocodingFeedback('Please enter address line (street/building) first.');
      return;
    }

    const fullQuery = buildAddressGeocodeQuery({
      addressLine: line,
      city: addressForm.city,
      state: addressForm.state,
      postalCode: addressForm.postalCode,
    });

    setGeocodingStatus('loading');
    setGeocodingFeedback('');
    setCandidateMatches([]);

    try {
      const res = await geocodeAddress(fullQuery, { limit: 5 });
      if (res.success && res.data) {
        if (res.isAmbiguous && res.results && res.results.length > 1) {
          setGeocodingStatus('ambiguous');
          setCandidateMatches(res.results);
          setAddressCoords(res.data);
          setGeocodingFeedback('Multiple matching locations found. Please select your specific location below.');
        } else {
          setGeocodingStatus('verified');
          setAddressCoords(res.data);
          setGeocodingFeedback(`Coordinates verified: ${formatCoordinates(res.data)}`);
        }
      } else if (res.status === 'unconfigured') {
        setGeocodingStatus('unconfigured');
        setGeocodingFeedback('Geocoding service inactive (API key unconfigured). Manual address accepted.');
      } else {
        setGeocodingStatus(res.status || 'not_found');
        setGeocodingFeedback(res.message || 'Could not verify exact coordinates. Manual address will be saved.');
      }
    } catch {
      setGeocodingStatus('error');
      setGeocodingFeedback('Geocoding lookup failed. Manual address will be saved.');
    }
  };

  const handleSelectCandidate = (candidate) => {
    setAddressCoords(candidate);
    setGeocodingStatus('verified');
    setGeocodingFeedback(`Selected: ${candidate.formattedAddress} (${formatCoordinates(candidate)})`);
    setCandidateMatches([]);
  };

  const handleRetroactiveVerify = async (addr) => {
    setVerifyingAddressId(addr.id);
    setRetroactiveFeedback((prev) => ({
      ...prev,
      [addr.id]: { status: 'loading', msg: 'Verifying location...' },
    }));
    try {
      const fullQuery = buildAddressGeocodeQuery({
        addressLine: addr.addressLine,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
      });
      const res = await geocodeAddress(fullQuery, { limit: 1 });
      if (res.success && res.data) {
        verifyAddress(addr.id, res.data);
        refreshAddresses();
        setRetroactiveFeedback((prev) => ({
          ...prev,
          [addr.id]: { status: 'success', msg: `Verified: ${formatCoordinates(res.data)}` },
        }));
      } else if (res.status === 'unconfigured') {
        setRetroactiveFeedback((prev) => ({
          ...prev,
          [addr.id]: { status: 'warning', msg: 'Geocoding API not configured.' },
        }));
      } else {
        setRetroactiveFeedback((prev) => ({
          ...prev,
          [addr.id]: { status: 'error', msg: res.message || 'Location could not be resolved.' },
        }));
      }
    } catch {
      setRetroactiveFeedback((prev) => ({
        ...prev,
        [addr.id]: { status: 'error', msg: 'Failed to verify address coordinates.' },
      }));
    } finally {
      setVerifyingAddressId(null);
      setTimeout(() => {
        setRetroactiveFeedback((prev) => {
          const next = { ...prev };
          delete next[addr.id];
          return next;
        });
      }, 5000);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressCoords(null);
    setGeocodingStatus('idle');
    setGeocodingFeedback('');
    setCandidateMatches([]);
    setAddressForm({
      label: 'Home',
      addressLine: '',
      city: '',
      state: '',
      postalCode: '',
      pickupInstructions: '',
      isDefault: addresses.length === 0,
    });
    setAddressError('');
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressCoords(addr.coordinates || null);
    setGeocodingStatus(addr.coordinates ? 'verified' : 'idle');
    setGeocodingFeedback(
      addr.coordinates ? `Coordinates: ${formatCoordinates(addr.coordinates)}` : ''
    );
    setCandidateMatches([]);
    setAddressForm({
      label: addr.label || 'Home',
      addressLine: addr.addressLine || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      pickupInstructions: addr.pickupInstructions || '',
      isDefault: addr.isDefault || false,
    });
    setAddressError('');
    setShowAddressModal(true);
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    setAddressError('');

    if (!addressForm.addressLine.trim()) {
      setAddressError('Address line is required.');
      return;
    }
    if (!addressForm.city.trim()) {
      setAddressError('City is required.');
      return;
    }

    try {
      saveAddress({
        ...(editingAddress ? { id: editingAddress.id } : {}),
        ...addressForm,
        coordinates: addressCoords,
      });
      refreshAddresses();
      setShowAddressModal(false);
      setAddressSuccessMsg(
        editingAddress ? 'Address updated successfully.' : 'New address added to your address book.'
      );
      setTimeout(() => setAddressSuccessMsg(''), 4000);
    } catch (err) {
      setAddressError(err.message || 'Failed to save address.');
    }
  };

  const handleOpenDeleteAddressModal = (addr) => {
    setAddressToDelete(addr);
    setShowDeleteAddressModal(true);
  };

  const handleConfirmDeleteAddress = () => {
    if (addressToDelete) {
      deleteAddress(addressToDelete.id);
      refreshAddresses();
      setShowDeleteAddressModal(false);
      setAddressToDelete(null);
      setAddressSuccessMsg('Address removed from address book.');
      setTimeout(() => setAddressSuccessMsg(''), 3000);
    }
  };

  const handleSetDefaultAddress = (addrId) => {
    setDefaultAddress(addrId);
    refreshAddresses();
    setAddressSuccessMsg('Default pickup address updated.');
    setTimeout(() => setAddressSuccessMsg(''), 3000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccessMsg('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccessMsg('Password updated successfully.');
      setTimeout(() => setPasswordSuccessMsg(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    }
  };

  const handleNotificationToggle = (key) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key],
    };
    setNotifications(updated);
    saveUserPreferences(updated);
    setNotifSuccessMsg('Notification preferences updated.');
    setTimeout(() => setNotifSuccessMsg(''), 3000);
  };

  const handleOpenClearCacheModal = () => {
    setShowClearCacheModal(true);
  };

  const handleConfirmClearCache = () => {
    clearNonEssentialCache();
    setShowClearCacheModal(false);
    setCacheSuccessMsg('Recent search history and form drafts cleared successfully.');
    setTimeout(() => setCacheSuccessMsg(''), 4000);
  };

  const handleOpenSignOutModal = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    logout();
    navigate('/');
  };

  const userInitials = (user?.name || user?.email || 'U').trim().slice(0, 2).toUpperCase();
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 page-enter text-charcoal dark:text-[#F5F5F5]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-[#3A3E43]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Account Settings
            </h1>
            <span className="text-xs font-mono font-medium text-gray-500 dark:text-[#B8BDC3] bg-gray-100 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] px-2 py-0.5 rounded">
              Customer Portal
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#B8BDC3] mt-1">
            Manage your personal profile, saved collection addresses, security credentials, and communication preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenSignOutModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#3A3E43] text-charcoal dark:text-[#F5F5F5] hover:bg-gray-50 dark:hover:bg-[#202326] text-xs font-semibold transition-colors self-start sm:self-auto shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5 text-gray-500 dark:text-[#B8BDC3]" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Amazon-Style Quick Jump Navigation Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'personal'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50 hover:shadow-xs'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] mb-3">
            <User className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Personal Info</h3>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">Name, contact &amp; avatar</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('addresses')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'addresses'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50 hover:shadow-xs'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] mb-3">
            <MapPin className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Address Book</h3>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">{addresses.length} saved pickup address(es)</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'security'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50 hover:shadow-xs'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] mb-3">
            <Lock className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Login &amp; Security</h3>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">Password &amp; credentials</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'notifications'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50 hover:shadow-xs'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] mb-3">
            <Bell className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Notifications</h3>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">Intake &amp; dispatch alerts</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'appearance'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50 hover:shadow-xs'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] mb-3">
            <Sun className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Appearance</h3>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">Light, dark, &amp; system</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`text-left p-4 rounded-xl border transition-all ${
            activeTab === 'privacy'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50 hover:shadow-xs'
          }`}
        >
          <div className="w-9 h-9 rounded-lg bg-forest-50 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] flex items-center justify-center text-forest dark:text-[#FF7028] mb-3">
            <Shield className="w-4 h-4 text-forest-700 dark:text-[#FF7028]" />
          </div>
          <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Data &amp; Privacy</h3>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">Cache &amp; compliance</p>
        </button>
      </div>

      {/* Global Success / Alert Banners */}
      {addressSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{addressSuccessMsg}</span>
        </div>
      )}
      {notifSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{notifSuccessMsg}</span>
        </div>
      )}
      {cacheSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{cacheSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OVERVIEW SECTION (Default Amazon-Style Summary) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Profile Overview Card */}
            <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white text-base font-bold shadow-xs`}>
                  {userInitials}
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">{user?.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-[#B8BDC3]">{user?.userType}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-[#3A3E43] text-xs space-y-1.5 text-gray-600 dark:text-[#B8BDC3]">
                <div><strong className="text-charcoal dark:text-[#F5F5F5]">Email:</strong> {user?.email}</div>
                <div><strong className="text-charcoal dark:text-[#F5F5F5]">Phone:</strong> {user?.phone || 'Not provided'}</div>
                <div><strong className="text-charcoal dark:text-[#F5F5F5]">Member Since:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className="text-xs font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline inline-flex items-center gap-1"
              >
                <span>Edit Profile</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Default Pickup Address Card */}
            <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-forest dark:text-[#FF7028]">
                  <MapPin className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Default Pickup Address</h3>
                </div>
                {defaultAddress && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF3EB] dark:bg-[#FF7028]/15 text-[#B83A05] dark:text-[#FF7028] border border-[#FFE6D5] dark:border-[#FF7028]/30">
                    Default
                  </span>
                )}
              </div>

              {defaultAddress ? (
                <div className="text-xs text-gray-600 dark:text-[#B8BDC3] space-y-1">
                  <div className="font-semibold text-charcoal dark:text-[#F5F5F5]">{defaultAddress.label}</div>
                  <div>{defaultAddress.addressLine}</div>
                  <div>{defaultAddress.city}, {defaultAddress.state} {defaultAddress.postalCode}</div>
                  {defaultAddress.pickupInstructions && (
                    <div className="text-gray-500 dark:text-[#B8BDC3]/70 italic text-[11px] pt-1">
                      "{defaultAddress.pickupInstructions}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-[#B8BDC3] py-2">
                  No default pickup address configured. Add an address to speed up collection requests.
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
                <button
                  type="button"
                  onClick={() => setActiveTab('addresses')}
                  className="text-xs font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Address Book ({addresses.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Active Declarations & Requests Card */}
            <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-forest dark:text-[#FF7028]">
                <PackageCheck className="w-4 h-4" />
                <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">Your E-Waste Declarations</h3>
              </div>
              <div className="text-xs text-gray-600 dark:text-[#B8BDC3] space-y-2">
                <p>
                  You currently have <strong className="text-charcoal dark:text-[#F5F5F5]">{userRequestsCount}</strong> collection or drop-off declarations recorded in your account.
                </p>
                <div className="p-2.5 rounded-lg bg-offwhite dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-[11px] text-gray-600 dark:text-[#B8BDC3]">
                  Track 3-stage custody (Submitted &rarr; Scheduled &rarr; Received) in real time.
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between">
                <Link
                  to="/requests"
                  className="text-xs font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline inline-flex items-center gap-1"
                >
                  <span>View All Requests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold text-charcoal dark:text-[#F5F5F5] hover:text-forest dark:hover:text-[#FF7028] inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Item</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PERSONAL INFORMATION & AVATAR */}
      {/* ========================================================================= */}
      {activeTab === 'personal' && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <User className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Personal Information &amp; Profile</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
            >
              Back to Overview
            </button>
          </div>

          {profileSuccessMsg && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">

            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-2">
                Profile Avatar &amp; Theme
              </label>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full ${avatarColor} flex items-center justify-center text-white text-lg font-bold shadow-sm ring-4 ring-gray-100 dark:ring-[#202326]`}>
                  {userInitials}
                </div>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setAvatarColor(c.bg)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${
                        avatarColor === c.bg ? 'scale-125 ring-2 ring-forest dark:ring-[#FF7028] ring-offset-2' : 'hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Email (Protected Identifier) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                Account Email (Official Declaration Identifier)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-[#3A3E43] rounded-lg bg-gray-50 dark:bg-[#202326] text-gray-500 dark:text-[#B8BDC3] cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]/60 mt-1 block">
                Your email is cryptographically associated with your custody chain records. Email modification requires administrative verification.
              </span>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                Full Legal Name / Organization Contact
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 234-5678"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
              <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]/60 mt-1 block">
                Used by couriers to coordinate doorstep collections and confirm drop-off arrivals.
              </span>
            </div>

            {/* User Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                Account Classification
              </label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028] bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5]"
              >
                <option value="Individual Resident">Individual Resident / Household</option>
                <option value="Student / Faculty">Student / Academic Faculty</option>
                <option value="Department / Lab">Research Department / Laboratory</option>
                <option value="Commercial Business">Commercial Enterprise / Organization</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs"
              >
                Save Profile Changes
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADDRESS BOOK (Amazon-Inspired) */}
      {/* ========================================================================= */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200 dark:border-[#3A3E43]">
            <div>
              <h2 className="text-lg font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-forest dark:text-[#FF7028]" />
                <span>Your Addresses</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-0.5">
                Manage saved pickup addresses for seamless doorstep collection requests.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddAddress}
              className="btn-primary text-xs px-4 py-2 font-semibold shadow-xs inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Address Snapshot Policy:</strong> Changing or deleting addresses here will not alter the designated pickup location of already submitted collection requests. Historical requests remain locked to maintain chain-of-custody accuracy.
            </span>
          </div>

          {addresses.length === 0 ? (
            <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6 text-forest-700 dark:text-[#FF7028]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">No Saved Addresses Found</h3>
                <p className="text-xs text-gray-500 dark:text-[#B8BDC3] max-w-md mx-auto mt-1">
                  Save your home or office address to autofill pickup details whenever you register surplus electronic devices.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="btn-primary text-xs px-5 py-2 font-semibold"
              >
                Add Your First Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Add Address Card */}
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="border-2 border-dashed border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 hover:border-forest dark:hover:border-[#FF7028] hover:bg-forest-50/20 dark:hover:bg-[#202326] transition-colors group min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#202326] group-hover:bg-forest-100 dark:group-hover:bg-[#FF7028]/20 text-gray-500 dark:text-[#B8BDC3] group-hover:text-forest dark:group-hover:text-[#FF7028] flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-charcoal dark:text-[#F5F5F5] group-hover:text-forest dark:group-hover:text-[#FF7028] transition-colors">
                  Add Address
                </span>
                <span className="text-xs text-gray-400 dark:text-[#B8BDC3]/60">Add another pickup location</span>
              </button>

              {/* Saved Address Cards */}
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white dark:bg-[#292D31] border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-2xs relative ${
                    addr.isDefault ? 'border-forest dark:border-[#FF7028] ring-1 ring-forest/20 dark:ring-[#FF7028]/20' : 'border-gray-200 dark:border-[#3A3E43]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                        {addr.label || 'Pickup Address'}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF3EB] dark:bg-[#FF7028]/15 text-[#B83A05] dark:text-[#FF7028] border border-[#FFE6D5] dark:border-[#FF7028]/30">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-700 dark:text-[#B8BDC3] space-y-1">
                      <div className="font-semibold text-charcoal dark:text-[#F5F5F5]">{addr.addressLine}</div>
                      <div>{addr.city}, {addr.state} {addr.postalCode}</div>
                      {addr.pickupInstructions && (
                        <div className="pt-2 text-[11px] text-gray-500 dark:text-[#B8BDC3]/70 border-t border-gray-100 dark:border-[#3A3E43] italic">
                          "{addr.pickupInstructions}"
                        </div>
                      )}
                    </div>

                    {/* Geographic Coordinate Verification Status */}
                    <div className="pt-2">
                      {addr.coordinates && isValidCoordinate(addr.coordinates.latitude, addr.coordinates.longitude) ? (
                        <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Verified Location</span>
                            {addr.coordinates.precision && (
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900 font-mono">
                                {addr.coordinates.precision}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono truncate">
                            {formatCoordinates(addr.coordinates)}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
                            <span className="flex items-center gap-1 text-[11px]">
                              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Coordinates unverified</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRetroactiveVerify(addr)}
                              disabled={verifyingAddressId === addr.id}
                              className="font-semibold text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline disabled:opacity-50 text-[11px] shrink-0 ml-1.5 inline-flex items-center gap-1"
                            >
                              {verifyingAddressId === addr.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Verifying...</span>
                                </>
                              ) : (
                                <>
                                  <Navigation className="w-3 h-3" />
                                  <span>Verify Location</span>
                                </>
                              )}
                            </button>
                          </div>
                          {retroactiveFeedback[addr.id] && (
                            <div className={`text-[10px] px-1 ${
                              retroactiveFeedback[addr.id].status === 'success'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {retroactiveFeedback[addr.id].msg}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenEditAddress(addr)}
                        className="text-forest dark:text-[#FF7028] dark:hover:text-[#F45D16] hover:underline inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteAddressModal(addr)}
                        className="text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5] text-[11px]"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}

            </div>
          )}

          {/* Modal for Adding / Editing Address */}
          {showAddressModal && (
            <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
                  <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                    {editingAddress ? 'Edit Pickup Address' : 'Add New Pickup Address'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(false)}
                    className="p-1 rounded-md text-gray-400 hover:text-charcoal dark:hover:text-[#F5F5F5]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {addressError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{addressError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Address Label / Name
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      placeholder="e.g. Home, Office, Main Campus"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Address Line (Street, Building, Flat / Office #)
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.addressLine}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddressForm((prev) => ({ ...prev, addressLine: val }));
                        if (addressCoords) {
                          setAddressCoords(null);
                          setGeocodingStatus('idle');
                          setGeocodingFeedback('Address modified. Please re-verify coordinates.');
                          setCandidateMatches([]);
                        }
                      }}
                      placeholder="e.g. 104 Willow Street, Suite 3B"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={addressForm.city}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddressForm((prev) => ({ ...prev, city: val }));
                          if (addressCoords) {
                            setAddressCoords(null);
                            setGeocodingStatus('idle');
                            setGeocodingFeedback('City modified. Please re-verify coordinates.');
                            setCandidateMatches([]);
                          }
                        }}
                        placeholder="e.g. San Francisco"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">State / Province</label>
                      <input
                        type="text"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        placeholder="e.g. CA"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">Postal / ZIP Code</label>
                    <input
                      type="text"
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      placeholder="e.g. 94105"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                    />
                  </div>

                  {/* Address Geocoding Controls */}
                  <div className="p-3 bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] rounded-lg space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal dark:text-[#F5F5F5]">
                        <MapPin className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
                        <span>Address Coordinates (Geoapify)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLookupCoordinates}
                        disabled={geocodingStatus === 'loading' || !addressForm.addressLine.trim()}
                        className="px-2.5 py-1 text-xs font-medium rounded border border-forest-600/40 dark:border-[#FF7028]/40 text-forest-700 dark:text-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/10 hover:bg-forest-100/60 dark:hover:bg-[#FF7028]/20 disabled:opacity-50 inline-flex items-center gap-1 transition-colors"
                      >
                        {geocodingStatus === 'loading' ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-forest dark:text-[#FF7028]" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3 h-3 text-forest dark:text-[#FF7028]" />
                            <span>Verify Address Coordinates</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Geocoding Visual Feedback */}
                    {geocodingStatus === 'verified' && addressCoords && (
                      <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            <span>Coordinates Verified: {formatCoordinates(addressCoords)}</span>
                            {addressCoords.precision && (
                              <span className="text-[9px] uppercase px-1 rounded bg-emerald-200/60 dark:bg-emerald-900 font-mono">
                                {addressCoords.precision}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {addressCoords.formattedAddress}
                          </div>
                        </div>
                      </div>
                    )}

                    {geocodingStatus === 'unconfigured' && (
                      <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                        Geocoding service inactive (API key unconfigured). Manual street address accepted.
                      </div>
                    )}

                    {(geocodingStatus === 'not_found' || geocodingStatus === 'error') && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>{geocodingFeedback || 'Could not verify exact coordinates. Manual address will be saved.'}</span>
                      </div>
                    )}

                    {/* Multi-Match Candidate Selection */}
                    {candidateMatches.length > 1 && (
                      <div className="space-y-1.5 pt-1 border-t border-gray-200 dark:border-[#3A3E43] animate-fadeIn">
                        <span className="text-[11px] font-semibold text-charcoal dark:text-[#F5F5F5] block">
                          Multiple locations matched ({candidateMatches.length} candidates):
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {candidateMatches.map((cand, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectCandidate(cand)}
                              className={`w-full text-left p-2 rounded border text-[11px] transition-colors ${
                                addressCoords?.formattedAddress === cand.formattedAddress
                                  ? 'border-forest dark:border-[#FF7028] bg-forest-50 dark:bg-[#FF7028]/15 font-semibold'
                                  : 'border-gray-200 dark:border-[#3A3E43] hover:bg-gray-100 dark:hover:bg-[#292D31]'
                              }`}
                            >
                              <div className="text-charcoal dark:text-[#F5F5F5] leading-snug">{cand.formattedAddress}</div>
                              <div className="text-[10px] text-gray-500 dark:text-[#B8BDC3] flex items-center justify-between mt-1">
                                <span>{formatCoordinates(cand)}</span>
                                <span className="uppercase font-mono text-[9px] px-1 py-0.2 rounded bg-gray-200 dark:bg-[#101010]">
                                  {cand.precision || 'match'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                      Courier Pickup Instructions (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={addressForm.pickupInstructions}
                      onChange={(e) => setAddressForm({ ...addressForm, pickupInstructions: e.target.value })}
                      placeholder="e.g. Security check-in required, buzz #204, loading bay on rear street"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                      className="w-4 h-4 text-forest dark:accent-[#FF7028] rounded border-gray-300 focus:ring-forest"
                    />
                    <span className="text-xs text-gray-700 dark:text-[#B8BDC3]">Set as my default pickup address</span>
                  </label>

                  <div className="pt-3 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddressModal(false)}
                      className="btn-secondary text-xs px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs px-5 py-2 font-semibold shadow-xs"
                    >
                      {editingAddress ? 'Update Address' : 'Save Address'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LOGIN & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Lock className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Login &amp; Security</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
            >
              Back to Overview
            </button>
          </div>

          {passwordSuccessMsg && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}
          {passwordError && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your existing account password"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                New Password (Minimum 6 characters)
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a strong replacement password"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-gray-400 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your new password"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] focus:border-forest dark:focus:border-[#FF7028]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs"
              >
                Update Password
              </button>
            </div>
          </form>

          {/* Session Overview */}
          <div className="pt-6 border-t border-gray-100 dark:border-[#3A3E43] space-y-3 text-xs text-gray-600 dark:text-[#B8BDC3]">
            <h3 className="font-bold text-charcoal dark:text-[#F5F5F5]">Active Prototype Session</h3>
            <div className="p-3 bg-offwhite dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] rounded-lg flex items-center justify-between">
              <div>
                <div className="font-semibold text-charcoal dark:text-[#F5F5F5]">Web Browser Client</div>
                <div className="text-[11px] text-gray-400 dark:text-[#B8BDC3]/70">Persistent storage session tied to local browser cache</div>
              </div>
              <button
                type="button"
                onClick={handleOpenSignOutModal}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Bell className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Communication &amp; Alert Preferences</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
            >
              Back to Overview
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-[#B8BDC3]">
            Configure how EcoCycle notifies you regarding collection slot confirmations, status advancements, and facility messages.
          </p>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Appointment Confirmations</div>
                <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                  Receive alerts when a recycling centre accepts and schedules your collection or drop-off slot.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.appointmentConfirmations}
                  onChange={() => handleNotificationToggle('appointmentConfirmations')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-[#3A3E43] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest dark:peer-checked:bg-[#FF7028]" />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Intake &amp; Status Transitions</div>
                <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                  Notify me when items transition through Submitted &rarr; Scheduled &rarr; Received.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.statusUpdates}
                  onChange={() => handleNotificationToggle('statusUpdates')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-[#3A3E43] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest dark:peer-checked:bg-[#FF7028]" />
              </label>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Cancellation &amp; Reschedule Notices</div>
                <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                  Immediate alerts if a facility requests to reschedule an appointment or cancels a pickup.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.cancellationAlerts}
                  onChange={() => handleNotificationToggle('cancellationAlerts')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-[#3A3E43] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest dark:peer-checked:bg-[#FF7028]" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRIVACY & COMPLIANCE */}
      {/* ========================================================================= */}
      {activeTab === 'privacy' && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs max-w-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Shield className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Data Management &amp; Regulatory Compliance</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
            >
              Back to Overview
            </button>
          </div>

          {/* Legal Compliance Notice */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] space-y-2 text-xs text-gray-600 dark:text-[#B8BDC3]">
            <div className="font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Chain-of-Custody Record Preservation</span>
            </div>
            <p className="leading-relaxed">
              Under electronic stewardship guidelines and toxic depollution compliance standards, operational requests, verified facility physical receipts, and audit history logs are permanently maintained. They cannot be wiped with generic history clear buttons.
            </p>
          </div>

          {/* Clear Non-Essential Cache */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-charcoal dark:text-[#F5F5F5] uppercase tracking-wider">
              Non-Essential Data &amp; Search Cache
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] leading-relaxed">
              Clear temporary frontend caches including recent facility search terms, unsaved form drafts, and ephemeral view states without affecting your actual requests or appointments.
            </p>

            <button
              type="button"
              onClick={handleOpenClearCacheModal}
              className="btn-secondary text-xs px-4 py-2 font-semibold"
            >
              Clear Temporary Search &amp; Form Cache
            </button>
          </div>

          {/* Account Deletion Dialog Trigger */}
          <div className="pt-6 border-t border-gray-100 dark:border-[#3A3E43] space-y-3">
            <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Permanent Account Deletion
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] leading-relaxed">
              Permanently close and delete your customer account. This erases your personal profile, credentials, saved address book, and historical declarations. Deletion is blocked if you have any active or unresolved services.
            </p>

            <button
              type="button"
              onClick={handleOpenDeleteModal}
              className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
            >
              Request Account Deletion
            </button>
          </div>

          {/* Two-Step Deletion Modal / Pending Service Blocker */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
                {deleteEligibility && !deleteEligibility.canDelete ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                      Account Deletion Blocked: Unresolved Services
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                      {deleteEligibility.reason || 'You have active declarations or scheduled collections awaiting physical completion or cancellation.'}
                    </p>

                    {deleteEligibility.unresolvedRequests?.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-amber-200 dark:border-amber-900/60 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                        <p className="font-semibold text-amber-900 dark:text-amber-200 text-[11px] mb-1">
                          Unresolved Declarations ({deleteEligibility.unresolvedRequests.length}):
                        </p>
                        {deleteEligibility.unresolvedRequests.map((req) => (
                          <div key={req.id} className="flex items-center justify-between py-1 border-b border-amber-200/50 dark:border-amber-900/40 last:border-0">
                            <div>
                              <span className="font-mono font-bold text-charcoal dark:text-[#F5F5F5]">#{req.id}</span>
                              <span className="text-gray-600 dark:text-[#B8BDC3] ml-2">
                                {req.brand ? `${req.brand} ` : ''}{req.category}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                              {req.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeleteEligibility(null);
                        }}
                        className="btn-secondary text-xs px-4 py-2"
                      >
                        Close
                      </button>
                      <Link
                        to="/requests"
                        className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                      >
                        <span>Manage Declarations</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                      Confirm Permanent Account Deletion
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                      This action cannot be undone. Your user profile, saved addresses, login credentials, and historical records will be permanently erased. You will not be able to log in again with this account.
                    </p>

                    {deleteError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
                        {deleteError}
                      </div>
                    )}

                    <div className="text-xs font-medium text-gray-700 dark:text-[#B8BDC3]">
                      Please type <strong>DELETE</strong> to confirm permanent deletion:
                    </div>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                    />
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeleteConfirmationText('');
                          setDeleteError('');
                        }}
                        className="btn-secondary text-xs px-4 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deleteConfirmationText !== 'DELETE' || isDeleting}
                        onClick={handleConfirmDeleteAccount}
                        className={`text-xs px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                          deleteConfirmationText === 'DELETE' && !isDeleting
                            ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                            : 'bg-red-300 dark:bg-red-900/50 cursor-not-allowed'
                        }`}
                      >
                        {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. APPEARANCE & THEME */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Sun className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Display Appearance &amp; Visual Theme</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
            >
              Back to Overview
            </button>
          </div>

          <ThemeSelector />
        </div>
      )}

      {/* ── MODAL: Delete Address Confirmation Dialog ── */}
      {showDeleteAddressModal && addressToDelete && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                Remove Saved Address
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to remove <strong>"{addressToDelete.label}"</strong> ({addressToDelete.addressLine}, {addressToDelete.city}) from your saved address book?
            </p>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-gray-600 dark:text-[#B8BDC3] text-xs space-y-1">
              <div className="font-semibold text-charcoal dark:text-[#F5F5F5] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-forest dark:text-[#FF7028] shrink-0" />
                <span>Existing Pickup Declarations Unaffected</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Removing this address will not alter any already submitted e-waste pickup manifests or scheduled appointments.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAddressModal(false);
                  setAddressToDelete(null);
                }}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAddress}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Confirm &amp; Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Clear Search & Form Cache Confirmation Dialog ── */}
      {showClearCacheModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-charcoal dark:text-[#F5F5F5]">
              <Shield className="w-5 h-5 text-forest dark:text-[#FF7028] shrink-0" />
              <h3 className="text-base font-bold">
                Clear Temporary Cache
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              This will clear temporary client-side data, including recent search filters and unsaved declaration drafts stored in this browser.
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Account &amp; Official Records Preserved</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your account credentials, saved pickup addresses, active requests, confirmed appointments, and environmental impact contributions are permanent and will not be touched.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCache}
                className="btn-primary text-xs px-4 py-2 font-semibold"
              >
                Confirm &amp; Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Sign Out Confirmation Dialog ── */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-charcoal dark:text-[#F5F5F5]">
              <LogOut className="w-5 h-5 text-forest dark:text-[#FF7028] shrink-0" />
              <h3 className="text-base font-bold">
                Sign Out of Account
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to sign out of your EcoCycle customer account? You can sign back in at any time using your registered email address.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#3A3E43]">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Stay Signed In
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

    </div>
  );
}
