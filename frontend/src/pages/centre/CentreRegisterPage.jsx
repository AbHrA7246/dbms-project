import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  MapPin,
  Clock,
  Scale,
  Layers,
  Lock
} from 'lucide-react';
import { useCentreAuth } from '../../context/CentreAuthContext';
import { geocodeAddress, formatCoordinates, buildAddressGeocodeQuery } from '../../services/geocodingService';
import VisualSchedulePicker from '../../components/centre/VisualSchedulePicker';
import { validateSchedule } from '../../services/storageService';


const AVAILABLE_CATEGORIES = [
  'Computers & Laptops',
  'Smartphones & Tablets',
  'Batteries & Power Units',
  'Displays & Monitors',
  'Home & Office Appliances',
  'Servers & Telecom Infrastructure',
];

export default function CentreRegisterPage() {
  const navigate = useNavigate();
  const { registerCentre } = useCentreAuth();

  const [form, setForm] = useState({
    name: '',
    staffName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    serviceArea: '',
    categories: ['Computers & Laptops', 'Smartphones & Tablets', 'Batteries & Power Units'],
    capabilities: 'Certified Sorting, Mechanical Disassembly & Hazard Depollution',
    certification: 'R2v3 Certified & ISO 14001',
    maxWeeklyCapacityKg: 5000,
    maxWeeklyUnits: 1200,
    pickupAvailable: true,
    dropoffAvailable: true,
    operatingDaysList: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    openingTime: '08:30',
    closingTime: '17:30',
    operatingDays: 'Monday to Friday',
    hours: '08:30 AM – 05:30 PM',
    leadTimeDays: 2,
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState(null);
  const [geocodingStatus, setGeocodingStatus] = useState('idle');
  const [geocodingFeedback, setGeocodingFeedback] = useState('');
  const [suggestedAddress, setSuggestedAddress] = useState('');
  const [candidateMatches, setCandidateMatches] = useState([]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'address' || name === 'city') {
      setGeocodedCoords(null);
      setGeocodingStatus('idle');
      setGeocodingFeedback('');
      setSuggestedAddress('');
      setCandidateMatches([]);
    }
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleLookupCoordinates = async () => {
    if (!form.address || form.address.trim().length < 3) {
      setGeocodingStatus('error');
      setGeocodingFeedback('Please enter facility street address first.');
      return;
    }
    const fullQuery = buildAddressGeocodeQuery(form.address, form.city);
    setGeocodingStatus('loading');
    setGeocodingFeedback('');
    setCandidateMatches([]);
    try {
      const res = await geocodeAddress(fullQuery, { limit: 5 });
      if (res.success && res.data) {
        if (res.isAmbiguous && res.results?.length > 1) {
          setCandidateMatches(res.results);
          setGeocodedCoords(res.data);
          setGeocodingStatus('ambiguous');
          setGeocodingFeedback('Multiple matches found. Select precise facility location below.');
        } else {
          setGeocodingStatus('verified');
          setGeocodedCoords(res.data);
          setCandidateMatches([]);
          setGeocodingFeedback(`Coordinates verified: ${formatCoordinates(res.data)}`);
        }
        if (res.data.formattedAddress && res.data.formattedAddress.toLowerCase() !== form.address.trim().toLowerCase()) {
          setSuggestedAddress(res.data.formattedAddress);
        } else {
          setSuggestedAddress('');
        }
      } else if (res.status === 'unconfigured') {
        setGeocodingStatus('unconfigured');
        setGeocodingFeedback('Geocoding service inactive (API key unconfigured). Manual address accepted.');
        setGeocodedCoords(null);
      } else {
        setGeocodingStatus(res.status || 'error');
        setGeocodingFeedback(res.message || 'Could not verify exact coordinates.');
        setGeocodedCoords(null);
      }
    } catch {
      setGeocodingStatus('error');
      setGeocodingFeedback('Geocoding lookup failed. Manual address will be used.');
      setGeocodedCoords(null);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setGeocodedCoords(candidate);
    setGeocodingStatus('verified');
    setGeocodingFeedback(`Coordinates verified: ${formatCoordinates(candidate)}`);
    setCandidateMatches([]);
    if (candidate.formattedAddress) {
      setSuggestedAddress(candidate.formattedAddress);
    }
  };

  const handleCategoryToggle = (category) => {
    setForm((prev) => {
      const exists = prev.categories.includes(category);
      const updated = exists
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: updated };
    });
  };

  const handleScheduleChange = (scheduleData) => {
    setForm((prev) => ({
      ...prev,
      operatingDaysList: scheduleData.operatingDaysList,
      openingTime: scheduleData.openingTime,
      closingTime: scheduleData.closingTime,
      operatingDays: scheduleData.operatingDays,
      hours: scheduleData.hours,
    }));
    if (formErrors.schedule) {
      setFormErrors((prev) => ({ ...prev, schedule: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Facility name is required.';
    if (!form.staffName.trim()) errors.staffName = 'Operations manager / contact name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Valid official contact email is required.';
    }
    if (!form.phone.trim()) errors.phone = 'Facility phone number is required.';
    if (!form.address.trim()) errors.address = 'Physical street address is required.';
    if (!form.city.trim()) errors.city = 'City / municipality is required.';
    if (form.categories.length === 0) {
      errors.categories = 'Please select at least one accepted e-waste category.';
    }
    if (Number(form.maxWeeklyCapacityKg) <= 0) {
      errors.maxWeeklyCapacityKg = 'Capacity must be greater than 0 kg.';
    }
    if (Number(form.maxWeeklyUnits) <= 0) {
      errors.maxWeeklyUnits = 'Unit quota must be greater than 0.';
    }
    const schedVal = validateSchedule({
      operatingDaysList: form.operatingDaysList,
      openingTime: form.openingTime,
      closingTime: form.closingTime,
    });
    if (!schedVal.isValid) {
      errors.schedule = schedVal.error;
    }
    if (!form.password || form.password.length < 4) {
      errors.password = 'Password must be at least 4 characters.';
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      registerCentre({
        name: form.name.trim(),
        staffName: form.staffName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        serviceArea: form.serviceArea.trim() || form.city.trim(),
        categories: form.categories,
        capabilities: form.capabilities.trim(),
        certification: form.certification.trim(),
        maxWeeklyCapacityKg: Number(form.maxWeeklyCapacityKg),
        maxWeeklyUnits: Number(form.maxWeeklyUnits),
        pickupAvailable: form.pickupAvailable,
        dropoffAvailable: form.dropoffAvailable,
        operatingDaysList: form.operatingDaysList,
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        operatingDays: form.operatingDays.trim(),
        hours: form.hours.trim(),
        leadTimeDays: Number(form.leadTimeDays) || 2,
        coordinates: geocodedCoords || null,
        password: form.password,
      });

      // Automatically signed in by registerCentre, redirect to facility dashboard
      navigate('/centre/dashboard');
    } catch (err) {
      setSubmitError(err.message || 'Failed to register recycling facility.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] py-12 px-4 sm:px-6 lg:px-8 bg-offwhite dark:bg-[#0A0A0A] page-enter">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-forest-50 dark:bg-[#202326] text-forest dark:text-[#FF7028] border border-forest-100 dark:border-[#3A3E43]">
            <Building2 className="w-3.5 h-3.5 text-forest dark:text-[#FF7028]" />
            <span>Facility Partner Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal dark:text-[#F5F5F5] tracking-tight">
            Register a Recycling Facility
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-[#B8BDC3] max-w-xl mx-auto">
            Join the verified EcoCycle regional network to receive categorized electronic waste dispatches, allocate processing pipelines, and issue recycling certificates.
          </p>
        </div>

        {submitError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#292D31] border border-gray-200/90 dark:border-[#3A3E43] rounded-2xl p-6 sm:p-10 space-y-8 shadow-xs">

          {/* Section 1: Facility Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              <Building2 className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                1. Facility Identity &amp; Contact
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Recycling Facility / Organization Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Apex Material Recovery & Refining Hub"
                  value={form.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.name ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.name && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.name}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Lead Staff / Operations Contact Name *
                </label>
                <input
                  type="text"
                  name="staffName"
                  required
                  placeholder="e.g. Dr. Aris Thorne"
                  value={form.staffName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.staffName ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.staffName && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.staffName}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Official Facility Email (Login Username) *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="ops@apexrecovery.org"
                  value={form.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.email ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.email && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.email}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  placeholder="+1 (555) 912-3300"
                  value={form.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.phone ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.phone && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.phone}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  City / Service Area *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="e.g. Metro City or Riverdale"
                  value={form.city}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.city ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.city && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.city}</span>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Physical Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="304 Smelter Road, Heavy Industrial Zone"
                  value={form.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.address ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.address && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.address}</span>
                )}

                {/* Geocoding Controls */}
                <div className="pt-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLookupCoordinates}
                      disabled={geocodingStatus === 'loading' || !form.address || form.address.trim().length < 3}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-forest-600/40 dark:border-[#FF7028]/40 text-forest-700 dark:text-[#FF7028] bg-forest-50/50 dark:bg-[#FF7028]/10 hover:bg-forest-100/60 dark:hover:bg-[#FF7028]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{geocodingStatus === 'loading' ? 'Verifying coordinates...' : 'Verify Facility Coordinates'}</span>
                    </button>

                    {geocodingStatus === 'verified' && geocodedCoords && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Coordinates: {formatCoordinates(geocodedCoords)} (Geoapify)</span>
                      </span>
                    )}

                    {geocodingStatus === 'unconfigured' && (
                      <span className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">
                        Geocoding inactive (API key unconfigured). Manual street address accepted.
                      </span>
                    )}

                    {(geocodingStatus === 'not_found' || geocodingStatus === 'error' || geocodingStatus === 'rate_limited') && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        {geocodingFeedback || 'Unable to resolve coordinates. Manual address will be saved.'}
                      </span>
                    )}
                  </div>

                  {suggestedAddress && (
                    <div className="p-2.5 rounded-lg bg-forest-50/70 dark:bg-[#202326] border border-forest-200 dark:border-[#3A3E43] flex items-center justify-between text-xs animate-fadeIn">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-forest-900 dark:text-[#FF7028]">Suggested Format: </span>
                        <span className="text-gray-700 dark:text-[#B8BDC3]">{suggestedAddress}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, address: suggestedAddress }));
                          setSuggestedAddress('');
                        }}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-forest dark:bg-[#FF7028] text-white rounded hover:bg-forest-700 dark:hover:bg-[#F45D16] transition-colors shadow-2xs"
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
                              <span className="uppercase font-mono text-[9px] px-1 rounded bg-gray-200 dark:bg-[#101010]">{cand.precision || 'match'}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Streams, Capabilities & Accreditations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              <Layers className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                2. Accepted Streams &amp; Capabilities
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-2">
                Accepted Electronic Waste Categories *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AVAILABLE_CATEGORIES.map((cat) => {
                  const isChecked = form.categories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-forest dark:border-[#FF7028] bg-forest-50/60 dark:bg-[#FF7028]/15 font-semibold text-forest-900 dark:text-[#FF7028]'
                          : 'border-gray-200 dark:border-[#3A3E43] text-gray-700 dark:text-[#B8BDC3] hover:bg-gray-50 dark:hover:bg-[#202326] bg-white dark:bg-[#202326]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCategoryToggle(cat)}
                        className="rounded text-forest dark:accent-[#FF7028] dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest"
                      />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
              {formErrors.categories && (
                <span className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 block">{formErrors.categories}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Recovery Capabilities / Specializations
                </label>
                <input
                  type="text"
                  name="capabilities"
                  value={form.capabilities}
                  onChange={handleInputChange}
                  placeholder="Mechanical Disassembly, PCB Refining, Battery Depollution"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Environmental &amp; Security Certifications
                </label>
                <input
                  type="text"
                  name="certification"
                  value={form.certification}
                  onChange={handleInputChange}
                  placeholder="e.g. R2v3 Certified & ISO 14001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Operational Throughput & Channels */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              <Scale className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                3. Weekly Quotas &amp; Fulfillment Options
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Max Weekly Mass Capacity (kg) *
                </label>
                <input
                  type="number"
                  name="maxWeeklyCapacityKg"
                  required
                  min="100"
                  step="50"
                  value={form.maxWeeklyCapacityKg}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Max Weekly Hardware Units *
                </label>
                <input
                  type="number"
                  name="maxWeeklyUnits"
                  required
                  min="50"
                  step="10"
                  value={form.maxWeeklyUnits}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Intake Scheduling Lead Time (Days)
                </label>
                <input
                  type="number"
                  name="leadTimeDays"
                  min="1"
                  max="14"
                  value={form.leadTimeDays}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3A3E43] rounded-md bg-white dark:bg-[#202326] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028]"
                />
              </div>
            </div>

            {/* Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="p-3.5 rounded-lg border border-gray-200 dark:border-[#3A3E43] hover:border-gray-300 dark:hover:border-[#FF7028]/50 bg-white dark:bg-[#202326] flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                  <div>
                    <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Public Drop-off Intake</div>
                    <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Customers can deliver items to site</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="dropoffAvailable"
                  checked={form.dropoffAvailable}
                  onChange={handleInputChange}
                  className="rounded text-forest dark:accent-[#FF7028] dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest"
                />
              </label>

              <label className="p-3.5 rounded-lg border border-gray-200 dark:border-[#3A3E43] hover:border-gray-300 dark:hover:border-[#FF7028]/50 bg-white dark:bg-[#202326] flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                  <div>
                    <div className="text-xs font-bold text-charcoal dark:text-[#F5F5F5]">Doorstep Collection Dispatch</div>
                    <div className="text-[11px] text-gray-500 dark:text-[#B8BDC3]">Facility dispatches courier pickups</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="pickupAvailable"
                  checked={form.pickupAvailable}
                  onChange={handleInputChange}
                  className="rounded text-forest dark:accent-[#FF7028] dark:border-[#3A3E43] dark:bg-[#202326] focus:ring-forest"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Operating Days & Hours Visual Scheduler */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-forest dark:text-[#FF7028]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                  4. Operating Schedule (Days &amp; Hours)
                </h2>
              </div>
            </div>

            <VisualSchedulePicker
              operatingDaysList={form.operatingDaysList}
              openingTime={form.openingTime}
              closingTime={form.closingTime}
              onChange={handleScheduleChange}
            />

            {formErrors.schedule && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formErrors.schedule}</span>
              </div>
            )}
          </div>

          {/* Section 5: Security Credentials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-[#3A3E43]">
              <Lock className="w-4 h-4 text-forest dark:text-[#FF7028]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal dark:text-[#F5F5F5]">
                5. Facility Account Credentials
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Account Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.password ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.password && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.password}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-[#B8BDC3] mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-[#FF7028] text-charcoal dark:text-[#F5F5F5] placeholder-gray-400 dark:placeholder-[#B8BDC3]/50 ${
                    formErrors.confirmPassword ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20' : 'border-gray-300 dark:border-[#3A3E43] bg-white dark:bg-[#202326]'
                  }`}
                />
                {formErrors.confirmPassword && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 mt-1 block">{formErrors.confirmPassword}</span>
                )}
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#3A3E43] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500 dark:text-[#B8BDC3]">
              Already have an account?{' '}
              <Link to="/centre/login" className="text-forest dark:text-[#FF7028] font-semibold hover:underline">
                Sign in to existing facility
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-sm px-6 py-2.5 font-semibold shadow-sm flex items-center justify-center gap-2 self-stretch sm:self-auto"
            >
              <span>Complete Facility Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

