import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  User, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Info,
  Layers,
  Truck,
  Scale,
  Lock,
  Bell,
  Eye,
  EyeOff,
  ChevronRight,
  LogOut,
  Calendar,
  Package,
  Trash2,
  Sliders,
  Sun,
  ArrowRight
} from 'lucide-react';
import { useCentreAuth } from '../../context/CentreAuthContext';
import {
  storageService,
  parseOperatingDays,
  parseOperatingHours,
  formatOperatingDays,
  formatOperatingHours,
  validateSchedule,
} from '../../services/storageService';
import { geocodeAddress, formatCoordinates, buildAddressGeocodeQuery } from '../../services/geocodingService';
import VisualSchedulePicker from '../../components/centre/VisualSchedulePicker';
import ThemeSelector from '../../components/ThemeSelector';

const ALL_WASTE_CATEGORIES = [
  'Computers & Laptops',
  'Smartphones & Tablets',
  'Batteries & Power Units',
  'Displays & Monitors',
  'Home & Office Appliances',
  'Servers & Telecom Infrastructure',
];

export default function CentreProfilePage() {
  const {
    currentCentre,
    centreSession,
    centresList,
    updateCentreProfile,
    updatePassword,
    clearNonEssentialCache,
    logoutCentre,
    checkDeletionEligibility,
    deleteCentreAccount,
  } = useCentreAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromLocation = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['profile', 'schedule', 'categories', 'security', 'appearance'].includes(tabParam)) {
      return tabParam;
    }
    if (location.hash === '#schedule') return 'schedule';
    if (location.hash === '#profile') return 'profile';
    if (location.hash === '#categories') return 'categories';
    if (location.hash === '#security') return 'security';
    if (location.hash === '#appearance') return 'appearance';
    return 'profile';
  };

  // Active category tab: 'profile' | 'schedule' | 'categories' | 'security' | 'appearance'
  const [activeTab, setActiveTab] = useState(getTabFromLocation);

  useEffect(() => {
    const targetTab = getTabFromLocation();
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  }, [location.search, location.hash]);

  // 1. Profile State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    serviceArea: '',
    intakePoint: '',
    description: '',
    certification: '',
    staffName: '',
  });

  // 2. Schedule & Capacity State
  const [scheduleForm, setScheduleForm] = useState({
    operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    openingTime: '09:00',
    closingTime: '17:00',
    operatingDays: 'Monday to Friday',
    hours: '09:00 AM – 05:00 PM',
    leadTimeDays: 2,
    pickupAvailable: true,
    dropoffAvailable: true,
    maxWeeklyCapacityKg: 3000,
    maxWeeklyUnits: 800,
    slotLimitKg: 250,
  });

  // 3. Accepted Streams State
  const [acceptedCategories, setAcceptedCategories] = useState([]);
  const [capabilities, setCapabilities] = useState('');

  // 4. Security & Notifications State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [notifications, setNotifications] = useState({
    newRequests: true,
    appointmentReminders: true,
    cancellations: true,
  });

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Confirmation Modals State
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteCentreModal, setShowDeleteCentreModal] = useState(false);
  const [deleteCentreConfirmationText, setDeleteCentreConfirmationText] = useState('');
  const [centreDeleteEligibility, setCentreDeleteEligibility] = useState(null);
  const [centreDeleteError, setCentreDeleteError] = useState('');
  const [isDeletingCentre, setIsDeletingCentre] = useState(false);

  // Geocoding State
  const [facilityCoords, setFacilityCoords] = useState(null);
  const [geocodingStatus, setGeocodingStatus] = useState('idle');
  const [geocodingFeedback, setGeocodingFeedback] = useState('');
  const [suggestedAddress, setSuggestedAddress] = useState('');
  const [candidateMatches, setCandidateMatches] = useState([]);

  // Load centre details into state
  useEffect(() => {
    if (currentCentre) {
      setFacilityCoords(currentCentre.coordinates || null);
      if (currentCentre.coordinates) {
        setGeocodingStatus('verified');
        setGeocodingFeedback(`Coordinates: ${formatCoordinates(currentCentre.coordinates)}`);
      } else {
        setGeocodingStatus('idle');
        setGeocodingFeedback('');
      }

      setProfileForm({
        name: currentCentre.name || '',
        email: currentCentre.email || '',
        phone: currentCentre.phone || '',
        address: currentCentre.address || '',
        city: currentCentre.city || '',
        serviceArea: currentCentre.serviceArea || currentCentre.city || '',
        intakePoint: currentCentre.intakePoint || 'Main Facility Loading Dock',
        description: currentCentre.description || 'Authorized electronic waste intake and recycling facility.',
        certification: currentCentre.certification || 'R2v3, ISO 14001, e-Stewards Compliant',
        staffName: currentCentre.staffName || centreSession?.staffName || '',
      });

      const daysList =
        Array.isArray(currentCentre.operatingDaysList) && currentCentre.operatingDaysList.length > 0
          ? currentCentre.operatingDaysList
          : parseOperatingDays(currentCentre.operatingDays);
      const parsedH = parseOperatingHours(currentCentre.hours);
      const openTime = currentCentre.openingTime || parsedH.openingTime || '09:00';
      const closeTime = currentCentre.closingTime || parsedH.closingTime || '17:00';

      setScheduleForm({
        operatingDaysList: daysList,
        openingTime: openTime,
        closingTime: closeTime,
        operatingDays: currentCentre.operatingDays || formatOperatingDays(daysList),
        hours: currentCentre.hours || formatOperatingHours(openTime, closeTime),
        leadTimeDays: currentCentre.leadTimeDays || 2,
        pickupAvailable: currentCentre.pickupAvailable ?? true,
        dropoffAvailable: currentCentre.dropoffAvailable ?? true,
        maxWeeklyCapacityKg: currentCentre.maxWeeklyCapacityKg || 3000,
        maxWeeklyUnits: currentCentre.maxWeeklyUnits || 800,
        slotLimitKg: currentCentre.slotLimitKg || 250,
      });

      setAcceptedCategories(
        Array.isArray(currentCentre.accepted) ? currentCentre.accepted : ['Computers & Laptops', 'Smartphones & Tablets']
      );

      setCapabilities(
        currentCentre.capabilities || 'Certified Sorting, Mechanical Disassembly & Hazard Depollution'
      );
    }
  }, [currentCentre?.id]);

  const triggerSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Profile Save
  const handleLookupCoordinates = async () => {
    if (!profileForm.address || profileForm.address.trim().length < 3) {
      setGeocodingStatus('error');
      setGeocodingFeedback('Please enter facility street address first.');
      return;
    }
    const fullQuery = buildAddressGeocodeQuery(profileForm.address, profileForm.city);
    setGeocodingStatus('loading');
    setGeocodingFeedback('');
    setCandidateMatches([]);
    try {
      const res = await geocodeAddress(fullQuery, { limit: 5 });
      if (res.success && res.data) {
        if (res.isAmbiguous && res.results?.length > 1) {
          setCandidateMatches(res.results);
          setFacilityCoords(res.data);
          setGeocodingStatus('ambiguous');
          setGeocodingFeedback('Multiple matches found. Select precise facility location below.');
        } else {
          setGeocodingStatus('verified');
          setFacilityCoords(res.data);
          setCandidateMatches([]);
          setGeocodingFeedback(`Coordinates verified: ${formatCoordinates(res.data)}`);
        }
        if (res.data.formattedAddress && res.data.formattedAddress.toLowerCase() !== profileForm.address.trim().toLowerCase()) {
          setSuggestedAddress(res.data.formattedAddress);
        } else {
          setSuggestedAddress('');
        }
      } else if (res.status === 'unconfigured') {
        setGeocodingStatus('unconfigured');
        setGeocodingFeedback('Geocoding service inactive (API key unconfigured). Manual address accepted.');
        setFacilityCoords(null);
      } else {
        setGeocodingStatus(res.status || 'error');
        setGeocodingFeedback(res.message || 'Could not verify exact coordinates.');
        setFacilityCoords(null);
      }
    } catch {
      setGeocodingStatus('error');
      setGeocodingFeedback('Geocoding lookup failed. Manual address will be used.');
      setFacilityCoords(null);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setFacilityCoords(candidate);
    setGeocodingStatus('verified');
    setGeocodingFeedback(`Coordinates verified: ${formatCoordinates(candidate)}`);
    setCandidateMatches([]);
    if (candidate.formattedAddress) {
      setSuggestedAddress(candidate.formattedAddress);
    }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profileForm.name.trim()) {
      setErrorMsg('Facility name is required.');
      return;
    }
    if (!profileForm.email.trim()) {
      setErrorMsg('Official contact email is required.');
      return;
    }

    // Check duplicate email against other facilities
    const normalizedEmail = profileForm.email.trim().toLowerCase();
    const otherCentres = centresList.filter((c) => c.id !== currentCentre.id);
    if (otherCentres.some((c) => (c.email || '').toLowerCase() === normalizedEmail)) {
      setErrorMsg('Another registered recycling facility is already using this official contact email.');
      return;
    }

    try {
      updateCentreProfile({
        name: profileForm.name.trim(),
        email: normalizedEmail,
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        serviceArea: profileForm.serviceArea.trim(),
        intakePoint: profileForm.intakePoint.trim(),
        description: profileForm.description.trim(),
        certification: profileForm.certification.trim(),
        staffName: profileForm.staffName.trim(),
        coordinates: facilityCoords || null,
      });
      triggerSuccess('Facility profile updated successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update facility profile.');
    }
  };

  // Schedule & Capacity Save
  const handleScheduleSave = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const maxKg = Number(scheduleForm.maxWeeklyCapacityKg);
    const maxUnits = Number(scheduleForm.maxWeeklyUnits);

    if (isNaN(maxKg) || maxKg <= 0) {
      setErrorMsg('Max weekly capacity must be a positive number in kg.');
      return;
    }
    if (isNaN(maxUnits) || maxUnits <= 0) {
      setErrorMsg('Max weekly units must be a positive number.');
      return;
    }

    const schedVal = validateSchedule({
      operatingDaysList: scheduleForm.operatingDaysList,
      openingTime: scheduleForm.openingTime,
      closingTime: scheduleForm.closingTime,
    });
    if (!schedVal.isValid) {
      setErrorMsg(schedVal.error);
      return;
    }

    try {
      updateCentreProfile({
        operatingDaysList: scheduleForm.operatingDaysList,
        openingTime: scheduleForm.openingTime,
        closingTime: scheduleForm.closingTime,
        operatingDays: scheduleForm.operatingDays,
        hours: scheduleForm.hours,
        leadTimeDays: Number(scheduleForm.leadTimeDays) || 2,
        pickupAvailable: scheduleForm.pickupAvailable,
        dropoffAvailable: scheduleForm.dropoffAvailable,
        maxWeeklyCapacityKg: maxKg,
        maxWeeklyUnits: maxUnits,
        slotLimitKg: Number(scheduleForm.slotLimitKg) || 250,
      });
      triggerSuccess('Operating schedule and capacity limits updated. Active bookings remain protected.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update capacity settings.');
    }
  };

  // Accepted Categories Save
  const handleCategoriesSave = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (acceptedCategories.length === 0) {
      setErrorMsg('A facility must accept at least one e-waste category stream.');
      return;
    }

    try {
      updateCentreProfile({
        accepted: acceptedCategories,
        capabilities: capabilities.trim(),
      });
      triggerSuccess('Accepted waste streams updated. Customer eligibility updated immediately.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update accepted categories.');
    }
  };

  const handleToggleCategory = (cat) => {
    setAcceptedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Password Save
  const handlePasswordSave = (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current facility password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
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
      triggerSuccess('Facility credentials updated successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update facility password.');
    }
  };

  const handleOpenClearCacheModal = () => {
    setShowClearCacheModal(true);
  };

  const handleConfirmClearCache = () => {
    clearNonEssentialCache();
    setShowClearCacheModal(false);
    triggerSuccess('Temporary facility view and search cache cleared.');
  };

  const handleOpenSignOutModal = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmSignOut = () => {
    setShowSignOutModal(false);
    logoutCentre();
    navigate('/');
  };

  const handleOpenDeleteCentreModal = () => {
    const eligibility = checkDeletionEligibility();
    setCentreDeleteEligibility(eligibility);
    setDeleteCentreConfirmationText('');
    setCentreDeleteError('');
    setShowDeleteCentreModal(true);
  };

  const handleConfirmDeleteCentre = () => {
    if (deleteCentreConfirmationText !== 'DELETE' || isDeletingCentre) return;
    setIsDeletingCentre(true);
    setCentreDeleteError('');
    try {
      deleteCentreAccount();
      navigate('/centre/login?deleted=centre');
    } catch (err) {
      setCentreDeleteError(err.message || 'Failed to delete recycling facility account.');
      setIsDeletingCentre(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 page-enter text-charcoal dark:text-[#F5F5F5]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#3A3E43]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-charcoal dark:text-[#F5F5F5]">
              Facility Settings &amp; Configuration
            </h1>
            <span className="text-xs font-mono font-bold text-forest dark:text-[#FF7028] bg-forest-50 dark:bg-[#FF7028]/15 px-2.5 py-0.5 rounded border border-forest-200 dark:border-[#FF7028]/30">
              {currentCentre?.id}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-[#B8BDC3] mt-1">
            Configure operational hours, capacity constraints, accepted e-waste streams, and facility access credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-[#B8BDC3]">Active Facility:</span>
          <span 
            className="text-xs font-semibold px-2.5 py-1.5 border border-forest-200 dark:border-[#3A3E43] rounded-md bg-forest-50/70 dark:bg-[#202326] text-forest dark:text-[#FF7028]"
            data-testid="centre-profile-active-identity"
          >
            {currentCentre?.name}
          </span>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Navigation Tabs (Amazon-Style Hub) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'profile'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50'
          }`}
        >
          <div className="flex items-center gap-2 text-forest dark:text-[#FF7028] mb-1.5">
            <Building2 className="w-4 h-4" />
            <span className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Centre Profile</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Contact, location &amp; intake dock</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'schedule'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50'
          }`}
        >
          <div className="flex items-center gap-2 text-forest dark:text-[#FF7028] mb-1.5">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Schedule &amp; Capacity</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Intake hours, slots &amp; limits</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'categories'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50'
          }`}
        >
          <div className="flex items-center gap-2 text-forest dark:text-[#FF7028] mb-1.5">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Accepted Streams</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Hardware categories &amp; handling</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'security'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50'
          }`}
        >
          <div className="flex items-center gap-2 text-forest dark:text-[#FF7028] mb-1.5">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Security &amp; Alerts</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Password, notices &amp; cache</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'appearance'
              ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 shadow-xs'
              : 'border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#292D31] hover:border-forest-200 dark:hover:border-[#FF7028]/50'
          }`}
        >
          <div className="flex items-center gap-2 text-forest dark:text-[#FF7028] mb-1.5">
            <Sun className="w-4 h-4" />
            <span className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Appearance</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Light, dark, or system</p>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CENTRE PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Facility Identity &amp; Physical Intake Location</span>
            </h2>
            <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]">
              Changes update public directory and customer receipts
            </span>
          </div>

          {!facilityCoords && (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Facility Coordinates Unverified</span>
                <p className="text-[11px] leading-relaxed mt-0.5 text-amber-800 dark:text-amber-300">
                  This recycling facility does not currently have verified geographic coordinates. Verify your physical street address below using Geoapify to enable nearest-facility discovery for local customers.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Official Facility Contact Email *
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
              <span className="text-[10px] text-gray-400 dark:text-[#B8BDC3] mt-1 block">
                Normalized email used for staff authentication and request alerts.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Intake Gate Phone Line *
              </label>
              <input
                type="tel"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Registered Street Address *
              </label>
              <input
                type="text"
                required
                value={profileForm.address}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, address: e.target.value });
                  setFacilityCoords(null);
                  setGeocodingStatus('idle');
                  setGeocodingFeedback('');
                  setSuggestedAddress('');
                }}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />

              {/* Geocoding Controls */}
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLookupCoordinates}
                    disabled={geocodingStatus === 'loading' || !profileForm.address || profileForm.address.trim().length < 3}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-forest-600/40 dark:border-[#FF7028]/40 text-forest-700 dark:text-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/10 hover:bg-forest-100/60 dark:hover:bg-[#FF7028]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{geocodingStatus === 'loading' ? 'Verifying...' : 'Verify Facility Coordinates'}</span>
                  </button>

                  {geocodingStatus === 'verified' && facilityCoords && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Coordinates: {formatCoordinates(facilityCoords)} (Geoapify)</span>
                    </span>
                  )}

                  {geocodingStatus === 'unconfigured' && (
                    <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                      Geocoding inactive (API key unconfigured). Manual street address accepted.
                    </span>
                  )}

                  {(geocodingStatus === 'not_found' || geocodingStatus === 'error' || geocodingStatus === 'rate_limited') && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      {geocodingFeedback || 'Unable to resolve coordinates.'}
                    </span>
                  )}
                </div>

                {suggestedAddress && (
                  <div className="p-2.5 rounded-lg bg-forest-50/70 dark:bg-[#202326] border border-forest-200 dark:border-[#3A3E43] flex items-center justify-between text-xs animate-fadeIn">
                    <div className="truncate mr-2">
                      <span className="font-semibold text-forest-900 dark:text-[#FF7028]">Suggested Format: </span>
                      <span className="text-gray-700 dark:text-[#F5F5F5]">{suggestedAddress}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileForm((prev) => ({ ...prev, address: suggestedAddress }));
                        setSuggestedAddress('');
                      }}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-forest dark:bg-[#FF7028] dark:hover:bg-[#F45D16] text-white rounded hover:bg-forest-700 transition-colors shadow-2xs"
                    >
                      Use Suggestion
                    </button>
                  </div>
                )}

                {candidateMatches.length > 1 && (
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] space-y-1.5 animate-fadeIn text-xs">
                    <span className="font-semibold text-charcoal dark:text-[#F5F5F5] block">
                      Multiple facility matches found ({candidateMatches.length}):
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {candidateMatches.map((cand, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectCandidate(cand)}
                          className="w-full text-left p-2 rounded border border-gray-200 dark:border-[#3A3E43] hover:bg-white dark:hover:bg-[#292D31] text-[11px] transition-colors"
                        >
                          <div className="font-medium text-charcoal dark:text-[#F5F5F5] leading-snug">{cand.formattedAddress}</div>
                          <div className="text-[10px] text-gray-500 dark:text-[#B8BDC3] flex items-center justify-between mt-0.5">
                            <span>{formatCoordinates(cand)}</span>
                            <span className="uppercase font-mono text-[9px] px-1 rounded bg-gray-200 dark:bg-[#3A3E43] text-charcoal dark:text-[#F5F5F5]">{cand.precision || 'match'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                City / Municipality *
              </label>
              <input
                type="text"
                required
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Service &amp; Collection Area
              </label>
              <input
                type="text"
                value={profileForm.serviceArea}
                onChange={(e) => setProfileForm({ ...profileForm, serviceArea: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Intake Point Directives (Drop-off Gate / Loading Bay)
              </label>
              <input
                type="text"
                value={profileForm.intakePoint}
                onChange={(e) => setProfileForm({ ...profileForm, intakePoint: e.target.value })}
                placeholder="e.g. North Gate 3, Loading Bay B, Public Drop-off Kiosk"
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Accreditations &amp; Security Standards
              </label>
              <input
                type="text"
                value={profileForm.certification}
                onChange={(e) => setProfileForm({ ...profileForm, certification: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Public Facility Description
              </label>
              <textarea
                rows={2}
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-end">
            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCHEDULE & CAPACITY */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <form onSubmit={handleScheduleSave} className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Clock className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Operating Schedule &amp; Intake Capacity Management</span>
            </h2>
            <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]">
              Directly regulates appointment calendar availability
            </span>
          </div>

          {/* Active Appointment Protection Notice */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Active Booking Integrity:</strong> Modifications to working days or reductions in weekly capacity limits will not silently cancel or invalidate already reserved appointments. Active customer bookings are strictly protected.
            </span>
          </div>

          <VisualSchedulePicker
            operatingDaysList={scheduleForm.operatingDaysList}
            openingTime={scheduleForm.openingTime}
            closingTime={scheduleForm.closingTime}
            onChange={(sched) => {
              setScheduleForm((prev) => ({
                ...prev,
                operatingDaysList: sched.operatingDaysList,
                openingTime: sched.openingTime,
                closingTime: sched.closingTime,
                operatingDays: sched.operatingDays,
                hours: sched.hours,
              }));
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

            {/* Service Availability Toggles */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
              <span className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-2">Service Availability Channels</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3.5 rounded-lg border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202326]/80">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    <div>
                      <div className="font-semibold text-charcoal dark:text-[#F5F5F5]">Doorstep Pickup Collection</div>
                      <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Accept doorstep collection requests</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleForm.pickupAvailable}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, pickupAvailable: e.target.checked })}
                    className="w-4 h-4 text-forest dark:text-[#FF7028] rounded border-gray-300 dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest dark:focus:ring-[#FF7028]"
                  />
                </label>

                <label className="p-3.5 rounded-lg border border-gray-200 dark:border-[#3A3E43] bg-white dark:bg-[#202326] flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202326]/80">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                    <div>
                      <div className="font-semibold text-charcoal dark:text-[#F5F5F5]">Kiosk / Depot Drop-off</div>
                      <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Accept direct self-drop-off visits</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleForm.dropoffAvailable}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, dropoffAvailable: e.target.checked })}
                    className="w-4 h-4 text-forest dark:text-[#FF7028] rounded border-gray-300 dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest dark:focus:ring-[#FF7028]"
                  />
                </label>
              </div>
            </div>

            {/* Intake Capacity Limits */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
              <span className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-2">Weekly Throughput Constraints</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-[#B8BDC3] mb-1">Max Weekly Capacity (kg) *</label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={scheduleForm.maxWeeklyCapacityKg}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maxWeeklyCapacityKg: e.target.value })}
                    className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-[#B8BDC3] mb-1">Max Weekly Units *</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={scheduleForm.maxWeeklyUnits}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maxWeeklyUnits: e.target.value })}
                    className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-[#B8BDC3] mb-1">Per-Slot Limit (kg)</label>
                  <input
                    type="number"
                    min="10"
                    value={scheduleForm.slotLimitKg}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, slotLimitKg: e.target.value })}
                    className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Scheduling Lead Time (Days)
              </label>
              <input
                type="number"
                min="0"
                max="14"
                value={scheduleForm.leadTimeDays}
                onChange={(e) => setScheduleForm({ ...scheduleForm, leadTimeDays: e.target.value })}
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm font-semibold"
              />
              <span className="text-[10px] text-gray-400 dark:text-[#B8BDC3] mt-1 block">
                Minimum advance notice before first bookable appointment date.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-end">
            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Schedule &amp; Capacity</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACCEPTED STREAMS & CAPABILITIES */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <form onSubmit={handleCategoriesSave} className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Accepted Electronic Waste Streams &amp; Handling Capabilities</span>
            </h2>
            <span className="text-[11px] text-gray-400 dark:text-[#B8BDC3]">
              Determines customer-side centre eligibility
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-forest-50/70 dark:bg-[#202326] border border-forest-100 dark:border-[#3A3E43] text-xs text-forest-900 dark:text-[#F5F5F5] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-forest-700 dark:text-[#FF7028] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Direct Customer Impact:</strong> Your selected categories govern which disposal requests can be assigned to this facility. If a category is unselected, customers registering equipment in that category will not see this facility as an eligible recommendation.
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-2">
                Supported E-Waste Hardware Categories *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_WASTE_CATEGORIES.map((cat) => {
                  const isChecked = acceptedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-forest dark:border-[#FF7028] bg-forest-50/40 dark:bg-[#FF7028]/15 text-forest-900 dark:text-[#FF7028] font-semibold'
                          : 'border-gray-200 dark:border-[#3A3E43] text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326]/80 bg-white dark:bg-[#202326]'
                      }`}
                    >
                      <span>{cat}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCategory(cat)}
                        className="w-4 h-4 text-forest dark:text-[#FF7028] rounded border-gray-300 dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest dark:focus:ring-[#FF7028]"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-[#3A3E43]">
              <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                Certified Handling &amp; Depollution Capabilities
              </label>
              <textarea
                rows={2}
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
                placeholder="e.g. Certified Sorting, Mechanical Disassembly, Battery Depollution, Precious Metal Refining"
                className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex items-center justify-end">
            <button
              type="submit"
              className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Update Waste Stream Eligibility</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SECURITY, NOTIFICATIONS & AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">

          {/* Change Password Card */}
          <form onSubmit={handlePasswordSave} className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-5 shadow-xs max-w-2xl">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] pb-2 border-b border-gray-100 dark:border-[#3A3E43] flex items-center gap-2">
              <Lock className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Facility Access Credentials</span>
            </h2>

            {passwordError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm pr-10"
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
                <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  New Password (Minimum 6 characters) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm pr-10"
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
                <label className="block font-semibold text-charcoal dark:text-[#F5F5F5] mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-sm"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn-primary text-xs px-6 py-2.5 font-semibold shadow-xs"
                >
                  Update Facility Password
                </button>
              </div>
            </div>
          </form>

          {/* Operational Readiness Checklist Card */}
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-4 shadow-xs max-w-2xl">
            <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Scheduling Configuration &amp; Readiness Checklist</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-offwhite dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">Facility Registration Status</span>
                </div>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  ACTIVE &amp; CERTIFIED
                </span>
              </div>

              <div className="p-3 bg-offwhite dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">Capacity &amp; Working Days</span>
                </div>
                <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3] font-medium">
                  {currentCentre?.operatingDays || 'Configured'} ({currentCentre?.maxWeeklyCapacityKg || 3000} kg/wk)
                </span>
              </div>

              <div className="p-3 bg-offwhite dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-charcoal dark:text-[#F5F5F5]">Intake Channels Configured</span>
                </div>
                <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3] font-medium">
                  {currentCentre?.pickupAvailable && currentCentre?.dropoffAvailable
                    ? 'Pickup + Drop-off'
                    : currentCentre?.pickupAvailable
                    ? 'Pickup Only'
                    : 'Drop-off Only'}
                </span>
              </div>
            </div>
          </div>

          {/* Non-Essential Cache Clearance */}
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-4 shadow-xs max-w-2xl">
            <h3 className="text-sm font-bold text-charcoal dark:text-[#F5F5F5]">
              Cache &amp; Storage Maintenance
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] leading-relaxed">
              Clear temporary facility search filters and view caches without affecting assigned customer declarations, appointment bookings, or chain-of-custody logs.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenClearCacheModal}
                className="btn-secondary text-xs px-4 py-2 font-semibold"
              >
                Clear Temporary Cache
              </button>
              <button
                type="button"
                onClick={handleOpenSignOutModal}
                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
              >
                Sign Out of Facility
              </button>
            </div>
          </div>

          {/* Facility Decommissioning & Deregistration (Danger Zone) */}
          <div className="bg-white dark:bg-[#292D31] border border-red-200 dark:border-red-900/60 rounded-xl p-6 sm:p-8 space-y-4 shadow-xs max-w-2xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">
                Decommission Facility &amp; Permanent Deregistration
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-[#B8BDC3] leading-relaxed">
              Permanently decommission and delete <strong>{currentCentre?.name}</strong> from the official EcoCycle network.
              Facility capacity limits, working days, stream authorizations, and manager credentials will be completely erased from local storage.
            </p>
            <div>
              <button
                type="button"
                onClick={handleOpenDeleteCentreModal}
                className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors"
              >
                Delete Recycling Facility Account
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: APPEARANCE & THEME */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-xl p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#3A3E43]">
            <h2 className="text-base font-bold text-charcoal dark:text-[#F5F5F5] flex items-center gap-2">
              <Sun className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <span>Facility Portal Display Appearance &amp; Visual Theme</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="text-xs text-gray-500 dark:text-[#B8BDC3] hover:text-charcoal dark:hover:text-[#F5F5F5]"
            >
              Back to Profile
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-[#B8BDC3]">
            Choose your preferred color theme for the EcoCycle Centre Portal interface. Settings apply across facility management, intake registers, and appointment schedules.
          </p>

          <ThemeSelector />
        </div>
      )}

      {/* ── MODAL: Clear Facility Cache Confirmation Dialog ── */}
      {showClearCacheModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-charcoal dark:text-[#F5F5F5]">
              <ShieldCheck className="w-5 h-5 text-forest dark:text-[#FF7028] shrink-0" />
              <h3 className="text-base font-bold">
                Clear Facility View Cache
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              This will clear temporary client search queries, filtering state, and local interface cache for this facility.
            </p>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Operational Data &amp; Capacity Safe</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Active customer declarations, assigned appointment bookings, weekly capacity configurations, and chain-of-custody audit records are permanently preserved.
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

      {/* ── MODAL: Facility Sign Out Confirmation Dialog ── */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-charcoal dark:text-[#F5F5F5]">
              <LogOut className="w-5 h-5 text-forest dark:text-[#FF7028] shrink-0" />
              <h3 className="text-base font-bold">
                Sign Out of Facility Operations
              </h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
              Are you sure you want to end your active session for <strong>{currentCentre?.name || 'this facility'}</strong>?
            </p>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#202326] border border-gray-200 dark:border-[#3A3E43] text-gray-600 dark:text-[#B8BDC3] text-xs space-y-1">
              <div className="font-semibold text-charcoal dark:text-[#F5F5F5] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-forest dark:text-[#FF7028] shrink-0" />
                <span>Facility Continuity</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Upcoming appointments and pending declarations will remain safely queued for processing when you sign back in.
              </p>
            </div>

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

      {/* ── MODAL: Facility Permanent Deletion & Operational Blocker Dialog ── */}
      {showDeleteCentreModal && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#292D31] border border-gray-200 dark:border-[#3A3E43] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-fadeIn">
            {centreDeleteEligibility && !centreDeleteEligibility.canDelete ? (
              <>
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal dark:text-[#F5F5F5]">
                  Facility Deletion Blocked: Unresolved Intake
                </h3>
                <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                  {centreDeleteEligibility.reason || 'This facility has unresolved customer declarations or appointments awaiting intake.'}
                </p>

                {centreDeleteEligibility.unresolvedRequests?.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-amber-200 dark:border-amber-900/60 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                    <p className="font-semibold text-amber-900 dark:text-amber-200 text-[11px] mb-1">
                      Assigned Unresolved Declarations ({centreDeleteEligibility.unresolvedRequests.length}):
                    </p>
                    {centreDeleteEligibility.unresolvedRequests.map((req) => (
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
                      setShowDeleteCentreModal(false);
                      setCentreDeleteEligibility(null);
                    }}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Close
                  </button>
                  <Link
                    to="/centre/requests"
                    className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5"
                  >
                    <span>Manage Intake Queue</span>
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
                  Confirm Permanent Facility Deletion
                </h3>
                <p className="text-xs text-gray-600 dark:text-[#B8BDC3] leading-relaxed">
                  This action is permanent and cannot be undone. <strong>{currentCentre?.name}</strong> will be permanently removed from the recycling directory, all operating hours and capacity limits will be erased, and facility staff credentials will be invalidated.
                </p>

                {centreDeleteError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs">
                    {centreDeleteError}
                  </div>
                )}

                <div className="text-xs font-medium text-gray-700 dark:text-[#B8BDC3]">
                  Please type <strong>DELETE</strong> to confirm permanent decommissioning:
                </div>
                <input
                  type="text"
                  value={deleteCentreConfirmationText}
                  onChange={(e) => setDeleteCentreConfirmationText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-lg bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteCentreModal(false);
                      setDeleteCentreConfirmationText('');
                      setCentreDeleteError('');
                    }}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteCentreConfirmationText !== 'DELETE' || isDeletingCentre}
                    onClick={handleConfirmDeleteCentre}
                    className={`text-xs px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                      deleteCentreConfirmationText === 'DELETE' && !isDeletingCentre
                        ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                        : 'bg-red-300 dark:bg-red-900/50 cursor-not-allowed'
                    }`}
                  >
                    {isDeletingCentre ? 'Decommissioning...' : 'Permanently Delete Facility'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
